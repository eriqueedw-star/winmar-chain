import fs from 'node:fs';

const RPC_URL = process.env.WINMAR_RPC_URL || 'https://rpc.winmarchain.io';
const EXPLORER_API_URL =
  process.env.WINMAR_EXPLORER_API_URL || 'https://scan.winmarchain.io/api/v2/transactions';
const EXPECTED_CHAIN_ID = 12142816n;
const MAX_SCAN = Number(process.env.WINMAR_PQ_SCAN_BLOCKS || 32);
const REQUEST_TIMEOUT_MS = Number(process.env.WINMAR_PQ_REQUEST_TIMEOUT_MS || 20_000);

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

async function rpc(method, params = []) {
  const body = await fetchJson(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (body.error) throw new Error(`RPC ${method} failed: ${JSON.stringify(body.error)}`);
  return body.result;
}

function observation(block, tx) {
  return {
    rpcUrl: RPC_URL,
    chainId: Number(EXPECTED_CHAIN_ID),
    observedAt: new Date().toISOString(),
    blockNumber: Number(BigInt(block.number)),
    blockHash: block.hash,
    txHash: tx.hash,
    from: tx.from,
    to: tx.to,
    nonce: BigInt(tx.nonce).toString(),
    txType: tx.type ?? null,
  };
}

const chainIdHex = await rpc('eth_chainId');
const chainId = BigInt(chainIdHex);
if (chainId !== EXPECTED_CHAIN_ID) {
  throw new Error(`unexpected chain ID: ${chainId.toString()}`);
}

const latestHex = await rpc('eth_blockNumber');
const latest = BigInt(latestHex);

let found = null;
for (let offset = 0n; offset < BigInt(MAX_SCAN) && latest >= offset; offset++) {
  const number = latest - offset;
  const block = await rpc('eth_getBlockByNumber', ['0x' + number.toString(16), true]);
  if (!block) continue;
  if (Array.isArray(block.transactions) && block.transactions.length > 0) {
    found = observation(block, block.transactions[0]);
    break;
  }
}

if (!found) {
  // Winmar Chain can be intentionally quiet for long periods. Use the
  // explorer only to discover a historical transaction hash, then retrieve
  // and verify the transaction and its containing block from the canonical
  // JSON-RPC endpoint before generating evidence.
  const configuredHash = process.env.WINMAR_PQ_TX_HASH;
  const explorer = configuredHash ? null : await fetchJson(EXPLORER_API_URL);
  const txHash = configuredHash || explorer?.items?.find((item) => item?.hash)?.hash;
  if (!txHash) {
    throw new Error(`no transaction found in latest ${MAX_SCAN} blocks or explorer history`);
  }

  const tx = await rpc('eth_getTransactionByHash', [txHash]);
  if (!tx?.blockHash || !tx?.blockNumber) {
    throw new Error(`RPC did not return a mined transaction for ${txHash}`);
  }

  const block = await rpc('eth_getBlockByHash', [tx.blockHash, false]);
  if (!block || block.hash !== tx.blockHash || block.number !== tx.blockNumber) {
    throw new Error(`RPC block verification failed for ${txHash}`);
  }
  found = observation(block, tx);
}

fs.mkdirSync('evidence', { recursive: true });
fs.writeFileSync('evidence/live-mainnet-transaction.json', JSON.stringify(found, null, 2) + '\n');
console.log(JSON.stringify(found, null, 2));
