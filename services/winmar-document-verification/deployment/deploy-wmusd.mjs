import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { JsonRpcProvider, Wallet, ContractFactory, getAddress } from 'ethers';

const repo = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const artifactPath = path.join(repo, 'artifacts', 'WMUSD.json');
const isDryRun = process.argv.includes('--dry-run');
const environment = process.env.DEPLOY_ENV || 'staging';
const expectedChainId = 12142818n;
if (environment !== 'staging' || (process.env.CHAIN_ID && BigInt(process.env.CHAIN_ID) !== expectedChainId)) {
  throw new Error('WMUSD pre-launch deployment is staging-only (chain ID 12142818).');
}
const rpcUrl = process.env.RPC_URL || 'http://127.0.0.1:18545';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for WMUSD deployment`);
  return value;
}

const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
if (!artifact.abi?.length || !artifact.bytecode?.startsWith('0x')) throw new Error('Invalid WMUSD artifact');

const provider = new JsonRpcProvider(rpcUrl);
const network = { chainId: BigInt(await provider.send('eth_chainId', [])) };
if (network.chainId !== expectedChainId) throw new Error(`Chain ID mismatch: expected ${expectedChainId}, got ${network.chainId}`);

const admin = getAddress(required('WMUSD_ADMIN'));
const minter = getAddress(required('WMUSD_MINTER'));
const burner = getAddress(required('WMUSD_BURNER'));
const pauser = getAddress(required('WMUSD_PAUSER'));
const constructorArgs = [admin, minter, burner, pauser, 0n];

console.log(JSON.stringify({ environment, chainId: expectedChainId.toString(), admin, minter, burner, pauser, initialMintCap: '0', mintingEnabled: false, redemptionEnabled: false, distributionEnabled: false, dryRun: isDryRun }, null, 2));
if (isDryRun) process.exit(0);
const deployer = new Wallet(required('DEPLOYER_PRIVATE_KEY'), provider);
const factory = new ContractFactory(artifact.abi, artifact.bytecode, deployer);
const contract = await factory.deploy(...constructorArgs);
await contract.waitForDeployment();
console.log(`WMUSD staging address: ${await contract.getAddress()}`);
console.log('Minting remains disabled and mintCap remains 0.');
