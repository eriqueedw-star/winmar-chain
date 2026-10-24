import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { JsonRpcProvider, Wallet, ContractFactory, getAddress } from 'ethers';

const repo = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const artifactPath = path.join(repo, 'artifacts', 'WMUSD.json');
const isDryRun = process.argv.includes('--dry-run');
const environment = process.env.DEPLOY_ENV || 'staging';
const expectedChainId = BigInt(process.env.CHAIN_ID || (environment === 'staging' ? '12142818' : '12142816'));
const rpcUrl = process.env.RPC_URL || (environment === 'staging' ? 'http://127.0.0.1:18545' : 'https://rpc.winmarchain.io/');

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for WMUSD deployment`);
  return value;
}

const artifact = JSON.parse(await fs.readFile(artifactPath, 'utf8'));
if (!artifact.abi?.length || !artifact.bytecode?.startsWith('0x')) throw new Error('Invalid WMUSD artifact');

const provider = new JsonRpcProvider(rpcUrl, Number(expectedChainId), { staticNetwork: true });
const network = await provider.getNetwork();
if (network.chainId !== expectedChainId) throw new Error(`Chain ID mismatch: expected ${expectedChainId}, got ${network.chainId}`);

const admin = getAddress(required('WMUSD_ADMIN'));
const minter = getAddress(required('WMUSD_MINTER'));
const burner = getAddress(required('WMUSD_BURNER'));
const pauser = getAddress(required('WMUSD_PAUSER'));
const constructorArgs = [admin, minter, burner, pauser, 0n];

console.log(JSON.stringify({ environment, rpcUrl, chainId: expectedChainId.toString(), admin, minter, burner, pauser, initialMintCap: '0', mintingEnabled: false, dryRun: isDryRun }, null, 2));
if (isDryRun) process.exit(0);
if (environment !== 'staging') throw new Error('This script only permits staging deployment. Mainnet requires a separate reviewed release process.');
const deployer = new Wallet(required('DEPLOYER_PRIVATE_KEY'), provider);
const factory = new ContractFactory(artifact.abi, artifact.bytecode, deployer);
const contract = await factory.deploy(...constructorArgs);
await contract.waitForDeployment();
console.log(`WMUSD staging address: ${await contract.getAddress()}`);
console.log('Minting remains disabled and mintCap remains 0.');
