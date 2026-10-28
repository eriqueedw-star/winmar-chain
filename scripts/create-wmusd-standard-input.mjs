import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const dep = path.join(repo, 'services', 'winmar-document-verification', 'deployment', 'node_modules');
const sources = new Map();

async function addSource(name, file) {
  if (sources.has(name)) return;
  const content = await fs.readFile(file, 'utf8');
  sources.set(name, { content });
  for (const match of content.matchAll(/import\s+(?:[^'\"]+from\s+)?['\"]([^'\"]+)['\"];?/g)) {
    const imp = match[1];
    const resolved = imp.startsWith('@openzeppelin/')
      ? path.join(dep, imp)
      : path.resolve(path.dirname(file), imp);
    const sourceName = name.startsWith('@openzeppelin/')
      ? path.posix.normalize(path.posix.join(path.posix.dirname(name), imp))
      : (imp.startsWith('@openzeppelin/') ? imp : path.relative(repo, resolved).replaceAll('\\', '/'));
    await addSource(sourceName, resolved);
  }
}

await addSource('contracts/WUSD.sol', path.join(repo, 'contracts', 'WUSD.sol'));
const input = {
  language: 'Solidity',
  sources: Object.fromEntries(sources),
  settings: {
    evmVersion: 'berlin',
    optimizer: { enabled: true, runs: 200 },
    metadata: { bytecodeHash: 'ipfs' },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode', 'metadata'] } }
  }
};
await fs.writeFile(path.join(repo, 'output', 'wmusd-standard-input.json'), JSON.stringify(input));
console.log(`sources=${sources.size}`);
