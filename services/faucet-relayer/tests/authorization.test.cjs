'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Wallet}=require('ethers');
const {createFaucetAuthorization,ClaimError,LIMIT_LUA,CLAIM_LUA}=require('../core.cjs');
let clock=Date.parse('2026-10-10T00:00:00Z');
class MemoryRedis {
  constructor(){this.values=new Map();this.expires=new Map();}
  read(k){if(this.expires.has(k)&&this.expires.get(k)<=clock){this.values.delete(k);this.expires.delete(k);}return this.values.get(k);}
  async get(k){return this.read(k)||null;}
  async set(k,v,o={}){
    if(o.NX&&this.read(k)!==undefined)return null;
    this.values.set(k,v);if(o.EX)this.expires.set(k,clock+o.EX*1000);return 'OK';
  }
  async eval(lua,{keys,arguments:args}){
    if(lua===LIMIT_LUA){
      const previous=Number(this.read(keys[0])||0),next=previous+1;
      this.values.set(keys[0],String(next));if(previous===0)this.expires.set(keys[0],clock+Number(args[0])*1000);
      return next;
    }
    if(lua===CLAIM_LUA){
      if(this.read(keys[3])!==undefined)return 4;
      if(this.read(keys[0])!==args[0])return 0;
      if(this.read(keys[1])!==undefined)return 2;
      const count=Number(this.read(keys[2])||0);
      if(count>=Number(args[1]))return 3;
      this.values.set(keys[1],args[0]);this.expires.set(keys[1],clock+Number(args[2])*1000);
      this.values.set(keys[2],String(count+1));
      if(count===0)this.expires.set(keys[2],clock+Number(args[3])*1000);
      this.values.delete(keys[0]);this.expires.delete(keys[0]);
      this.values.set(keys[3],'reserved');return 1;
    }
    throw Error('Unknown redis script');
  }
}
const hash='0x'+'a'.repeat(64),ip='198.51.100.24',captcha='turnstile-token-testing';
function harness(){
  clock=Date.parse('2026-10-10T00:00:00Z');
  const store=new MemoryRedis(),sent=[];let captchaOk=true,submissionFails=false;
  const service=createFaucetAuthorization({
    store,origin:'https://faucet.winmarchain.io',clock:()=>clock,random:()=>('a'.repeat(63)+'b'),
    verifyCaptcha:async()=>captchaOk,
    submitClaim:async wallet=>{if(submissionFails)throw Error('uncertain receipt');sent.push(wallet);return {hash};}
  });
  return {store,service,sent,setCaptcha:v=>captchaOk=v,setFailure:v=>submissionFails=v};
}
async function request(wallet,ch){
  return {address:wallet.address,signature:await wallet.signMessage(ch.message),captchaToken:captcha};
}
async function rejects(promise,code){await assert.rejects(promise,e=>e instanceof ClaimError&&e.code===code);}
test('wallet challenge is domain and chain bound and cannot be replayed',async()=>{
  const {service,sent}=harness(),wallet=Wallet.createRandom();
  const ch=await service.challenge({address:wallet.address},ip);
  assert.match(ch.message,/https:\/\/faucet\.winmarchain\.io/);
  assert.match(ch.message,/Chain ID: 12142816/);
  const form=await request(wallet,ch);
  const result=await service.claim(form,ip);
  assert.equal(result.status,'submitted');assert.equal(result.txHash,hash);
  assert.deepEqual(sent,[wallet.address]);
  await rejects(service.claim(form,ip),'CHALLENGE_ALREADY_USED');
});
test('signature mismatch and CAPTCHA failure are denied',async()=>{
  const {service,setCaptcha,sent}=harness(),a=Wallet.createRandom(),b=Wallet.createRandom();
  const ch=await service.challenge({address:a.address},ip),form=await request(a,ch);
  await rejects(service.claim({...form,signature:await b.signMessage(ch.message)},ip),'INVALID_WALLET_PROOF');
  setCaptcha(false);await rejects(service.claim(form,ip),'CAPTCHA_FAILED');
  setCaptcha(true);await service.claim(form,ip);assert.equal(sent.length,1);
});
test('malformed, duplicate, and expired challenges fail closed',async()=>{
  const {service,sent}=harness(),w=Wallet.createRandom();
  await rejects(service.challenge({address:'bad'},ip),'BAD_ADDRESS');
  const ch=await service.challenge({address:w.address},ip);
  await rejects(service.challenge({address:w.address},ip),'CHALLENGE_ALREADY_ACTIVE');
  await rejects(service.claim({...await request(w,ch),signature:'x'},ip),'BAD_SIGNATURE');
  clock+=301000;
  await rejects(service.claim(await request(w,ch),ip),'CHALLENGE_EXPIRED');
  assert.equal(sent.length,0);
});
test('wallet cooldown shared by worker replicas',async()=>{
  const {service,store,sent}=harness(),w=Wallet.createRandom();
  const ch=await service.challenge({address:w.address},ip);await service.claim(await request(w,ch),ip);
  clock+=301000;
  const other=createFaucetAuthorization({
    store,origin:'https://faucet.winmarchain.io',clock:()=>clock,
    random:()=>('b'.repeat(64)),verifyCaptcha:async()=>true,
    submitClaim:async recipient=>{sent.push(recipient);return {hash};}
  });
  const next=await other.challenge({address:w.address},ip);
  await rejects(other.claim(await request(w,next),ip),'WALLET_COOLDOWN');
  assert.equal(sent.length,1);
});
test('IP quota limits claims across distinct wallets',async()=>{
  const {service,sent}=harness();
  for(let n=0;n<4;n++){
    const w=Wallet.createRandom(),ch=await service.challenge({address:w.address},ip);
    if(n<3)await service.claim(await request(w,ch),ip);
    else await rejects(service.claim(await request(w,ch),ip),'IP_DAILY_LIMIT');
  }
  assert.equal(sent.length,3);
});
test('challenge request storm is rate limited',async()=>{
  const {service}=harness();
  for(let n=0;n<5;n++)await service.challenge({address:Wallet.createRandom().address},ip);
  await rejects(service.challenge({address:Wallet.createRandom().address},ip),'CHALLENGE_RATE_LIMIT');
});
test('parallel claims only submit once',async()=>{
  const {service,sent}=harness(),w=Wallet.createRandom();
  const ch=await service.challenge({address:w.address},ip),form=await request(w,ch);
  const results=await Promise.allSettled([service.claim(form,ip),service.claim(form,ip)]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(sent.length,1);
});
test('unknown submission requires manual reconciliation and cannot be immediately retried',async()=>{
  const {service,setFailure,sent}=harness(),w=Wallet.createRandom();
  const ch=await service.challenge({address:w.address},ip),form=await request(w,ch);
  setFailure(true);
  await rejects(service.claim(form,ip),'CLAIM_REQUIRES_OPERATOR_RECONCILIATION');
  setFailure(false);
  await rejects(service.claim(form,ip),'CHALLENGE_ALREADY_USED');
  assert.equal(sent.length,0);
});

test('durable per-wallet submission journal survives cooldown and prevents uncertain retry',async()=>{
  const {service,store}=harness(),w=Wallet.createRandom();
  const ch=await service.challenge({address:w.address},ip);
  const form=await request(w,ch);
  const first=await service.claim(form,ip);
  assert.equal(first.status,'submitted');
  const journal='wmc:faucet:pending:'+w.address.toLowerCase();
  assert.equal(await store.get(journal),'submitted:'+hash);
  clock+=86500000; // cooldown expired; pending journal deliberately has no TTL
  const fresh=await service.challenge({address:w.address},ip);
  await rejects(service.claim(await request(w,fresh),ip),'CLAIM_AWAITING_RECONCILIATION');
});
