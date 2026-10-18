/*
 * Winmar approved certificate renderer.
 * Only runtime DATA boxes and the existing QR payload may change.
 * The owner's PNG is a strict byte-for-byte asset; no similar/recreated
 * templates are ever accepted.
 */
(function (root) {
  'use strict';

  const ORIGINAL_MASTER_SHA256 = 'e6f621c211c389398377f251c533b522e3f76117c8428624a5e43407ab5fe5d3';
  const ORIGINAL_MASTER_BYTES = 2199597;
  const WIDTH = 1055;
  const HEIGHT = 1491;
  const EXPLORER_PREFIX = 'https://scan.winmarchain.io/verify/';

  function requireState(allowed, explanation) {
    if (!allowed) throw new Error(explanation);
  }

  function byteHex(bytes) {
    return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function loadApprovedMaster() {
    const res = await fetch('./winmar-verification-certificate-master.png', {
      cache: 'no-store', credentials: 'same-origin',
    });
    requireState(res.ok, 'Approved Winmar certificate artwork is not available.');
    const imageBytes = await res.arrayBuffer();
    const digest = byteHex(await crypto.subtle.digest('SHA-256', imageBytes));
    requireState(
      digest === ORIGINAL_MASTER_SHA256 && imageBytes.byteLength === ORIGINAL_MASTER_BYTES,
      'The certificate artwork differs from the owner-approved master. Official PDF issuance is blocked.',
    );
    const header = new DataView(imageBytes, 0, 24);
    requireState(header.getUint32(16, false) === WIDTH && header.getUint32(20, false) === HEIGHT,
      'Wrong certificate image dimensions; issuance blocked.');
    const blob = new Blob([imageBytes], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
        const asset = new Image();
        asset.onload = () => resolve(asset);
        asset.onerror = () => reject(new Error('Approved PNG image could not be decoded.'));
        asset.src = url;
      });
      requireState(img.width === WIDTH && img.height === HEIGHT, 'Invalid approved certificate image.');
      return img;
    } finally {
      // The loaded Image is already decoded; its pixels remain available.
      URL.revokeObjectURL(url);
    }
  }

  function field(ctx, x, y, width, value, options = {}) {
    const { background = '#ffffff', size = 16, weight = '400', color = '#1d2c6b' } = options;
    const str = String(value ?? '').trim();
    requireState(str.length > 0 && !/[\u0000-\u001f]/.test(str), 'Missing certificate data.');
    ctx.fillStyle = background;
    ctx.fillRect(x, y, width, 30);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    let fontSize = size;
    do {
      ctx.font = `${weight} ${fontSize}px Arial, sans-serif`;
      if (ctx.measureText(str).width <= width - 12) break;
      fontSize -= 1;
    } while (fontSize >= 11);
    requireState(fontSize >= 11, 'Verified data is too long for the locked certificate field.');
    ctx.fillText(str, x + 5, y + 15);
  }

  function qr(ctx, url) {
    requireState(typeof root.QRCode === 'function', 'Local QR library unavailable.');
    const offscreen = document.createElement('div');
    Object.assign(offscreen.style, { position: 'absolute', left: '-9999px',
      width: '110px', height: '110px', visibility: 'hidden' });
    document.body.append(offscreen);
    try {
      new root.QRCode(offscreen, { text: url, width: 110, height: 110,
        colorDark: '#000000', colorLight: '#ffffff',
        correctLevel: root.QRCode.CorrectLevel.M });
      const bitmap = offscreen.querySelector('canvas');
      requireState(bitmap && bitmap.width === 110, 'QR generator returned no canvas.');
      // Top-right QR white area INSIDE the ORIGINAL border and label.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(833, 83, 112, 112);
      ctx.drawImage(bitmap, 834, 84, 110, 110);
    } finally {
      offscreen.remove();
    }
  }

  async function render(verified) {
    requireState(verified && verified.status === 'verified', 'No confirmed document registration.');
    const id = String(verified.documentId || '').toLowerCase();
    requireState(/^0x[0-9a-f]{64}$/.test(id), 'Invalid registered document ID.');
    requireState(String(verified.sha256).toLowerCase() === id.slice(2),
      'Certificate SHA-256 does not match its on-chain document ID.');
    requireState(/^0x[0-9a-f]{64}$/i.test(verified.registrationTransactionHash || ''),
      'Missing on-chain registration transaction.');
    requireState(/^0x[0-9a-f]{40}$/i.test(verified.issuerWallet || ''),
      'Missing on-chain issuer address.');
    requireState(Number.isSafeInteger(verified.registrationBlockNumber) &&
      verified.registrationBlockNumber > 0, 'Invalid registration block.');
    const verificationUrl = EXPLORER_PREFIX + id;
    requireState(verified.verificationUrl === verificationUrl,
      'Explorer verification URL is inconsistent with the registered hash.');

    const master = await loadApprovedMaster();
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d', { alpha: false });
    requireState(ctx, 'Certificate rendering unavailable.');
    ctx.drawImage(master, 0, 0, WIDTH, HEIGHT);

    const issueDate = String(verified.issuedAt || '').slice(0, 10);
    requireState(/^20\d\d-\d\d-\d\d$/.test(issueDate), 'Invalid verified on-chain date.');
    const dateWithTime = String(verified.issuedAt || '');
    const report = `WMC-${issueDate.slice(0, 4)}-${id.slice(2, 10).toUpperCase()}`;
    const subject = String(verified.subject || '').trim();
    const docType = String(verified.documentType || 'Document Verification Record').trim();
    requireState(subject && subject.length <= 160 && docType && docType.length <= 160,
      'Subject or document type invalid.');

    // WARNING: Sample-value bounding boxes are locked; these are data only.
    // This canvas does not restyle, crop, recolor or move any of the approved
    // brand artwork, fixed text, badge, title, status panel, lines or footer.
    field(ctx, 567, 109, 216, report, { weight: '600' });
    field(ctx, 567, 182, 216, issueDate, { weight: '600' });
    field(ctx, 339, 483, 564, report, { background: '#f7fbff', weight: '600' });
    field(ctx, 339, 526, 564, docType, { background: '#f7fbff' });
    field(ctx, 339, 570, 564, subject, { background: '#f7fbff' });
    field(ctx, 339, 614, 564, 'Authorized Winmar Chain Issuer', { background: '#f7fbff', weight: '600' });
    field(ctx, 339, 658, 564, issueDate, { background: '#f7fbff' });
    field(ctx, 339, 700, 564, 'PDF (SHA-256 Verified)', { background: '#f7fbff' });

    // A full 64-digit SHA is written in TWO rows exactly as in the master.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(347, 958, 541, 41);
    field(ctx, 347, 957, 540, verified.sha256.toUpperCase().slice(0, 32),
      { background: '#ffffff', size: 15 });
    field(ctx, 347, 976, 540, verified.sha256.toUpperCase().slice(32),
      { background: '#ffffff', size: 15 });
    field(ctx, 347, 1010, 540, verified.registrationTransactionHash, { size: 12 });
    field(ctx, 347, 1053, 540, `#${verified.registrationBlockNumber}`);
    field(ctx, 347, 1096, 540, dateWithTime);
    field(ctx, 347, 1138, 540, verified.issuerWallet);
    field(ctx, 347, 1180, 540, 'Winmar Chain Mainnet');
    field(ctx, 347, 1229, 419, verificationUrl, { size: 11, color: '#086cfa' });
    field(ctx, 97, 1342, 254, report, { size: 14, weight: '600' });
    field(ctx, 487, 1342, 151, verified.pageLabel, { size: 15, weight: '600' });

    qr(ctx, verificationUrl);
    return canvas;
  }

  root.WinmarCertificateRenderer = { render, loadApprovedMaster,
    APPROVED_SHA256: ORIGINAL_MASTER_SHA256 };
})(typeof window === 'undefined' ? globalThis : window);
