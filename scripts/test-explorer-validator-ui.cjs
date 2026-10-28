const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function main() {
  const response = await fetch('https://scan.winmarchain.io/brand/winmar-brand.js?v=26');
  assert(response.ok, 'Could not read deployed branding script');
  let lines = (await response.text()).split(/\r?\n/);
  const patch = fs.readFileSync(path.join(__dirname, '../ops/explorer-validator-ui.patch'), 'utf8');
  let delta = 0;
  for (const chunk of patch.split(/(?=^@@)/m).slice(1)) {
    const hunk = chunk.trimEnd().split('\n');
    const match = /^@@ -(\d+),(\d+) \+(\d+),(\d+) @@$/.exec(hunk.shift());
    assert(match, 'Malformed patch header');
    const old = hunk.filter((line) => !line.startsWith('+')).map((line) => line.slice(1));
    const replacement = hunk.filter((line) => !line.startsWith('-')).map((line) => line.slice(1));
    assert.equal(old.length, Number(match[2]));
    assert.equal(replacement.length, Number(match[4]));
    const index = Number(match[1]) - 1 + delta;
    assert.deepEqual(lines.slice(index, index + old.length), old, 'Deployed script differs; do not apply blindly');
    lines.splice(index, old.length, ...replacement);
    delta += replacement.length - old.length;
  }
  const source = lines.join('\n');
  new vm.Script(source);
  assert(!source.includes('const VALIDATORS = new Set'));
  assert(source.includes('https://rpc.winmarchain.io'));
  assert(source.includes('https://rpc.winmarchain.com'));
  assert(source.includes("validators ? `${producers.size} / ${validators.size} producing` : 'Unavailable'"));
  const decoder = source.slice(source.indexOf('function consensusValidators'), source.indexOf('const formatNumber'));
  const rpcLoader = source.slice(source.indexOf('async function loadConsensusValidators'), source.indexOf('async function loadLiveData'));
  const context = vm.createContext({ Uint8Array, Set, BigInt, AbortController, setTimeout, clearTimeout, fetch });
  vm.runInContext(decoder + '\n' + rpcLoader, context);

  function encode(value) {
    const list = Array.isArray(value);
    const body = list ? Buffer.concat(value.map(encode)) : Buffer.from(value);
    if (!list && body.length === 1 && body[0] < 128) return body;
    const prefix = list ? 192 : 128;
    if (body.length < 56) return Buffer.concat([Buffer.from([prefix + body.length]), body]);
    let length = body.length.toString(16);
    if (length.length % 2) length = '0' + length;
    const size = Buffer.from(length, 'hex');
    return Buffer.concat([Buffer.from([(list ? 247 : 183) + size.length]), size, body]);
  }
  function fixture(count) {
    return '0x' + encode([Buffer.alloc(32), Array.from({ length: count }, (_, i) => Buffer.alloc(20, i + 1)), [], Buffer.alloc(0), []]).toString('hex');
  }
  for (const count of [4, 5]) {
    assert.equal(context.consensusValidators(fixture(count)).size, count);
  }
  for (const bad of ['0x', '0xc0', fixture(0), fixture(4) + '00', fixture(4).slice(0, -2), '0xff01']) {
    assert.throws(() => context.consensusValidators(bad));
  }
  const duplicate = '0x' + encode([Buffer.alloc(32), [Buffer.alloc(20, 1), Buffer.alloc(20, 1)], [], Buffer.alloc(0), []]).toString('hex');
  assert.throws(() => context.consensusValidators(duplicate));
  const actual = await context.loadConsensusValidators();
  assert(actual.size > 0);
  console.log('PASS: patch matches deployed script; syntax valid; 4/5 validators handled; malformed/duplicate data rejected.');
  console.log('Live consensus validators:', actual.size, [...actual].join(', '));
  context.fetch = async () => ({ ok: true, json: async () => ({ result: '0x1' }) });
  await assert.rejects(context.loadConsensusValidators(), /Wrong chain/);
  context.fetch = async () => ({ ok: false });
  await assert.rejects(context.loadConsensusValidators(), /unavailable/);
  console.log('PASS: wrong-chain and unavailable RPC fail closed. No deployment performed.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
