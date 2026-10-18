import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const web = read('../web/app.js');
const worker = read('../deployment/receipt-worker.mjs');
const issuer = read('../deployment/authorize-issuer.mjs');
const apiConfig = read('../.env.example');
const standard = read('../../../docs/WINMAR_VERIFICATION_STANDARD.md');

const feeContract = '0xcec232bd11f03006ecc80917f5cd55bf247617d';
const verificationContract = '0x53fb6ba2997a50d3ddfff5395a3bb9b7b24b7aef';
const treasury = '0x2d26e199f9be1a907239e403c4fad14c0856e7fd';
const expectedFeeWei = 2_100_000_000_000_000n;

test('document payment contract remains aligned between UI, worker and config', () => {
  for (const [label, source] of [['UI', web], ['worker', worker], ['config', apiConfig]]) {
    assert.ok(source.toLowerCase().includes(feeContract), `${label}: payment contract address mismatch`);
  }
  assert.ok(web.includes('0x8609cad1'), 'Payment function selector must be reviewed when ABI changes');
});

test('document registration contract and issuer are aligned with worker', () => {
  assert.ok(worker.toLowerCase().includes(verificationContract));
  assert.ok(issuer.toLowerCase().includes(verificationContract));
  assert.ok(issuer.toLowerCase().includes('0x853a35b5318fd219ebf98b2a12ca346a9853d975'));
});

test('fee in UI, service config and verification standard is 0.0021 WMC', () => {
  const paymentHex = web.match(/const DOCUMENT_FEE_WEI = '([^']+)'/)?.[1];
  assert.ok(paymentHex, 'UI must specify fee amount');
  assert.equal(BigInt(paymentHex), expectedFeeWei);
  assert.ok(apiConfig.includes(`DOCUMENT_FEE_AMOUNT_WEI=${expectedFeeWei}`));
  assert.ok(standard.includes('0.0021 WMC'));
  assert.ok(standard.toLowerCase().includes(treasury));
});

test('canonical mainnet and explorer verification URL are consistent', () => {
  assert.ok(web.includes("const MAINNET_CHAIN_ID = '0xb948e0'"));
  assert.ok(apiConfig.includes('DOCUMENT_FEE_CONTRACT='));
  assert.ok(web.includes('https://scan.winmarchain.io/verify/'));
  assert.ok(standard.includes('https://scan.winmarchain.io/verify/<documentId>'));
  assert.ok(web.includes('^0x[0-9a-fA-F]{64}$'), 'Document ID input must be validated');
});
