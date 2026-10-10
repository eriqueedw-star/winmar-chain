'use strict';
/**
 * Preview-only by default; no transactions without every production gate.
 * Deploy only behind an authenticated, HTTPS edge with independently verified
 * real-client IP forwarding. Never use a validator signer or public admin RPC.
 */
const http=require('node:http');
const {URL}=require('node:url');
const {createClient}=require('redis');
const {ethers}=require('ethers');
const {createFaucetAuthorization,ClaimError}=require('./core.cjs');

const enabled=process.env.WMC_ENABLE_LIVE_CLAIMS==='I_ACKNOWLEDGE_MAINNET_RISK';
const origin=process.env.WMC_FAUCET_ORIGIN || 'https://faucet.winmarchain.io';
const contractAddress=process.env.WMC_FAUCET_CONTRACT;
const rpcUrl=process.env.WMC_RPC || 'https://rpc.winmarchain.io';
const key=process.env.WMC_RELAYER_PRIVATE_KEY;
const redisUrl=process.env.REDIS_URL;
const captchaSecret=process.env.TURNSTILE_SECRET;
const port=Number(process.env.PORT||8788);

async function main(){
  if(!redisUrl)throw new Error('REDIS_URL required; never use in-memory authorization state');
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
  if(rpcUrl!=='https://rpc.winmarchain.io')throw new Error('Only canonical RPC allowed');
  if(enabled && (!key||!captchaSecret||!contractAddress||!ethers.isAddress(contractAddress))) {
    throw new Error('Production gate missing audited contract, relayer wallet key or Turnstile key');
  }
  const redis=createClient({url:redisUrl});
  redis.on('error',()=>{ /* fail-closed: requests throw if unavailable; do not log credentials */ });
  await redis.connect();
  const store={
    eval:(lua,args)=>redis.eval(lua,args),
    get:key=>redis.get(key),
    set:(key,value,opts)=>redis.set(key,value,opts)
  };
  const provider=enabled?new ethers.JsonRpcProvider(rpcUrl):null;
  let relay=null,contract=null;
  if(enabled){
    const network=await provider.getNetwork();
    if(network.chainId!==12142816n)throw new Error('RPC chain ID mismatch');
    relay=new ethers.Wallet(key,provider);
    contract=new ethers.Contract(contractAddress,[
      'function claimFor(address recipient)',
      'function relayer() view returns (address)',
      'function paused() view returns (bool)',
      'function availableBalance() view returns (uint256)'
    ],relay);
    if((await contract.relayer()).toLowerCase()!==relay.address.toLowerCase())throw new Error('Relayer not authorized on contract');
    if(await contract.paused())throw new Error('Faucet paused');
    if((await contract.availableBalance())===0n)throw new Error('Faucet unfunded');
  }

  const authorize=createFaucetAuthorization({
    store,origin,
    verifyCaptcha:async(token,ip)=>{
      if(!enabled||!captchaSecret)return false;
      const form=new URLSearchParams({secret:captchaSecret,response:token,remoteip:ip});
      const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
        method:'POST',body:form,signal:AbortSignal.timeout(6500)
      });
      if(!response.ok)return false;
      const data=await response.json();
      return data.success===true && data.hostname===new URL(origin).hostname;
    },
    submitClaim:async(wallet)=>{
      if(!enabled||!contract)throw new Error('Claims disabled');
      const network=await provider.getNetwork();
      if(network.chainId!==12142816n)throw new Error('Wrong network');
      if(await contract.paused())throw new Error('Faucet paused');
      if((await contract.availableBalance())===0n)throw new Error('Faucet depleted');
      if((await contract.relayer()).toLowerCase()!==relay.address.toLowerCase())throw new Error('Relayer changed');
      // A successful broadcast is not a receipt; the client gets the tx hash.
      const tx=await contract.claimFor(wallet);
      return {hash:tx.hash};
    }
  });

  const server=http.createServer(async(req,res)=>{
    const send=(code,payload)=>{res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','access-control-allow-origin':origin,'vary':'Origin'});res.end(JSON.stringify(payload));};
    const url=new URL(req.url||'/',origin);
    if(req.method==='GET'&&url.pathname==='/health'){
      return send(200,{status:'up',claimsEnabled:enabled,chainId:12142816});
    }
    if(req.method==='OPTIONS' && url.pathname.startsWith('/v1/')){
      res.writeHead(204,{'access-control-allow-origin':origin,'access-control-allow-methods':'POST','access-control-allow-headers':'Content-Type','vary':'Origin'});return res.end();
    }
    if(req.method!=='POST'||!['/v1/challenge','/v1/claim'].includes(url.pathname))return send(404,{error:'NOT_FOUND'});
    if(req.headers.origin!==origin)return send(403,{error:'ORIGIN_REJECTED'});
    if(!enabled)return send(503,{error:'FAUCET_NOT_ACTIVATED'});
    if(!(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return send(415,{error:'JSON_REQUIRED'});
    try{
      const bufs=[];let total=0;
      for await(const chunk of req){total+=chunk.length;if(total>8192)throw new ClaimError(413,'BODY_TOO_LARGE');bufs.push(chunk);}
      let data;try{data=JSON.parse(Buffer.concat(bufs).toString('utf8'));}catch(_){throw new ClaimError(400,'INVALID_JSON');}
      // Do not trust caller-supplied X-Forwarded-For. Edge topology must preserve
      // verified client IP on this socket or requests must be rejected upstream.
      const ip=req.socket.remoteAddress;
      if(!ip)throw new ClaimError(503,'PEER_IP_UNAVAILABLE');
      const result=url.pathname==='/v1/challenge'
        ?await authorize.challenge(data,ip)
        :await authorize.claim(data,ip);
      return send(200,result);
    }catch(e){
      if(e instanceof ClaimError)return send(e.status,{error:e.code});
      return send(503,{error:'FAUCET_UNAVAILABLE'});
    }
  });
  server.requestTimeout=10000;server.headersTimeout=10000;
  server.listen(port,'127.0.0.1',()=>process.stdout.write('WMC faucet relayer service listening locally; claims enabled: '+enabled+'\n'));
}
main().catch(()=>{process.stderr.write('Relayer failed closed at startup\n');process.exitCode=1;});
