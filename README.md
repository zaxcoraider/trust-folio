# TrustFolio — Verified Portfolios, Trusted Everywhere

> Upload your portfolio to 0G decentralized storage, get AI-verified quality scores, mint soul-bound credentials, and showcase work the world can trust.

**Live on 0G-Galileo-Testnet (Chain ID: 16602)**

---

## What is TrustFolio?

TrustFolio is a full-stack Web3 portfolio verification platform built on the **0G blockchain network**. It lets developers, designers, and creators:

- **Upload** work files to permanent decentralized storage (0G Storage)
- **Verify** portfolio quality using AI (0G Compute / Qwen 2.5)
- **Mint** non-transferable soul-bound credential NFTs (ERC-5192)
- **Trade** Intelligent NFTs (iNFTs) on a built-in marketplace
- **Hire** talent via on-chain escrow contracts
- **Govern** the protocol through DAO proposals and TRUST token voting
- **Stake** TRUST tokens to earn rewards and unlock boost tiers

---

## Features

### Phase 1 — Upload & AI Verification
- Drag-and-drop file upload to 0G decentralized storage
- Merkle tree hashing generates a tamper-proof root hash
- AI scoring via 0G Compute (Qwen 2.5 7B Instruct) across 4 dimensions:
  - **Originality** — uniqueness and creativity
  - **Quality** — technical polish and professionalism
  - **Complexity** — depth and mastery
  - **Authenticity** — confidence this is genuine work
- Auto skill detection: code, design, writing, document
- Verification proof JSON uploaded to 0G Storage (separate root hash)
- Tier system: **Diamond** (90–100) · **Gold** (75–89) · **Silver** (50–74) · **Bronze** (0–49)

### Phase 2 — Soul-Bound Credentials (ERC-5192)
- Verified files (score ≥ 50) can be minted as non-transferable NFTs
- On-chain metadata with SVG image, scores, tier, and proof hash
- Credentials are permanently locked to the minter's wallet
- Public verification via root hash lookup

### Phase 3 — iNFT Marketplace & Hiring
- **Marketplace**: list, buy, and sell Intelligent NFTs with 2.5% platform fees
- **Offers**: place time-limited offers on any listing
- **Hiring Escrow**: post jobs, accept talent, release milestone payments
- **Dispute resolution**: built into the escrow contract

### Phase 4 — Tokenomics & Governance
- **TRUST Token** (ERC-20 + ERC20Votes): 100M supply, governance-enabled
- **Staking**: earn 8% APY, unlock boost tiers:
  - Bronze (100 TRUST) → 2× visibility, priority queue
  - Silver (500 TRUST) → 5× visibility, governance voting
  - Gold (2,000 TRUST) → 10× visibility, zero fees
  - Diamond (10,000 TRUST) → max visibility, revenue share
- **DAO Governance**: create proposals, vote, 2-day timelock execution
- **Verify-to-Earn**: TRUST rewards distributed based on verification activity
- **API Keys**: tiered enterprise API access (100 free / 10k paid per day)
- **Cross-Chain Export**: portable W3C-style credential proofs
- **Notifications**: in-app alerts for verifications, sales, hires, governance

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2.5 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.4 + Framer Motion |
| Charts | Recharts |
| Wallet | RainbowKit 2 + wagmi 2 + viem 2 |
| EVM | Ethers.js 6 |
| Storage | 0G Storage SDK (`@0gfoundation/0g-ts-sdk`) |
| AI | 0G Compute (Qwen 2.5 7B Instruct) |
| Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin 5 |
| Deployment | Vercel (frontend) + 0G Galileo Testnet (contracts) |

---

## Smart Contracts (0G-Galileo-Testnet)

| Contract | Address | Description |
|---|---|---|
| SoulBoundCredential | `0xA4948e4512dC57Da24d7367FEb6e2f54aF0C200E` | Non-transferable credential NFTs (ERC-5192) |
| TrustFolioINFT | `0xb5aA5d6Ef8eC7a6B2DD32dA223Db79114f92F19E` | Tradeable Intelligent NFTs (ERC-7857) |
| Marketplace | `0xB765b6d8d828897F47Defd0132cb359Cc6d4EDff` | P2P iNFT trading with offers |
| HiringEscrow | `0xb627Eac1A6f55EDD851763FFBF1206F64F676513` | Milestone-based job escrow |
| TrustToken | `0x622B9B1dDbc6711eF00f30756e59A700FC8b7E10` | Governance + staking token (100M supply) |
| Staking | `0x3298D65ecD3E965E90811353b1a84De0a39FDd56` | TRUST staking pool (8% APY) |
| RewardsDistributor | `0xc0ac2E778E0Eac4e1cBD3CC81a4610F2c7B0E627` | Verify-to-earn reward distribution |
| TrustGovernor | `0x3A297B610dc888ecAdb41f4417155468884F7972` | OpenZeppelin DAO Governor |
| TimeLock | `0xE5A92194c6f391a31E7E0E664E0483A003fD4046` | 2-day proposal execution delay |
| Treasury | `0x21050d34f16238f021A4c93a319Dc140f86Eb485` | Protocol fee treasury |
| CrossChainVerifier | `0xA4b3Cec8Da09a0004e5c0931A50e392611112739` | Cross-chain proof publishing |
| APIKeyRegistry | `0x36f4df29f177259F59e30Df00801a5fcacC893DB` | On-chain API key registry |
| StorageFlow (0G) | `0x22E03a6A89B950F1c82ec5e74F8eCa321a105296` | 0G Storage payment contract |

**Network Details**
- RPC: `https://evmrpc-testnet.0g.ai`
- Explorer: `https://chainscan-galileo.0g.ai`
- Storage Explorer: `https://storagescan-galileo.0g.ai`
- Faucet: `https://faucet.0g.ai`

---

## Project Structure

```
trustfolio/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Landing page
│   ├── layout.tsx              # Root layout (Providers, Navbar)
│   ├── dashboard/              # Portfolio file manager
│   ├── upload/                 # File upload to 0G Storage
│   ├── verify/                 # AI verification
│   ├── mint/                   # Credential minting
│   ├── marketplace/            # iNFT marketplace
│   ├── hire/                   # Hiring & escrow
│   ├── governance/             # DAO proposals & voting
│   ├── stake/                  # TRUST staking
│   ├── profile/                # Public portfolio view
│   ├── settings/               # User profile config
│   ├── notifications/          # Notification inbox
│   ├── admin/                  # Admin dashboard
│   ├── stats/                  # Platform analytics
│   ├── check/                  # Public proof verifier
│   ├── history/                # Transaction history
│   ├── export/                 # Credential export
│   ├── docs/                   # Developer docs
│   ├── api-keys/               # API key management
│   └── api/                    # API routes (12 endpoints)
├── components/                 # Reusable React components (20+)
├── contracts/                  # Solidity smart contracts (12)
├── lib/                        # Stores, utilities, ABIs (19 files)
├── scripts/                    # Hardhat deployment scripts
├── deployments/
│   └── phase4.json             # Deployed contract addresses
├── public/
│   └── logo.png                # TrustFolio logo
├── .env.example                # Environment variable template
├── hardhat.config.js           # Solidity compiler & networks
├── next.config.js              # Next.js + webpack config
├── vercel.json                 # Vercel deployment config
└── tailwind.config.js          # Dark neon theme config
```

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| POST | `/api/verify` | AI verification of uploaded file |
| POST | `/api/mint` | Mint soul-bound credential NFT |
| GET | `/api/check/[rootHash]` | Public proof verification |
| GET | `/api/inft/listings` | Fetch marketplace listings |
| POST | `/api/inft/mint` | Mint iNFT from verified portfolio |
| GET | `/api/admin/stats` | Platform statistics |
| GET | `/api/profile-hash` | User profile root hash |
| POST | `/api/v1/verify` | Enterprise verification (API key required) |
| GET | `/api/v1/verify-proof/[rootHash]` | Fetch verification proof JSON |
| GET | `/api/v1/profile/[wallet]` | Public profile by wallet address |
| POST | `/api/v1/search` | Search profiles by skill/tier/name |
| POST | `/api/v1/hire` | Create hiring contract |

---

## Getting Started

### Prerequisites
- Node.js 18+
- MetaMask or any EVM wallet
- 0G testnet tokens from [faucet.0g.ai](https://faucet.0g.ai)

### Installation

```bash
git clone https://github.com/zaxcoraider/trustfolio.git
cd trustfolio
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# 0G Network
NEXT_PUBLIC_ZERO_G_RPC=https://evmrpc-testnet.0g.ai
NEXT_PUBLIC_ZERO_G_CHAIN_ID=16602
NEXT_PUBLIC_ZERO_G_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai
NEXT_PUBLIC_ZERO_G_STORAGE_EXPLORER=https://storagescan-galileo.0g.ai
NEXT_PUBLIC_ZERO_G_CHAIN_EXPLORER=https://chainscan-galileo.0g.ai
NEXT_PUBLIC_STORAGE_FLOW_CONTRACT=0x22E03a6A89B950F1c82ec5e74F8eCa321a105296

# WalletConnect (get from cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Server wallet (for proof uploads & minting)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Contracts
NEXT_PUBLIC_CREDENTIAL_CONTRACT=0xA4948e4512dC57Da24d7367FEb6e2f54aF0C200E
CREDENTIAL_CONTRACT=0xA4948e4512dC57Da24d7367FEb6e2f54aF0C200E
NEXT_PUBLIC_INFT_CONTRACT=0xb5aA5d6Ef8eC7a6B2DD32dA223Db79114f92F19E
INFT_CONTRACT=0xb5aA5d6Ef8eC7a6B2DD32dA223Db79114f92F19E
NEXT_PUBLIC_MARKETPLACE_CONTRACT=0xB765b6d8d828897F47Defd0132cb359Cc6d4EDff
MARKETPLACE_CONTRACT=0xB765b6d8d828897F47Defd0132cb359Cc6d4EDff
NEXT_PUBLIC_HIRING_ESCROW_CONTRACT=0xb627Eac1A6f55EDD851763FFBF1206F64F676513
HIRING_ESCROW_CONTRACT=0xb627Eac1A6f55EDD851763FFBF1206F64F676513
NEXT_PUBLIC_TRUST_TOKEN_CONTRACT=0x622B9B1dDbc6711eF00f30756e59A700FC8b7E10
NEXT_PUBLIC_STAKING_CONTRACT=0x3298D65ecD3E965E90811353b1a84De0a39FDd56
NEXT_PUBLIC_TRUST_GOVERNOR_CONTRACT=0x3A297B610dc888ecAdb41f4417155468884F7972

# 0G Compute AI (optional — falls back to simulation if not set)
COMPUTE_SERVICE_URL=https://your-provider-url/v1/proxy
COMPUTE_API_KEY=app-sk-your_key_here
COMPUTE_MODEL=qwen-2.5-7b-instruct
```

### Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

### Build for Production

```bash
npm run build
npm run start
```

---

## Deploying to Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import `trustfolio`
3. Add the following in **Settings → Environment Variables**:

| Variable | Notes |
|---|---|
| `PRIVATE_KEY` | Server wallet private key (keep secret) |
| `CREDENTIAL_CONTRACT` | `0xA4948e4512dC57Da24d7367FEb6e2f54aF0C200E` |
| `INFT_CONTRACT` | `0xb5aA5d6Ef8eC7a6B2DD32dA223Db79114f92F19E` |
| `MARKETPLACE_CONTRACT` | `0xB765b6d8d828897F47Defd0132cb359Cc6d4EDff` |
| `HIRING_ESCROW_CONTRACT` | `0xb627Eac1A6f55EDD851763FFBF1206F64F676513` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | From cloud.walletconnect.com |

4. Click **Deploy**

All `NEXT_PUBLIC_*` contract addresses are pre-configured in `vercel.json`.

---

## Smart Contract Development

```bash
# Compile contracts
npx hardhat compile

# Deploy Phase 1 (SoulBound)
npx hardhat run scripts/deploy.js --network 0g-testnet

# Deploy Phase 3 (INFT, Marketplace, Hiring)
npx hardhat run scripts/deploy-all.js --network 0g-testnet

# Deploy Phase 4 (TRUST, Staking, Governance)
npx hardhat run scripts/deploy-phase4.js --network 0g-testnet
```

Deployed addresses are auto-saved to `deployments/phase4.json`.

---

## License

MIT
