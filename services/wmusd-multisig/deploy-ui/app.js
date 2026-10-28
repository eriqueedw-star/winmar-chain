import EthereumProvider from "https://esm.sh/@walletconnect/ethereum-provider@2.21.6";
import { BrowserProvider } from "https://esm.sh/ethers@6.15.0";
import { WALLETCONNECT_PROJECT_ID } from "./config.js";

const status = document.querySelector("#status");
const button = document.querySelector("#connect");
const signers = document.querySelector("#signers");
const applyButton = document.querySelector("#apply");
const applyStatus = document.querySelector("#applyStatus");
const signerAddresses = new Set();
const signedAddresses = new Set();
let currentAddress = "";

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
  if (signerAddresses.size > 0 && provider.session) {
    await provider.disconnect();
  }
  await provider.connect();
  const chain = await provider.request({ method: "eth_chainId" });
  if (BigInt(chain) !== 12142816n) throw new Error(`Wrong network: ${chain}`);
  const browser = new BrowserProvider(provider);
  const signer = await browser.getSigner();
  const connectedAddress = await signer.getAddress();
  currentAddress = connectedAddress.toLowerCase();
  signerAddresses.add(connectedAddress.toLowerCase());
  renderSigners();
  status.textContent = `${signerAddresses.size}/2 signer wallet connected. Review every transaction in the wallet.`;
  button.textContent = signerAddresses.size < 2 ? "Connect second SafePal wallet" : "Reconnect signer wallet";
  applyButton.disabled = signerAddresses.size !== 2;
  applyStatus.textContent = signerAddresses.size === 2
    ? "Both signers connected. Click Apply to request the active wallet signature."
    : "Waiting for both signer wallets.";
}

function renderSigners() {
  signers.innerHTML = "";
  [...signerAddresses].forEach((wallet, index) => {
    const row = document.createElement("p");
    row.innerHTML = `<b>Signer ${index + 1}</b><br><code>${wallet}</code>`;
    signers.append(row);
  });
}

applyButton.addEventListener("click", () => {
  requestApproval().catch((error) => {
    applyButton.disabled = false;
    applyStatus.textContent = error?.message || "Signature request was rejected.";
  });
});

async function requestApproval() {
  if (signerAddresses.size !== 2 || !currentAddress) return;
  applyButton.disabled = true;
  applyStatus.textContent = "Signature request sent. Approve it in the active SafePal wallet…";
  const message = `Winmar 2-of-2 signer approval\nChain ID: 12142816\nSigner: ${currentAddress}`;
  await provider.request({
    method: "personal_sign",
    params: [message, currentAddress],
  });
  signedAddresses.add(currentAddress);
  const signed = signedAddresses.size;
  applyStatus.textContent = signed === 2
    ? "Both signer approvals received. Ready for the separately reviewed deployment transaction."
    : `Approval received from ${currentAddress}. Connect the other signer and apply again (${signed}/2).`;
  applyButton.disabled = signed === 2;
}

button.addEventListener("click", () => connect().catch((error) => {
  status.textContent = error?.message || "Wallet connection failed";
}));
