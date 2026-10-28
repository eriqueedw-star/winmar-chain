import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import hre from "hardhat";

const SIGNER_A = "0x2A94dfdbaf51c71f5E554260D56Fff14Fee43624";
const SIGNER_B = "0xF66287c43Eb62f238c333393b4c29Da19001E97F";
const CHAIN_ID = 12142816;
const RPC_URL = process.env.WINMAR_RPC_URL ?? "https://rpc.winmarchain.io";

const { ethers } = await hre.network.getOrCreate();
const factory = await ethers.getContractFactory("WinmarTwoOfTwoMultisig");
const deployment = factory.getDeployTransaction(SIGNER_A, SIGNER_B);
const payload = {
  type: "winmar-contract-deployment-v1",
  chainId: CHAIN_ID,
  rpcUrl: RPC_URL,
  to: null,
  value: "0x0",
  data: deployment.data,
  signerA: SIGNER_A,
  signerB: SIGNER_B,
};

const outDir = path.resolve("qr-output");
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, "wmusd-multisig-deployment.json"), JSON.stringify(payload, null, 2));
await QRCode.toFile(path.join(outDir, "wmusd-multisig-deployment.png"), JSON.stringify(payload), {
  errorCorrectionLevel: "M",
  margin: 2,
  width: 900,
});
console.log(`QR created: ${path.join(outDir, "wmusd-multisig-deployment.png")}`);
