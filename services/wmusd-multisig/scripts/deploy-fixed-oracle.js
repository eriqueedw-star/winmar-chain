import hre from "hardhat";

const ADMIN = process.env.WMC_ORACLE_ADMIN ?? "0x6f6c6a209dc3297021aa3b2b9a63fc6c59577f6f";
const HEARTBEAT = BigInt(process.env.WMC_ORACLE_HEARTBEAT ?? "86400");
const INITIAL_PRICE = BigInt(process.env.WMC_ORACLE_INITIAL_PRICE ?? "200000000000");

if (!hre.ethers.isAddress(ADMIN)) throw new Error(`Invalid WMC_ORACLE_ADMIN: ${ADMIN}`);
if (HEARTBEAT === 0n || INITIAL_PRICE <= 0n) throw new Error("Heartbeat and initial price must be positive");

const { ethers } = await hre.network.getOrCreate();
const [deployer] = await ethers.getSigners();
const Factory = await ethers.getContractFactory("WinmarFixedPriceOracle");
const oracle = await Factory.deploy(ADMIN, HEARTBEAT, INITIAL_PRICE);
await oracle.waitForDeployment();

console.log(JSON.stringify({
  network: (await ethers.provider.getNetwork()).chainId.toString(),
  deployer: deployer.address,
  oracle: await oracle.getAddress(),
  admin: ADMIN,
  priceUsd: "2000",
  answer: INITIAL_PRICE.toString(),
  decimals: 8,
  heartbeatSeconds: HEARTBEAT.toString(),
  transactionHash: oracle.deploymentTransaction()?.hash ?? null,
}, null, 2));
