import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const TEMPLATE = './winmar-verification-certificate-public.png';

function imageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Certificate artwork could not be loaded.'));
    image.src = url;
  });
}

function drawField(ctx, x, y, width, value, options = {}) {
  const { fill = '#fff', color = '#1d2c6b', size = 16, weight = '400', height = 30 } = options;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  let fontSize = size;
  do {
    ctx.font = `${weight} ${fontSize}px Arial, sans-serif`;
    if (ctx.measureText(value).width <= width - 10) break;
    fontSize -= 1;
  } while (fontSize > 11);
  ctx.fillText(value, x + 5, y + height / 2, width - 10);
}

function utcParts(unixSeconds) {
  const iso = new Date(unixSeconds * 1000).toISOString();
  return { date: iso.slice(0, 10), timestamp: `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC` };
}

export async function renderCertificateCanvas(record, pageCount) {
  const image = await imageFromUrl(TEMPLATE);
  const canvas = document.createElement('canvas');
  canvas.width = 1055;
  canvas.height = 1491;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Certificate canvas is unavailable.');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const { date, timestamp } = utcParts(record.issuedAt);
  const reportId = `WMC-${date.slice(0, 4)}-${record.documentId.slice(2, 12).toUpperCase()}`;
  drawField(ctx, 581, 113, 202, reportId, { weight: '700' });
  drawField(ctx, 581, 185, 202, date, { weight: '700' });
  drawField(ctx, 346, 493, 590, reportId, { fill: '#f7fbff', weight: '700' });
  drawField(ctx, 346, 538, 590, 'Verified PDF Document', { fill: '#f7fbff' });
  drawField(ctx, 346, 583, 590, record.subject, { fill: '#f7fbff' });
  drawField(ctx, 346, 628, 590, record.issuer, { fill: '#f7fbff' });
  drawField(ctx, 346, 673, 590, date, { fill: '#f7fbff' });
  drawField(ctx, 355, 984, 578, record.documentId, { size: 14, height: 40 });
  drawField(ctx, 355, 1040, 578, record.registrationTx, { size: 14, height: 35 });
  drawField(ctx, 355, 1084, 578, `#${record.blockNumber}`, { height: 35 });
  drawField(ctx, 355, 1127, 578, timestamp, { size: 15, height: 35 });
  drawField(ctx, 355, 1171, 578, record.issuerWallet, { size: 15, height: 35 });
  drawField(ctx, 355, 1264, 435, record.explorerUrl, { size: 12, color: '#0064e6' });
  drawField(ctx, 101, 1382, 245, reportId, { weight: '700' });
  drawField(ctx, 497, 1382, 145, `${pageCount + 1} of ${pageCount + 1}`, { weight: '700' });

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, record.explorerUrl, {
    width: 112, margin: 1, errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
  ctx.fillStyle = '#fff';
  ctx.fillRect(857, 88, 113, 113);
  ctx.drawImage(qrCanvas, 858, 89, 111, 111);

  return { canvas, reportId };
}

export async function makeVerifiedPdf(sourceFile, record) {
  const sourceBytes = await sourceFile.arrayBuffer();
  const pdf = await PDFDocument.load(sourceBytes, { updateMetadata: false });
  const pageCount = pdf.getPageCount();
  if (!pageCount) throw new Error('The source PDF has no pages.');
  const { canvas, reportId } = await renderCertificateCanvas(record, pageCount);

  const certificateBytes = await fetch(canvas.toDataURL('image/png')).then((response) => response.arrayBuffer());
  const certificateImage = await pdf.embedPng(certificateBytes);
  const certificatePage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  certificatePage.drawImage(certificateImage, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT });
  return { bytes: await pdf.save(), reportId, pageCount: pageCount + 1 };
}
