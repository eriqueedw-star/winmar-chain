import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Contract, JsonRpcProvider, Wallet, getAddress } from 'ethers';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = new Set(process.argv.slice(2));
const rpcUrl = process.env.RPC_URL || 'https://rpc.winmarchain.io/';
const chainId = BigInt(process.env.CHAIN_ID || '12142816');
const contractAddress = getAddress(process.env.DOCUMENT_VERIFICATION_CONTRACT || '0x53fB6ba2997A50d3ddFfF5395a3BB9b7b24B7AEF');
const issuer = getAddress(process.env.DOCUMENT_ISSUER || '0x853a35B5318FD219eBf98B2a12Ca346A9853D975');

try {
  const artifact = JSON.parse(await fs.readFile(path.resolve(here, '../../../artifacts/DocumentVerification.json'), 'utf8'));
  const provider = new JsonRpcProvider(rpcUrl, Number(chainId));
  const network = await provider.getNetwork();
  if (network.chainId !== chainId) throw new Error(`Chain ID mismatch: expected ${chainId}, got ${network.chainId}`);
  if (!process.env.DEPLOYER_PRIVATE_KEY) throw new Error('DEPLOYER_PRIVATE_KEY is required locally');
  const signer = new Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const owner = await new Contract(contractAddress, artifact.abi, provider).owner();
  if (getAddress(owner) !== getAddress(signer.address)) throw new Error('Signer is not the DocumentVerification owner');
  const contract = new Contract(contractAddress, artifact.abi, signer);
  if (await contract.issuers(issuer)) { console.log(JSON.stringify({ issuer, authorized: true, alreadyAuthorized: true }, null, 2)); process.exit(0); }
  if (args.has('--dry-run')) { console.log(JSON.stringify({ chainId: chainId.toString(), contractAddress, issuer, owner, dryRun: true }, null, 2)); process.exit(0); }
  const tx = await contract.setIssuer(issuer, true);
  console.log(`issuerTx=${tx.hash}`);
  await tx.wait();
  console.log(JSON.stringify({ chainId: chainId.toString(), contractAddress, issuer, authorized: true, issuerTx: tx.hash }, null, 2));
} catch (error) { console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }
