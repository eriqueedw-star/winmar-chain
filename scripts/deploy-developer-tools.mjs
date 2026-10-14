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

if (!['token-factory', 'faucet-v2', 'all'].includes(component)) {
  throw new Error('WINMAR_DEPLOY_COMPONENT must be token-factory, faucet-v2, or all.');
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

const shouldDeployFactory = component === 'token-factory' || component === 'all';
const shouldDeployFaucet = component === 'faucet-v2' || component === 'all';
const factoryArtifact = shouldDeployFactory
  ? artifact('contracts_WinmarTokenFactory_sol_WinmarTokenFactory')
  : null;
const faucetArtifact = shouldDeployFaucet
  ? artifact('contracts_WinmarFaucetV2_sol_WinmarFaucetV2')
  : null;

if (shouldDeployFaucet) {
  const expectedAdmin = process.env.WINMAR_FAUCET_EXPECTED_ADMIN;
  if (!expectedAdmin || !/^0x[0-9a-fA-F]{40}$/.test(expectedAdmin)) {
    throw new Error('WINMAR_FAUCET_EXPECTED_ADMIN must be set to the reviewed faucet admin address.');
  }
  if (deployer.toLowerCase() !== expectedAdmin.toLowerCase()) {
    throw new Error(`Faucet V2 must be deployed by expected admin ${expectedAdmin}; current deployer is ${deployer}.`);
  }
  const intendedClaimAmount = parseEther('0.00001');
  const intendedDailyCap = parseEther('10');
  if (parseEther(process.env.WINMAR_FAUCET_CLAIM_AMOUNT || '0.00001') !== intendedClaimAmount ||
      parseEther(process.env.WINMAR_FAUCET_DAILY_CAP || '10') !== intendedDailyCap) {
    throw new Error('Faucet V2 deployment is locked to 0.00001 WMC per claim and 10 WMC per UTC day.');
  }
}

console.log(`Deploying to Winmar Chain mainnet ${MAINNET_CHAIN_ID} from ${deployer}`);

let factoryResult = null;
if (shouldDeployFactory) {
  const factory = await new ContractFactory(factoryArtifact.abi, factoryArtifact.bytecode, wallet).deploy();
  await factory.waitForDeployment();
  factoryResult = {
    address: await factory.getAddress(),
    transactionHash: factory.deploymentTransaction()?.hash || null,
  };
}

let faucetResult = null;
if (shouldDeployFaucet) {
  const claimAmount = parseEther(process.env.WINMAR_FAUCET_CLAIM_AMOUNT || '0.00001');
  const dailyCap = parseEther(process.env.WINMAR_FAUCET_DAILY_CAP || '10');
  const faucet = await new ContractFactory(faucetArtifact.abi, faucetArtifact.bytecode, wallet).deploy(
    deployer,
    claimAmount,
    dailyCap
  );
  await faucet.waitForDeployment();
  const faucetAddress = await faucet.getAddress();
  const [onchainAdmin, onchainClaimAmount, onchainDailyCap, onchainPaused, runtimeCode] = await Promise.all([
    faucet.admin(),
    faucet.claimAmount(),
    faucet.dailyCap(),
    faucet.paused(),
    provider.getCode(faucetAddress),
  ]);
  if (onchainAdmin.toLowerCase() !== deployer.toLowerCase()) throw new Error('Deployed faucet admin does not match deployer.');
  if (onchainClaimAmount !== claimAmount || onchainDailyCap !== dailyCap) throw new Error('Deployed faucet parameters differ from requested settings.');
  if (!onchainPaused || runtimeCode === '0x') throw new Error('Deployed faucet must have runtime code and start paused.');
  faucetResult = {
    address: faucetAddress,
    transactionHash: faucet.deploymentTransaction()?.hash || null,
    claimAmountWei: claimAmount.toString(),
    dailyCapWei: dailyCap.toString(),
    oneClaimPerWallet: true,
    initiallyPaused: true,
    funded: false
  };
}

const result = {
  network: { name: 'Winmar Chain', chainId: expectedChainId.toString(), rpcUrl, rpcBackupUrl },
  deployer,
  tokenFactory: factoryResult,
  component,
  faucet: faucetResult,
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
