# WTC NFT Vault Frontend

Retro 8-bit dApp for minting and staking WTC NFTs on Ethereum Sepolia.

🌐 **Live site:** [https://wtc-nft-minter.vercel.app](https://wtc-nft-minter.vercel.app)

## Features

- MetaMask wallet connect (Sepolia)
- Mint WTC NFTs
- Approve + stake NFTs into the vault
- Claim WTCC ERC-20 rewards
- Unstake / withdraw NFTs
- Auto-discover wallet-held and vault-staked NFTs
- Retro 8-bit arcade UI

## Stack

- [Next.js 16](https://nextjs.org) + React 19 + TypeScript
- [wagmi v3](https://wagmi.sh) + [viem v2](https://viem.sh)
- [Tailwind CSS v4](https://tailwindcss.com)
- MetaMask via `injected` connector

## Local development

1. Copy the env template and fill in your RPC URL:

```bash
cp .env.example .env
```

2. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect MetaMask on **Sepolia**.

Required env vars:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Sepolia JSON-RPC endpoint |

Free public options:
- `https://ethereum-sepolia-rpc.publicnode.com`
- `https://rpc.sepolia.org`

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

## Contracts (Sepolia)

| Contract | Address |
|---|---|
| `WTC_NFT` | [`0xE73A1CA4e89b1afFE6a96d7d5b6D6F8c1669b12D`](https://sepolia.etherscan.io/address/0xE73A1CA4e89b1afFE6a96d7d5b6D6F8c1669b12D) |
| `WTC_Coin` | [`0xfd3e678d9dAE2762B0205254E60723f845b024cA`](https://sepolia.etherscan.io/address/0xfd3e678d9dAE2762B0205254E60723f845b024cA) |
| `StakingVault` | [`0x5a746227730c729c9Fcc26Ccd0fB0a111E1D5bB5`](https://sepolia.etherscan.io/address/0x5a746227730c729c9Fcc26Ccd0fB0a111E1D5bB5) |

All contracts are verified on Sepolia Etherscan.

## Validation

```bash
npm run lint
npm run build
npm run start
```
