import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.argv[2] || 'config/token-registry.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const address = /^0x[0-9a-fA-F]{40}$/;
if (data.chainId !== 12142816) throw new Error('Unexpected chainId');
if (!Array.isArray(data.tokens) || data.tokens.length === 0) throw new Error('Registry has no tokens');
const seen = new Set();
for (const token of data.tokens) {
  if (!address.test(token.address)) throw new Error(`Invalid address: ${token.address}`);
  const key = token.address.toLowerCase();
  if (seen.has(key)) throw new Error(`Duplicate token: ${token.address}`);
  seen.add(key);
  if (!token.name || !/^[A-Z0-9]{2,12}$/.test(token.symbol)) throw new Error(`Invalid token identity: ${token.address}`);
  if (!Number.isInteger(token.decimals) || token.decimals < 0 || token.decimals > 255) throw new Error(`Invalid decimals: ${token.address}`);
  if (!/^https:\/\//.test(token.logoUrl)) throw new Error(`Logo must use HTTPS: ${token.address}`);
}
console.log(`Token registry valid: ${data.tokens.length} token(s) on chain ${data.chainId}`);
