import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import { ContractFactory, JsonRpcProvider, Wallet, getAddress } from 'ethers';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const envFlag = process.argv.indexOf('--environment');
const environment = process.env.DEPLOY_ENV || (envFlag >= 0 ? process.argv[envFlag + 1] : 'staging');
const production = environment === 'production';
const dryRun = args.has('--dry-run') || !process.env.DEPLOYER_PRIVATE_KEY;
const required = (name) => { if (!process.env[name]) throw new Error(`${name} is required`); return process.env[name]; };

try {
  if (production && !args.has('--confirm-mainnet')) throw new Error('Production deployment requires --confirm-mainnet');
  const rpcUrl = required('RPC_URL');
  const expectedChainId = BigInt(required('CHAIN_ID'));
  const owner = getAddress(process.env.DOCUMENT_OWNER || '0xb6E21d958893601F4A90A71eCD41547D54C0B844');
  const artifactPath = path.resolve(here, process.env.VERIFICATION_ARTIFACT || '../../../artifacts/DocumentVerification.json');
  const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
  const artifactSha256 = crypto.createHash('sha256').update(JSON.stringify(artifact)).digest('hex');
  const provider = new JsonRpcProvider(rpcUrl, Number(expectedChainId));
  const network = await provider.getNetwork();
  if (network.chainId !== expectedChainId) throw new Error(`Chain ID mismatch: expected ${expectedChainId}, got ${network.chainId}`);
  let deployerAddress = null;
  let balance = 0n;
  if (!dryRun) {
    const deployer = new Wallet(required('DEPLOYER_PRIVATE_KEY'), provider);
    deployerAddress = deployer.address;
    if (getAddress(deployerAddress) !== getAddress(process.env.DEPLOYER_ADDRESS || deployerAddress)) throw new Error('DEPLOYER_ADDRESS does not match private key');
    if (getAddress(deployerAddress) !== owner) throw new Error('Owner must match the approved deployer/issuer address');
    balance = await provider.getBalance(deployerAddress);
  }
  console.log(JSON.stringify({ environment, chainId: network.chainId.toString(), owner, artifactSha256, deployerAddress, deployerBalanceWei: balance.toString(), dryRun }, null, 2));
  if (dryRun) { console.log('Dry run complete. No transaction was signed or broadcast.'); process.exit(0); }
  const deployer = new Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const contract = await new ContractFactory(artifact.abi, artifact.bytecode, deployer).deploy(owner);
  console.log(`deploymentTx=${contract.deploymentTransaction().hash}`);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const setIssuer = await contract.setIssuer(owner, true);
  console.log(`issuerTx=${setIssuer.hash}`);
  await setIssuer.wait();
  console.log(JSON.stringify({ contractAddress: address, deploymentTx: contract.deploymentTransaction().hash, issuerTx: setIssuer.hash, owner, chainId: expectedChainId.toString(), artifactSha256 }, null, 2));
} catch (error) { console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }
