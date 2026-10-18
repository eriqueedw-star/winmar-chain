const input = document.querySelector('#file-input');
const fileStatus = document.querySelector('#file-status');
const hashValue = document.querySelector('#hash-value');
const issueButton = document.querySelector('#issue-button');
const verifyButton = document.querySelector('#verify-button');
const documentId = document.querySelector('#document-id');
const verifyResult = document.querySelector('#verify-result');
const documentPreview = document.querySelector('#document-preview');
const pdfPreview = document.querySelector('#pdf-preview');
const documentIdValue = document.querySelector('#document-id-value');
const verificationLink = document.querySelector('#verification-link');
const verificationUrl = document.querySelector('#verification-url');
const subjectInput = document.querySelector('#document-subject');
const issuerInput = document.querySelector('#document-issuer');
const issueProgress = document.querySelector('#issue-progress');
const issueProgressText = document.querySelector('#issue-progress-text');
const certificateDownload = document.querySelector('#certificate-download');
const rpcStatus = document.querySelector('#rpc-status');
const DOCUMENT_FEE_CONTRACT = '0xcEC232bd11F03006ECC80917F5cD55bBf247617D';
const DOCUMENT_FEE_WEI = '0x775f05a074000';
const MAINNET_CHAIN_ID = '0xb948e0';
const EXPLORER_VERIFY_BASE = 'https://scan.winmarchain.io/verify/';
let selectedDocumentHash = '';
let previewUrl = '';
let fileSelectionVersion = 0;
let issuancePending = false;

function canIssue() {
  issueButton.disabled = issuancePending || !(selectedDocumentHash && subjectInput.value.trim() && issuerInput.value.trim());
}

function rpc(method, params = []) {
  return fetch('https://rpc.winmarchain.io/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  }).then((response) => response.json()).then((payload) => {
    if (payload.error) throw new Error(payload.error.message || 'RPC error');
    return payload.result;
  });
}

async function refreshRpcStatus() {
  try {
    const chainId = await rpc('eth_chainId');
    if (chainId !== MAINNET_CHAIN_ID) throw new Error(`Unexpected chain ${chainId}`);
    rpcStatus.textContent = 'WINMAR CHAIN · RPC CONNECTED';
    rpcStatus.className = 'environment rpc-status connected';
  } catch {
    rpcStatus.textContent = 'WINMAR CHAIN · RPC OFFLINE';
    rpcStatus.className = 'environment rpc-status disconnected';
  }
}

async function sha256(file) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

input.addEventListener('change', async () => {
  const version = ++fileSelectionVersion;
  const file = input.files?.[0];
  selectedDocumentHash = '';
  hashValue.textContent = 'Waiting for PDF';
  documentIdValue.textContent = 'Waiting for PDF';
  verificationLink.hidden = true;
  certificateDownload.hidden = true;
  document.querySelector('#status-value').textContent = 'Not issued';
  document.querySelector('#status-value').className = 'status pending';
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = '';
  pdfPreview.removeAttribute('src');
  documentPreview.hidden = true;
  canIssue();
  if (!file) { fileStatus.textContent = 'No document selected'; return; }
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    fileStatus.textContent = 'Only PDF files are accepted'; return;
  }
  if (file.size === 0 || file.size > 10 * 1024 * 1024) {
    fileStatus.textContent = 'PDF must be between 1 byte and 10 MB'; return;
  }
  fileStatus.textContent = `Selected: ${file.name} (${Math.ceil(file.size / 1024)} KB)`;
  hashValue.textContent = 'Computing...';
  try {
    const digest = await sha256(file);
    if (version !== fileSelectionVersion) return;
    selectedDocumentHash = digest;
    hashValue.textContent = digest;
    const id = `0x${digest}`;
    documentIdValue.textContent = id;
    const publicUrl = `${EXPLORER_VERIFY_BASE}${id}`;
    verificationUrl.href = publicUrl;
    verificationUrl.textContent = publicUrl;
    verificationLink.hidden = false;
    previewUrl = URL.createObjectURL(file);
    pdfPreview.src = previewUrl;
    documentPreview.hidden = false;
    canIssue();
  } catch {
    if (version !== fileSelectionVersion) return;
    fileStatus.textContent = 'Unable to read PDF. Please select another file.';
    hashValue.textContent = 'Hash unavailable';
  }
});

[subjectInput, issuerInput].forEach((field) => field.addEventListener('input', canIssue));

issueButton.addEventListener('click', async () => {
  if (issuancePending || !window.ethereum || !selectedDocumentHash || !subjectInput.value.trim() || !issuerInput.value.trim()) return;
  issuancePending = true;
  const submittedHash = selectedDocumentHash;
  input.disabled = true;
  try {
    issueProgress.hidden = false;
    issueProgressText.textContent = 'Confirm the transaction in your wallet…';
    certificateDownload.hidden = true;
    issueButton.disabled = true;
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== MAINNET_CHAIN_ID) throw new Error('Switch wallet to Winmar Chain Mainnet first.');
    // Document ID is the SHA-256 digest, so the payment event and the
    // authorized issuer registration refer to the same immutable record.
    const data = `0x8609cad1${selectedDocumentHash}`;
    // The contract anchors the immutable PDF hash. Subject and applicant issuer
    // are retained as issuance metadata for the certificate/receipt worker.
    const issuanceMetadata = {
      documentId: `0x${selectedDocumentHash}`,
      subject: subjectInput.value.trim(),
      issuer: issuerInput.value.trim(),
    };
    window.sessionStorage.setItem(`winmar:issuance:${selectedDocumentHash}`, JSON.stringify(issuanceMetadata));
    const tx = await window.ethereum.request({ method: 'eth_sendTransaction', params: [{ from: accounts[0], to: DOCUMENT_FEE_CONTRACT, value: DOCUMENT_FEE_WEI, data }] });
    document.querySelector('#status-value').textContent = `Payment submitted · ${tx.slice(0, 10)}...`;
    document.querySelector('#status-value').className = 'status pending';
    issueButton.textContent = 'Recording on Winmar Chain…';
    issueProgressText.textContent = 'Recording document and waiting for blockchain receipt…';

    let receipt;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      receipt = await rpc('eth_getTransactionReceipt', [tx]);
      if (receipt) break;
    }
    if (!receipt) throw new Error('Receipt is still pending. Please check the transaction in the explorer.');
    if (receipt.status !== '0x1') throw new Error('The blockchain transaction failed. No certificate was generated.');
    const blockData = await rpc('eth_getBlockByNumber', [receipt.blockNumber, false]);
    const issuedAt = `${new Date(Number(BigInt(blockData.timestamp)) * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC')}`;
    const params = new URLSearchParams({
      documentId: `0x${selectedDocumentHash}`,
      subject: subjectInput.value.trim(), issuer: issuerInput.value.trim(), issuedAt,
      sha256: selectedDocumentHash, tx, block: String(Number(BigInt(receipt.blockNumber))), issuerWallet: accounts[0],
    });
    certificateDownload.href = `./certificate.html?${params.toString()}`;
    certificateDownload.hidden = false;
    issueProgressText.textContent = 'Receipt confirmed. Certificate is ready.';
    document.querySelector('#status-value').textContent = 'Recorded on-chain';
    document.querySelector('#status-value').className = 'status confirmed';
    issueButton.textContent = 'Document Generated';
  } catch (error) {
    document.querySelector('#status-value').textContent = error.message || 'Payment cancelled';
    document.querySelector('#status-value').className = 'status pending';
    issueProgress.hidden = true;
    issueButton.disabled = false;
    issueButton.textContent = 'Generate Document';
  } finally {
    issuancePending = false;
    input.disabled = false;
    if (selectedDocumentHash !== submittedHash) certificateDownload.hidden = true;
    canIssue();
  }
});

verifyButton.addEventListener('click', () => {
  const value = documentId.value.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    verifyResult.textContent = 'Enter a valid document ID (0x followed by 64 hexadecimal characters).';
    return;
  }
  const url = `${EXPLORER_VERIFY_BASE}${value}`;
  verifyResult.textContent = 'Opening the public Explorer record. Verify the source PDF hash and record status there.';
  window.open(url, '_blank', 'noopener,noreferrer');
});

const connectWalletButton = document.querySelector('#connect-wallet');
const walletAddress = document.querySelector('#wallet-address');
const walletBalance = document.querySelector('#wallet-balance');
const walletNetwork = document.querySelector('#wallet-network');
const walletNote = document.querySelector('#wallet-note');
const menuButton = document.querySelector('#menu-button');
const navDrawer = document.querySelector('#nav-drawer');

function shortAddress(value) { return `${value.slice(0, 6)}...${value.slice(-4)}`; }
function weiToWmc(hex) {
  const value = BigInt(hex);
  const whole = value / 1000000000000000000n;
  const fraction = (value % 1000000000000000000n).toString().padStart(18, '0').slice(0, 6).replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''} WMC`;
}

menuButton.addEventListener('click', () => {
  const open = navDrawer.hidden;
  navDrawer.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});

connectWalletButton.addEventListener('click', async () => {
  if (!window.ethereum) {
    walletNote.textContent = 'No compatible wallet detected. Install a wallet extension that supports EVM networks.';
    return;
  }
  try {
    connectWalletButton.disabled = true;
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const balance = await window.ethereum.request({ method: 'eth_getBalance', params: [accounts[0], 'latest'] });
    walletAddress.textContent = shortAddress(accounts[0]);
    walletBalance.textContent = weiToWmc(balance);
    walletNetwork.textContent = chainId === '0xb948e0' ? 'Winmar Chain Mainnet · Chain ID 12142816' : `Wrong network · detected ${chainId}`;
    walletNote.textContent = chainId === '0xb948e0' ? 'Wallet connected. The document fee and network gas will only be charged after an explicit transaction confirmation.' : 'Please switch to Winmar Chain Mainnet before issuing a document.';
    connectWalletButton.textContent = 'Wallet connected';
  } catch {
    walletNote.textContent = 'Wallet connection was cancelled or unavailable.';
  } finally {
    connectWalletButton.disabled = false;
  }
});

refreshRpcStatus();
