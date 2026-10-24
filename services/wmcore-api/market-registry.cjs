'use strict';

const { randomUUID } = require('node:crypto');

const MARKET_KINDS = Object.freeze(['PERPETUAL', 'SPOT', 'OUTCOME']);
const MARKET_CATEGORIES = Object.freeze(['CRYPTO', 'COMMODITY', 'FX', 'INDEX', 'EQUITY', 'WINMAR_ECOSYSTEM']);
const MARKET_STATUSES = Object.freeze(['PROPOSED', 'REVIEW', 'TESTING', 'ACTIVE', 'PAUSED', 'REJECTED']);

const SEED_MARKETS = Object.freeze([
  { symbol:'BTC-USD-PERP', kind:'PERPETUAL', category:'CRYPTO', base:'BTC', quote:'USD', maxLeverage:100, tickSize:'0.1', lotSize:'0.001', markPrice:'95000.0', oracle:{source:'TESTNET_SIMULATION', feed:'BTC/USD'}, status:'ACTIVE' },
  { symbol:'ETH-USD-PERP', kind:'PERPETUAL', category:'CRYPTO', base:'ETH', quote:'USD', maxLeverage:100, tickSize:'0.01', lotSize:'0.01', markPrice:'3500.00', oracle:{source:'TESTNET_SIMULATION', feed:'ETH/USD'}, status:'ACTIVE' },
  { symbol:'SOL-USD-PERP', kind:'PERPETUAL', category:'CRYPTO', base:'SOL', quote:'USD', maxLeverage:50, tickSize:'0.001', lotSize:'0.1', markPrice:'180.00', oracle:{source:'TESTNET_SIMULATION', feed:'SOL/USD'}, status:'ACTIVE' },
  { symbol:'XRP-USD-PERP', kind:'PERPETUAL', category:'CRYPTO', base:'XRP', quote:'USD', maxLeverage:25, tickSize:'0.0001', lotSize:'1', markPrice:'2.50', oracle:{source:'TESTNET_SIMULATION', feed:'XRP/USD'}, status:'ACTIVE' },
  { symbol:'WMC-USD-PERP', kind:'PERPETUAL', category:'WINMAR_ECOSYSTEM', base:'WMC', quote:'USD', maxLeverage:25, tickSize:'0.0001', lotSize:'1', markPrice:'0.1000', oracle:{source:'TESTNET_SIMULATION', feed:'WMC/USD'}, status:'ACTIVE' },
  { symbol:'GOLD-USD-PERP', kind:'PERPETUAL', category:'COMMODITY', base:'GOLD', quote:'USD', maxLeverage:50, tickSize:'0.1', lotSize:'0.01', markPrice:'2750.0', oracle:{source:'TESTNET_SIMULATION', feed:'XAU/USD'}, status:'ACTIVE' },
  { symbol:'SILVER-USD-PERP', kind:'PERPETUAL', category:'COMMODITY', base:'SILVER', quote:'USD', maxLeverage:25, tickSize:'0.001', lotSize:'0.1', markPrice:'34.00', oracle:{source:'TESTNET_SIMULATION', feed:'XAG/USD'}, status:'ACTIVE' }
]);

function normalizeSymbol(value) {
  return String(value || '').trim().toUpperCase();
}

function validateDefinition(input, { proposal = false } = {}) {
  const symbol = normalizeSymbol(input?.symbol);
  if (!/^[A-Z0-9]{2,16}-[A-Z0-9]{2,12}-(PERP|SPOT|OUTCOME)$/.test(symbol)) throw new Error('BAD_MARKET_SYMBOL');
  const kind = String(input.kind || '').toUpperCase();
  const category = String(input.category || '').toUpperCase();
  if (!MARKET_KINDS.includes(kind)) throw new Error('BAD_MARKET_KIND');
  if (!MARKET_CATEGORIES.includes(category)) throw new Error('BAD_MARKET_CATEGORY');
  if (!String(input.base || '').match(/^[A-Z0-9]{2,16}$/)) throw new Error('BAD_BASE_ASSET');
  if (!String(input.quote || '').match(/^[A-Z0-9]{2,12}$/)) throw new Error('BAD_QUOTE_ASSET');
  const maxLeverage = Number(input.maxLeverage);
  if (!Number.isInteger(maxLeverage) || maxLeverage < 1 || maxLeverage > 100) throw new Error('BAD_MAX_LEVERAGE');
  if (!(Number(input.tickSize) > 0) || !(Number(input.lotSize) > 0)) throw new Error('BAD_MARKET_PRECISION');
  if (!proposal && !(Number(input.markPrice) > 0)) throw new Error('BAD_MARK_PRICE');
  return {
    symbol, kind, category,
    base: String(input.base).toUpperCase(),
    quote: String(input.quote).toUpperCase(),
    maxLeverage,
    tickSize: String(input.tickSize),
    lotSize: String(input.lotSize),
    markPrice: String(input.markPrice || '0'),
    oracle: {
      source: String(input.oracle?.source || 'UNASSIGNED'),
      feed: String(input.oracle?.feed || '')
    },
    tokenAddress: input.tokenAddress ? String(input.tokenAddress) : null,
    status: proposal ? 'PROPOSED' : String(input.status || 'ACTIVE').toUpperCase()
  };
}

function createMarketRegistry(initial = SEED_MARKETS) {
  const records = new Map();
  let version = 0;

  function put(definition, metadata = {}) {
    const record = { ...validateDefinition(definition, { proposal: String(definition?.status || '').toUpperCase() === 'PROPOSED' }), id: metadata.id || randomUUID(), proposer: metadata.proposer || null, createdAt: metadata.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (!MARKET_STATUSES.includes(record.status)) throw new Error('BAD_MARKET_STATUS');
    records.set(record.symbol, record);
    version += 1;
    return record;
  }

  for (const market of initial) put(market, { id: 'seed:' + market.symbol, proposer: 'WINMAR_TESTNET_GENESIS' });

  return {
    version: () => version,
    list(filters = {}) {
      const category = filters.category ? String(filters.category).toUpperCase() : '';
      const kind = filters.kind ? String(filters.kind).toUpperCase() : '';
      const status = filters.status ? String(filters.status).toUpperCase() : '';
      const query = filters.q ? String(filters.q).toUpperCase() : '';
      return [...records.values()].filter((m) =>
        (!category || m.category === category) &&
        (!kind || m.kind === kind) &&
        (!status || m.status === status) &&
        (!query || m.symbol.includes(query) || m.base.includes(query))
      );
    },
    get(symbol) { return records.get(normalizeSymbol(symbol)) || null; },
    require(symbol) {
      const market = records.get(normalizeSymbol(symbol));
      if (!market) throw new Error('MARKET_NOT_FOUND');
      return market;
    },
    requireActive(symbol) {
      const market = this.require(symbol);
      if (market.status !== 'ACTIVE') throw new Error('MARKET_NOT_ACTIVE');
      return market;
    },
    propose(definition, proposer) {
      const normalized = validateDefinition(definition, { proposal: true });
      if (records.has(normalized.symbol)) throw new Error('MARKET_ALREADY_EXISTS');
      return put({ ...normalized, status:'PROPOSED' }, { proposer });
    },
    activate(symbol, patch = {}) {
      const existing = this.require(symbol);
      return put({ ...existing, ...patch, symbol: existing.symbol, status:'ACTIVE' }, { id: existing.id, proposer: existing.proposer, createdAt: existing.createdAt });
    }
  };
}

module.exports = { MARKET_KINDS, MARKET_CATEGORIES, MARKET_STATUSES, SEED_MARKETS, createMarketRegistry };
