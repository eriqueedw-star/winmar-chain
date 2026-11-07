import fs from "node:fs";
import { ContractFactory, JsonRpcProvider, Wallet, keccak256 } from "ethers";

const RPC = "https://rpc.winmarchain.io";
const EXPECTED_CHAIN_ID = 12142816n;

// Exact Sourcify storage.artifact.json creation bytecode.
// Compiler: 0.8.7+commit.e28d00a7
// EVM: london
// Optimizer: disabled
const BYTECODE =
  "0x608060405234801561001057600080fd5b50610150806100206000396000f3fe60806040523480156100105760003560e01c80632e64cec11461003b5780636057361d14610059575b600080fd5b610043610075565b60405161005091906100d9565b60405180910390f35b610073600480360381019061006e919061009d565b61007e565b005b60008054905090565b8060008190555050565b60008135905061009781610103565b92915050565b6000602082840312156100b3576100b26100fe565b5b60006100c184828501610088565b91505092915050565b6100d3816100f4565b82525050565b60006020820190506100ee60008301846100ca565b92915050565b6000819050919050565b600080fd5b61010c816100f4565b811461011757600080fd5b5056fea2646970667358221220404e37f487a89a932dca5e77faaf6ca2de3b991f93d230604b1b8daaef64766264736f6c63430008070033";

const ABI = [
  {
    inputs: [],
    name: "retrieve",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "num", type: "uint256" }],
    name: "store",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

const broadcast = process.argv.includes("--broadcast");
const provider = new JsonRpcProvider(RPC);
const network = await provider.getNetwork();

if (network.chainId !== EXPECTED_CHAIN_ID) {
  throw new Error(`Refusing deployment: RPC returned chainId ${network.chainId}, expected ${EXPECTED_CHAIN_ID}`);
}

const summary = {
  network: "Winmar Chain",
  chainId: Number(network.chainId),
  rpc: RPC,
  bytecodeKeccak256: keccak256(BYTECODE),
  sourcifyCompiler: "0.8.7+commit.e28d00a7",
  evmVersion: "london",
  optimizerEnabled: false,
  broadcast
};

if (!broadcast) {
  console.log(JSON.stringify({
    ...summary,
    status: "DRY_RUN_ONLY",
    next: "Set SOURCIFY_DEPLOYER_PRIVATE_KEY and rerun with --broadcast to deploy exactly one Storage fixture contract."
  }, null, 2));
  process.exit(0);
}

const privateKey = process.env.SOURCIFY_DEPLOYER_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("SOURCIFY_DEPLOYER_PRIVATE_KEY is required only when --broadcast is supplied");
}

const wallet = new Wallet(privateKey, provider);
const balance = await provider.getBalance(wallet.address);
if (balance === 0n) {
  throw new Error(`Deployer ${wallet.address} has zero WMC balance`);
}

const factory = new ContractFactory(ABI, BYTECODE, wallet);
const contract = await factory.deploy();
const tx = contract.deploymentTransaction();
if (!tx) throw new Error("Deployment transaction unavailable");

console.log(JSON.stringify({
  ...summary,
  status: "BROADCAST",
  deployer: wallet.address,
  transactionHash: tx.hash
}, null, 2));

await contract.waitForDeployment();
const address = await contract.getAddress();
const receipt = await tx.wait();

const result = {
  status: "DEPLOYED",
  chainId: Number(network.chainId),
  contractAddress: address,
  transactionHash: tx.hash,
  blockNumber: receipt?.blockNumber ?? null,
  sourcifyFixturePatch: {
    file: "tests/fixtures/storage-contract-chain-addresses.json",
    entry: { "12142816": address }
  }
};
console.log(JSON.stringify(result, null, 2));

const resultPath = process.env.SOURCIFY_DEPLOY_RESULT_PATH;
if (resultPath) {
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n", { mode: 0o600 });
}
