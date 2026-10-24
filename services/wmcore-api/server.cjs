'use strict';

const http = require('node:http');
const { URL } = require('node:url');
const { WebSocketServer } = require('ws');
const { ApiError, createEngine } = require('./core.cjs');

if ((process.env.WMC_ENVIRONMENT || 'testnet') !== 'testnet') {
  throw new Error('WMCore API skeleton is testnet-only');
}

const port = Number(process.env.PORT || 8790);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');

const engine = createEngine();

function json(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(payload));
}

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) throw new ApiError(413, 'BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch (_) { throw new ApiError(400, 'INVALID_JSON'); }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const path = url.pathname;

    if (req.method === 'GET' && path === '/api/v1/status') return json(res, 200, engine.status());
    if (req.method === 'GET' && path === '/api/v1/markets') return json(res, 200, { markets: engine.markets() });

    let match = path.match(/^\/api\/v1\/markets\/([^/]+)$/);
    if (req.method === 'GET' && match) return json(res, 200, engine.market(decodeURIComponent(match[1])));

    match = path.match(/^\/api\/v1\/orderbook\/([^/]+)$/);
    if (req.method === 'GET' && match) return json(res, 200, engine.orderbook(decodeURIComponent(match[1])));

    match = path.match(/^\/api\/v1\/oracle\/([^/]+)$/);
    if (req.method === 'GET' && match) return json(res, 200, engine.oracle(decodeURIComponent(match[1])));

    if (req.method === 'GET' && path === '/api/v1/commitments/latest') return json(res, 200, engine.commitment());

    if (req.method === 'GET' && path === '/api/v1/orders') return json(res, 200, { orders: engine.listOrders(url.searchParams.get('account') || '') });
    if (req.method === 'GET' && path === '/api/v1/positions') return json(res, 200, { positions: engine.positions(url.searchParams.get('account') || '') });
    if (req.method === 'GET' && path === '/api/v1/fills') return json(res, 200, { fills: engine.fills(url.searchParams.get('account') || '') });

    if (req.method === 'POST' && path === '/api/v1/orders') {
      const order = engine.place(await body(req));
      broadcast({ channel: 'account.orders', sequence: order.sequence, data: order });
      return json(res, 201, order);
    }

    match = path.match(/^\/api\/v1\/orders\/([^/]+)\/cancel$/);
    if (req.method === 'POST' && match) {
      const input = await body(req);
      if (input?.envelope?.payload?.orderId !== decodeURIComponent(match[1])) throw new ApiError(400, 'ORDER_ID_MISMATCH');
      const order = engine.cancel(input);
      broadcast({ channel: 'account.orders', sequence: order.sequence, data: order });
      return json(res, 200, order);
    }

    return json(res, 404, { error: 'NOT_FOUND' });
  } catch (error) {
    if (error instanceof ApiError) return json(res, error.status, { error: error.code });
    return json(res, 500, { error: 'INTERNAL_ERROR' });
  }
});

server.requestTimeout = 10_000;
server.headersTimeout = 10_000;

const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (url.pathname !== '/api/v1/ws') return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
});

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({ channel: 'system.status', data: engine.status() }));
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.op === 'ping') ws.send(JSON.stringify({ op: 'pong', timestamp: new Date().toISOString() }));
    } catch (_) {
      ws.close(1003, 'invalid json');
    }
  });
  ws.on('close', () => clients.delete(ws));
});

function broadcast(message) {
  const encoded = JSON.stringify(message);
  for (const ws of clients) if (ws.readyState === 1) ws.send(encoded);
}

server.listen(port, '127.0.0.1', () => {
  process.stdout.write('Winmar WMCore testnet API listening on 127.0.0.1:' + port + '\n');
});
