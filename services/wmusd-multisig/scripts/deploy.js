import hre from "hardhat";

const SIGNER_A = "0x2A94dfdbaf51c71f5E554260D56Fff14Fee43624";
const SIGNER_B = "0xF66287c43Eb62f238c333393b4c29Da19001E97F";

const { ethers } = await hre.network.getOrCreate();
const [deployer] = await ethers.getSigners();
const factory = await ethers.getContractFactory("WinmarTwoOfTwoMultisig");
const multisig = await factory.deploy(SIGNER_A, SIGNER_B);
await multisig.waitForDeployment();

console.log(JSON.stringify({
  deployer: deployer.address,
  contract: await multisig.getAddress(),
  signerA: SIGNER_A,
  signerB: SIGNER_B,
  chainId: 12142816,
}, null, 2));
