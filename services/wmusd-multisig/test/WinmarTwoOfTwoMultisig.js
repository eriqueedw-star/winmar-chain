import { expect } from 'chai';
import hre from 'hardhat';
import { before, describe, it } from 'mocha';

let ethers;

before(async function () {
  ({ ethers } = await hre.network.getOrCreate());
});

describe('WinmarTwoOfTwoMultisig', function () {
  async function fixture() {
    const [signerA, signerB, outsider, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('WinmarTwoOfTwoMultisig');
    const wallet = await Factory.deploy(signerA.address, signerB.address);
    await wallet.waitForDeployment();
    return { wallet, signerA, signerB, outsider, recipient };
  }

  async function signedExecution(wallet, signerA, signerB, to, value, data) {
    const nonce = await wallet.nonce();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const digest = ethers.solidityPackedKeccak256(
      ['string', 'uint256', 'address', 'uint256', 'address', 'uint256', 'bytes32'],
      ['WINMAR_MULTISIG_V1', chainId, await wallet.getAddress(), nonce, to, value, ethers.keccak256(data)]
    );
    return {
      signatureA: await signerA.signMessage(ethers.getBytes(digest)),
      signatureB: await signerB.signMessage(ethers.getBytes(digest))
    };
  }

  it('deploys with the two configured signers', async function () {
    const { wallet, signerA, signerB } = await fixture();
    expect(await wallet.signerA()).to.equal(signerA.address);
    expect(await wallet.signerB()).to.equal(signerB.address);
    expect(await wallet.nonce()).to.equal(0n);
  });

  it('rejects zero or duplicate signer configuration', async function () {
    const [signerA] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('WinmarTwoOfTwoMultisig');
    await expect(Factory.deploy(ethers.ZeroAddress, signerA.address)).to.be.revertedWith('zero signer');
    await expect(Factory.deploy(signerA.address, signerA.address)).to.be.revertedWith('duplicate signer');
  });

  it('executes only with both signatures and increments nonce', async function () {
    const { wallet, signerA, signerB, recipient } = await fixture();
    const data = '0x';
    const signatures = await signedExecution(wallet, signerA, signerB, recipient.address, 0, data);
    await expect(wallet.execute(recipient.address, 0, data, signatures.signatureA, signatures.signatureB))
      .to.emit(wallet, 'Executed').withArgs(0, recipient.address, 0, data);
    expect(await wallet.nonce()).to.equal(1n);
  });

  it('rejects an outsider signature', async function () {
    const { wallet, signerA, outsider, recipient } = await fixture();
    const signatures = await signedExecution(wallet, signerA, outsider, recipient.address, 0, '0x');
    await expect(wallet.execute(recipient.address, 0, '0x', signatures.signatureA, signatures.signatureB))
      .to.be.revertedWithCustomError(wallet, 'NotSigner');
  });

  it('rejects replaying a completed transaction', async function () {
    const { wallet, signerA, signerB, recipient } = await fixture();
    const signatures = await signedExecution(wallet, signerA, signerB, recipient.address, 0, '0x');
    await wallet.execute(recipient.address, 0, '0x', signatures.signatureA, signatures.signatureB);
    await expect(wallet.execute(recipient.address, 0, '0x', signatures.signatureA, signatures.signatureB))
      .to.be.revertedWithCustomError(wallet, 'NotSigner');
  });
});
