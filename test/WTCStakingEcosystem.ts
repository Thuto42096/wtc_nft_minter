import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

describe("WTCStakingEcosystem", function () {
  async function deployFixture() {
    const [, user] = await ethers.getSigners();
    const mintPrice = ethers.parseEther("0.1");

    const nft = await ethers.deployContract("WTC_NFT", [mintPrice]);
    await nft.waitForDeployment();

    const coin = await ethers.deployContract("WTC_Coin");
    await coin.waitForDeployment();

    const vault = await ethers.deployContract("StakingVault", [
      await nft.getAddress(),
      await coin.getAddress(),
    ]);
    await vault.waitForDeployment();

    const minterRole = await coin.MINTER_ROLE();
    await (await coin.grantRole(minterRole, await vault.getAddress())).wait();

    return { user, mintPrice, nft, coin, vault };
  }

  it("stakes an NFT and claims exactly one day of rewards", async function () {
    const { user, mintPrice, nft, coin, vault } =
      await networkHelpers.loadFixture(deployFixture);
    const userAddress = await user.getAddress();

    await (await nft.connect(user).mint(1n, { value: mintPrice })).wait();
    await (await nft.connect(user).approve(await vault.getAddress(), 1n)).wait();
    await expect(vault.connect(user).stake(1n)).to.emit(vault, "Staked");

    const startedAt = await vault.timestampStarted(1n);
    const oneDay = BigInt(networkHelpers.time.duration.days(1));
    await networkHelpers.time.setNextBlockTimestamp(startedAt + oneDay);

    await expect(vault.connect(user).claimRewards(1n))
      .to.emit(vault, "RewardsClaimed")
      .withArgs(userAddress, 1n, ethers.parseEther("1"));

    expect(await coin.balanceOf(userAddress)).to.equal(ethers.parseEther("1"));
    expect(await vault.ownerOfToken(1n)).to.equal(userAddress);
  });

  it("unstakes the NFT and mints the accrued rewards", async function () {
    const { user, mintPrice, nft, coin, vault } =
      await networkHelpers.loadFixture(deployFixture);
    const userAddress = await user.getAddress();

    await (await nft.connect(user).mint(1n, { value: mintPrice })).wait();
    await (await nft.connect(user).approve(await vault.getAddress(), 1n)).wait();
    await (await vault.connect(user).stake(1n)).wait();

    const startedAt = await vault.timestampStarted(1n);
    const twoDays = BigInt(networkHelpers.time.duration.days(2));
    await networkHelpers.time.setNextBlockTimestamp(startedAt + twoDays);

    await expect(vault.connect(user).unstake(1n))
      .to.emit(vault, "Unstaked")
      .withArgs(userAddress, 1n, ethers.parseEther("2"));

    expect(await nft.ownerOf(1n)).to.equal(userAddress);
    expect(await coin.balanceOf(userAddress)).to.equal(ethers.parseEther("2"));
    expect(await vault.ownerOfToken(1n)).to.equal(ethers.ZeroAddress);
  });
});