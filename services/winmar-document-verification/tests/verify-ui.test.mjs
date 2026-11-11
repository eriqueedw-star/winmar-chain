import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../web/verify.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../web/verify.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../web/verify.css', import.meta.url), 'utf8');

test('public verify UI uses the approved master and starts certificate actions locked', () => {
  assert.match(html, /winmar-verification-certificate-master\.png/);
  assert.match(html, /certificate-renderer\.js/);
  assert.match(html, /download-certificate" class="button" disabled/);
  assert.match(html, /print-certificate" class="button secondary" disabled/);
  assert.doesNotMatch(html, /WMC-2024-0015837/);
});

test('verification UI implements fail-closed public states and local-only matching', () => {
  for (const required of ['INVALID DOCUMENT ID', 'NO ON-CHAIN DOCUMENT RECORD FOUND',
    'DOCUMENT REVOKED', 'VERIFICATION TEMPORARILY UNAVAILABLE',
    'DOCUMENT HASH MISMATCH', 'VERIFIED ON-CHAIN', 'crypto.subtle.digest']) {
    assert.match(script, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(script, /current\?\.status==='registered'&&actual===current\.documentId/);
  assert.match(script, /verificationUrl/);
});

test('verification page is responsive and preserves the full certificate aspect ratio', () => {
  assert.match(css, /aspect-ratio:1055\/1491/);
  assert.match(css, /@media\(max-width:980px\)/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(html, /PUBLIC VERIFICATION · READ ONLY/);
});
