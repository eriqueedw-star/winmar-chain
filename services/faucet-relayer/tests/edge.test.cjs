'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {verifiedClientIp}=require('../edge.cjs');
function r(headers={},remoteAddress){return {headers,socket:{remoteAddress}};}
test('trusted UDS proxy IP is accepted and normalized',()=>{
 assert.equal(verifiedClientIp(r({'x-winmar-verified-ip':'198.51.100.24'}),'unix'),'198.51.100.24');
 assert.equal(verifiedClientIp(r({'x-winmar-verified-ip':'::ffff:198.51.100.24'}),'unix'),'198.51.100.24');
 assert.equal(verifiedClientIp(r({'x-winmar-verified-ip':'2001:db8::a'}),'unix'),'2001:db8::a');
});
test('TCP and forged IP forwarding fail closed',()=>{
 assert.throws(()=>verifiedClientIp(r({'x-winmar-verified-ip':'198.51.100.24'},'127.0.0.1'),'unix'),/EDGE_NOT_TRUSTED/);
 assert.throws(()=>verifiedClientIp(r({'x-winmar-verified-ip':'198.51.100.24'}),'tcp'),/EDGE_NOT_TRUSTED/);
 assert.throws(()=>verifiedClientIp(r({'x-winmar-verified-ip':'198.51.100.24','x-forwarded-for':'203.0.113.3'}),'unix'),/UNVERIFIED_FORWARDING_HEADERS/);
 assert.throws(()=>verifiedClientIp(r({'x-winmar-verified-ip':'198.51.100.24','cf-connecting-ip':'203.0.113.3'}),'unix'),/UNVERIFIED_FORWARDING_HEADERS/);
});
test('missing, chained, malformed or malicious IP cannot bypass limits',()=>{
 for(const value of [undefined,'','198.51.100.1, 127.0.0.1','198.51.100.1:3333','example.com','127.0.0.1\nX-Bad: x',' 198.51.100.1']){
  const headers=value===undefined?{}:{'x-winmar-verified-ip':value};
  assert.throws(()=>verifiedClientIp(r(headers),'unix'),/VERIFIED_IP_REQUIRED/);
 }
});
