import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Contract, JsonRpcProvider, Wallet, getAddress, ZeroHash } from 'ethers';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const rpcUrl = process.env.RPC_URL || 'https://rpc.winmarchain.io/';
const chainId = BigInt(process.env.CHAIN_ID || '12142816');
const paymentAddress = getAddress(process.env.DOCUMENT_FEE_CONTRACT || '0xcEC232bd11F03006ECC80917F5cD55bBf247617D');
const verificationAddress = getAddress(process.env.DOCUMENT_VERIFICATION_CONTRACT || '0x53fB6ba2997A50d3ddFfF5395a3BB9b7b24B7AEF');
const intervalMs = Number(process.env.RECEIPT_WORKER_INTERVAL_MS || 5000);
const statePath = path.resolve(process.env.RECEIPT_WORKER_STATE || path.join(here, 'receipt-worker-state.json'));

const paymentAbi = ['event FeePaid(bytes32 indexed documentId,address indexed payer,address indexed treasury,uint256 amount)'];
const verificationAbi = ['function registerDocument(bytes32 documentId,bytes32 documentHash,bytes32 metadataHash) returns ()', 'function getDocument(bytes32 documentId) view returns (tuple(bytes32 documentHash,address issuer,uint64 issuedAt,uint64 revokedAt,bytes32 metadataHash))'];

async function readState() { try { return JSON.parse(await fs.readFile(statePath, 'utf8')); } catch { return { lastBlock: null, processed: {} }; } }
async function writeState(state) { await fs.writeFile(statePath, JSON.stringify(state, null, 2) + '\n', 'utf8'); }
async function main() {
  if (!process.env.ISSUER_PRIVATE_KEY) throw new Error('ISSUER_PRIVATE_KEY is required locally');
  const provider = new JsonRpcProvider(rpcUrl, Number(chainId));
  if ((await provider.getNetwork()).chainId !== chainId) throw new Error('Chain ID mismatch');
  const signer = new Wallet(process.env.ISSUER_PRIVATE_KEY, provider);
  const issuer = getAddress(signer.address);
  const payment = new Contract(paymentAddress, paymentAbi, provider);
  const verification = new Contract(verificationAddress, verificationAbi, signer);
  const state = await readState();
  const latest = await provider.getBlockNumber();
  const fromBlock = state.lastBlock == null ? Math.max(0, latest - 2000) : state.lastBlock + 1;
  if (fromBlock > latest) return console.log(JSON.stringify({ status: 'idle', latest, issuer }));
  const events = await payment.queryFilter(payment.filters.FeePaid(), fromBlock, latest);
  for (const event of events) {
    const documentId = event.args.documentId;
    const key = `${event.transactionHash}:${documentId}`;
    if (state.processed[key]) continue;
    try {
      await verification.getDocument(documentId);
      state.processed[key] = { status: 'already_registered', block: event.blockNumber };
      continue;
    } catch {}
    const tx = await verification.registerDocument(documentId, documentId, ZeroHash);
    await tx.wait(1);
    state.processed[key] = { status: 'registered', paymentTx: event.transactionHash, verificationTx: tx.hash, block: event.blockNumber };
    console.log(JSON.stringify({ status: 'registered', documentId, paymentTx: event.transactionHash, verificationTx: tx.hash }));
  }
  state.lastBlock = latest;
  await writeState(state);
}

async function loop() { for (;;) { try { await main(); } catch (error) { console.error(`receipt-worker error: ${error.message}`); } await new Promise((resolve) => setTimeout(resolve, intervalMs)); } }
loop();
