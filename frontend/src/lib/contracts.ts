import { parseAbi, type Address } from "viem";

export const SEPOLIA_CHAIN_ID = 11_155_111;
export const NFT_ADDRESS = "0xE73A1CA4e89b1afFE6a96d7d5b6D6F8c1669b12D" as Address;
export const COIN_ADDRESS = "0xfd3e678d9dAE2762B0205254E60723f845b024cA" as Address;
export const VAULT_ADDRESS = "0x5a746227730c729c9Fcc26Ccd0fB0a111E1D5bB5" as Address;

export const nftAbi = parseAbi([
  "function mint(uint256 quantity) payable",
  "function mintPrice() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function approve(address to, uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
]);

export const coinAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
]);

export const vaultAbi = parseAbi([
  "function stake(uint256 tokenId)",
  "function calculateRewards(address user, uint256 tokenId) view returns (uint256)",
  "function claimRewards(uint256 tokenId)",
  "function unstake(uint256 tokenId)",
  "function ownerOfToken(uint256 tokenId) view returns (address)",
  "function timestampStarted(uint256 tokenId) view returns (uint256)",
]);

export const contracts = {
  nft: { address: NFT_ADDRESS, abi: nftAbi },
  coin: { address: COIN_ADDRESS, abi: coinAbi },
  vault: { address: VAULT_ADDRESS, abi: vaultAbi },
} as const;