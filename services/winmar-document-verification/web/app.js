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
let verifiedIssuance = null;
let pdfDownloadPending = false;

function withTimeout(promise, ms = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Certificate generation timed out while reading the on-chain record. Refresh and try again.')), ms)),
  ]);
}

function canIssue() {
  issueButton.disabled = issuancePending || !(selectedDocumentHash && subjectInput.value.trim());
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
  verifiedIssuance = null;
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
    // A local SHA-256 is not an on-chain certificate; don't expose a verification link yet.
    verificationLink.hidden = true;
    const pastPayment = sessionStorage.getItem(`winmar:payment:${id}`);
    issueButton.textContent = pastPayment ? 'Resume On-chain Verification (No New Fee)' : 'Pay 0.0021 WMC & Verify On-chain';
    previewUrl = URL.createObjectURL(file);
    pdfPreview.src = previewUrl;
    documentPreview.hidden = false;
    canIssue();
    // If this PDF is already registered, continue from the existing on-chain
    // record instead of forcing a second payment. The original file hash is
    // still checked again when the certificate is generated.
    if (window.WinmarVerificationProof?.lookup) {
      try {
        const existing = await window.WinmarVerificationProof.lookup(rpc, id);
        if (version !== fileSelectionVersion) return;
        if (existing.status === 'registered') {
          verifiedIssuance = {
            file, paymentTransactionHash: null,
            // The local SHA-256 is the canonical document ID. Do not trust a
            // missing/legacy documentId field from an indexer lookup.
            expectedDocumentId: id,
            verifiedProof: { ...existing, documentId: id, sha256: id.slice(2), status: 'verified' },
            subject: subjectInput.value.trim() || 'On-chain Document Record',
            issuer: issuerInput.value.trim() || existing.issuerWallet,
            documentType: 'Document Verification Record',
          };
          certificateDownload.textContent = 'Download Verified PDF';
          certificateDownload.hidden = false;
          document.querySelector('#status-value').textContent = 'Already verified on-chain';
          document.querySelector('#status-value').className = 'status confirmed';
          issueProgress.hidden = false;
          issueProgressText.textContent = 'Existing on-chain record found. No new payment is required.';
        }
      } catch {
        // Normal new-document flow remains available when the registry is slow.
      }
    }
  } catch {
    if (version !== fileSelectionVersion) return;
    fileStatus.textContent = 'Unable to read PDF. Please select another file.';
    hashValue.textContent = 'Hash unavailable';
  }
});

[subjectInput, issuerInput].forEach((field) => field.addEventListener('input', canIssue));

issueButton.addEventListener('click', async () => {
  if (issuancePending || !selectedDocumentHash || !subjectInput.value.trim()) return;
  if (!window.ethereum) {
    walletNote.textContent = 'Install or connect an EVM wallet first. No account registration is required.';
    return;
  }
  issuancePending = true;
  const digest = selectedDocumentHash;
  const id = `0x${digest}`;
  const subject = subjectInput.value.trim();
  const applicant = issuerInput.value.trim();
  const storageKey = `winmar:payment:${id}`;
  const status = document.querySelector('#status-value');
  input.disabled = true;
  subjectInput.disabled = true;
  issuerInput.disabled = true;
  issueButton.disabled = true;
  certificateDownload.hidden = true;
  verificationLink.hidden = true;
  issueProgress.hidden = false;
  try {
    // Never charge a new customer if approved visual master or local PDF engine
    // is missing. Existing paid users may still resume the on-chain proof.
    if (!window.PDFLib?.PDFDocument || !window.WinmarPdfAssembler?.build ||
        !window.WinmarCertificateRenderer?.loadApprovedMaster) {
      throw new Error('Official PDF generator is unavailable. No payment was requested.');
    }
    if (!sessionStorage.getItem(storageKey)) {
      await window.WinmarCertificateRenderer.loadApprovedMaster();
    }
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (String(chainId).toLowerCase() !== MAINNET_CHAIN_ID) {
      throw new Error('Please switch your wallet to Winmar Chain Mainnet (12142816).');
    }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts?.[0]) throw new Error('Wallet account unavailable.');
    let paymentTx = sessionStorage.getItem(storageKey);
    if (!/^0x[0-9a-f]{64}$/i.test(paymentTx || '')) {
      // Do not request a second fee for a document already recorded on-chain.
      // RPC failure is UNKNOWN, never a reason to send a payment anyway.
      if (!window.WinmarVerificationProof?.preflightNewPayment) {
        throw new Error('Document registry preflight unavailable. No payment requested.');
      }
      issueProgressText.textContent = 'Checking the live document registry before payment…';
      const initial = await window.WinmarVerificationProof.preflightNewPayment(rpc, id);
      if (initial.status !== 'not_registered') {
        throw new Error(initial.status === 'already_registered'
          ? 'This exact PDF is already recorded on Winmar Chain. Do not pay again; verify the existing record.'
          : 'This document has an inactive or revoked registry record. No payment requested.');
      }
      issueProgressText.textContent = 'Approve the 0.0021 WMC fee and network gas in your wallet…';
      status.textContent = 'Awaiting wallet payment approval';
      status.className = 'status pending';
      paymentTx = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: accounts[0], to: DOCUMENT_FEE_CONTRACT,
          value: DOCUMENT_FEE_WEI, data: `0x8609cad1${digest}` }],
      });
      if (!/^0x[0-9a-f]{64}$/i.test(paymentTx || '')) {
        throw new Error('Wallet returned no valid payment transaction reference.');
      }
      // Keep the payment reference before waiting on a separate issuer transaction.
      // Resuming must never silently charge the customer twice.
      sessionStorage.setItem(storageKey, paymentTx);
      sessionStorage.setItem(`winmar:issuance:${digest}`, JSON.stringify({
        documentId: id, subject, applicant, payerWallet: accounts[0],
      }));
    }
    issueButton.textContent = 'Awaiting on-chain registration…';
    let proof;
    for (let attempt = 0; attempt < 250; attempt += 1) {
      proof = await window.WinmarVerificationProof.check(rpc, id, paymentTx);
      if (proof.status === 'verified') break;
      status.textContent = proof.status === 'payment_pending'
        ? 'Payment pending'
        : 'Payment confirmed · registration pending';
      status.className = 'status pending';
      issueProgressText.textContent = proof.status === 'payment_pending'
        ? 'Waiting for payment receipt. Do not pay again.'
        : 'Waiting for authorized document registration. Do not pay again.';
      await new Promise((resolve) => setTimeout(resolve, 3500));
    }
    if (proof?.status !== 'verified') {
      throw new Error('Registration is still pending. Resume with your existing payment; do not pay again.');
    }
    if (digest !== selectedDocumentHash) {
      throw new Error('The selected document changed. Reopen the exact original PDF.');
    }
    // The official file must be assembled from the user's ORIGINAL PDF,
    // independently checked against on-chain registration and approved artwork.
    // No HTML-only, query-string-only, or mock certificate is issued.
    verifiedIssuance = {
      file: input.files[0], paymentTransactionHash: paymentTx,
      expectedDocumentId: proof.documentId, subject,
      documentType: 'Document Verification Record',
    };
    certificateDownload.textContent = 'Download Verified PDF';
    certificateDownload.hidden = false;
    verificationUrl.href = proof.verificationUrl;
    verificationUrl.textContent = proof.verificationUrl;
    verificationLink.hidden = false;
    issueProgressText.textContent = 'Payment and separate document registration both confirmed.';
    status.textContent = 'VERIFIED ON-CHAIN';
    status.className = 'status confirmed';
    issueButton.textContent = 'Verified On-chain';
  } catch (error) {
    const pastPayment = sessionStorage.getItem(storageKey);
    status.textContent = error?.message || 'Document not issued';
    status.className = 'status pending';
    issueProgressText.textContent = pastPayment
      ? `Payment ${pastPayment} saved. Resume without a second fee.`
      : 'No official certificate was issued.';
    issueButton.textContent = pastPayment
      ? 'Resume On-chain Verification (No New Fee)'
      : 'Pay 0.0021 WMC & Verify On-chain';
  } finally {
    issuancePending = false;
    input.disabled = false;
    subjectInput.disabled = false;
    issuerInput.disabled = false;
    canIssue();
  }
});

certificateDownload.addEventListener('click', async () => {
  if (pdfDownloadPending || !verifiedIssuance) return;
  pdfDownloadPending = true;
  certificateDownload.disabled = true;
  certificateDownload.textContent = 'Creating verified PDF…';
  try {
    issueProgress.hidden = false;
    issueProgressText.textContent = 'Checking the active on-chain record and creating the certificate…';
    const result = await withTimeout(window.WinmarPdfAssembler.build({
      ...verifiedIssuance, rpc,
    }), 45000);
    if (verifiedIssuance.expectedDocumentId !== result.documentId) {
      throw new Error('Document reference changed during PDF generation.');
    }
    const blob = new Blob([result.bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WINMAR-VERIFIED-${result.documentId.slice(2, 14).toUpperCase()}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    issueProgressText.textContent = `Verified PDF ready: ${result.pageCount} pages; original PDF + 1 certificate page.`;
  } catch (error) {
    issueProgress.hidden = false;
    issueProgressText.textContent = error?.message ||
      'No official PDF generated. Contact Winmar support with your existing payment transaction.';
  } finally {
    certificateDownload.disabled = false;
    certificateDownload.textContent = 'Download Verified PDF';
    pdfDownloadPending = false;
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
