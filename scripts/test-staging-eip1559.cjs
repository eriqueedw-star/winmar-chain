const { JsonRpcProvider, Wallet, parseUnits } = require('../Fansverse/node_modules/ethers');

const rpc = process.env.WMC_STAGING_RPC || 'http://127.0.0.1:8545';
const privateKey = process.env.WMC_STAGING_PRIVATE_KEY;
if (!privateKey) throw new Error('WMC_STAGING_PRIVATE_KEY is required and must not be committed');

async function main() {
  const provider = new JsonRpcProvider(rpc, 12142817);
  const wallet = new Wallet(privateKey, provider);
  const before = await provider.getBlock('latest');
  if (!before?.baseFeePerGas) throw new Error('Latest staging block has no base fee');

  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: 0,
    maxPriorityFeePerGas: parseUnits('0.1', 'gwei'),
    maxFeePerGas: parseUnits('2', 'gwei'),
  });
  const receipt = await tx.wait();
  const block = await provider.getBlock(receipt.blockNumber);
  console.log(JSON.stringify({
    hash: receipt.hash,
    block: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    effectiveGasPrice: receipt.gasPrice?.toString(),
    baseFeePerGas: block?.baseFeePerGas?.toString(),
    proposer: block?.miner,
  }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
