/*
 * Controlled, single-instance issuer receipt worker (DRAFT integration).
 * Never logs signing keys, never deploys contracts, never changes fee/treasury.
 * This file is NOT proof that this version is running on mainnet.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Contract, JsonRpcProvider, Wallet, getAddress, ZeroHash } from 'ethers';
import { fileURLToPath } from 'node:url';
import { processWindow } from './receipt-worker-core.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const rpcUrl = process.env.RPC_URL || 'https://rpc.winmarchain.io/';
const chainId = BigInt(process.env.CHAIN_ID || '12142816');
const paymentAddress = getAddress(process.env.DOCUMENT_FEE_CONTRACT ||
  '0xcEC232bd11F03006ECC80917F5cD55bBf247617D');
const verificationAddress = getAddress(process.env.DOCUMENT_VERIFICATION_CONTRACT ||
  '0x53fB6ba2997A50d3ddFfF5395a3BB9b7b24B7AEF');
const intervalMs = Number(process.env.RECEIPT_WORKER_INTERVAL_MS || 5000);
const statePath = path.resolve(process.env.RECEIPT_WORKER_STATE ||
  path.join(here, 'receipt-worker-state.json'));
const lockPath = statePath + '.lock';

const paymentAbi = [
  'event FeePaid(bytes32 indexed documentId,address indexed payer,address indexed treasury,uint256 amount)',
];
const verificationAbi = [
  'function registerDocument(bytes32 documentId,bytes32 documentHash,bytes32 metadataHash) returns ()',
  'function getDocument(bytes32 documentId) view returns (tuple(bytes32 documentHash,address issuer,uint64 issuedAt,uint64 revokedAt,bytes32 metadataHash))',
  'function issuers(address account) view returns (bool)',
];

function safeState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Worker state must be a JSON object');
  }
  if (!value.processed || typeof value.processed !== 'object') value.processed = {};
  if (!value.pending || typeof value.pending !== 'object') value.pending = {};
  return value;
}

async function readState() {
  try {
    return safeState(JSON.parse(await fs.readFile(statePath, 'utf8')));
  } catch (error) {
    if (error?.code === 'ENOENT') return { lastBlock: null, processed: {}, pending: {} };
    // Never erase a corrupted worker cursor and silently replay or skip fees.
    throw error;
  }
}

async function writeState(state) {
  const temporary = `${statePath}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(state, null, 2) + '\n', {
    encoding: 'utf8', mode: 0o600,
  });
  await fs.rename(temporary, statePath);
}

async function start() {
  if (!process.env.ISSUER_PRIVATE_KEY) throw new Error('ISSUER_PRIVATE_KEY is required locally');
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 1000) {
    throw new Error('Receipt-worker interval must be >= 1000 ms');
  }
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  // Exclusive lock prevents multiple workers from spending issuer gas for the
  // same paid event. A stale lock after a crash needs an operator to verify
  // process state and remove it manually; never auto-steal a lock.
  const lock = await fs.open(lockPath, 'wx', 0o600);
  try {
    await lock.writeFile(`pid=${process.pid}\n`, 'utf8');
    const provider = new JsonRpcProvider(rpcUrl, Number(chainId));
    if ((await provider.getNetwork()).chainId !== chainId) throw new Error('Chain ID mismatch');
    const signer = new Wallet(process.env.ISSUER_PRIVATE_KEY, provider);
    const issuer = getAddress(signer.address);
    const payment = new Contract(paymentAddress, paymentAbi, provider);
    const verification = new Contract(verificationAddress, verificationAbi, signer);
    if (!(await verification.issuers(issuer))) {
      throw new Error('Configured issuer wallet is not authorized on-chain');
    }

    for (;;) {
      try {
        const result = await processWindow({
          latestBlock: await provider.getBlockNumber(),
          state: await readState(),
          getEvents: (from, to) => payment.queryFilter(payment.filters.FeePaid(), from, to),
          getDocument: (id) => verification.getDocument(id),
          registerDocument: (id) => verification.registerDocument(id, id, ZeroHash),
          getRegistrationReceipt: (hash) => provider.getTransactionReceipt(hash),
          saveState: writeState,
        });
        if (result.status !== 'idle' && result.processed > 0) {
          console.log(JSON.stringify({ status: result.status, cursor: result.cursor,
            count: result.processed, issuer }));
        }
      } catch (error) {
        // Failed/unconfirmed paid events are retained for retry; cursor does
        // not advance past them. Never log private keys or transaction inputs.
        console.error('receipt-worker cycle failed; cursor preserved:', error?.message ||
          String(error));
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  } finally {
    await lock.close();
    await fs.unlink(lockPath).catch(() => {});
  }
}

start().catch((error) => {
  console.error('receipt-worker stopped:', error?.message || String(error));
  process.exitCode = 1;
});
