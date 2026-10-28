import fs from 'node:fs/promises';
import { AbiCoder } from '../services/winmar-document-verification/deployment/node_modules/ethers/lib.esm/abi/index.js';

const sourceCode = await fs.readFile('output/wmusd-standard-input.json', 'utf8');
const constructorArguments = AbiCoder.defaultAbiCoder().encode(
  ['address', 'address', 'address', 'address', 'uint256'],
  [
    '0x0b1B6b337DfceE4e4811c8f7828e9acFc4a70716',
    '0x0a8E959ED2488EB82CE9EC41499113C73da41975',
    '0x01Dbd53F01aA55C38D7b1A8B5e575cd5D6F9DbD9',
    '0x424a1311f90c1D58AC222088c11f15955290A088',
    0n
  ]
).slice(2);
const form = new URLSearchParams({
  module: 'contract', action: 'verifysourcecode',
  addressHash: '0x61E3Bce195AcEb0D48726b8b7Eba104C94dA2fCC',
  contractaddress: '0x61E3Bce195AcEb0D48726b8b7Eba104C94dA2fCC',
  sourceCode, codeformat: 'solidity-standard-json-input',
  contractname: 'contracts/WUSD.sol:WMUSD',
  compilerversion: 'v0.8.37+commit.f401782d', optimizationUsed: '1', runs: '200',
  evmversion: 'berlin', licenseType: '3', constructorArguements: constructorArguments
});
const response = await fetch('https://scan.winmarchain.io/api', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form });
console.log(await response.text());
