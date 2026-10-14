const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
async function main() {
  const base = 'https://scan.winmarchain.io';
  const response = await fetch(base + '/brand/winmar-brand.js?verify=' + Date.now());
  assert(response.ok);
  let lines = (await response.text()).split(/\r?\n/);
  const patch = fs.readFileSync(path.join(__dirname, '../ops/explorer-validator-ui-same-origin.patch'), 'utf8');
  let delta = 0;
  for (const chunk of patch.split(/(?=^@@)/m).slice(1)) {
    const hunk = chunk.trimEnd().split('\n');
    const match = /^@@ -(\d+),(\d+) \+(\d+),(\d+) @@$/.exec(hunk.shift());
    assert(match);
    const old = hunk.filter((line) => !line.startsWith('+')).map((line) => line.slice(1));
    const next = hunk.filter((line) => !line.startsWith('-')).map((line) => line.slice(1));
    assert.equal(old.length, Number(match[2]));
    assert.equal(next.length, Number(match[4]));
    const index = Number(match[1]) - 1 + delta;
    assert.deepEqual(lines.slice(index, index + old.length), old, 'Live source changed; stop deployment');
    lines.splice(index, old.length, ...next);
    delta += next.length - old.length;
  }
  const source = lines.join('\n');
  new vm.Script(source);
  assert(source.includes("fetch('/api/eth-rpc'"));
  assert(!source.includes(": 'Unavailable'"));
  const decoder = source.slice(source.indexOf('function consensusValidators'), source.indexOf('const formatNumber'));
  const loader = source.slice(source.indexOf('async function loadConsensusValidators'), source.indexOf('async function loadLiveData'));
  const requests = [];
  const context = vm.createContext({ Uint8Array, Set, BigInt, AbortController, setTimeout, clearTimeout,
    fetch: async (url, options) => {
      assert.equal(url, '/api/eth-rpc');
      assert.equal(options.cache, undefined);
      requests.push(JSON.parse(options.body).method);
      return fetch(new URL(url, base), options);
    },
  });
  vm.runInContext(decoder + '\n' + loader, context);
  const validators = await context.loadConsensusValidators();
  assert(validators.size > 0);
  assert.deepEqual(requests, ['eth_chainId', 'eth_getBlockByNumber']);
  const blocks = await (await fetch(base + '/api/v2/blocks')).json();
  const producers = new Set(blocks.items.map((block) => block.miner?.hash?.toLowerCase()).filter((address) => validators.has(address)));
  const sample = blocks.items.slice(0, 20);
  const interval = (Date.parse(sample[0].timestamp) - Date.parse(sample[sample.length - 1].timestamp)) /
    (sample[0].height - sample[sample.length - 1].height) / 1000;
  assert(Number.isFinite(interval) && interval > 0);
  console.log('PASS: patch matches live source; JavaScript syntax valid; only same-origin read methods used.');
  console.log(`Live API result: ${producers.size}/${validators.size} producing; recent interval ${interval.toFixed(1)} sec.`);
  context.fetch = async () => ({ ok: false });
  await assert.rejects(context.loadConsensusValidators(), /unavailable/);
  console.log('PASS: request failure stays unverified, with no invented validator count. NOT deployed yet.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
