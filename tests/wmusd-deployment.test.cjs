'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const http = require('node:http');
const { spawn } = require('node:child_process');
const base = 'services/winmar-document-verification/deployment/';
const roles = Object.fromEntries(['ADMIN', 'MINTER', 'BURNER', 'PAUSER'].map(
  (role, i) => ['WMUSD_' + role, '0x' + String(i + 1).padStart(40, '0')]));
function run(script, args = [], env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [base + script, ...args], {
      env: { PATH: process.env.PATH, DEPLOY_ENV: 'staging', CHAIN_ID: '12142818', ...roles, ...env }
    });
    let output = '';
    child.stdout.on('data', d => output += d);
    child.stderr.on('data', d => output += d);
    child.on('error', reject);
    child.on('exit', code => resolve({ code, output }));
  });
}
async function mockRpc(t, chainId) {
  const methods = [];
  const server = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    const input = JSON.parse(body);
    const answer = item => {
      methods.push(item.method);
      assert.equal(item.method, 'eth_chainId', 'Deployment preflight must not sign or broadcast');
      return { jsonrpc: '2.0', id: item.id, result: chainId };
    };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(Array.isArray(input) ? input.map(answer) : answer(input)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return { methods, url: `http://127.0.0.1:${server.address().port}/private-api-key?token=secret-value` };
}
test('staging dry run queries actual RPC chain and never logs signed endpoint', async t => {
  const rpc = await mockRpc(t, '0x' + (12142818).toString(16));
  const result = await run('deploy-wmusd.mjs', ['--dry-run'], { RPC_URL: rpc.url });
  assert.equal(result.code, 0, result.output);
  assert.ok(rpc.methods.includes('eth_chainId'));
  assert.equal(result.output.includes('private-api-key'), false);
  assert.equal(result.output.includes('secret-value'), false);
  const report = JSON.parse(result.output);
  assert.equal(report.initialMintCap, '0');
  for (const key of ['mintingEnabled', 'redemptionEnabled', 'distributionEnabled'])
    assert.equal(report[key], false);
});
test('misconfigured staging RPC is rejected even in dry-run mode', async t => {
  const rpc = await mockRpc(t, '0x' + (12142816).toString(16));
  const result = await run('deploy-wmusd.mjs', ['--dry-run'], { RPC_URL: rpc.url });
  assert.notEqual(result.code, 0);
  assert.match(result.output, /Chain ID mismatch/);
  assert.ok(rpc.methods.includes('eth_chainId'));
});
test('non-staging environments and chain overrides fail before RPC access', async () => {
  for (const env of [{ DEPLOY_ENV: 'production' }, { CHAIN_ID: '12142816' }]) {
    const result = await run('deploy-wmusd.mjs', ['--dry-run'], env);
    assert.notEqual(result.code, 0);
    assert.match(result.output, /staging-only/);
  }
});
test('mainnet script remains hard-blocked even with legacy release confirmation', async () => {
  const result = await run('deploy-wmusd-mainnet-release.mjs', ['--confirm-mainnet'], {
    RELEASE_APPROVAL: 'WMUSD-DORMANT-MAINNET'
  });
  assert.notEqual(result.code, 0);
  assert.match(result.output, /mainnet deployment is blocked pending all pre-launch approvals/);
});
