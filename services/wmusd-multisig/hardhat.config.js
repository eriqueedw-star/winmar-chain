import mochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

export default {
  plugins: [mochaEthers],
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhatMainnet: { type: "edr-simulated", chainId: 12142816 },
    winmar: {
      type: "http",
      chainType: "l1",
      url: process.env.WINMAR_RPC_URL ?? "https://rpc.winmarchain.io",
      chainId: 12142816,
    },
  },
};
