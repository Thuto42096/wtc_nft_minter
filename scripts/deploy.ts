import { network } from "hardhat";

const INITIAL_MINT_PRICE = "0.01";

const { ethers, networkName } = await network.connect();
const [deployer] = await ethers.getSigners();

console.log(`Deploying WTC staking ecosystem to ${networkName}...`);
console.log(`Deployer: ${await deployer.getAddress()}`);

const nft = await ethers.deployContract("WTC_NFT", [ethers.parseEther(INITIAL_MINT_PRICE)]);
await nft.waitForDeployment();

const coin = await ethers.deployContract("WTC_Coin");
await coin.waitForDeployment();

const vault = await ethers.deployContract("StakingVault", [
  await nft.getAddress(),
  await coin.getAddress(),
]);
await vault.waitForDeployment();

const minterRole = await coin.MINTER_ROLE();
const grantMinterRoleTx = await coin.grantRole(minterRole, await vault.getAddress());
await grantMinterRoleTx.wait();

console.log("Deployment successful.");
console.log(`WTC_NFT: ${await nft.getAddress()}`);
console.log(`WTC_Coin: ${await coin.getAddress()}`);
console.log(`StakingVault: ${await vault.getAddress()}`);
console.log(`Vault granted MINTER_ROLE: ${await vault.getAddress()}`);