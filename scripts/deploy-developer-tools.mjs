import fs from 'node:fs';
import path from 'node:path';
import { JsonRpcProvider, Wallet, ContractFactory, parseEther } from 'ethers';

const MAINNET_CHAIN_ID = 12142816n;
const target = process.env.WINMAR_DEPLOY_TARGET || 'mainnet';
const component = process.env.WINMAR_DEPLOY_COMPONENT || 'token-factory';
const rpcUrl = process.env.WINMAR_DEPLOY_RPC_URL;
const rpcBackupUrl = process.env.WINMAR_DEPLOY_RPC_BACKUP_URL || '';
const expectedChainId = BigInt(process.env.WINMAR_DEPLOY_CHAIN_ID || '0');
const privateKey = process.env.WINMAR_DEPLOY_PRIVATE_KEY;
const artifactDir = process.env.WINMAR_ARTIFACT_DIR || 'build/developer-tools';
const outputFile = process.env.WINMAR_DEPLOYMENT_OUTPUT || 'deployments/developer-tools.json';

if (!rpcUrl || !privateKey || expectedChainId === 0n) {
  throw new Error('WINMAR_DEPLOY_RPC_URL, WINMAR_DEPLOY_CHAIN_ID, and WINMAR_DEPLOY_PRIVATE_KEY are required.');
}

if (target !== 'mainnet') {
  throw new Error('This deployment workflow is mainnet-only.');
}

if (!['token-factory', 'all'].includes(component)) {
  throw new Error('WINMAR_DEPLOY_COMPONENT must be token-factory or all.');
}

if (expectedChainId !== MAINNET_CHAIN_ID) {
  throw new Error(`Mainnet deployment requires Chain ID ${MAINNET_CHAIN_ID}. Received ${expectedChainId}.`);
}

const provider = new JsonRpcProvider(rpcUrl, Number(expectedChainId), { staticNetwork: true });
const network = await provider.getNetwork();
if (network.chainId !== expectedChainId) {
  throw new Error(`RPC chain ID ${network.chainId} does not match expected mainnet Chain ID ${expectedChainId}.`);
}

const wallet = new Wallet(privateKey, provider);
const deployer = await wallet.getAddress();
const balance = await provider.getBalance(deployer);
if (balance === 0n) {
  throw new Error(`Deployment wallet ${deployer} has zero WMC balance and cannot pay gas.`);
}

function artifact(name) {
  const prefix = path.join(artifactDir, name);
  const bytecode = fs.readFileSync(`${prefix}.bin`, 'utf8').trim();
  const abi = JSON.parse(fs.readFileSync(`${prefix}.abi`, 'utf8'));
  if (!bytecode) throw new Error(`Empty bytecode: ${prefix}.bin`);
  return { abi, bytecode: `0x${bytecode}` };
}

const factoryArtifact = artifact('contracts_WinmarTokenFactory_sol_WinmarTokenFactory');
const faucetArtifact = component === 'all'
  ? artifact('contracts_WinmarFaucet_sol_WinmarFaucet')
  : null;

console.log(`Deploying to Winmar Chain mainnet ${MAINNET_CHAIN_ID} from ${deployer}`);

const factory = await new ContractFactory(factoryArtifact.abi, factoryArtifact.bytecode, wallet).deploy();
await factory.waitForDeployment();
const factoryAddress = await factory.getAddress();

let faucetResult = null;
if (component === 'all') {
  const claimAmount = parseEther(process.env.WINMAR_FAUCET_CLAIM_AMOUNT || '0.1');
  const cooldown = BigInt(process.env.WINMAR_FAUCET_COOLDOWN_SECONDS || '86400');
  const dailyCap = parseEther(process.env.WINMAR_FAUCET_DAILY_CAP || '100');
  const faucet = await new ContractFactory(faucetArtifact.abi, faucetArtifact.bytecode, wallet).deploy(
    deployer,
    claimAmount,
    cooldown,
    dailyCap
  );
  await faucet.waitForDeployment();
  faucetResult = {
    address: await faucet.getAddress(),
    transactionHash: faucet.deploymentTransaction()?.hash || null,
    claimAmountWei: claimAmount.toString(),
    cooldownSeconds: cooldown.toString(),
    dailyCapWei: dailyCap.toString(),
    funded: false
  };
}

const result = {
  network: { name: 'Winmar Chain', chainId: expectedChainId.toString(), rpcUrl, rpcBackupUrl },
  deployer,
  tokenFactory: { address: factoryAddress, transactionHash: factory.deploymentTransaction()?.hash || null },
  component,
  faucet: faucetResult,
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
