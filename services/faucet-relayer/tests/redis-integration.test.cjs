'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createClient}=require('redis');
const {Wallet}=require('ethers');
const {createFaucetAuthorization}=require('../core.cjs');
test('real Redis atomically consumes a signed challenge and keeps a durable reconciliation record',async(t)=>{
 const url=process.env.REDIS_TEST_URL;
 if(!url){t.skip('Requires isolated Redis test service');return;}
 const client=createClient({url});
 await client.connect();t.after(async()=>client.quit());
 const store={eval:(src,args)=>client.eval(src,args),get:k=>client.get(k),set:(k,v,o)=>client.set(k,v,o)};
 const w=Wallet.createRandom(),ip='203.0.113.19',hash='0x'+'1'.repeat(64);
 const options={store,origin:'https://faucet.winmarchain.io',
   verifyCaptcha:async()=>true,submitClaim:async()=>({hash})};
 const serviceA=createFaucetAuthorization(options);
 const serviceB=createFaucetAuthorization(options);
 const ch=await serviceA.challenge({address:w.address},ip);
 const payload={address:w.address,signature:await w.signMessage(ch.message),captchaToken:'valid-mock-only'};
 const concurrent=await Promise.allSettled([serviceA.claim(payload,ip),serviceB.claim(payload,ip)]);
 assert.equal(concurrent.filter(x=>x.status==='fulfilled').length,1);
 const key='wmc:faucet:pending:'+w.address.toLowerCase();
 assert.equal(await client.get(key),'submitted:'+hash);
 assert.equal(await client.ttl(key),-1,'No TTL: unresolved transfer never auto-unlocks');
 assert.ok((await client.ttl('wmc:faucet:wallet:'+w.address.toLowerCase()))>0);
 await assert.rejects(()=>serviceA.claim(payload,ip));
});
