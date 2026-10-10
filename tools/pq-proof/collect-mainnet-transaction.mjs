import fs from 'node:fs';

const RPC_URL = process.env.WINMAR_RPC_URL || 'https://rpc.winmarchain.io';
const EXPECTED_CHAIN_ID = 12142816n;
const MAX_SCAN = Number(process.env.WINMAR_PQ_SCAN_BLOCKS || 256);

async function rpc(method, params = []) {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`RPC ${method} failed: ${JSON.stringify(body.error)}`);
  return body.result;
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
    const tx = block.transactions[0];
    found = {
      rpcUrl: RPC_URL,
      chainId: Number(chainId),
      observedAt: new Date().toISOString(),
      blockNumber: Number(BigInt(block.number)),
      blockHash: block.hash,
      txHash: tx.hash,
      from: tx.from,
      to: tx.to,
      nonce: BigInt(tx.nonce).toString(),
      txType: tx.type ?? null,
    };
    break;
  }
}

if (!found) {
  throw new Error(`no transaction found in latest ${MAX_SCAN} blocks`);
}

fs.mkdirSync('evidence', { recursive: true });
fs.writeFileSync('evidence/live-mainnet-transaction.json', JSON.stringify(found, null, 2) + '\n');
console.log(JSON.stringify(found, null, 2));
