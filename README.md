# WTC NFT Minter

NFT minting and staking ecosystem on Ethereum Sepolia.

🌐 **Live site:** [https://wtc-nft-minter.vercel.app](https://wtc-nft-minter.vercel.app)

## Repository layout

```
/                  ← Hardhat project (contracts, tests, deploy scripts)
  contracts/       ← Solidity contracts (WTC_NFT, WTC_Coin, StakingVault)
  scripts/         ← Hardhat deploy script
  test/            ← Hardhat tests
  frontend/        ← Next.js dApp (see frontend/README.md)
```

## Contracts (Sepolia)

| Contract | Address |
|---|---|
| `WTC_NFT` | [`0xE73A1CA4e89b1afFE6a96d7d5b6D6F8c1669b12D`](https://sepolia.etherscan.io/address/0xE73A1CA4e89b1afFE6a96d7d5b6D6F8c1669b12D) |
| `WTC_Coin` | [`0xfd3e678d9dAE2762B0205254E60723f845b024cA`](https://sepolia.etherscan.io/address/0xfd3e678d9dAE2762B0205254E60723f845b024cA) |
| `StakingVault` | [`0x5a746227730c729c9Fcc26Ccd0fB0a111E1D5bB5`](https://sepolia.etherscan.io/address/0x5a746227730c729c9Fcc26Ccd0fB0a111E1D5bB5) |

All contracts are verified on Sepolia Etherscan.

## Hardhat commands

```bash
npm run build             # compile contracts
npm run test:staking      # run tests
npm run deploy:sepolia    # deploy to Sepolia
npm run verify:nft        # verify WTC_NFT on Etherscan
npm run verify:coin       # verify WTC_Coin on Etherscan
npm run verify:vault      # verify StakingVault on Etherscan
```

Copy `.env.example` to `.env` and fill in:

- `SEPOLIA_RPC_URL`
- `SEPOLIA_PRIVATE_KEY`
- `ETHERSCAN_API_KEY`

## Frontend

See [`frontend/README.md`](./frontend/README.md) for local dev and Vercel deployment instructions.