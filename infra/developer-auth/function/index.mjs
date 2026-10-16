import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  Interface,
  JsonRpcProvider,
  getAddress,
  hashMessage,
  isAddress,
  verifyMessage,
} from "ethers";
import { randomBytes } from "node:crypto";

const CHAIN_ID = 12142816;
const EIP1271_MAGIC = "0x1626ba7e";
const eip1271 = new Interface([
  "function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)",
]);
const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const tableName = process.env.WALLET_LINKS_TABLE;
const rpcUrl = process.env.WINMAR_RPC_URL || "https://rpc.winmarchain.io";
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean),
);

function response(statusCode, body, origin) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(origin && allowedOrigins.has(origin)
        ? { "access-control-allow-origin": origin, vary: "origin" }
        : {}),
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    const error = new Error("Invalid JSON request body.");
    error.statusCode = 400;
    throw error;
  }
}

function authenticatedSub(event) {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims?.sub || claims.email_verified !== true && claims.email_verified !== "true") {
    const error = new Error("A verified developer email account is required.");
    error.statusCode = 401;
    throw error;
  }
  return String(claims.sub);
}

function requestOrigin(event) {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  if (!allowedOrigins.has(origin)) {
    const error = new Error("Request origin is not allowed.");
    error.statusCode = 403;
    throw error;
  }
  return origin;
}

function normalizeWallet(value) {
  if (typeof value !== "string" || !isAddress(value)) {
    const error = new Error("A valid creator wallet address is required.");
    error.statusCode = 400;
    throw error;
  }
  const checksummed = getAddress(value);
  return { checksummed, lower: checksummed.toLowerCase() };
}

function makeSiweMessage({ domain, uri, address, nonce, issuedAt, expiresAt }) {
  return `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nLink this wallet to your Winmar developer account. This message does not authorize a transaction.\n\nURI: ${uri}\nVersion: 1\nChain ID: ${CHAIN_ID}\nNonce: ${nonce}\nIssued At: ${issuedAt}\nExpiration Time: ${expiresAt}`;
}

async function issueChallenge(event, sub, origin) {
  const body = parseBody(event);
  if (Number(body.chainId) !== CHAIN_ID) {
    return response(400, { error: "Wallet must be linked on Winmar Chain (12142816)." }, origin);
  }
  const wallet = normalizeWallet(body.walletAddress);
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + 5 * 60_000);
  const uri = new URL("/developers.html", origin).toString();
  const message = makeSiweMessage({
    domain: new URL(origin).host,
    uri,
    address: wallet.checksummed,
    nonce,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  await client.send(new PutCommand({
    TableName: tableName,
    Item: {
      pk: `CHALLENGE#${nonce}`,
      sk: `ACCOUNT#${sub}`,
      userSub: sub,
      walletAddress: wallet.lower,
      message,
      expiresAt: Math.floor(expiresAt.getTime() / 1000),
    },
    ConditionExpression: "attribute_not_exists(pk)",
  }));
  return response(200, { nonce, message, expiresAt: expiresAt.toISOString() }, origin);
}

async function listWallets(sub, origin) {
  const result = await client.send(new QueryCommand({
    TableName: tableName,
    IndexName: "account-index",
    KeyConditionExpression: "accountPk = :accountPk",
    ExpressionAttributeValues: { ":accountPk": `ACCOUNT#${sub}` },
    ProjectionExpression: "walletAddress, chainId, linkedAt",
  }));
  return response(200, { wallets: result.Items || [] }, origin);
}

async function validSignature(address, message, signature) {
  try {
    if (getAddress(verifyMessage(message, signature)) === getAddress(address)) return true;
  } catch {
    // Contract wallets do not use EOA recovery; try EIP-1271 below.
  }

  const provider = new JsonRpcProvider(rpcUrl, CHAIN_ID, { staticNetwork: true });
  try {
    if (await provider.getCode(address) === "0x") return false;
    const digest = hashMessage(message);
    const result = await provider.call({
      to: address,
      data: eip1271.encodeFunctionData("isValidSignature", [digest, signature]),
    });
    return result.slice(0, 10).toLowerCase() === EIP1271_MAGIC;
  } finally {
    provider.destroy();
  }
}

async function linkWallet(event, sub, origin) {
  const body = parseBody(event);
  if (typeof body.nonce !== "string" || !/^[a-f0-9]{32}$/.test(body.nonce) ||
      typeof body.signature !== "string" || body.signature.length > 2048) {
    return response(400, { error: "A valid challenge nonce and wallet signature are required." }, origin);
  }

  const key = { pk: `CHALLENGE#${body.nonce}`, sk: `ACCOUNT#${sub}` };
  const challenge = await client.send(new GetCommand({ TableName: tableName, Key: key }));
  if (!challenge.Item || challenge.Item.expiresAt <= Math.floor(Date.now() / 1000)) {
    return response(410, { error: "Wallet challenge is missing or expired. Request a new one." }, origin);
  }
  if (!await validSignature(challenge.Item.walletAddress, challenge.Item.message, body.signature)) {
    return response(401, { error: "Wallet signature could not be verified." }, origin);
  }

  const address = getAddress(challenge.Item.walletAddress);
  const accountPk = `ACCOUNT#${sub}`;
  const accountSk = `WALLET#${CHAIN_ID}#${address.toLowerCase()}`;
  try {
    await client.send(new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: tableName,
            Key: key,
            ConditionExpression: "userSub = :userSub AND expiresAt > :now",
            ExpressionAttributeValues: {
              ":userSub": sub,
              ":now": Math.floor(Date.now() / 1000),
            },
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: {
              pk: `WALLET#${CHAIN_ID}#${address.toLowerCase()}`,
              sk: "OWNER",
              accountPk,
              accountSk,
              userSub: sub,
              chainId: CHAIN_ID,
              walletAddress: address,
              linkedAt: new Date().toISOString(),
            },
            ConditionExpression: "attribute_not_exists(pk)",
          },
        },
      ],
    }));
  } catch (error) {
    if (error.name === "TransactionCanceledException") {
      return response(409, { error: "This wallet is already linked to a developer account, or the challenge was used." }, origin);
    }
    throw error;
  }
  return response(201, { walletAddress: address, chainId: CHAIN_ID, linked: true }, origin);
}

export async function handler(event) {
  let origin = event.headers?.origin || event.headers?.Origin || "";
  try {
    origin = requestOrigin(event);
    const sub = authenticatedSub(event);
    const routeKey = event.routeKey;
    if (routeKey === "POST /v1/wallet/challenge") return await issueChallenge(event, sub, origin);
    if (routeKey === "POST /v1/wallet/link") return await linkWallet(event, sub, origin);
    if (routeKey === "GET /v1/wallets") return await listWallets(sub, origin);
    return response(404, { error: "Route not found." }, origin);
  } catch (error) {
    const status = Number(error.statusCode) || 500;
    return response(status, {
      error: status === 500 ? "Developer account service is temporarily unavailable." : error.message,
    }, origin);
  }
}
