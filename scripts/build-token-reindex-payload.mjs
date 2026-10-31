import fs from 'node:fs';
import path from 'node:path';

const registryPath = path.resolve(process.argv[2] || 'config/token-registry.json');
const outputPath = path.resolve(process.argv[3] || 'output/token-reindex-payload.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const payload = {
  chainId: registry.chainId,
  generatedAt: new Date().toISOString(),
  mode: 'metadata-only',
  note: 'Apply through the authenticated explorer/indexer admin path. This payload does not submit transactions.',
  tokens: registry.tokens.map(({ address, name, symbol, decimals, logoUrl, website, verified, status }) => ({
    address: address.toLowerCase(), name, symbol, decimals, logoUrl, website, verified, status
  }))
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n');
console.log(`Wrote ${outputPath}`);
