'use strict';
/**
 * Trusted source-IP extraction for a private Unix-domain-socket ingress.
 * Only a locally controlled, locked-down reverse proxy may set this header.
 * NEVER trust these headers over a TCP port reachable by other applications.
 */
const {isIP} = require('node:net');
const {ClaimError} = require('./core.cjs');

function verifiedClientIp(req,mode) {
  if(mode!=='unix') throw new ClaimError(503,'EDGE_NOT_TRUSTED');
  // Unix-domain sockets have no IP peer; reject fallback TCP traffic.
  if(req.socket && req.socket.remoteAddress) throw new ClaimError(503,'EDGE_NOT_TRUSTED');
  const headers=req.headers||{};
  if(headers['x-forwarded-for'] || headers['x-real-ip'] || headers['cf-connecting-ip'] ||
     headers.forwarded) throw new ClaimError(400,'UNVERIFIED_FORWARDING_HEADERS');
  const raw=headers['x-winmar-verified-ip'];
  if(typeof raw!=='string' || raw.length>45 || raw.trim()!==raw || isIP(raw)===0 ||
     raw.includes('%')) throw new ClaimError(503,'VERIFIED_IP_REQUIRED');
  // Normalize conventional IPv4-mapped IPv6 addresses to prevent split quotas.
  return raw.toLowerCase().startsWith('::ffff:') && isIP(raw.slice(7))===4
    ? raw.slice(7) : raw.toLowerCase();
}
module.exports={verifiedClientIp};
