import { PDFDocument } from 'pdf-lib';
import { makeVerifiedPdf } from './certificate-renderer.js';

const $ = (selector) => document.querySelector(selector);
const ui = {
  input: $('#file-input'), fileStatus: $('#file-status'), hash: $('#hash-value'),
  issue: $('#issue-button'), verify: $('#verify-button'), verifyInput: $('#document-id'),
  verifyResult: $('#verify-result'), preview: $('#document-preview'), pdfPreview: $('#pdf-preview'),
  documentId: $('#document-id-value'), verificationLink: $('#verification-link'),
  verificationUrl: $('#verification-url'), subject: $('#document-subject'), issuer: $('#document-issuer'),
  progress: $('#issue-progress'), progressText: $('#issue-progress-text'),
  download: $('#certificate-download'), rpcStatus: $('#rpc-status'),
  connect: $('#connect-wallet'), walletAddress: $('#wallet-address'),
  walletBalance: $('#wallet-balance'), walletNetwork: $('#wallet-network'),
  walletNote: $('#wallet-note'), menu: $('#menu-button'), drawer: $('#nav-drawer'),
  status: $('#status-value'),
};

const RPC_URL = 'https://rpc.winmarchain.io/';
const CHAIN_ID = '0xb948e0';
const FEE_CONTRACT = '0xcEC232bd11F03006ECC80917F5cD55bBf247617D';
const VERIFICATION_CONTRACT = '0x53fB6ba2997A50d3ddFfF5395a3BB9b7b24B7AEF';
const FEE_PAID_TOPIC = '0x3e8af3edd4cc6c38e4b22a0110ebdcaa13f693b0954b418c7fddcae70f8f864d';
const REGISTERED_TOPIC = '0x5b89de9f4846bfc83db0a655fd2c69d1a30f49b5f2b09c485c167d39374210f2';
const VERIFY_SELECTOR = '0xb10d6b41';
const EXPLORER_TX = 'https://scan.winmarchain.io/tx/';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let selectedFile = null;
let selectedHash = '';
let previewUrl = '';
let pendingPayment = null;
let confirmedRecord = null;
let fileSelectionVersion = 0;
let issuancePending = false;

function validHash(value) { return /^0x[0-9a-fA-F]{64}$/.test(value); }
function canIssue() {
  ui.issue.disabled = issuancePending || !(selectedFile && selectedHash && ui.subject.value.trim() && ui.issuer.value.trim()) || Boolean(confirmedRecord);
}
function setStatus(message, confirmed = false) {
  ui.status.textContent = message;
  ui.status.className = `status ${confirmed ? 'confirmed' : 'pending'}`;
}
function showProgress(message) { ui.progress.hidden = false; ui.progressText.textContent = message; }
function shortAddress(value) { return `${value.slice(0, 6)}…${value.slice(-4)}`; }
function weiToWmc(hex) {
  const amount = BigInt(hex);
  const whole = amount / 1000000000000000000n;
  const fraction = (amount % 1000000000000000000n).toString().padStart(18, '0').slice(0, 6).replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''} WMC`;
}

async function rpc(method, params = []) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(RPC_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`RPC returned HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.error) throw new Error(payload.error.message || 'RPC error');
    return payload.result;
  } finally { clearTimeout(timeout); }
}

async function checkChain() {
  const chain = await rpc('eth_chainId');
  if (chain.toLowerCase() !== CHAIN_ID) throw new Error('RPC is not connected to Winmar Chain Mainnet.');
}

async function refreshRpcStatus() {
  try {
    await checkChain();
    ui.rpcStatus.textContent = 'WINMAR CHAIN · RPC CONNECTED';
    ui.rpcStatus.className = 'environment rpc-status connected';
  } catch {
    ui.rpcStatus.textContent = 'WINMAR CHAIN · RPC OFFLINE';
    ui.rpcStatus.className = 'environment rpc-status disconnected';
  }
}

async function sha256(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return `0x${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function decodeDocument(result) {
  if (!/^0x[0-9a-fA-F]{320}$/.test(result || '')) throw new Error('Invalid verification record from RPC.');
  const words = result.slice(2).match(/.{64}/g);
  return {
    hash: `0x${words[0]}`,
    issuerWallet: `0x${words[1].slice(24)}`,
    issuedAt: Number(BigInt(`0x${words[2]}`)),
    revokedAt: Number(BigInt(`0x${words[3]}`)),
  };
}

async function getDocument(documentId) {
  const result = await rpc('eth_call', [{ to: VERIFICATION_CONTRACT, data: `${VERIFY_SELECTOR}${documentId.slice(2)}` }, 'latest']);
  return decodeDocument(result);
}

async function walletAccount() {
  if (!window.ethereum) throw new Error('No compatible wallet was found. Open this page in a browser with an EVM wallet.');
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts?.[0]) throw new Error('Select a wallet account first.');
  const chain = await window.ethereum.request({ method: 'eth_chainId' });
  if (chain.toLowerCase() !== CHAIN_ID) throw new Error('Switch your wallet to Winmar Chain Mainnet first.');
  return accounts[0];
}

async function waitForReceipt(txHash, attempts = 50) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const receipt = await rpc('eth_getTransactionReceipt', [txHash]);
    if (receipt) return receipt;
    await wait(3000);
  }
  throw new Error('Transaction is still pending. Keep its hash and resume verification here.');
}

function confirmFeeReceipt(receipt, documentId, payer) {
  if (receipt.status !== '0x1' || receipt.to?.toLowerCase() !== FEE_CONTRACT.toLowerCase()) {
    throw new Error('Document payment was not confirmed by the fee contract.');
  }
  const paid = receipt.logs?.some((log) =>
    log.address?.toLowerCase() === FEE_CONTRACT.toLowerCase() &&
    log.topics?.[0]?.toLowerCase() === FEE_PAID_TOPIC &&
    log.topics?.[1]?.toLowerCase() === documentId.toLowerCase() &&
    log.topics?.[2]?.slice(-40).toLowerCase() === payer.slice(2).toLowerCase());
  if (!paid) throw new Error('FeePaid event does not match this PDF and wallet.');
}

async function waitForRegistration(documentId, fromBlock) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const logs = await rpc('eth_getLogs', [{
      address: VERIFICATION_CONTRACT,
      fromBlock, toBlock: 'latest', topics: [REGISTERED_TOPIC, documentId],
    }]);
    const log = logs?.find((entry) => entry.topics?.[2]?.toLowerCase() === documentId.toLowerCase());
    if (log) {
      const receipt = await rpc('eth_getTransactionReceipt', [log.transactionHash]);
      if (receipt?.status !== '0x1') throw new Error('Document registration transaction failed.');
      const record = await getDocument(documentId);
      if (record.hash.toLowerCase() !== documentId.toLowerCase() || record.revokedAt !== 0) {
        throw new Error('The registered fingerprint is missing or revoked.');
      }
      const block = await rpc('eth_getBlockByNumber', [log.blockNumber, false]);
      const blockTimestamp = Number(BigInt(block.timestamp));
      if (record.issuedAt !== blockTimestamp) throw new Error('Registration timestamp does not match its block.');
      return { registrationTx: log.transactionHash, blockNumber: Number(BigInt(log.blockNumber)), issuedAt: record.issuedAt, issuerWallet: record.issuerWallet };
    }
    await wait(3000);
  }
  throw new Error('Payment confirmed; registration is still pending. Use Resume verification to check again.');
}

function resetForFile() {
  selectedFile = null;
  selectedHash = '';
  pendingPayment = null;
  confirmedRecord = null;
  ui.download.hidden = true;
  ui.verificationLink.hidden = true;
  ui.preview.hidden = true;
  ui.progress.hidden = true;
  setStatus('Not issued');
  ui.issue.textContent = 'Generate Document';
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = '';
  ui.pdfPreview.removeAttribute('src');
  canIssue();
}

ui.input.addEventListener('change', async () => {
  const version = ++fileSelectionVersion;
  resetForFile();
  const file = ui.input.files?.[0];
  if (!file) { ui.fileStatus.textContent = 'No document selected'; return; }
  if (!file.size || file.size > 10 * 1024 * 1024) { ui.fileStatus.textContent = 'PDF must be between 1 byte and 10 MB.'; return; }
  try {
    const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    if (version !== fileSelectionVersion) return;
    if (String.fromCharCode(...header) !== '%PDF-') throw new Error('Only valid PDF files are accepted.');
    const pdf = await PDFDocument.load(await file.arrayBuffer());
    if (version !== fileSelectionVersion) return;
    if (!pdf.getPageCount()) throw new Error('This PDF has no pages.');
    const digest = await sha256(file);
    if (version !== fileSelectionVersion) return;
    selectedHash = digest;
    selectedFile = file;
    ui.fileStatus.textContent = `Selected: ${file.name} (${Math.ceil(file.size / 1024)} KB · ${pdf.getPageCount()} pages)`;
    ui.hash.textContent = selectedHash;
    ui.documentId.textContent = selectedHash;
    previewUrl = URL.createObjectURL(file);
    ui.pdfPreview.src = previewUrl;
    ui.preview.hidden = false;
    canIssue();
    ui.preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    if (version !== fileSelectionVersion) return;
    ui.fileStatus.textContent = error.message || 'This PDF could not be opened.';
    ui.hash.textContent = 'Waiting for PDF';
    ui.documentId.textContent = 'Waiting for PDF';
  }
});

[ui.subject, ui.issuer].forEach((field) => field.addEventListener('input', canIssue));

ui.issue.addEventListener('click', async () => {
  if (issuancePending || !selectedFile || !selectedHash || !ui.subject.value.trim() || !ui.issuer.value.trim()) return;
  issuancePending = true;
  const submittedHash = selectedHash;
  ui.input.disabled = true;
  ui.subject.readOnly = true;
  ui.issuer.readOnly = true;
  ui.issue.disabled = true;
  ui.download.hidden = true;
  try {
    await checkChain();
    let payment = pendingPayment;
    if (!payment) {
      const payer = await walletAccount();
      const [feeCode, verificationCode, feeResult] = await Promise.all([
        rpc('eth_getCode', [FEE_CONTRACT, 'latest']),
        rpc('eth_getCode', [VERIFICATION_CONTRACT, 'latest']),
        rpc('eth_call', [{ to: FEE_CONTRACT, data: '0xe22efe1b' }, 'latest']),
      ]);
      if (feeCode === '0x' || verificationCode === '0x') throw new Error('Verification contracts are unavailable on this network.');
      const fee = BigInt(feeResult);
      if (fee <= 0n) throw new Error('The document fee is unavailable.');
      showProgress('Confirm the document transaction in your wallet…');
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction', params: [{
          from: payer, to: FEE_CONTRACT, value: `0x${fee.toString(16)}`,
          data: `0x8609cad1${selectedHash.slice(2)}`,
        }],
      });
      payment = { txHash, payer, documentId: selectedHash };
      pendingPayment = payment;
      ui.input.disabled = true;
      ui.subject.readOnly = true;
      ui.issuer.readOnly = true;
      setStatus(`Payment submitted · ${txHash.slice(0, 12)}…`);
    }
    showProgress('Confirming payment on Winmar Chain…');
    const paymentReceipt = await waitForReceipt(payment.txHash);
    confirmFeeReceipt(paymentReceipt, payment.documentId, payment.payer);
    showProgress('Payment confirmed. Waiting for document registration…');
    ui.issue.textContent = 'Recording on Winmar Chain…';
    const registration = await waitForRegistration(payment.documentId, paymentReceipt.blockNumber);
    confirmedRecord = {
      ...registration, documentId: payment.documentId,
      subject: ui.subject.value.trim(), issuer: ui.issuer.value.trim(),
      explorerUrl: `${EXPLORER_TX}${registration.registrationTx}`,
    };
    ui.verificationUrl.href = confirmedRecord.explorerUrl;
    ui.verificationUrl.textContent = confirmedRecord.explorerUrl;
    ui.verificationLink.hidden = false;
    ui.download.hidden = false;
    ui.issue.textContent = 'Document Recorded';
    ui.progress.hidden = true;
    setStatus('Verified on-chain', true);
  } catch (error) {
    const message = error?.message || 'The request could not be completed.';
    setStatus(message);
    ui.progress.hidden = true;
    ui.issue.textContent = pendingPayment ? 'Resume verification' : 'Generate Document';
  } finally {
    issuancePending = false;
    if (!pendingPayment) {
      ui.input.disabled = false;
      ui.subject.readOnly = false;
      ui.issuer.readOnly = false;
    }
    if (selectedHash !== submittedHash) {
      confirmedRecord = null;
      ui.download.hidden = true;
    }
    canIssue();
  }
});

ui.download.addEventListener('click', async () => {
  if (!selectedFile || !confirmedRecord) return;
  ui.download.disabled = true;
  try {
    const record = await getDocument(confirmedRecord.documentId);
    if (record.hash.toLowerCase() !== confirmedRecord.documentId.toLowerCase() || record.revokedAt !== 0) {
      throw new Error('Document record is missing or revoked. Download cancelled.');
    }
    const output = await makeVerifiedPdf(selectedFile, confirmedRecord);
    const blob = new Blob([output.bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${output.reportId}-verified.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) { setStatus(error.message || 'Could not create the verified PDF.'); }
  finally { ui.download.disabled = false; }
});

ui.verify.addEventListener('click', async () => {
  const value = ui.verifyInput.value.trim();
  const id = value.startsWith('0x') ? value : `0x${value}`;
  if (!validHash(id)) { ui.verifyResult.textContent = 'Enter the full SHA-256 document ID (64 hexadecimal characters).'; return; }
  ui.verify.disabled = true;
  ui.verifyResult.textContent = 'Checking the Winmar Chain record…';
  try {
    await checkChain();
    const record = await getDocument(id);
    if (record.hash.toLowerCase() !== id.toLowerCase()) throw new Error('Recorded hash does not match the document ID.');
    const issuedAt = new Date(record.issuedAt * 1000).toISOString().replace('T', ' ').slice(0, 19);
    ui.verifyResult.textContent = `${record.revokedAt ? 'Revoked' : 'Registered'} on-chain · ${issuedAt} UTC · issuer wallet ${record.issuerWallet}.`;
  } catch { ui.verifyResult.textContent = 'No confirmed verification record was found for this document ID.'; }
  finally { ui.verify.disabled = false; }
});

ui.menu.addEventListener('click', () => {
  ui.drawer.hidden = !ui.drawer.hidden;
  ui.menu.setAttribute('aria-expanded', String(!ui.drawer.hidden));
  ui.menu.setAttribute('aria-label', ui.drawer.hidden ? 'Open navigation' : 'Close navigation');
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !ui.drawer.hidden) ui.menu.click();
});
document.addEventListener('click', (event) => {
  if (!ui.drawer.hidden && !ui.drawer.contains(event.target) && !ui.menu.contains(event.target)) ui.menu.click();
});

ui.connect.addEventListener('click', async () => {
  try {
    ui.connect.disabled = true;
    const account = await walletAccount();
    const balance = await window.ethereum.request({ method: 'eth_getBalance', params: [account, 'latest'] });
    ui.walletAddress.textContent = shortAddress(account);
    ui.walletBalance.textContent = weiToWmc(balance);
    ui.walletNetwork.textContent = 'Winmar Chain Mainnet · Chain ID 12142816';
    ui.walletNote.textContent = 'Wallet connected. A separate confirmation is required to issue a document.';
    ui.connect.textContent = 'Wallet connected';
  } catch (error) { ui.walletNote.textContent = error.message || 'Wallet connection was cancelled.'; }
  finally { ui.connect.disabled = false; }
});

refreshRpcStatus();
setInterval(refreshRpcStatus, 60000);
