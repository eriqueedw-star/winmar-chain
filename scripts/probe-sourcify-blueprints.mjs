#!/usr/bin/env node
const RPC="https://rpc.winmarchain.io";
const targets=[
  {name:"CreateX",address:"0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed"},
  {name:"Multicall3",address:"0xcA11bde05977b3631167028862bE2a173976CA11"},
  {name:"SafeProxyFactory",address:"0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67"}
];

async function rpc(method,params=[]){
  const res=await fetch(RPC,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})
  });
  const data=await res.json();
  if(!res.ok || data.error) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return data.result;
}

const chainId=await rpc("eth_chainId");
const results=[];
for(const t of targets){
  const code=await rpc("eth_getCode",[t.address,"latest"]);
  results.push({...t,hasCode:typeof code==="string" && code!=="0x",codeBytes:Math.max(0,(code.length-2)/2)});
}
const report={checkedAt:new Date().toISOString(),rpc:RPC,chainId,expectedChainId:"0xb948e0",results,anyCanonicalBlueprint:results.some(x=>x.hasCode)};
console.log(JSON.stringify(report,null,2));
if(chainId.toLowerCase()!=="0xb948e0") process.exitCode=2;
