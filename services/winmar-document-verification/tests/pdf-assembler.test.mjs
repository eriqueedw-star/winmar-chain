import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import { File } from 'node:buffer';
import vm from 'node:vm';
import test from 'node:test';

const read = (filename) => readFileSync(new URL(filename, import.meta.url), 'utf8');
const sandbox = { console, crypto: webcrypto, File, TextDecoder, Uint8Array, Blob, ArrayBuffer };
sandbox.globalThis = sandbox;
const context = vm.createContext(sandbox);
const pageDimensions = (width, height) => vm.runInContext(`[${width}, ${height}]`, context);

vm.runInContext(read('../web/vendor/pdf-lib-1.17.1.min.js'), context, { timeout: 10000 });
const PDFDocument = sandbox.PDFLib?.PDFDocument;
assert.equal(typeof PDFDocument, 'function', 'Bundled PDF engine must load without external network');

vm.runInContext(read('../web/pdf-assembler.js'), context, { timeout: 10000 });
vm.runInContext(read('../web/certificate-renderer.js'), context, { timeout: 10000 });

test('self-hosted browser PDF engine is complete and can load/save a real PDF', async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage(pageDimensions(500, 600));
  const bytes = await pdf.save();
  const loaded = await PDFDocument.load(bytes);
  assert.equal(loaded.getPageCount(), 1);
});

test('approved certificate asset fails closed if repository still serves older PNG', async () => {
  sandbox.fetch = async () => ({
    ok: true,
    arrayBuffer: async () => Uint8Array.from([137,80,78,71,13,10,26,10]).buffer,
  });
  await assert.rejects(sandbox.WinmarCertificateRenderer.loadApprovedMaster(),
    /differs from the owner-approved master/);
});

test('browser PDF assembler preserves source pages visually and adds only one A4 page', async () => {
  const original = await PDFDocument.create();
  original.addPage(pageDimensions(432, 640));
  original.addPage(pageDimensions(500, 600));
  const originalBytes = await original.save();
  const digest = createHash('sha256').update(originalBytes).digest('hex');
  const paymentTx = '0x' + '11'.repeat(32);
  let proofCalls = 0;
  sandbox.WinmarVerificationProof = {
    check: async () => {
      proofCalls += 1;
      return { status: 'verified', sha256: digest, documentId: '0x' + digest,
        registrationTransactionHash: '0x' + '22'.repeat(32) };
    },
  };
  // Renderer is mocked so this test NEVER creates or ships a simulated
  // official visual certificate. The real renderer requires the exact owner PNG.
  sandbox.WinmarCertificateRenderer.render = async () => ({
    toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL5VQAAAABJRU5ErkJggg==',
  });

  const input = new File([originalBytes], 'sample.pdf', { type: 'application/pdf' });
  const result = await sandbox.WinmarPdfAssembler.build({
    file: input, paymentTransactionHash: paymentTx,
    expectedDocumentId: '0x' + digest, subject: 'QA fixture', issuer: 'QA Organization',
    rpc: async () => { throw Error('Replaced by mocked read-only proof'); },
  });
  const checked = await PDFDocument.load(result.bytes);
  assert.equal(checked.getPageCount(), 3, 'N pages -> N+1');
  assert.equal(checked.getPage(0).getWidth(), 432);
  assert.equal(checked.getPage(0).getHeight(), 640);
  assert.equal(checked.getPage(1).getWidth(), 500);
  assert.equal(checked.getPage(1).getHeight(), 600);
  assert.ok(Math.abs(checked.getPage(2).getWidth() - 595.27559) < 0.02);
  assert.ok(Math.abs(checked.getPage(2).getHeight() - 841.88976) < 0.02);
  assert.equal(proofCalls, 1, 'On-chain status rechecked at download time');
  assert.equal(createHash('sha256').update(originalBytes).digest('hex'), digest,
    'Input source PDF remains byte-identical');
});

test('PDF assembler rejects mismatched SHA-256 before attempting blockchain proof', async () => {
  const original = await PDFDocument.create();
  original.addPage(pageDimensions(500, 600));
  const bytes = await original.save();
  const file = new File([bytes], 'source.pdf', { type: 'application/pdf' });
  await assert.rejects(sandbox.WinmarPdfAssembler.build({
    file, paymentTransactionHash: '0x' + '12'.repeat(32),
    expectedDocumentId: '0x' + '00'.repeat(32), subject: 'Test', issuer: 'QA Organization',
    rpc: async () => { throw Error('RPC must not be called'); },
  }), /fingerprint changed/);
});

test('PDF assembler rejects existing signature markers before output', async () => {
  const original = await PDFDocument.create();
  original.addPage(pageDimensions(500, 600));
  const source = await original.save();
  const signedMarker = new TextEncoder().encode('\n/ByteRange [0 4 8 12]\n');
  const combined = new Uint8Array(source.length + signedMarker.length);
  combined.set(source);
  combined.set(signedMarker, source.length);
  const file = new File([combined], 'signed.pdf', { type: 'application/pdf' });
  const sha = createHash('sha256').update(combined).digest('hex');
  await assert.rejects(sandbox.WinmarPdfAssembler.build({
    file, paymentTransactionHash: '0x' + '12'.repeat(32),
    expectedDocumentId: '0x' + sha, subject: 'Test', issuer: 'QA Organization',
    rpc: async () => { throw Error('RPC must not be called'); },
  }), /Digitally signed source PDFs/);
});
