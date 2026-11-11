import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import solc from 'solc';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const outputDir = path.join(repo, 'artifacts');
const sources = {
  'contracts/DocumentFeePayment.sol': await fs.readFile(path.join(repo, 'contracts/DocumentFeePayment.sol'), 'utf8'),
  'contracts/DocumentVerification.sol': await fs.readFile(path.join(repo, 'contracts/DocumentVerification.sol'), 'utf8'),
  'contracts/WUSD.sol': await fs.readFile(path.join(repo, 'contracts/WUSD.sol'), 'utf8')
};

function findImports(importPath) {
  if (!importPath.startsWith('@openzeppelin/')) return { error: `Unsupported import: ${importPath}` };
  try { return { contents: requireFile(importPath) }; } catch (error) { return { error: error.message }; }
}

function requireFile(importPath) {
  const file = path.join(here, 'node_modules', importPath);
  return require('fs').readFileSync(file, 'utf8');
}

const input = { language: 'Solidity', sources: Object.fromEntries(Object.entries(sources).map(([file, content]) => [file, { content }])), settings: { evmVersion: 'berlin', optimizer: { enabled: true, runs: 200 }, metadata: { bytecodeHash: 'ipfs' }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'metadata'] } } } };
const result = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = result.errors || [];
const fatal = errors.filter((item) => item.severity === 'error');
for (const item of errors) console.log(item.formattedMessage);
if (fatal.length) process.exit(1);

await fs.mkdir(outputDir, { recursive: true });
for (const [file, contracts] of Object.entries(result.contracts || {})) {
  for (const [name, artifact] of Object.entries(contracts)) {
    if (!artifact.evm?.bytecode?.object) continue;
    const payload = { contractName: name, sourceName: file, abi: artifact.abi, bytecode: `0x${artifact.evm.bytecode.object}`, metadata: artifact.metadata };
    const target = path.join(outputDir, `${name}.json`);
    await fs.writeFile(target, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    const digest = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    console.log(`${name}: ${target}`);
    console.log(`sha256=${digest}`);
  }
}
