'use strict';
/**
 * WMC native faucet claim authorization. No persistent in-memory storage.
 * This module never loads a private key or broadcasts a transaction itself.
 * A vetted Redis instance provides atomic cross-worker nonce and quota guards.
 */
const { randomBytes } = require('node:crypto');
const { getAddress, verifyMessage } = require('ethers');

const LIMIT_LUA = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1])) end",
  "return count"
].join('\n');
const CLAIM_LUA = [
  "local nonce = redis.call('GET', KEYS[1])",
  "if not nonce or nonce ~= ARGV[1] then return 0 end",
  "if redis.call('EXISTS', KEYS[2]) == 1 then return 2 end",
  "local count = tonumber(redis.call('GET', KEYS[3]) or '0')",
  "if count >= tonumber(ARGV[2]) then return 3 end",
  "redis.call('SET', KEYS[2], ARGV[1], 'EX', tonumber(ARGV[3]), 'NX')",
  "redis.call('INCR', KEYS[3])",
  "if count == 0 then redis.call('EXPIRE', KEYS[3], tonumber(ARGV[4])) end",
  "redis.call('DEL', KEYS[1])",
  "return 1"
].join('\n');

class ClaimError extends Error {
  constructor(status, code) { super(code); this.status=status; this.code=code; }
}

function createFaucetAuthorization(options) {
  const { store, verifyCaptcha, submitClaim, origin, clock=()=>Date.now(), random=()=>randomBytes(32).toString('hex') } = options;
  if (!store || typeof store.eval !== 'function' || !origin || typeof verifyCaptcha !== 'function' || typeof submitClaim !== 'function') {
    throw new Error('Missing required authorization dependencies');
  }
  if (!/^https:\/\//.test(origin)) throw new Error('Public origin must use HTTPS');

  const challengeExpirySeconds=300, walletHoldSeconds=86400;
  function address(value) {
    if (typeof value !== 'string') throw new ClaimError(400,'BAD_ADDRESS');
    try { return getAddress(value); } catch (_) { throw new ClaimError(400,'BAD_ADDRESS'); }
  }
  function ipKey(ip){ if(typeof ip!=='string' || ip.length>90 || !ip)throw new ClaimError(400,'BAD_PEER_IP');return Buffer.from(ip).toString('base64url'); }

  async function challenge(input,ip){
    const wallet=address(input?.address), ipId=ipKey(ip);
    const count=Number(await store.eval(LIMIT_LUA, {keys:['wmc:faucet:challenge-ip:'+ipId], arguments:['60']}));
    if(count>5)throw new ClaimError(429,'CHALLENGE_RATE_LIMIT');
    const token=random();
    if(!/^[a-f0-9]{64}$/i.test(token))throw new Error('Invalid nonce generator');
    const issued=clock(), expires=issued+challengeExpirySeconds*1000;
    const message=[
      'Winmar Chain Faucet - Gas Sponsored Claim',
      'Origin: '+origin,
      'Chain ID: 12142816',
      'Wallet: '+wallet,
      'Nonce: '+token,
      'Issued At: '+new Date(issued).toISOString(),
      'Expires At: '+new Date(expires).toISOString(),
      'This is a wallet ownership challenge. No payment, transfer, or token approval is authorized.'
    ].join('\n');
    const key='wmc:faucet:nonce:'+wallet.toLowerCase();
    const record=JSON.stringify({message,expires});
    const ok=await store.set(key,record,{NX:true,EX:challengeExpirySeconds});
    if(ok!=='OK')throw new ClaimError(429,'CHALLENGE_ALREADY_ACTIVE');
    return {message,expiresAt:new Date(expires).toISOString()};
  }

  async function claim(input,ip){
    const wallet=address(input?.address), ipId=ipKey(ip);
    if(typeof input?.signature!=='string' || !/^0x[a-f0-9]{130}$/i.test(input.signature))throw new ClaimError(400,'BAD_SIGNATURE');
    if(typeof input?.captchaToken!=='string' || input.captchaToken.length<10 || input.captchaToken.length>2048)throw new ClaimError(400,'BAD_CAPTCHA');
    const nonceKey='wmc:faucet:nonce:'+wallet.toLowerCase();
    const record=await store.get(nonceKey);
    if(!record){
      // A consumed nonce is removed atomically by the claim script. Retain
      // the signed challenge in the per-wallet cooldown slot to distinguish
      // the same previously submitted signature from a truly expired nonce.
      const prior=await store.get('wmc:faucet:wallet:'+wallet.toLowerCase());
      if(prior){
        try {
          const used=JSON.parse(prior);
          if(typeof used.message==='string' && getAddress(verifyMessage(used.message,input.signature))===wallet){
            throw new ClaimError(409,'CHALLENGE_ALREADY_USED');
          }
        }catch(e){ if(e instanceof ClaimError)throw e; }
      }
      throw new ClaimError(400,'CHALLENGE_EXPIRED');
    }
    let saved;try{saved=JSON.parse(record);}catch(_){throw new ClaimError(400,'CHALLENGE_CORRUPT');}
    if(clock()>saved.expires)throw new ClaimError(400,'CHALLENGE_EXPIRED');
    let recovered;
    try { recovered=getAddress(verifyMessage(saved.message,input.signature)); }
    catch(_) { throw new ClaimError(401,'INVALID_WALLET_PROOF'); }
    if(recovered!==wallet)throw new ClaimError(401,'INVALID_WALLET_PROOF');
    const captchaOk=await verifyCaptcha(input.captchaToken,ip);
    if(captchaOk!==true)throw new ClaimError(403,'CAPTCHA_FAILED');
    const dayWindow=Math.floor(clock()/86400000);
    const lockKey='wmc:faucet:wallet:'+wallet.toLowerCase();
    const limitKey='wmc:faucet:claim-ip:'+ipId+':'+dayWindow;
    const ok=Number(await store.eval(CLAIM_LUA,{
      keys:[nonceKey,lockKey,limitKey],
      arguments:[record,'3',String(walletHoldSeconds),'86400']
    }));
    if(ok===0)throw new ClaimError(409,'CHALLENGE_ALREADY_USED');
    if(ok===2)throw new ClaimError(429,'WALLET_COOLDOWN');
    if(ok===3)throw new ClaimError(429,'IP_DAILY_LIMIT');
    if(ok!==1)throw new Error('Authorization store failed closed');

    // Do NOT automatically release the durable wallet lock on submission failure:
    // a transaction could have been broadcast but the response lost.
    // Operator must investigate the chain and reconcile any uncertain result.
    let outcome;
    try{outcome=await submitClaim(wallet);}
    catch(_){throw new ClaimError(503,'CLAIM_REQUIRES_OPERATOR_RECONCILIATION');}
    if(!outcome || typeof outcome.hash!=='string' || !/^0x[0-9a-f]{64}$/i.test(outcome.hash)){
      throw new ClaimError(503,'CLAIM_REQUIRES_OPERATOR_RECONCILIATION');
    }
    return {status:'submitted',txHash:outcome.hash,explorer:'https://scan.winmarchain.io/tx/'+outcome.hash};
  }

  return {challenge,claim};
}
module.exports={createFaucetAuthorization,ClaimError,LIMIT_LUA,CLAIM_LUA};
