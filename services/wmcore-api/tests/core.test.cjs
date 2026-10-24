'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Wallet } = require('ethers');
const { createEngine, signingMessage } = require('../core.cjs');

const wallet = Wallet.createRandom();
const nowMs = Date.parse('2026-10-25T00:00:00.000Z');
const engine = createEngine({ now: () => nowMs });

async function signed(action, nonce, payload, overrides = {}) {
  const envelope = {
    protocol: 'wmcore',
    version: 1,
    environment: 'testnet',
    account: wallet.address,
    action,
    nonce,
    expiresAt: new Date(nowMs + 60_000).toISOString(),
    payload,
    ...overrides
  };
  return { envelope, signature: await wallet.signMessage(signingMessage(envelope)) };
}

test('exposes four initial testnet perpetual markets with market-specific leverage caps', () => {
  const markets = engine.markets();
  assert.deepEqual(markets.map((m) => m.symbol), ['BTC-USD-PERP', 'ETH-USD-PERP', 'WMC-USD-PERP', 'GOLD-USD-PERP']);
  assert.equal(markets.find((m) => m.symbol === 'BTC-USD-PERP').maxLeverage, 100);
  assert.equal(markets.find((m) => m.symbol === 'WMC-USD-PERP').maxLeverage, 25);
});

test('accepts a correctly signed testnet order', async () => {
  const input = await signed('order.place', 1, { market: 'BTC-USD-PERP', side: 'BUY', type: 'LIMIT', price: '94000', size: '0.01', leverage: 2 });
  const order = engine.place(input);
  assert.equal(order.account, wallet.address);
  assert.equal(order.status, 'OPEN');
});

test('accepts 100x on a market whose risk cap allows it', async () => {
  const input = await signed('order.place', 2, { market: 'BTC-USD-PERP', side: 'BUY', type: 'LIMIT', price: '94000', size: '0.001', leverage: 100 });
  const order = engine.place(input);
  assert.equal(order.leverage, 100);
});

test('rejects leverage above a market-specific risk cap', async () => {
  const input = await signed('order.place', 3, { market: 'WMC-USD-PERP', side: 'BUY', type: 'LIMIT', price: '0.09', size: '10', leverage: 50 });
  assert.throws(() => engine.place(input), /BAD_LEVERAGE/);
});

test('rejects nonce replay', async () => {
  const input = await signed('order.place', 3, { market: 'ETH-USD-PERP', side: 'BUY', type: 'LIMIT', price: '3400', size: '0.1', leverage: 2 });
  assert.throws(() => engine.place(input), /NONCE_REPLAY/);
});

test('rejects wrong signing domain', async () => {
  const envelope = {
    protocol: 'wmcore', version: 1, environment: 'mainnet', account: wallet.address,
    action: 'order.place', nonce: 4, expiresAt: new Date(nowMs + 60_000).toISOString(),
    payload: { market: 'ETH-USD-PERP', side: 'BUY', type: 'MARKET', size: '0.1', leverage: 1 }
  };
  assert.throws(() => signingMessage(envelope), /WRONG_SIGNING_DOMAIN/);
});

test('rejects expired signed action', async () => {
  const input = await signed('order.place', 5, { market: 'WMC-USD-PERP', side: 'BUY', type: 'MARKET', size: '10', leverage: 1 }, { expiresAt: new Date(nowMs - 1).toISOString() });
  assert.throws(() => engine.place(input), /ACTION_EXPIRED/);
});

test('cancel requires a new signed nonce and ownership proof', async () => {
  const placed = engine.place(await signed('order.place', 6, { market: 'GOLD-USD-PERP', side: 'SELL', type: 'LIMIT', price: '2800', size: '0.1', leverage: 50 }));
  const canceled = engine.cancel(await signed('order.cancel', 7, { orderId: placed.id }));
  assert.equal(canceled.status, 'CANCELED');
});
