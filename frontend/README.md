# WTC Pixel Vault Frontend

Next.js frontend for the Sepolia WTC NFT minting + staking dApp.

## Features

- MetaMask wallet connect
- Mint WTC NFTs
- Approve + stake NFTs
- Claim WTCC rewards
- Unstake NFTs
- Auto-discover wallet and vault-staked NFTs
- Retro 8-bit arcade UI

## Local development

1. Create `frontend/.env` from `frontend/.env.example`
2. Start the dev server:

```bash
npm run dev
```

Required env vars:

- `NEXT_PUBLIC_SEPOLIA_RPC_URL`

## Vercel deployment

This repository is a monorepo-style layout:

- Hardhat project at the repo root
- Next.js app in `frontend/`

### Vercel dashboard settings

When importing this repo into Vercel, set:

- **Framework Preset:** `Next.js`
- **Root Directory:** `frontend`
- **Install Command:** leave default or use `npm install`
- **Build Command:** leave default or use `npm run build`
- **Output Directory:** leave default

### Environment variables

Add this variable in Vercel for Preview and Production:

- `NEXT_PUBLIC_SEPOLIA_RPC_URL`

Example value:

- `https://ethereum-sepolia-rpc.publicnode.com`

### Deploy steps

1. Push this repo to GitHub
2. Import the repository into Vercel
3. Set the **Root Directory** to `frontend`
4. Add `NEXT_PUBLIC_SEPOLIA_RPC_URL`
5. Deploy

### Vercel CLI note

For monorepos, run Vercel CLI commands from the **repository root**, not from `frontend/`.

Example:

```bash
vercel link --repo
```

Then choose the project that points at the `frontend` root directory.

## Contract configuration

The frontend is already wired to these deployed Sepolia contracts in `src/lib/contracts.ts`:

- `WTC_NFT`: `0xE73A1CA4e89b1afFE6a96d7d5b6D6F8c1669b12D`
- `WTC_Coin`: `0xfd3e678d9dAE2762B0205254E60723f845b024cA`
- `StakingVault`: `0x5a746227730c729c9Fcc26Ccd0fB0a111E1D5bB5`

## Validation

Validated locally with:

- `npm run lint`
- `npm run build`
- `npm run start`
