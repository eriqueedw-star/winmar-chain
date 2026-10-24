'use strict';

const { createHash, randomUUID } = require('node:crypto');
const { getAddress, verifyMessage } = require('ethers');

const PROTOCOL = 'wmcore';
const VERSION = 1;
const ENVIRONMENT = 'testnet';

const MARKETS = Object.freeze([
  { symbol: 'BTC-USD-PERP', base: 'BTC', quote: 'USD', maxLeverage: 5, tickSize: '0.1', lotSize: '0.001', markPrice: '95000.0' },
  { symbol: 'ETH-USD-PERP', base: 'ETH', quote: 'USD', maxLeverage: 5, tickSize: '0.01', lotSize: '0.01', markPrice: '3500.00' },
  { symbol: 'WMC-USD-PERP', base: 'WMC', quote: 'USD', maxLeverage: 5, tickSize: '0.0001', lotSize: '1', markPrice: '0.1000' },
  { symbol: 'GOLD-USD-PERP', base: 'GOLD', quote: 'USD', maxLeverage: 5, tickSize: '0.1', lotSize: '0.01', markPrice: '2750.0' }
]);

class ApiError extends Error {
  constructor(status, code, message = code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
}

function payloadHash(payload) {
  return createHash('sha256').update(stable(payload)).digest('hex');
}

function signingMessage(envelope) {
  const account = getAddress(envelope.account);
  if (envelope.protocol !== PROTOCOL || envelope.version !== VERSION || envelope.environment !== ENVIRONMENT) {
    throw new ApiError(400, 'WRONG_SIGNING_DOMAIN');
  }
  if (!Number.isSafeInteger(envelope.nonce) || envelope.nonce < 1) throw new ApiError(400, 'BAD_NONCE');
  const expiry = Date.parse(envelope.expiresAt);
  if (!Number.isFinite(expiry)) throw new ApiError(400, 'BAD_EXPIRY');
  return [
    'Winmar Chain Financial Action',
    'Protocol: ' + PROTOCOL,
    'Version: ' + VERSION,
    'Environment: ' + ENVIRONMENT,
    'Account: ' + account,
    'Action: ' + envelope.action,
    'Nonce: ' + envelope.nonce,
    'Expires At: ' + new Date(expiry).toISOString(),
    'Payload SHA256: ' + payloadHash(envelope.payload)
  ].join('\n');
}

function createEngine(options = {}) {
  const now = options.now || (() => Date.now());
  const orders = new Map();
  const accountOrders = new Map();
  const lastNonce = new Map();
  const fills = [];
  let sequence = 0;

  function verifyEnvelope(input, expectedAction) {
    if (!input || typeof input !== 'object' || typeof input.signature !== 'string') throw new ApiError(400, 'SIGNED_ACTION_REQUIRED');
    const envelope = input.envelope;
    if (!envelope || envelope.action !== expectedAction) throw new ApiError(400, 'WRONG_ACTION');
    let account;
    try { account = getAddress(envelope.account); } catch (_) { throw new ApiError(400, 'BAD_ACCOUNT'); }
    const expiry = Date.parse(envelope.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= now()) throw new ApiError(401, 'ACTION_EXPIRED');
    if (expiry - now() > 5 * 60 * 1000) throw new ApiError(400, 'EXPIRY_TOO_FAR');
    let recovered;
    try { recovered = getAddress(verifyMessage(signingMessage(envelope), input.signature)); }
    catch (_) { throw new ApiError(401, 'INVALID_SIGNATURE'); }
    if (recovered !== account) throw new ApiError(401, 'INVALID_SIGNATURE');
    const previous = lastNonce.get(account.toLowerCase()) || 0;
    if (envelope.nonce <= previous) throw new ApiError(409, 'NONCE_REPLAY');
    lastNonce.set(account.toLowerCase(), envelope.nonce);
    return { envelope, account };
  }

  function market(symbol) {
    const found = MARKETS.find((item) => item.symbol === symbol);
    if (!found) throw new ApiError(404, 'MARKET_NOT_FOUND');
    return found;
  }

  function orderbook(symbol) {
    const m = market(symbol);
    const mark = Number(m.markPrice);
    const step = Number(m.tickSize) * 10;
    return {
      symbol,
      sequence,
      bids: Array.from({ length: 5 }, (_, i) => [(mark - step * (i + 1)).toFixed(4), String(1 + i)]),
      asks: Array.from({ length: 5 }, (_, i) => [(mark + step * (i + 1)).toFixed(4), String(1 + i)])
    };
  }

  function place(input) {
    const { envelope, account } = verifyEnvelope(input, 'order.place');
    const p = envelope.payload || {};
    const m = market(p.market);
    if (!['BUY', 'SELL'].includes(p.side)) throw new ApiError(400, 'BAD_SIDE');
    if (!['LIMIT', 'MARKET'].includes(p.type)) throw new ApiError(400, 'BAD_ORDER_TYPE');
    if (![1, 2, 3, 5].includes(p.leverage) || p.leverage > m.maxLeverage) throw new ApiError(400, 'BAD_LEVERAGE');
    if (!(Number(p.size) > 0)) throw new ApiError(400, 'BAD_SIZE');
    if (p.type === 'LIMIT' && !(Number(p.price) > 0)) throw new ApiError(400, 'BAD_PRICE');
    sequence += 1;
    const id = randomUUID();
    const order = {
      id, sequence, account, market: p.market, side: p.side, type: p.type,
      price: p.type === 'MARKET' ? m.markPrice : String(p.price),
      size: String(p.size), leverage: p.leverage, reduceOnly: p.reduceOnly === true,
      status: 'OPEN', createdAt: new Date(now()).toISOString()
    };
    orders.set(id, order);
    const key = account.toLowerCase();
    if (!accountOrders.has(key)) accountOrders.set(key, []);
    accountOrders.get(key).push(id);
    return order;
  }

  function cancel(input) {
    const { envelope, account } = verifyEnvelope(input, 'order.cancel');
    const id = envelope.payload?.orderId;
    const order = orders.get(id);
    if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND');
    if (order.account !== account) throw new ApiError(403, 'ORDER_NOT_OWNED');
    if (order.status !== 'OPEN') throw new ApiError(409, 'ORDER_NOT_OPEN');
    sequence += 1;
    order.status = 'CANCELED';
    order.updatedAt = new Date(now()).toISOString();
    order.sequence = sequence;
    return order;
  }

  function listOrders(account) {
    let address;
    try { address = getAddress(account); } catch (_) { throw new ApiError(400, 'BAD_ACCOUNT'); }
    return (accountOrders.get(address.toLowerCase()) || []).map((id) => orders.get(id));
  }

  return {
    status: () => ({ status: 'up', protocol: PROTOCOL, version: VERSION, environment: ENVIRONMENT, execution: 'simulation', sequence }),
    markets: () => MARKETS,
    market,
    orderbook,
    oracle: (symbol) => {
      const m = market(symbol);
      return { symbol, oraclePrice: m.markPrice, indexPrice: m.markPrice, markPrice: m.markPrice, source: 'TESTNET_SIMULATION', timestamp: new Date(now()).toISOString() };
    },
    place,
    cancel,
    listOrders,
    positions: () => [],
    fills: () => fills.slice(),
    commitment: () => ({ sequence, stateRoot: null, status: 'NOT_YET_CONNECTED_TO_SETTLEMENT', environment: ENVIRONMENT })
  };
}

module.exports = { ApiError, PROTOCOL, VERSION, ENVIRONMENT, MARKETS, stable, payloadHash, signingMessage, createEngine };
