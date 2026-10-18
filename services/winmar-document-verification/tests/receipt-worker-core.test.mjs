import assert from 'node:assert/strict';
import test from 'node:test';
import { assessDocument, processWindow, selectWindow,
  PAYMENT_DEPLOYMENT_BLOCK, MAX_BLOCKS_PER_BATCH } from '../deployment/receipt-worker-core.mjs';

const documentId = '0x' + 'ab'.repeat(32);
const issuer = '0x' + 'cd'.repeat(20);
const issuerTx = '0x' + 'ff'.repeat(32);
const paymentTx1 = '0x' + '11'.repeat(32);
const paymentTx2 = '0x' + '22'.repeat(32);
const zero = '0x' + '00'.repeat(32);
const missing = { documentHash: zero, issuer: '0x' + '00'.repeat(20),
  issuedAt: 0n, revokedAt: 0n };
const registered = { documentHash: documentId, issuer,
  issuedAt: 1790000000n, revokedAt: 0n };
const event = (hash, block = PAYMENT_DEPLOYMENT_BLOCK + 2) =>
  ({ transactionHash: hash, blockNumber: block, index: 0, args: { documentId } });

test('zero-value Solidity tuple is NOT an already-registered document', () => {
  assert.equal(assessDocument(missing, documentId), 'missing');
  assert.equal(assessDocument(registered, documentId), 'registered');
});
test('conflicting registered hash is rejected rather than overwritten', () => {
  assert.throws(() => assessDocument({ ...registered, documentHash: zero }, documentId),
    /conflicting/);
});
test('revoked document is blocked, never issued again', () => {
  assert.throws(() => assessDocument({ ...registered, revokedAt: 1n }, documentId),
    /revoked/);
});
test('initial scan begins at the actual payment deployment block', () => {
  const window = selectWindow(null, PAYMENT_DEPLOYMENT_BLOCK + 1000);
  assert.equal(window.from, PAYMENT_DEPLOYMENT_BLOCK);
  assert.equal(window.to - window.from + 1, MAX_BLOCKS_PER_BATCH);
});
test('cursor scan replays past blocks and skips unconfirmed chain tip', () => {
  const window = selectWindow(PAYMENT_DEPLOYMENT_BLOCK + 80, PAYMENT_DEPLOYMENT_BLOCK + 82);
  assert.equal(window.from, PAYMENT_DEPLOYMENT_BLOCK + 75);
  assert.equal(window.to, PAYMENT_DEPLOYMENT_BLOCK + 80);
});

test('payment event registers only after distinct issuer receipt and re-read', async () => {
  const state = { lastBlock: null, processed: {}, pending: {} };
  const writes = [];
  let complete = false, registrations = 0, receipts = 0;
  const result = await processWindow({
    state, latestBlock: PAYMENT_DEPLOYMENT_BLOCK + 15,
    getEvents: async () => [event(paymentTx1)],
    getDocument: async () => complete ? registered : missing,
    registerDocument: async () => { registrations++; return { hash: issuerTx }; },
    getRegistrationReceipt: async () => { receipts++; complete = true; return { status: 1 }; },
    saveState: async (s) => { writes.push({
      cursor: s.lastBlock, pending: Object.keys(s.pending).length,
      processed: Object.keys(s.processed).length,
    }); },
  });
  assert.equal(result.status, 'processed');
  assert.equal(result.processed, 1);
  assert.equal(registrations, 1);
  assert.equal(receipts, 1);
  assert.ok(writes.some(x => x.pending === 1 && x.processed === 0),
    'Issuer transaction hash must be durably written BEFORE waiting for its receipt');
  assert.equal(state.pending[Object.keys(state.pending)[0]], undefined);
  assert.equal(Object.keys(state.processed).length, 1);
  assert.ok(state.processed[Object.keys(state.processed)[0]].verificationTx === issuerTx);
});

test('an unconfirmed issuer receipt never advances cursor or resends on retry', async () => {
  const state = { lastBlock: null, processed: {}, pending: {} };
  let registerCalls = 0, receiptReady = false, registeredOnChain = false;
  const args = {
    state, latestBlock: PAYMENT_DEPLOYMENT_BLOCK + 15,
    getEvents: async () => [event(paymentTx1)],
    getDocument: async () => registeredOnChain ? registered : missing,
    registerDocument: async () => { registerCalls++; return { hash: issuerTx }; },
    getRegistrationReceipt: async () => {
      if (!receiptReady) return null;
      registeredOnChain = true; return { status: 1 };
    },
    saveState: async () => {},
  };
  await assert.rejects(processWindow(args), /pending/);
  assert.equal(state.lastBlock, null);
  assert.equal(Object.keys(state.pending).length, 1);
  receiptReady = true;
  const result = await processWindow(args);
  assert.equal(result.processed, 1);
  assert.equal(registerCalls, 1, 'No duplicate issuer transaction after restart');
  assert.equal(Object.keys(state.pending).length, 0);
});

test('network error on document getter never causes an issuer transaction', async () => {
  const state = { lastBlock: null, processed: {}, pending: {} };
  let registers = 0;
  await assert.rejects(processWindow({
    state, latestBlock: PAYMENT_DEPLOYMENT_BLOCK + 12,
    getEvents: async () => [event(paymentTx1)],
    getDocument: async () => { throw new Error('RPC gateway timed out'); },
    registerDocument: async () => { registers++; return { hash: issuerTx }; },
    getRegistrationReceipt: async () => ({ status: 1 }),
    saveState: async () => {},
  }), /RPC gateway timed out/);
  assert.equal(registers, 0);
  assert.equal(state.lastBlock, null);
});

test('a failed later payment keeps cursor behind it, preserving retry', async () => {
  const state = { lastBlock: null, processed: {}, pending: {} };
  const x = event(paymentTx1, PAYMENT_DEPLOYMENT_BLOCK + 1);
  const y = event(paymentTx2, PAYMENT_DEPLOYMENT_BLOCK + 2);
  let first = true;
  const args = {
    state, latestBlock: PAYMENT_DEPLOYMENT_BLOCK + 18,
    getEvents: async () => [x, y],
    getDocument: async () => { if (!first) return registered; return registered; },
    registerDocument: async () => { throw new Error('Must not register already confirmed'); },
    getRegistrationReceipt: async () => null,
    saveState: async () => {},
  };
  // Ensure a failure after the first processed event cannot advance cursor.
  let called = 0;
  args.getDocument = async () => {
    called++;
    if (called === 2 && first) throw new Error('Temporary RPC failure');
    return registered;
  };
  await assert.rejects(processWindow(args), /Temporary RPC failure/);
  assert.equal(Object.keys(state.processed).length, 1);
  assert.equal(state.lastBlock, null);
  first = false;
  const res = await processWindow(args);
  assert.equal(res.processed, 1);
  assert.equal(Object.keys(state.processed).length, 2);
  assert.ok(state.lastBlock >= PAYMENT_DEPLOYMENT_BLOCK + 2);
});
