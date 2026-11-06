#!/usr/bin/env node
import fs from "node:fs";

const RPC = "https://rpc.winmarchain.io";
const EXPLORER = "https://scan.winmarchain.io";
const NETWORK_LOGO = "https://winmarchain.io/assets/winmar-logo.png";
const WMC_LOGO = "https://winmarchain.io/logo/wmc.png";
const EXPECTED_CHAIN_ID = "0xb948e0";

async function rpc(method, params = []) {
  const started = Date.now();
  const response = await fetch(RPC, {
    method: "POST",
    headers: {"content-type":"application/json"},
    body: JSON.stringify({jsonrpc:"2.0",id:1,method,params})
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error?.message || `RPC HTTP ${response.status}`);
  return {result:data.result,httpStatus:response.status,latencyMs:Date.now()-started};
}

async function head(url) {
  const started = Date.now();
  let response = await fetch(url, {method:"HEAD", redirect:"follow"});
  if (response.status === 405) response = await fetch(url, {method:"GET", redirect:"follow"});
  return {httpStatus:response.status,ok:response.ok,latencyMs:Date.now()-started,contentType:response.headers.get("content-type")};
}

const checkedAt = new Date().toISOString();
const chain = await rpc("eth_chainId");
const block = await rpc("eth_blockNumber");
const [explorer,networkLogo,wmcLogo] = await Promise.all([
  head(EXPLORER), head(NETWORK_LOGO), head(WMC_LOGO)
]);

const chainIdMatches = String(chain.result).toLowerCase() === EXPECTED_CHAIN_ID;
const passed = chainIdMatches && explorer.ok && networkLogo.ok && wmcLogo.ok;

const report = {
  schemaVersion:1,
  checkedAt,
  network:"Winmar Chain",
  expectedChainId:12142816,
  expectedChainIdHex:"0xB948E0",
  passed,
  rpc:{
    url:RPC,
    chainIdHex:chain.result,
    chainIdMatches,
    blockNumberHex:block.result,
    blockNumber:Number.parseInt(block.result,16),
    chainIdLatencyMs:chain.latencyMs,
    blockLatencyMs:block.latencyMs
  },
  explorer:{url:EXPLORER,...explorer},
  networkLogo:{url:NETWORK_LOGO,...networkLogo},
  nativeCoinLogo:{url:WMC_LOGO,...wmcLogo}
};

fs.mkdirSync("_site/discovery",{recursive:true});
fs.writeFileSync("_site/discovery/health.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if (!passed) process.exitCode=1;
