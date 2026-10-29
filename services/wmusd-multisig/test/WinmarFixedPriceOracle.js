import { expect } from 'chai';
import hre from 'hardhat';
import { before, describe, it } from 'mocha';

let ethers;
before(async function () { ({ ethers } = await hre.network.getOrCreate()); });

describe('WinmarFixedPriceOracle', function () {
  it('starts at the configured 2,000 USD reference price', async function () {
    const [admin] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('WinmarFixedPriceOracle');
    const oracle = await Factory.deploy(admin.address, 86400, 200000000000n);
    await oracle.waitForDeployment();
    const data = await oracle.latestRoundData();
    expect(await oracle.decimals()).to.equal(8);
    expect(data[1]).to.equal(200000000000n);
  });

  it('allows only admin to update the fixed reference price', async function () {
    const [admin, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('WinmarFixedPriceOracle');
    const oracle = await Factory.deploy(admin.address, 86400, 200000000000n);
    await expect(oracle.connect(outsider).setPrice(210000000000n))
      .to.be.revertedWithCustomError(oracle, 'NotAdmin');
    await expect(oracle.setPrice(210000000000n)).to.emit(oracle, 'PriceUpdated');
    expect((await oracle.latestRoundData())[1]).to.equal(210000000000n);
  });
});
