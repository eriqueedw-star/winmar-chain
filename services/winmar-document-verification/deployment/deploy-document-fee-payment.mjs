import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { ContractFactory, JsonRpcProvider, Wallet, getAddress, parseUnits } from 'ethers';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const environmentFlag = process.argv.indexOf('--environment');
const environment = process.env.DEPLOY_ENV || (environmentFlag >= 0 ? process.argv[environmentFlag + 1] : 'staging');
const dryRun = args.has('--dry-run') || !process.env.DEPLOYER_PRIVATE_KEY;
const mainnet = environment === 'production';

function required(name, value) { if (!value) throw new Error(`${name} is required`); return value; }
function die(message) { console.error(`ERROR: ${message}`); process.exitCode = 1; }

try {
  const rpcUrl = required('RPC_URL', process.env.RPC_URL);
  const expectedChainId = BigInt(required('CHAIN_ID', process.env.CHAIN_ID));
  const treasury = getAddress(required('DOCUMENT_FEE_TREASURY', process.env.DOCUMENT_FEE_TREASURY));
  const feeWei = BigInt(required('DOCUMENT_FEE_WEI', process.env.DOCUMENT_FEE_WEI));
  if (feeWei !== parseUnits('0.0021', 18)) throw new Error('DOCUMENT_FEE_WEI must equal 0.0021 WMC for the initial release');
  if (mainnet && !args.has('--confirm-mainnet')) throw new Error('Production deployment requires --confirm-mainnet');
  const artifactPath = path.resolve(here, process.env.PAYMENT_ARTIFACT || '../../../artifacts/DocumentFeePayment.json');
  const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
  if (!artifact.abi || !artifact.bytecode) throw new Error('Artifact must contain abi and bytecode');
  const artifactHash = crypto.createHash('sha256').update(JSON.stringify(artifact)).digest('hex');
  const provider = new JsonRpcProvider(rpcUrl, Number(expectedChainId));
  const network = await provider.getNetwork();
  if (network.chainId !== expectedChainId) throw new Error(`Chain ID mismatch: expected ${expectedChainId}, got ${network.chainId}`);
  const feeData = await provider.getFeeData();
  const balance = dryRun ? 0n : await provider.getBalance(new Wallet(required('DEPLOYER_PRIVATE_KEY', process.env.DEPLOYER_PRIVATE_KEY)).address);
  console.log(JSON.stringify({ environment, chainId: network.chainId.toString(), treasury, feeWei: feeWei.toString(), feeWmc: '0.0021', artifactSha256: artifactHash, gasPrice: feeData.gasPrice?.toString() ?? null, deployerBalanceWei: balance.toString(), dryRun }, null, 2));
  if (dryRun) { console.log('Dry run complete. No transaction was signed or broadcast.'); process.exit(0); }
  const deployer = new Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, deployer);
  const contract = await factory.deploy(treasury, feeWei);
  console.log(`deploymentTx=${contract.deploymentTransaction().hash}`);
  await contract.waitForDeployment();
  console.log(JSON.stringify({ contractAddress: await contract.getAddress(), deploymentTx: contract.deploymentTransaction().hash, chainId: expectedChainId.toString(), treasury, feeWei: feeWei.toString(), artifactSha256: artifactHash }, null, 2));
} catch (error) { die(error instanceof Error ? error.message : String(error)); }
