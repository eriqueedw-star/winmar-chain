'use strict';
/**
 * Process-level staging smoke test. No WMC signer, no mainnet transaction.
 * Runs the production entrypoint over a private local Unix socket.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {existsSync,mkdtempSync,statSync,rmSync}=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');

async function waitUntil(predicate,ms=10000){
  const start=Date.now();
  while(Date.now()-start<ms){
    if(predicate())return;
    await new Promise(resolve=>setTimeout(resolve,75));
  }
  throw Error('Staging process did not start');
}
function request(socketPath,method,url,headers={}){
  return new Promise((resolve,reject)=>{
    const req=http.request({
      socketPath,path:url,method,
      headers:method==='POST'?{origin:'https://faucet.winmarchain.io','content-type':'application/json',...headers}:headers,
      timeout:2000
    },res=>{
      let data='';
      res.setEncoding('utf8');
      res.on('data',part=>data+=part);
      res.on('end',()=>{try{resolve({status:res.statusCode,body:JSON.parse(data)});}catch(e){reject(e);}});
    });
    req.on('timeout',()=>req.destroy(Error('Request timeout')));
    req.on('error',reject);
    if(method==='POST')req.write(JSON.stringify({address:'0x1111111111111111111111111111111111111111'}));
    req.end();
  });
}
test('Faucet preview is private, starts without signer and blocks all claims',{timeout:25000},async()=>{
  const base=mkdtempSync(path.join(os.tmpdir(),'wmc-p0-'));
  const socket=path.join(base,'f.sock');
  const child=spawn(process.execPath,['server.cjs'],{
    cwd:path.join(__dirname,'..'),
    env:{
      ...process.env,
      WMC_ENABLE_LIVE_CLAIMS:'disabled',
      WMC_RELAYER_PRIVATE_KEY:'',
      WMC_FAUCET_CONTRACT:'',
      WMC_EXPECTED_RELAYER_ADDRESS:'',
      TURNSTILE_SECRET:'',
      WMC_RPC:'https://rpc.winmarchain.io',
      WMC_FAUCET_ORIGIN:'https://faucet.winmarchain.io',
      REDIS_URL:process.env.REDIS_TEST_URL||'redis://127.0.0.1:6379',
      WMC_PROXY_SOCKET:socket
    },
    stdio:['ignore','pipe','pipe']
  });
  let stderr='';
  child.stderr.on('data',x=>stderr+=x.toString('utf8'));
  try{
    await waitUntil(()=>existsSync(socket)||child.exitCode!==null);
    assert.equal(child.exitCode,null,'Process exited early: '+stderr);
    assert.equal(statSync(socket).mode&0o777,0o600,'Socket must be owner-only');
    const health=await request(socket,'GET','/health');
    assert.equal(health.status,200);
    assert.equal(health.body.claimsEnabled,false);
    assert.equal(health.body.chainId,12142816);
    for(const route of ['/v1/challenge','/v1/claim']){
      const blocked=await request(socket,'POST',route,{'x-winmar-verified-ip':'198.51.100.23'});
      assert.equal(blocked.status,503,'Disabled route must not claim WMC');
      assert.equal(blocked.body.error,'FAUCET_NOT_ACTIVATED');
    }
    const forged=await request(socket,'POST','/v1/claim',{
      'x-winmar-verified-ip':'198.51.100.23',
      'x-forwarded-for':'203.0.113.1'
    });
    assert.equal(forged.status,503);
  }finally{
    child.kill('SIGTERM');
    await new Promise(resolve=>{
      if(child.exitCode!==null||child.signalCode!==null)return resolve();
      child.once('close',resolve);
      setTimeout(resolve,3000).unref();
    });
    rmSync(base,{recursive:true,force:true});
  }
});
