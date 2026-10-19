/* Public Explorer document lookup - read-only. No wallet or account needed. */
(function () {
  'use strict';

  const note = document.querySelector('#verification-state');
  const details = document.querySelector('#record-details');
  const idOutput = document.querySelector('#document-id');
  const issuerOutput = document.querySelector('#issuer-wallet');
  const txOutput = document.querySelector('#registration-tx');
  const issuedOutput = document.querySelector('#issued-at');
  const integrity = document.querySelector('#file-integrity');
  const input = document.querySelector('#source-pdf');

  let current = null;
  let fileVersion = 0;

  function state(text, type = 'pending') {
    note.textContent = text;
    note.dataset.status = type;
  }

  async function rpc(method, params = []) {
    const res = await fetch('https://rpc.winmarchain.io/', {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    });
    if (!res.ok) throw new Error('Public Winmar Chain RPC did not respond.');
    const payload = await res.json();
    if (payload.error) throw new Error('Explorer cannot verify on-chain state at this time.');
    return payload.result;
  }

  function requestedId() {
    const match = location.pathname.match(/\/verify\/(0x[0-9a-fA-F]{64})\/?$/);
    const candidate = match?.[1] || new URLSearchParams(location.search).get('documentId');
    return window.WinmarVerificationProof.docId(candidate);
  }

  async function verifyLocalFile() {
    const sequence = ++fileVersion;
    const file = input.files?.[0];
    if (!file) { integrity.textContent = 'Select the ORIGINAL source PDF to verify its SHA-256.'; return; }
    if (!file.name.toLowerCase().endsWith('.pdf') || file.size <= 0 ||
        file.size > 10 * 1024 * 1024) {
      integrity.textContent = 'Choose a valid PDF no larger than 10 MB.';
      return;
    }
    integrity.textContent = 'Calculating SHA-256 of the original PDF…';
    try {
      const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      if (sequence !== fileVersion) return;
      const actual = '0x' + Array.from(new Uint8Array(digest),
        b => b.toString(16).padStart(2, '0')).join('');
      if (current?.status === 'registered' && actual === current.documentId) {
        integrity.textContent = 'VERIFIED ON-CHAIN — selected original PDF matches the active blockchain record.';
        integrity.dataset.status = 'verified';
      } else {
        integrity.textContent = 'HASH MISMATCH or inactive record — this PDF is NOT verified against the blockchain.';
        integrity.dataset.status = 'failed';
      }
    } catch {
      if (sequence !== fileVersion) return;
      integrity.textContent = 'Could not read or hash this PDF.';
      integrity.dataset.status = 'failed';
    }
  }

  input.addEventListener('change', verifyLocalFile);

  async function start() {
    let id;
    try {
      id = requestedId();
    } catch {
      state('Invalid document ID. Scan the QR on a real Winmar certificate or use the document ID.', 'failed');
      input.disabled = true;
      return;
    }
    state('Reading the current on-chain document record…');
    try {
      current = await window.WinmarVerificationProof.lookup(rpc, id);
      if (current.status === 'not_registered') {
        state('NO ON-CHAIN DOCUMENT RECORD FOUND. No Winmar certificate can be validated.', 'failed');
        input.disabled = true;
        return;
      }
      if (current.status === 'revoked') {
        state('REVOKED — this document is not currently verified.', 'failed');
        input.disabled = true;
        return;
      }
      if (current.status !== 'registered') {
        state('Document is not currently verifiable. The issuer or registration receipt needs review.', 'failed');
        input.disabled = true;
        return;
      }

      details.hidden = false;
      idOutput.textContent = current.documentId;
      issuerOutput.textContent = current.issuerWallet;
      issuedOutput.textContent = current.issuedAt;
      txOutput.textContent = current.registrationTransactionHash;
      txOutput.href = 'https://scan.winmarchain.io/tx/' + current.registrationTransactionHash;
      state('ACTIVE ON-CHAIN RECORD FOUND — upload the original PDF to check document integrity.', 'pending');
      integrity.textContent = 'No PDF uploaded. A registered hash alone does not prove the file you hold matches it.';
      integrity.dataset.status = 'pending';
      if (input.files?.[0]) verifyLocalFile();
    } catch {
      state('Unable to establish the blockchain record. No verification claim can be made.', 'failed');
      input.disabled = true;
    }
  }

  start();
})();
