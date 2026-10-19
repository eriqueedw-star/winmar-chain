import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { NETWORK } from '../organization-api/src/core.mjs';

const tests = path.dirname(fileURLToPath(import.meta.url));
const service = path.resolve(tests, '..');
const repo = path.resolve(service, '../..');
const approvedSha256 =
  'e6f621c211c389398377f251c533b522e3f76117c8428624a5e43407ab5fe5d3';
const pngNames = [
  'assets/winmar-verification-certificate-master.png',
  'assets/winmar-verification-certificate-public.png',
  'services/winmar-document-verification/web/winmar-verification-certificate-master.png',
  'services/winmar-document-verification/web/winmar-verification-certificate-public.png',
];

function browserModule(relativeFile, exportedName) {
  const sandbox = { console };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(readFileSync(path.join(service, relativeFile), 'utf8'),
    sandbox, { filename: relativeFile });
  return sandbox[exportedName];
}

test('public issuance proof, company API and deployed contract metadata match exactly', () => {
  const C = browserModule('web/verification-proof.js', 'WinmarVerificationProof').constants;
  const entry = readFileSync(path.join(service, 'web/app.js'), 'utf8');
  assert.equal(NETWORK.chainId, C.MAINNET_CHAIN_ID);
  assert.equal(NETWORK.feeContract, C.FEE_ADDRESS);
  assert.equal(NETWORK.registryContract, C.VERIFICATION_ADDRESS);
  assert.equal(NETWORK.treasury, C.TREASURY_ADDRESS);
  assert.equal(NETWORK.feeWei, C.FEE_WEI);
  assert.equal(NETWORK.paySelector, C.FEE_SELECTOR);
  assert.equal(NETWORK.feePaidTopic, C.FEE_EVENT);
  assert.equal(NETWORK.documentRegisteredTopic, C.REGISTERED_EVENT);
  assert.match(entry, /const MAINNET_CHAIN_ID = '0xb948e0'/);
  assert.match(entry, /const DOCUMENT_FEE_WEI = '0x775f05a074000'/);
  assert.equal(BigInt('0x775f05a074000'), NETWORK.feeWei);
});

test('all approved master and public artwork variants are byte-identical to owner upload', () => {
  const renderer = browserModule('web/certificate-renderer.js', 'WinmarCertificateRenderer');
  assert.equal(renderer.APPROVED_SHA256, approvedSha256);
  const binary = pngNames.map(name => readFileSync(path.join(repo, name)));
  for (const [i, bytes] of binary.entries()) {
    assert.equal(bytes.length, 2199597, pngNames[i]);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), approvedSha256, pngNames[i]);
    assert.equal(bytes.readUInt32BE(16), 1055, 'approved width');
    assert.equal(bytes.readUInt32BE(20), 1491, 'approved height');
    assert.ok(bytes.equals(binary[0]), 'approved image binary differs from '+pngNames[0]);
  }
});

test('public and company flows never bypass on-chain payment and certificate gate', () => {
  const issue = readFileSync(path.join(service, 'web/app.js'), 'utf8');
  const payProof = readFileSync(path.join(service, 'web/verification-proof.js'), 'utf8');
  const org = readFileSync(path.join(service, 'organization-api/src/server.mjs'), 'utf8');
  assert.match(issue, /preflightNewPayment\(rpc, id\)/,
    'must inspect registry before inviting a new wallet fee');
  assert.match(payProof, /registrationEvent\(rpc, hash, record\.issuer, payment\.blockNumber\)/,
    'must prove a separate on-chain registration receipt');
  assert.match(org, /certificateIssued: false/,
    'proof-only API must not claim unreviewed certificate issuance');
  assert.doesNotMatch(org, /eth_sendTransaction/,
    'company proof API must never send a blockchain transaction');
});
