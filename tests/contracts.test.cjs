'use strict';
// Tests use in-memory Ganache only: no mainnet RPC, keys, or funds.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const ethers = require('ethers');
const ganache = require('ganache');
const solc = require('solc');
const files = ['contracts/WinmarFaucet.sol','contracts/WinmarToken.sol','contracts/WinmarTokenFactory.sol','contracts/WinmarDocumentRegistry.sol','contracts/WinmarBridgeAssetRegistry.sol'];
const sources = Object.fromEntries(files.map(f => [f,{content:fs.readFileSync(path.join(__dirname,'..',f),'utf8')}]));
const result = JSON.parse(solc.compile(JSON.stringify({
  language:'Solidity',sources,settings:{
    optimizer:{enabled:true,runs:200},
    evmVersion:'paris',
    outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}
  }
})));
assert.equal((result.errors||[]).filter(e=>e.severity==='error').length,0,
  (result.errors||[]).map(e=>e.formattedMessage).join('\n'));
function artifact(name){
  const file = files.find(f=>result.contracts[f] && result.contracts[f][name]);
  assert.ok(file, 'Missing contract '+name);
  const data=result.contracts[file][name];
  assert.ok(data.evm.bytecode.object.length>0);
  return {abi:data.abi,bytecode:'0x'+data.evm.bytecode.object};
}
async function fixture(){
  const eip1193=ganache.provider({
    logging:{quiet:true},chain:{chainId:12142816,hardfork:'shanghai'},
    miner:{blockGasLimit:30000000},wallet:{totalAccounts:6,defaultBalance:1000}
  });
  const provider=new ethers.BrowserProvider(eip1193);
  assert.equal((await provider.getNetwork()).chainId,12142816n);
  const accounts=await Promise.all([0,1,2,3].map(n=>provider.getSigner(n)));
  return {provider,accounts};
}
async function deploy(name,signer,...args){
  const a=artifact(name);
  const contract=await new ethers.ContractFactory(a.abi,a.bytecode,signer).deploy(...args);
  await contract.waitForDeployment();return contract;
}
async function done(p){return (await p).wait();}

test('Document digest self-attestation is issuer-scoped, non-repeatable and revocable',async()=>{
  const {accounts:[issuer,outsider]}=await fixture();
  const registry=await deploy('WinmarDocumentRegistry',issuer);
  const digest=ethers.sha256(ethers.toUtf8Bytes('example document'));
  const mine=await issuer.getAddress(), other=await outsider.getAddress();
  assert.equal(await registry.isActive(mine,digest),false);
  await done(registry.anchor(digest));
  const [anchored,revoked]=await registry.getRecord(mine,digest);
  assert.ok(anchored>0n);assert.equal(revoked,0n);
  assert.equal(await registry.isActive(mine,digest),true);
  assert.equal((await registry.getRecord(other,digest))[0],0n);
  await assert.rejects(()=>registry.anchor.staticCall(digest));
  await assert.rejects(()=>registry.connect(outsider).revoke.staticCall(digest));
  await done(registry.revoke(digest));
  assert.equal(await registry.isActive(mine,digest),false);
  assert.ok((await registry.getRecord(mine,digest))[1]>0n);
  await assert.rejects(()=>registry.revoke.staticCall(digest));
});

test('Bridge catalog rejects unauthorized routes and starts globally paused',async()=>{
  const {accounts:[admin,stranger]}=await fixture();
  const registry=await deploy('WinmarBridgeAssetRegistry',admin,await admin.getAddress());
  const source='0x1111111111111111111111111111111111111111';
  const wrapped='0x2222222222222222222222222222222222222222';
  const id=await registry.computeRouteId(1n,source);
  assert.equal(await registry.paused(),true);
  await assert.rejects(()=>registry.connect(stranger).registerRoute.staticCall(1n,source,wrapped));
  await assert.rejects(()=>registry.registerRoute.staticCall(12142816n,source,wrapped));
  await done(registry.registerRoute(1n,source,wrapped));
  assert.equal((await registry.getRoute(id)).enabled,false);
  await assert.rejects(()=>registry.registerRoute.staticCall(1n,source,wrapped));
  await assert.rejects(()=>registry.setRouteEnabled.staticCall(id,true));
  await done(registry.setPaused(false));
  await done(registry.setRouteEnabled(id,true));
  assert.equal(await registry.isRouteActive(id),true);
  await done(registry.setPaused(true));
  assert.equal(await registry.isRouteActive(id),false);
  await assert.rejects(()=>registry.connect(stranger).setPaused.staticCall(false));
  const methods=new Set(artifact('WinmarBridgeAssetRegistry').abi.filter(x=>x.type==='function').map(x=>x.name));
  for(const forbidden of ['mint','burn','deposit','withdraw','lock','release','bridge'])
    assert.equal(methods.has(forbidden),false,'Forbidden method: '+forbidden);
});

test('WMC-20 factory preserves ERC-20 ABI, balances, allowances and optional issuer powers',async()=>{
  const {accounts:[creator,receiver,spender]}=await fixture();
  const me=await creator.getAddress(),to=await receiver.getAddress(),by=await spender.getAddress();
  const factory=await deploy('WinmarTokenFactory',creator);
  const cfg={name:'Winmar Test',symbol:'WTEST',decimals:18,initialSupply:ethers.parseEther('1000'),
    initialHolder:me,mintable:false,burnable:true,pausable:false};
  const salt=ethers.id('wmc-20-test');
  const receipt=await done(factory.createToken(cfg,salt));
  const iface=new ethers.Interface(artifact('WinmarTokenFactory').abi);
  const event=receipt.logs.map(log=>{try{return iface.parseLog(log);}catch(_){return null;}})
    .find(log=>log && log.name==='TokenCreated');
  assert.ok(event,'Missing TokenCreated');
  const token=new ethers.Contract(event.args.token,artifact('WinmarToken').abi,creator);
  assert.equal(await token.symbol(),'WTEST');
  assert.equal(await token.decimals(),18n);
  assert.equal(await token.balanceOf(me),ethers.parseEther('1000'));
  await done(token.transfer(to,ethers.parseEther('100')));
  await done(token.approve(by,ethers.parseEther('30')));
  await done(token.connect(spender).transferFrom(me,to,ethers.parseEther('20')));
  assert.equal(await token.balanceOf(to),ethers.parseEther('120'));
  assert.equal(await token.allowance(me,by),ethers.parseEther('10'));
  await assert.rejects(()=>token.mint.staticCall(me,1n));
  await done(token.connect(receiver).burn(ethers.parseEther('10')));
  assert.equal(await token.totalSupply(),ethers.parseEther('990'));
  await assert.rejects(()=>token.setPaused.staticCall(true));
  await assert.rejects(()=>factory.createToken.staticCall(cfg,salt));
});

test('Native WMC faucet enforces daily cap, cooldown, pause and admin access',async()=>{
  const {accounts:[admin,alice,bob,carol]}=await fixture();
  const amount=ethers.parseEther('0.2');
  const faucet=await deploy('WinmarFaucet',admin,await admin.getAddress(),amount,86400n,ethers.parseEther('0.4'));
  await done(admin.sendTransaction({to:await faucet.getAddress(),value:ethers.parseEther('1')}));
  await done(faucet.connect(alice).claim());
  await assert.rejects(()=>faucet.connect(alice).claim.staticCall());
  await done(faucet.connect(bob).claim());
  await assert.rejects(()=>faucet.connect(carol).claim.staticCall());
  assert.equal(await faucet.distributedToday(),ethers.parseEther('0.4'));
  await assert.rejects(()=>faucet.connect(alice).setPaused.staticCall(true));
  await done(faucet.setPaused(true));
  await assert.rejects(()=>faucet.connect(carol).claim.staticCall());
  await done(faucet.withdraw(await admin.getAddress(),ethers.parseEther('0.1')));
  assert.equal(await faucet.availableBalance(),ethers.parseEther('0.5'));
});

test('Gas-sponsored WMC claims require an appointed relayer and enforce recipient-based limits',async()=>{
  const {accounts:[admin,relayer,recipient,outsider]}=await fixture();
  const amount=ethers.parseEther('0.15');
  const recipientAddress=await recipient.getAddress();
  const faucet=await deploy('WinmarFaucet',admin,await admin.getAddress(),amount,86400n,ethers.parseEther('0.3'));
  await done(admin.sendTransaction({to:await faucet.getAddress(),value:ethers.parseEther('1')}));
  const before=await recipient.provider.getBalance(recipientAddress);
  await assert.rejects(()=>faucet.connect(relayer).claimFor.staticCall(recipientAddress));
  const relayWallet = await relayer.getAddress();
  await assert.rejects(()=>faucet.connect(relayer).setRelayer.staticCall(relayWallet));
  await done(faucet.setRelayer(relayWallet));
  await assert.rejects(()=>faucet.connect(outsider).claimFor.staticCall(recipientAddress));
  await assert.rejects(()=>faucet.connect(relayer).claimFor.staticCall(ethers.ZeroAddress));
  await done(faucet.connect(relayer).claimFor(recipientAddress));
  const after=await recipient.provider.getBalance(recipientAddress);
  assert.equal(after-before,amount,'Only the relayer paid gas; recipient received full WMC');
  assert.equal(await faucet.claimedTotal(recipientAddress),amount);
  await assert.rejects(()=>faucet.connect(relayer).claimFor.staticCall(recipientAddress));
  await done(faucet.setRelayer(ethers.ZeroAddress));
  const outsiderAddress = await outsider.getAddress();
  await assert.rejects(()=>faucet.connect(relayer).claimFor.staticCall(outsiderAddress));
  await done(faucet.setPaused(true));
  await assert.rejects(()=>faucet.connect(recipient).claim.staticCall());
});
