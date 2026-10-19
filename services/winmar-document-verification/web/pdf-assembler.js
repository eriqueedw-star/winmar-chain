/*
 * Read-only, locally generated verified PDF. Original uploaded PDF never
 * leaves this browser: load its pages, validate the exact original-byte hash,
 * re-query Winmar Chain, and append a single owner-approved A4 certificate.
 * No wallet transaction, issuer key, or off-chain certificate can originate here.
 */
(function (root) {
  'use strict';

  const MAX_BYTES = 10 * 1024 * 1024;
  const A4 = [595.27559, 841.88976];

  function requireValue(condition, message) {
    if (!condition) throw new Error(message);
  }

  function hex(bytes) {
    return Array.from(new Uint8Array(bytes), (v) => v.toString(16).padStart(2, '0')).join('');
  }

  function signedSource(pdfBytes) {
    // Fail closed when the PDF has digital signature markers: rebuilding
    // an existing signed PDF would invalidate its original signatures.
    const text = new TextDecoder('latin1').decode(pdfBytes);
    return /\/ByteRange\s*\[/.test(text) ||
      /\/FT\s*\/Sig\b/.test(text) || /\/Type\s*\/Sig\b/.test(text);
  }

  async function build({ file, paymentTransactionHash, expectedDocumentId,
                         subject, issuer, documentType = 'Document Verification Record',
                         rpc }) {
    requireValue(file instanceof File && file.size > 0 && file.size <= MAX_BYTES,
      'Select one PDF file between 1 byte and 10 MB.');
    requireValue(file.name.toLowerCase().endsWith('.pdf'), 'Only PDF documents are supported.');
    requireValue(typeof subject === 'string' && subject.trim().length > 0,
      'Subject is required for the certificate.');
    requireValue(typeof issuer === 'string' && issuer.trim().length > 0,
      'Issuer / applicant organization is required for the certificate.');
    requireValue(typeof rpc === 'function', 'Read-only blockchain RPC is unavailable.');
    requireValue(root.WinmarVerificationProof?.check && root.WinmarCertificateRenderer?.render,
      'Verified PDF components are unavailable.');
    requireValue(root.PDFLib?.PDFDocument, 'Local PDF engine is not loaded.');

    const bytes = await file.arrayBuffer();
    const digest = hex(await crypto.subtle.digest('SHA-256', bytes));
    const documentId = '0x' + digest;
    requireValue(documentId === String(expectedDocumentId).toLowerCase(),
      'Original PDF fingerprint changed; refusing an unverified certificate.');
    requireValue(new TextDecoder('latin1').decode(bytes.slice(0, 8)).startsWith('%PDF-'),
      'Invalid PDF signature.');
    requireValue(!signedSource(bytes),
      'Digitally signed source PDFs cannot be reassembled without invalidating their signatures.');

    // Re-check current issuer authorization and revocation status at the moment
    // of download, not merely the proof shown earlier in the session.
    const verified = await root.WinmarVerificationProof.check(rpc, documentId, paymentTransactionHash);
    requireValue(verified.status === 'verified' && verified.sha256 === digest,
      'On-chain verification is pending, revoked or inconsistent. No certificate issued.');

    let originalPdf;
    try {
      originalPdf = await root.PDFLib.PDFDocument.load(bytes, {
        ignoreEncryption: false, updateMetadata: false,
      });
    } catch {
      throw new Error('Unsupported, corrupted or encrypted source PDF.');
    }
    const originalPages = originalPdf.getPageCount();
    requireValue(originalPages > 0 && originalPages <= 500,
      'PDF page count is invalid or exceeds supported limits.');
    const pageNumber = originalPages + 1;
    const proof = { ...verified, status: 'verified',
      pageLabel: `${pageNumber} of ${pageNumber}`, subject, issuer, documentType };

    // loadApprovedMaster() rejects anything that is not the exact original
    // owner-approved uploaded PNG, even if an older template has the same name.
    const certificateCanvas = await root.WinmarCertificateRenderer.render(proof);
    const png = certificateCanvas.toDataURL('image/png');
    const image = await originalPdf.embedPng(png);
    const page = originalPdf.addPage(A4);
    page.drawImage(image, { x: 0, y: 0, width: A4[0], height: A4[1] });
    requireValue(originalPdf.getPageCount() === pageNumber,
      'Certificate output page count does not match N + 1.');
    const completedBytes = await originalPdf.save({ useObjectStreams: true });
    return { bytes: completedBytes, documentId, pageCount: pageNumber,
      registrationTransactionHash: verified.registrationTransactionHash };
  }

  root.WinmarPdfAssembler = { build };
})(typeof window === 'undefined' ? globalThis : window);
