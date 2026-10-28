import EthereumProvider from "https://esm.sh/@walletconnect/ethereum-provider@2.21.6";
import { BrowserProvider } from "https://esm.sh/ethers@6.15.0";
import { WALLETCONNECT_PROJECT_ID } from "./config.js";

const status = document.querySelector("#status");
const address = document.querySelector("#address");
const button = document.querySelector("#connect");

const provider = await EthereumProvider.init({
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [12142816],
  optionalChains: [12142816],
  rpcMap: { 12142816: "https://rpc.winmarchain.io" },
  showQrModal: true,
  metadata: {
    name: "Winmar Multisig Deployment",
    description: "Winmar Chain deployment approval",
    url: window.location.origin,
    icons: ["https://winmarchain.io/favicon.ico"],
  },
});

async function connect() {
  status.textContent = "Opening WalletConnect…";
  await provider.connect();
  const chain = await provider.request({ method: "eth_chainId" });
  if (chain !== "0xb948e0") throw new Error(`Wrong network: ${chain}`);
  const browser = new BrowserProvider(provider);
  const signer = await browser.getSigner();
  address.textContent = await signer.getAddress();
  status.textContent = "SafePal connected on Winmar Chain. Review every transaction in the wallet.";
}

button.addEventListener("click", () => connect().catch((error) => {
  status.textContent = error?.message || "Wallet connection failed";
}));
