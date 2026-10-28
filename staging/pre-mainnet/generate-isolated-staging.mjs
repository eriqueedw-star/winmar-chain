import { Wallet, getAddress, keccak256, encodeRlp } from '../../services/winmar-document-verification/deployment/node_modules/ethers/lib.commonjs/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(new URL('.', import.meta.url).pathname.replace(/^\//, ''));
const out = path.join(root, 'isolated-runtime');
const names = ['stockholm', 'singapore', 'sydney', 'tokyo2', 'tokyo7'];
const validators = [];

for (const name of names) {
  const wallet = Wallet.createRandom();
  const pub = wallet.signingKey.publicKey.slice(4);
  const address = getAddress('0x' + keccak256('0x' + pub).slice(-40));
  const dir = path.join(out, 'keys', name);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'key.priv'), wallet.privateKey.slice(2) + '\n', { mode: 0o600 });
  await fs.writeFile(path.join(dir, 'key.pub'), pub + '\n');
  validators.push(address);
}

const deployer = Wallet.createRandom();
const deployerPub = deployer.signingKey.publicKey.slice(4);
const deployerAddress = getAddress('0x' + keccak256('0x' + deployerPub).slice(-40));
const deployerDir = path.join(out, 'deployer');
await fs.mkdir(deployerDir, { recursive: true });
await fs.writeFile(path.join(deployerDir, 'key.priv'), deployer.privateKey.slice(2) + '\n', { mode: 0o600 });
await fs.writeFile(path.join(deployerDir, 'address.txt'), deployerAddress + '\n');

const validatorBytes = validators.map((address) => address.toLowerCase());
const extraData = encodeRlp(['0x' + '00'.repeat(32), validatorBytes, [], '0x', []]);
const genesis = {
  config: { chainId: 12142818, berlinBlock: 0, londonBlock: 999999999, qbft: { epochlength: 30000, blockperiodseconds: 2, requesttimeoutseconds: 4 } },
  nonce: '0x0', timestamp: '0x0', extraData, gasLimit: '0x1c9c380', difficulty: '0x1',
  mixHash: '0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365',
  coinbase: '0x0000000000000000000000000000000000000000',
  alloc: { [deployerAddress.slice(2).toLowerCase()]: { balance: '0x3635c9adc5dea00000' } }
};
await fs.writeFile(path.join(out, 'genesis.json'), JSON.stringify(genesis, null, 2) + '\n');
await fs.writeFile(path.join(out, 'validator-addresses.json'), JSON.stringify(Object.fromEntries(names.map((name, i) => [name, validators[i]])), null, 2) + '\n');
console.log(JSON.stringify({ chainId: 12142818, runtime: out, validators, stagingDeployer: deployerAddress }, null, 2));
