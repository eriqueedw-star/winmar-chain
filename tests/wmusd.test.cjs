'use strict';
// Isolated in-memory staging EVM. Never connects to Winmar RPC or uses real keys.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ethers = require('ethers');
const ganache = require('ganache');
const solc = require('solc');
const source = 'contracts/WUSD.sol';
const result = JSON.parse(solc.compile(JSON.stringify({
  language: 'Solidity', sources: { [source]: { content: fs.readFileSync(source, 'utf8') } },
  settings: { evmVersion: 'berlin', optimizer: { enabled: true, runs: 200 }, metadata: { bytecodeHash: 'ipfs' },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'metadata'] } } }
}), { import: name => ({ contents: fs.readFileSync(require.resolve(name), 'utf8') }) }));
assert.deepEqual((result.errors || []).filter(e => e.severity === 'error'), []);
const compiled = result.contracts[source].WMUSD;
const abi = new ethers.Interface(compiled.abi);
const ref = ethers.id;
const units = n => BigInt(n) * 1000000n;
const done = async p => (await p).wait();
async function rejects(call, name) {
  await assert.rejects(call, e => {
    assert.equal(abi.parseError(e.data).name, name);
    return true;
  });
}
async function fixture(t) {
  const evm = ganache.provider({ logging: { quiet: true },
    chain: { chainId: 12142818 }, wallet: { totalAccounts: 6 } });
  t.after(() => evm.disconnect());
  const provider = new ethers.BrowserProvider(evm);
  provider.pollingInterval = 10;
  const [admin, minter, burner, pauser, holder, other] = await Promise.all(
    [0, 1, 2, 3, 4, 5].map(i => provider.getSigner(i)));
  const token = await new ethers.ContractFactory(compiled.abi,
    '0x' + compiled.evm.bytecode.object, admin).deploy(
    admin.address, minter.address, burner.address, pauser.address, 0);
  await token.waitForDeployment();
  return { token, admin, minter, burner, pauser, holder, other };
}
async function activate(f) {
  await done(f.token.setMintCap(units(100)));
  await done(f.token.setMintingEnabled(true));
  await done(f.token.setRedemptionEnabled(true));
}
async function mint(f, n, id) {
  await done(f.token.connect(f.minter).mintAgainstReserve(f.holder.address, units(n), ref(id)));
}

test('redemption retries cannot burn twice with sufficient balance and unlimited allowance', async t => {
  const f = await fixture(t); const { token, holder, burner, other } = f;
  await activate(f); await mint(f, 100, 'deposit');
  await done(token.connect(holder).approve(burner.address, ethers.MaxUint256));
  const instruction = ref('redemption');
  const first = await done(token.connect(burner).burnForRedemption(holder.address, units(20), instruction));
  assert.equal(first.logs.map(l => { try { return abi.parseLog(l)?.name; } catch {} })
    .filter(n => n === 'RedemptionBurned').length, 1);
  assert.equal(await token.redemptionReferences(instruction), true);
  // Force a real repeated transaction, rather than relying on estimateGas rejection.
  await assert.rejects(async () => done(token.connect(burner).burnForRedemption(
    holder.address, units(20), instruction, { gasLimit: 300000 })));
  await rejects(() => token.connect(burner).burnForRedemption.staticCall(
    holder.address, units(1), instruction), 'RedemptionAlreadyUsed');
  assert.equal(await token.balanceOf(holder.address), units(80));
  assert.equal(await token.totalSupply(), units(80));
  assert.equal(await token.allowance(holder.address, burner.address), ethers.MaxUint256);
  // References are global, including different holders and newly appointed burners.
  await done(token.grantRole(await token.BURNER_ROLE(), other.address));
  await rejects(() => token.connect(other).burnForRedemption.staticCall(
    other.address, units(1), instruction), 'RedemptionAlreadyUsed');
});

test('failed redemptions preserve reference, allowance and balance for a valid retry', async t => {
  const f = await fixture(t); const { token, holder, burner } = f;
  await activate(f); await mint(f, 100, 'deposit');
  const instruction = ref('retry-after-failure');
  await assert.rejects(async () => done(token.connect(burner).burnForRedemption(
    holder.address, units(10), instruction, { gasLimit: 300000 })));
  assert.equal(await token.redemptionReferences(instruction), false);
  await done(token.connect(holder).approve(burner.address, units(200)));
  await assert.rejects(async () => done(token.connect(burner).burnForRedemption(
    holder.address, units(101), instruction, { gasLimit: 300000 })));
  assert.equal(await token.redemptionReferences(instruction), false);
  assert.equal(await token.allowance(holder.address, burner.address), units(200));
  assert.equal(await token.balanceOf(holder.address), units(100));
  await done(token.connect(burner).burnForRedemption(holder.address, units(10), instruction));
  assert.equal(await token.redemptionReferences(instruction), true);
  assert.equal(await token.allowance(holder.address, burner.address), units(190));
});

test('mint cap limits outstanding supply after partial and full redemption, lifetime counter stays cumulative', async t => {
  const f = await fixture(t); const { token, holder, burner, minter } = f;
  await activate(f); await mint(f, 100, 'deposit-1');
  await done(token.connect(holder).approve(burner.address, ethers.MaxUint256));
  await done(token.connect(burner).burnForRedemption(holder.address, units(40), ref('redeem-1')));
  await rejects(() => token.connect(minter).mintAgainstReserve.staticCall(
    holder.address, units(41), ref('deposit-2')), 'MintCapExceeded');
  assert.equal(await token.reserveReferences(ref('deposit-2')), false);
  // A new independently verified reserve reference is still required for reissuance.
  await mint(f, 40, 'deposit-2');
  assert.equal(await token.totalSupply(), units(100));
  assert.equal(await token.totalMintedAgainstReserve(), units(140));
  await done(token.connect(burner).burnForRedemption(holder.address, units(100), ref('redeem-2')));
  assert.equal(await token.totalSupply(), 0n);
  await rejects(() => token.connect(minter).mintAgainstReserve.staticCall(
    holder.address, units(100), ref('deposit-1')), 'ReserveAlreadyUsed');
  await mint(f, 100, 'deposit-3');
  assert.equal(await token.totalSupply(), units(100));
  assert.equal(await token.totalMintedAgainstReserve(), units(240));
  await rejects(() => token.connect(minter).mintAgainstReserve.staticCall(
    holder.address, 1, ref('overflow')), 'MintCapExceeded');
});

test('prelaunch gates require cap then explicit mint activation and separate distribution approval', async t => {
  const f = await fixture(t); const { token, minter, holder, other, burner } = f;
  assert.equal(await token.mintCap(), 0n);
  for (const gate of ['mintingEnabled', 'redemptionEnabled', 'distributionEnabled'])
    assert.equal(await token[gate](), false);
  await rejects(() => token.setMintingEnabled.staticCall(true), 'MintCapExceeded');
  await rejects(() => token.setDistributionEnabled.staticCall(true), 'MintingDisabled');
  await rejects(() => token.connect(burner).burnForRedemption.staticCall(
    holder.address, 1, ref('closed')), 'RedemptionDisabled');
  await done(token.setMintCap(units(100)));
  await rejects(() => token.connect(minter).mintAgainstReserve.staticCall(
    holder.address, 1, ref('closed')), 'MintingDisabled');
  await done(token.setMintingEnabled(true)); await mint(f, 100, 'deposit');
  await rejects(() => token.connect(holder).transfer.staticCall(other.address, 1), 'DistributionDisabled');
  await done(token.connect(holder).approve(other.address, 1));
  await rejects(() => token.connect(other).transferFrom.staticCall(
    holder.address, other.address, 1), 'DistributionDisabled');
  await done(token.setDistributionEnabled(true));
  await done(token.connect(holder).transfer(other.address, 1));
  await done(token.setDistributionEnabled(false));
  await rejects(() => token.connect(holder).transfer.staticCall(other.address, 1), 'DistributionDisabled');
  await done(token.setMintCap(0));
  assert.equal(await token.mintingEnabled(), false);
  await done(token.setMintCap(units(100)));
  assert.equal(await token.mintingEnabled(), false);
  await rejects(() => token.connect(minter).mintAgainstReserve.staticCall(
    holder.address, 1, ref('still-closed')), 'MintingDisabled');
});

test('role, pause, zero amount and empty-reference protections preserve state', async t => {
  const f = await fixture(t); const { token, minter, holder, burner, pauser, other } = f;
  await activate(f);
  for (const fn of ['setMintCap', 'setMintingEnabled', 'setRedemptionEnabled', 'setDistributionEnabled'])
    await rejects(() => token.connect(other)[fn].staticCall(fn === 'setMintCap' ? 1 : true),
      'AccessControlUnauthorizedAccount');
  await rejects(() => token.connect(other).mintAgainstReserve.staticCall(
    holder.address, 1, ref('unauthorized')), 'AccessControlUnauthorizedAccount');
  await rejects(() => token.connect(other).burnForRedemption.staticCall(
    holder.address, 1, ref('unauthorized')), 'AccessControlUnauthorizedAccount');
  await rejects(() => token.connect(minter).mintAgainstReserve.staticCall(
    holder.address, 0, ref('zero')), 'ZeroAmount');
  assert.equal(await token.reserveReferences(ref('zero')), false);
  await rejects(() => token.connect(minter).mintAgainstReserve.staticCall(
    holder.address, 1, ethers.ZeroHash), 'EmptyReserveReference');
  await rejects(() => token.connect(burner).burnForRedemption.staticCall(
    holder.address, 0, ref('zero')), 'ZeroAmount');
  assert.equal(await token.redemptionReferences(ref('zero')), false);
  await rejects(() => token.connect(burner).burnForRedemption.staticCall(
    holder.address, 1, ethers.ZeroHash), 'EmptyRedemptionReference');
  await mint(f, 100, 'deposit');
  await done(token.connect(holder).approve(burner.address, units(100)));
  await done(token.setDistributionEnabled(true));
  await done(token.connect(pauser).pause());
  await rejects(() => token.connect(minter).mintAgainstReserve.staticCall(
    holder.address, 1, ref('paused')), 'EnforcedPause');
  await rejects(() => token.connect(burner).burnForRedemption.staticCall(
    holder.address, 1, ref('paused')), 'EnforcedPause');
  await rejects(() => token.connect(holder).transfer.staticCall(other.address, 1), 'EnforcedPause');
  await rejects(() => token.connect(pauser).unpause.staticCall(), 'AccessControlUnauthorizedAccount');
  await done(token.unpause());
  await done(token.connect(burner).burnForRedemption(holder.address, 1, ref('paused')));
  await done(token.setRedemptionEnabled(false));
  await rejects(() => token.connect(burner).burnForRedemption.staticCall(
    holder.address, 1, ref('disabled')), 'RedemptionDisabled');
});

// Bytecode is checked as well as source behavior: stale artifacts must fail CI.
test('committed WMUSD artifact matches reviewed source and pinned compiler settings', () => {
  const artifact = JSON.parse(fs.readFileSync('artifacts/WMUSD.json', 'utf8'));
  assert.deepEqual(artifact.abi, compiled.abi);
  assert.equal(artifact.bytecode, '0x' + compiled.evm.bytecode.object);
  assert.equal(artifact.metadata, compiled.metadata);
});
