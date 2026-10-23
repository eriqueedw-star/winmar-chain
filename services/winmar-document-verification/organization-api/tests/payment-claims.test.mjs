import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { IntentStore } from '../src/storage.mjs';

const documentId = '0x' + 'a1'.repeat(32);
const payerWallet = '0x' + 'b2'.repeat(20);
const paymentTx = '0x' + 'c3'.repeat(32);

async function setup(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'winmar-payment-claim-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new IntentStore(dir);
  const first = await store.create('org_alpha', 'first_request_12345', { documentId, payerWallet });
  const second = await store.create('org_beta', 'second_request_12345', { documentId, payerWallet });
  const third = await store.create('org_alpha', 'third_request_12345', { documentId, payerWallet });
  return { dir, store, first: first.record, second: second.record, third: third.record };
}

test('one paid WMC transaction can belong to only one organization across tenants', async t => {
  const { store, first, second } = await setup(t);
  const initial = await store.attachValidatedProof('org_alpha', first.id, { paymentTxHash: paymentTx });
  assert.equal(initial.paymentTxHash, paymentTx);
  await assert.rejects(
    store.attachValidatedProof('org_beta', second.id, { paymentTxHash: paymentTx }),
    error => error.statusCode === 409 && /another intent/.test(error.message));
  const after = await store.get('org_beta', second.id);
  assert.equal(after.paymentTxHash, null);
});

test('one paid WMC transaction cannot be claimed by two separate intents of one organization', async t => {
  const { store, first, third } = await setup(t);
  await store.attachValidatedProof('org_alpha', first.id, { paymentTxHash: paymentTx });
  await assert.rejects(
    store.attachValidatedProof('org_alpha', third.id, { paymentTxHash: paymentTx }),
    error => error.statusCode === 409 && /another intent/.test(error.message));
});

test('repeated confirmation on the SAME intent keeps payment and registration idempotent', async t => {
  const { store, first } = await setup(t);
  await store.attachValidatedProof('org_alpha', first.id, { paymentTxHash: paymentTx });
  const reg = '0x' + 'de'.repeat(32);
  const updated = await store.attachValidatedProof('org_alpha', first.id, {
    paymentTxHash: paymentTx, registrationTxHash: reg,
  });
  assert.equal(updated.registrationTxHash, reg);
  const again = await store.attachValidatedProof('org_alpha', first.id, { paymentTxHash: paymentTx });
  assert.equal(again.registrationTxHash, reg);
});

test('concurrent payment claims across stores resolve to exactly ONE successful claimant', async t => {
  const { dir, first, second } = await setup(t);
  const one = new IntentStore(dir);
  const two = new IntentStore(dir);
  const results = await Promise.allSettled([
    one.attachValidatedProof('org_alpha', first.id, { paymentTxHash: paymentTx }),
    two.attachValidatedProof('org_beta', second.id, { paymentTxHash: paymentTx }),
  ]);
  const successes = results.filter(x => x.status === 'fulfilled');
  const denials = results.filter(x => x.status === 'rejected');
  assert.equal(successes.length, 1);
  assert.equal(denials.length, 1);
  assert.equal(denials[0].reason.statusCode, 409);
  const paid = await Promise.all([
    one.get('org_alpha', first.id), two.get('org_beta', second.id),
  ]);
  assert.equal(paid.filter(x => x.paymentTxHash === paymentTx).length, 1);
});

test('payment claim survives store restart and cannot be reused by another tenant', async t => {
  const { dir, store, first, second } = await setup(t);
  await store.attachValidatedProof('org_alpha', first.id, { paymentTxHash: paymentTx });
  const restarted = new IntentStore(dir);
  const retried = await restarted.attachValidatedProof('org_alpha', first.id, { paymentTxHash: paymentTx });
  assert.equal(retried.paymentTxHash, paymentTx);
  await assert.rejects(
    restarted.attachValidatedProof('org_beta', second.id, { paymentTxHash: paymentTx }),
    error => error.statusCode === 409);
});

test('corrupt or incomplete global payment reservation fails closed instead of being reset', async t => {
  const { dir, store, first } = await setup(t);
  const payments = path.join(dir, '_payment_claims');
  await mkdir(payments, { recursive: true });
  await writeFile(path.join(payments, paymentTx.slice(2) + '.json'), '{ incomplete');
  await assert.rejects(
    store.attachValidatedProof('org_alpha', first.id, { paymentTxHash: paymentTx }),
    error => error.statusCode === 503 && /operator reconciliation/.test(error.message));
  assert.equal((await store.get('org_alpha', first.id)).paymentTxHash, null);
});

test('reservation file records only ownership metadata, never API keys or PDF content', async t => {
  const { dir, store, first } = await setup(t);
  await store.attachValidatedProof('org_alpha', first.id, { paymentTxHash: paymentTx });
  const file = path.join(dir, '_payment_claims', paymentTx.slice(2) + '.json');
  const raw = await readFile(file, 'utf8');
  const claimed = JSON.parse(raw);
  assert.deepEqual(Object.keys(claimed).sort(), ['intentId','tenantId','transactionHash']);
  assert.equal(claimed.intentId, first.id);
  assert.equal(claimed.tenantId, 'org_alpha');
});
