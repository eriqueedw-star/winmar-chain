import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApi } from '../src/server.mjs';
import { IntentStore } from '../src/storage.mjs';
import {
  NETWORK, indexedAddress, sha256, parseApprovedClients,
  authenticateBearer, validatePayment, validateRegistration, normalizeWallet,
} from '../src/core.mjs';

const samplePdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
const digest = sha256(samplePdf);
const documentId = '0x' + digest;
const payer = '0x' + 'b'.repeat(40);
const issuer = '0x' + 'c'.repeat(40);
const payTx = '0x' + '1'.repeat(64);
const regTx = '0x' + '2'.repeat(64);
const timestamp = 1792000123;
const word = n => BigInt(n).toString(16).padStart(64,'0');
const registeredRecord = '0x' + digest + issuer.slice(2).padStart(64,'0') +
  word(timestamp) + word(0) + '0'.repeat(64);
const paymentLog = {
  address: NETWORK.feeContract,
  topics: [NETWORK.feePaidTopic, documentId,
    indexedAddress(payer), indexedAddress(NETWORK.treasury)],
  data: '0x' + NETWORK.feeWei.toString(16),
};
const registrationLog = {
  address: NETWORK.registryContract,
  topics: [NETWORK.documentRegisteredTopic, documentId, documentId, indexedAddress(issuer)],
  data: '0x',
};
function rpcFixture({ pendingPayment = false, pendingRegistration = false,
                      revoked = false, badFee = false, badNetwork = false } = {}) {
  return async (method, params = []) => {
    if (method === 'eth_chainId') return badNetwork ? '0x1' : NETWORK.chainId;
    if (method === 'eth_getTransactionReceipt') {
      if (params[0] === payTx) return pendingPayment ? null : {
        status: '0x1', to: NETWORK.feeContract, blockNumber: '0x64', logs: [paymentLog],
      };
      return pendingRegistration ? null : {
        status: '0x1', to: NETWORK.registryContract, blockNumber: '0x66',
        logs: [registrationLog],
      };
    }
    if (method === 'eth_getTransactionByHash') {
      if (params[0] === payTx) return {
        from: payer, to: NETWORK.feeContract,
        value: '0x' + (badFee ? 1n : NETWORK.feeWei).toString(16),
        input: NETWORK.paySelector + digest,
      };
      return { from: issuer, to: NETWORK.registryContract };
    }
    if (method === 'eth_call') {
      if (params[0].data.startsWith(NETWORK.issuerSelector)) return '0x' + word(1);
      return revoked
        ? '0x' + digest + issuer.slice(2).padStart(64,'0') +
          word(timestamp) + word(1) + '0'.repeat(64)
        : registeredRecord;
    }
    if (method === 'eth_getBlockByNumber') {
      return { timestamp: '0x' + timestamp.toString(16) };
    }
    throw Error('Unexpected method ' + method);
  };
}
function keyConfig(secret, scopes, id) {
  return {
    id,
    keySha256: createHash('sha256').update(secret).digest('hex'),
    status: 'approved', scopes,
  };
}
async function withApi(t, rpc = rpcFixture()) {
  const dir = await mkdtemp(path.join(tmpdir(),'wmc-organization-test-'));
  const key1 = randomBytes(32).toString('base64url');
  const key2 = randomBytes(32).toString('base64url');
  const readOnlyKey = randomBytes(32).toString('base64url');
  const fullScopes = [
    'verification:intents:create',
    'verification:intents:read',
    'verification:intents:confirm',
  ];
  const clients = [
    keyConfig(key1, fullScopes, 'org_one'),
    keyConfig(key2, fullScopes, 'org_two'),
    keyConfig(readOnlyKey, ['verification:intents:read'], 'org_readonly'),
  ];
  const server = createServer(createApi({ clients, store: new IntentStore(dir), rpc }));
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await rm(dir,{recursive:true,force:true});
  });
  return {
    url: 'http://127.0.0.1:' + server.address().port,
    key1, key2, readOnlyKey,
  };
}
async function intent(f, key = f.key1, request = 'idempotent_req_1234') {
  const response = await fetch(f.url+'/v1/intents', {
    method:'POST',
    headers: {
      Authorization: 'Bearer '+key,
      'Content-Type':'application/pdf',
      'Idempotency-Key':request,
      'X-Payer-Wallet':payer,
    },
    body:samplePdf,
  });
  return { status:response.status, body:await response.json() };
}
async function getIntent(f,id,key=f.key1) {
  const response = await fetch(f.url+'/v1/intents/'+id, {
    headers:{Authorization:'Bearer '+key},
  });
  return { status:response.status, body:await response.json() };
}
async function confirm(f,id,registrationTxHash=null,key=f.key1) {
  const response = await fetch(f.url+'/v1/intents/'+id+'/confirm', {
    method:'POST',
    headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({paymentTxHash:payTx,registrationTxHash}),
  });
  return { status:response.status, body:await response.json() };
}

test('owner-locked mainnet addresses, chain and fee remain unchanged', () => {
  assert.equal(NETWORK.chainIdDecimal,12142816);
  assert.equal(NETWORK.feeWei,2100000000000000n);
  assert.equal(NETWORK.feeContract,'0xcec232bd11f03006ecc80917f5cd55bbf247617d');
  assert.equal(NETWORK.registryContract,'0x53fb6ba2997a50d3ddfff5395a3bb9b7b24b7aef');
});

test('source PDF fingerprint is computed from exact original bytes', () => {
  assert.equal(digest,createHash('sha256').update(samplePdf).digest('hex'));
  assert.equal(normalizeWallet(payer),payer);
});

test('API key authentication uses hash and enforces revoked/insufficient scopes', () => {
  const key = randomBytes(32).toString('base64url');
  const clients = parseApprovedClients(JSON.stringify([
    keyConfig(key,['verification:intents:read'],'org_test'),
  ]));
  assert.equal(authenticateBearer('Bearer '+key,clients,'verification:intents:read').id,'org_test');
  assert.throws(() => authenticateBearer('Bearer '+key,clients,'verification:intents:confirm'), /scope/);
  clients[0].status='revoked';
  assert.throws(() => authenticateBearer('Bearer '+key,clients,'verification:intents:read'),/revoked/);
});

test('one fee payment is not a registered document', async () => {
  const status = await validatePayment(rpcFixture(), {
    documentId,payerWallet:payer,paymentTxHash:payTx,
  });
  assert.equal(status.status,'payment_confirmed_registration_pending');
});
test('fee mismatch and wrong chain fail closed', async () => {
  const args = {documentId,payerWallet:payer,paymentTxHash:payTx};
  await assert.rejects(validatePayment(rpcFixture({badFee:true}),args), /Payment does not match/);
  await assert.rejects(validatePayment(rpcFixture({badNetwork:true}),args), /Wrong RPC network/);
});
test('registration validates authorized issuer, event and non-revoked contract record', async () => {
  const status = await validateRegistration(rpcFixture(),{
    documentId,paymentBlock:'0x64',registrationTxHash:regTx,
  });
  assert.equal(status.status,'registered');
  assert.equal(status.issuerWallet,issuer);
  assert.equal(status.certificateIssued,false);
});
test('revoked registration fails closed even with a valid payment', async () => {
  await assert.rejects(validateRegistration(rpcFixture({revoked:true}),{
    documentId,paymentBlock:'0x64',registrationTxHash:regTx,
  }),/revoked/);
});

test('HTTP health does not expose any organization configuration', async t => {
  const f=await withApi(t);
  const r=await fetch(f.url+'/healthz');
  assert.equal(r.status,200);
  assert.deepEqual(await r.json(),{status:'alive'});
});
test('HTTP denies API access when no Bearer token is provided', async t => {
  const f=await withApi(t);
  const r=await fetch(f.url+'/v1/intents',{method:'POST',body:samplePdf});
  assert.equal(r.status,401);
});
test('organization creates idempotent hash-bound intent, not a certificate', async t => {
  const f=await withApi(t);
  const first=await intent(f);
  const again=await intent(f);
  assert.equal(first.status,201);
  assert.equal(again.status,200);
  assert.equal(first.body.intentId,again.body.intentId);
  assert.equal(first.body.documentId,documentId);
  assert.equal(first.body.certificateIssued,false);
});
test('idempotency key cannot be reused for a different wallet',async t=>{
  const f=await withApi(t);
  const initial=await intent(f);
  assert.equal(initial.status,201);
  const res=await fetch(f.url+'/v1/intents',{
    method:'POST',
    headers:{
      Authorization:'Bearer '+f.key1,
      'Content-Type':'application/pdf',
      'Idempotency-Key':['idempotent','req','1234'].join('_'),
      'X-Payer-Wallet':'0x'+'d'.repeat(40),
    },
    body:samplePdf,
  });
  assert.equal(res.status,409);
});
test('tenant cannot view another tenant intent', async t => {
  const f=await withApi(t);
  const created=await intent(f);
  const other=await getIntent(f,created.body.intentId,f.key2);
  assert.equal(other.status,404);
});
test('read-only key cannot submit payment confirmation', async t => {
  const f=await withApi(t);
  const created=await intent(f);
  const attempt=await confirm(f,created.body.intentId,null,f.readOnlyKey);
  assert.equal(attempt.status,403);
});
test('paid but registration pending cannot issue certificate', async t => {
  const f=await withApi(t);
  const created=await intent(f);
  const paid=await confirm(f,created.body.intentId);
  assert.equal(paid.status,202);
  assert.equal(paid.body.certificateIssued,false);
  assert.equal(paid.body.status,'payment_confirmed_registration_pending');
});
test('confirmed registration returns on-chain record but no unapproved PDF', async t => {
  const f=await withApi(t);
  const created=await intent(f);
  const proof=await confirm(f,created.body.intentId,regTx);
  assert.equal(proof.status,200);
  assert.equal(proof.body.status,'registered');
  assert.equal(proof.body.registrationTxHash,regTx);
  assert.equal(proof.body.certificateIssued,false);
  const status=await getIntent(f,created.body.intentId);
  assert.equal(status.body.status,'registered');
});
test('registered but revoked record cannot be reported as active', async t => {
  const f=await withApi(t,rpcFixture({revoked:true}));
  const created=await intent(f);
  const result=await confirm(f,created.body.intentId,regTx);
  assert.equal(result.status,409);
  const current=await getIntent(f,created.body.intentId);
  assert.equal(current.body.certificateIssued,false);
});
