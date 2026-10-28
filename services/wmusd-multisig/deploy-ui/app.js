import EthereumProvider from "https://esm.sh/@walletconnect/ethereum-provider@2.21.6";
import { BrowserProvider } from "https://esm.sh/ethers@6.15.0";
import { WALLETCONNECT_PROJECT_ID } from "./config.js";

const status = document.querySelector("#status");
const signers = document.querySelector("#signers");
const connectButtons = [document.querySelector("#connect1"), document.querySelector("#connect2")];
const applyButtons = [document.querySelector("#apply1"), document.querySelector("#apply2")];
const applyStatus = document.querySelector("#applyStatus");
const signerAddresses = [null, null];
const signedAddresses = [false, false];

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

async function connect(slot) {
  status.textContent = `Opening WalletConnect for Signer ${slot + 1}…`;
  if (provider.session) {
    await provider.disconnect();
  }
  await provider.connect();
  const chain = await provider.request({ method: "eth_chainId" });
  if (BigInt(chain) !== 12142816n) throw new Error(`Wrong network: ${chain}`);
  const browser = new BrowserProvider(provider);
  const signer = await browser.getSigner();
  const connectedAddress = await signer.getAddress();
  const address = connectedAddress.toLowerCase();
  const otherSlot = slot === 0 ? 1 : 0;
  if (signerAddresses[otherSlot] === address) {
    throw new Error(`This wallet is already assigned to Signer ${otherSlot + 1}. Switch SafePal account first.`);
  }
  signerAddresses[slot] = address;
  renderSigners();
  status.textContent = `${signerAddresses.filter(Boolean).length}/2 signer wallets connected.`;
  connectButtons[slot].textContent = `Reconnect Signer ${slot + 1}`;
  applyButtons[slot].disabled = signedAddresses[slot];
  applyStatus.textContent = signerAddresses.every(Boolean)
    ? "Both signers connected. Approve each signer separately."
    : "Connect both signer wallets.";
}

function renderSigners() {
  signers.innerHTML = "";
  signerAddresses.forEach((wallet, index) => {
    const row = document.createElement("p");
    const state = signedAddresses[index] ? " — approved" : wallet ? " — waiting for approval" : " — not connected";
    row.innerHTML = `<b>Signer ${index + 1}${state}</b><br><code>${wallet || "—"}</code>`;
    signers.append(row);
  });
}

connectButtons.forEach((button, slot) => button.addEventListener("click", () => connect(slot).catch((error) => {
  status.textContent = error?.message || "Wallet connection failed";
})));

applyButtons.forEach((button, slot) => button.addEventListener("click", () => {
  requestApproval(slot).catch((error) => {
    button.disabled = false;
    applyStatus.textContent = error?.message || "Signature request was rejected.";
  });
}));

async function requestApproval(slot) {
  const address = signerAddresses[slot];
  if (!address) throw new Error(`Connect Signer ${slot + 1} first.`);
  if (signedAddresses[slot]) throw new Error(`Signer ${slot + 1} already approved.`);
  applyButtons[slot].disabled = true;
  applyStatus.textContent = `Signature request sent for Signer ${slot + 1}. Approve it in SafePal…`;
  const message = `Winmar 2-of-2 signer approval\nChain ID: 12142816\nSigner ${slot + 1}: ${address}`;
  await provider.request({
    method: "personal_sign",
    params: [message, address],
  });
  signedAddresses[slot] = true;
  renderSigners();
  const signed = signedAddresses.filter(Boolean).length;
  applyStatus.textContent = signed === 2
    ? "Both signer approvals received. Ready for the separately reviewed deployment transaction."
    : `Signer ${slot + 1} approved. Approve the other signer (${signed}/2).`;
}
