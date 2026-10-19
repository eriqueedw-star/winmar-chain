#!/usr/bin/env node
// Server-side integration example ONLY. Do not use this file in browser code.
// The customer wallet signs a SEPARATE user-approved on-chain transaction.
// This sample never signs payments or registers documents on-chain.
import { readFile } from 'node:fs/promises';

const endpoint = process.env.WINMAR_ORG_API_URL;
const key = process.env.WINMAR_ORG_API_KEY;
if (!endpoint || !key) {
  console.error('Set WINMAR_ORG_API_URL and WINMAR_ORG_API_KEY in your private backend environment.');
  process.exit(2);
}
const root = new URL(endpoint);
if (!['https:', 'http:'].includes(root.protocol) ||
    (root.protocol === 'http:' && root.hostname !== '127.0.0.1' &&
     root.hostname !== 'localhost')) {
  throw Error('Remote organization API must use HTTPS');
}

async function request(path, { method = 'GET', data, headers = {} } = {}) {
  const url = new URL(path, root);
  if (url.origin !== root.origin) throw Error('Unsafe API URL');
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: 'Bearer ' + key, ...headers,
    },
    body: data,
    signal: AbortSignal.timeout(12000),
  });
  const result = await response.json();
  if (!response.ok) {
    throw Error('Organization API returned HTTP ' + response.status +
      ': ' + (result.error || 'request failed'));
  }
  // DO NOT log or store API keys or customer PDF contents.
  return result;
}

const [action, ...args] = process.argv.slice(2);
if (action === 'prepare') {
  const [fileName, payerWallet, idempotencyKey] = args;
  if (!fileName || !payerWallet || !idempotencyKey) {
    throw Error('Usage: prepare <source.pdf> <payer-wallet> <reusable-idempotency-key>');
  }
  const bytes = await readFile(fileName);
  const intent = await request('/v1/intents', {
    method: 'POST', data: bytes,
    headers: {
      'Content-Type': 'application/pdf',
      'X-Payer-Wallet': payerWallet,
      'Idempotency-Key': idempotencyKey,
    },
  });
  console.log(JSON.stringify(intent, null, 2));
  console.log('NEXT: Customer explicitly approves fee using their own wallet. This script cannot charge it.');
} else if (action === 'confirm') {
  const [id, paymentTxHash, registrationTxHash] = args;
  if (!id || !paymentTxHash) {
    throw Error('Usage: confirm <intent-id> <payment-tx> [distinct-registration-tx]');
  }
  const result = await request('/v1/intents/' + encodeURIComponent(id) + '/confirm', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    data:JSON.stringify({ paymentTxHash, registrationTxHash }),
  });
  console.log(JSON.stringify(result,null,2));
  if (result.status !== 'registered') {
    console.log('PENDING: Keep original payment reference. Do not charge the customer again.');
  } else {
    console.log('Registration confirmed. A separate approved official PDF issuer is still required.');
  }
} else if (action === 'status') {
  const [id] = args;
  if (!id) throw Error('Usage: status <intent-id>');
  console.log(JSON.stringify(
    await request('/v1/intents/' + encodeURIComponent(id)), null, 2));
} else {
  console.error('Usage: partner-client.mjs prepare|confirm|status ...');
  process.exitCode = 2;
}
