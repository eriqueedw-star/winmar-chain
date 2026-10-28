'use strict';

const fs = require('node:fs');
const path = require('node:path');

const configPath = path.resolve(__dirname, '..', 'config', 'oracle.testnet.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const failures = [];

if (config.environment !== 'testnet') failures.push('ORACLE_CONFIG_MUST_BE_TESTNET');
if (config.chainId !== 12142818) failures.push('ORACLE_PREFLIGHT_REQUIRES_ISOLATED_TESTNET_CHAIN');
if (!String(config.rpcUrl).startsWith('http://127.0.0.1:')) failures.push('ORACLE_PREFLIGHT_REQUIRES_LOCAL_RPC');
if (!Array.isArray(config.feeds) || config.feeds.length === 0) failures.push('NO_FEEDS_CONFIGURED');

const feedIds = new Set();
for (const feed of config.feeds || []) {
  if (!/^[A-Z0-9]+\/[A-Z0-9]+$/.test(feed.symbol)) failures.push(`BAD_FEED_SYMBOL:${feed.symbol}`);
  if (!Number.isInteger(feed.decimals) || feed.decimals < 0 || feed.decimals > 18) failures.push(`BAD_DECIMALS:${feed.symbol}`);
  if (!Number.isInteger(feed.heartbeatSeconds) || feed.heartbeatSeconds <= 0) failures.push(`BAD_HEARTBEAT:${feed.symbol}`);
  if (!Number.isInteger(feed.maxDeviationBps) || feed.maxDeviationBps <= 0 || feed.maxDeviationBps > 10000) failures.push(`BAD_DEVIATION:${feed.symbol}`);
  if (feedIds.has(feed.symbol)) failures.push(`DUPLICATE_FEED_SYMBOL:${feed.symbol}`);
  feedIds.add(feed.symbol);
  process.stdout.write(`${feed.symbol} (feed id: keccak256(\"${feed.symbol}\"))\n`);
}

if (failures.length) {
  for (const failure of failures) process.stderr.write(`${failure}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`PASS: ${config.feeds.length} oracle feeds configured for isolated Winmar testnet ${config.chainId}; no deployment performed.\n`);
}
