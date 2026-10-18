import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console };
sandbox.globalThis = sandbox;
vm.runInNewContext(readFileSync(new URL('../web/verification-proof.js', import.meta.url), 'utf8'), sandbox);
const proof = sandbox.WinmarVerificationProof;
const C = proof.constants;

const id = '0x477a80f1f39d85e3b746f621a5271a17c3aa1b6adc9d88401cc7bbf58ae209fc';
const payer = '0xb6e21d958893601f4a90a71ecd41547d54c0b844';
const issuer = '0x853a35b5318fd219ebf98b2a12ca346a9853d975';
const paymentTx = '0x' + '11'.repeat(32);
const registrationTx = '0x' + '22'.repeat(32);
const paymentBlockHash = '0x' + 'aa'.repeat(32);
const registrationBlockHash = '0x' + 'bb'.repeat(32);
const issuedAt = 1792327638n;
const word = (v) => BigInt(v).toString(16).padStart(64, '0');
const indexed = (address) => '0x' + address.slice(2).padStart(64, '0');
const encodedRecord = (revokedAt = 0n) =>
  '0x' + id.slice(2) + indexed(issuer).slice(2) + word(issuedAt) + word(revokedAt) + '0'.repeat(64);
const paymentLog = {
  address: C.FEE_ADDRESS,
  topics: [C.FEE_EVENT, id, indexed(payer), indexed(C.TREASURY_ADDRESS)],
  data: '0x' + word(C.FEE_WEI),
};
const registrationLog = {
  address: C.VERIFICATION_ADDRESS,
  topics: [C.REGISTERED_EVENT, id, id, indexed(issuer)],
  transactionHash: registrationTx,
  blockHash: registrationBlockHash,
};
const paymentReceipt = {
  status: '0x1', to: C.FEE_ADDRESS, blockNumber: '0x64',
  blockHash: paymentBlockHash, logs: [paymentLog],
};
const registeredReceipt = {
  status: '0x1', to: C.VERIFICATION_ADDRESS,
  blockNumber: '0x78', blockHash: registrationBlockHash, logs: [registrationLog],
};

function mockRpc({ registered = true, revoked = false, badAmount = false, currentIssuer = true } = {}) {
  return async (method, params) => {
    switch (method) {
      case 'eth_chainId': return C.MAINNET_CHAIN_ID;
      case 'eth_getTransactionByHash':
        return { to: C.FEE_ADDRESS, from: payer,
          value: '0x' + (badAmount ? 1n : C.FEE_WEI).toString(16),
          input: C.FEE_SELECTOR + id.slice(2) };
      case 'eth_getTransactionReceipt':
        return params[0] === paymentTx ? paymentReceipt :
          params[0] === registrationTx ? registeredReceipt : null;
      case 'eth_call': {
        const data = params[0].data;
        if (data.startsWith('0xb10d6b41')) {
          if (!registered) throw new Error('missing on-chain document');
          return encodedRecord(revoked ? 123n : 0n);
        }
        if (data.startsWith('0x38a7543e')) {
          return '0x' + word(currentIssuer ? 1n : 0n);
        }
        throw new Error('Unknown eth_call selector');
      }
      case 'eth_blockNumber': return '0x78';
      case 'eth_getLogs': return registered ? [registrationLog] : [];
      case 'eth_getBlockByNumber': return { timestamp: '0x' + issuedAt.toString(16) };
      default: throw new Error('Unexpected RPC method ' + method);
    }
  };
}

test('independently proves paid fee and separate authorized hash registration', async () => {
  const result = await proof.check(mockRpc(), id, paymentTx);
  assert.equal(result.status, 'verified');
  assert.equal(result.documentId, id);
  assert.equal(result.registrationTransactionHash, registrationTx);
  assert.equal(result.paymentTransactionHash, paymentTx);
  assert.equal(result.issuerWallet, issuer);
  assert.ok(result.verificationUrl.endsWith(id));
});

test('confirmed payment alone does not issue a verified certificate', async () => {
  const result = await proof.check(mockRpc({ registered: false }), id, paymentTx);
  assert.equal(result.status, 'registration_pending');
});

test('wrong fee amount fails closed', async () => {
  await assert.rejects(proof.check(mockRpc({ badAmount: true }), id, paymentTx), /Payment does not match/);
});

test('revoked document fails closed', async () => {
  await assert.rejects(proof.check(mockRpc({ revoked: true }), id, paymentTx), /revoked/);
});

test('issuer must remain authorized', async () => {
  await assert.rejects(proof.check(mockRpc({ currentIssuer: false }), id, paymentTx), /not currently authorized/);
});

test('invalid document ID rejected before any RPC call', async () => {
  await assert.rejects(proof.check(async () => { throw Error('RPC must not be called'); }, 'bad', paymentTx), /Invalid document ID/);
});
