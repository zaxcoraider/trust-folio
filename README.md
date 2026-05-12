# TrustFolio

> **Decentralized AI-Verified Professional Portfolio Platform — Live on 0G Testnet & Mainnet**

TrustFolio lets professionals mint their portfolios as on-chain credentials with AI-generated trust scores. Every file is stored on 0G's decentralized storage, scored by an LLM running on 0G Compute, and issued as a verifiable token on 0G Chain — creating a tamper-proof, portable professional identity that works across both testnet and mainnet with fully isolated data.

**Live →** [trustfolio.space](https://trustfolio.space)  
**Meme Layer →** [fun.trustfolio.space](https://fun.trustfolio.space)  
**Built on →** [0G Network](https://0g.ai)

---

## The Problem

The traditional portfolio system is broken:
- PDFs get lost, faked, or doctored
- Credentials can't be verified without contacting institutions
- Open source contributors ship tools used by millions — and get nothing back
- Employers have no trustless way to verify skill claims

TrustFolio fixes all of this with three 0G modules working in concert.

---

## The Ecosystem

TrustFolio is two products, one treasury, one network.

```
┌─────────────────────────────────────────────────────────────┐
│                    TrustFolio Ecosystem                      │
│                                                             │
│  trustfolio.space          fun.trustfolio.space             │
│  ─────────────────         ─────────────────────            │
│  Professional portfolio    Meme token launchpad             │
│  verification platform     for viral OSS repos              │
│                                                             │
│  Upload → AI Verify →      GitHub Repo → Bonding Curve →   │
│  Mint Credential →         Token Launch → DEX Graduation    │
│  Get Hired                                                  │
│                                                             │
│  Both powered by 0G Network. Both fees → TrustFolio treasury│
└─────────────────────────────────────────────────────────────┘
```

→ See [fun.trustfolio.space README](https://github.com/zaxcoraider/fun-trustfolio) for full details on the meme token layer.

---

## What TrustFolio Does

```
Upload File  ──►  0G Storage  ──►  Root Hash (immutable proof)
                                         │
                                    0G Compute
                                    (AI scoring)
                                         │
                               Score + Breakdown
                                         │
                                    0G Chain
                              ┌──────────┴──────────┐
                   SoulBound Credential        INFT (ERC-7857)
                   (non-transferable,         (transferable,
                    identity anchor)           tradeable on
                                               Marketplace)
```

### For Talent
- **Upload** any portfolio file (PDF, code, design, doc) → stored on 0G decentralized storage
- **AI Verify** → 0G Compute scores across 4 axes: Originality, Quality, Complexity, Authenticity
- **Mint SoulBound Credential** (ERC-5192) → permanent, non-transferable identity anchor
- **Mint INFT** (ERC-7857) → transferable NFT with AI scores embedded on-chain
- **List on Marketplace** → sell credentials or receive hiring offers
- **Public Profile** → shareable at `/profile/[wallet]`

### For Employers
- **Browse verified talent** filtered by score tier, skill category, badges
- **Send hiring requests** with on-chain escrow — payment held until job completion
- **2.5% platform fee** on escrow releases — trustless, no intermediary

### For Traders (fun.trustfolio.space)
- Deploy meme tokens for viral open source repos
- Trade on a bonding curve — no whale manipulation
- Auto-graduation to DEX when bonding curve fills

---

## Live Networks

### 0G Galileo Testnet (Chain ID: 16602)

| Contract | Address |
|----------|---------|
| SoulBoundCredential | `0xa0fFE4b4FEC7f3fD0d4737385f7a97254B4D69ae` |
| TrustFolioINFT | `0x7558AEa3b63254295288038942e1421D9117C38D` |
| TrustFolioMarketplace | `0x1d4C87Fe51E4774347546f51237Dce0E9317Bbd7` |
| TrustFolioHiringEscrow | `0xC2a13e00d1e3D89460fb6420ccaBCA7a900fF590` |

| Property | Value |
|----------|-------|
| RPC | `https://evmrpc-testnet.0g.ai` |
| Explorer | https://chainscan-galileo.0g.ai |
| Storage Explorer | https://storagescan-galileo.0g.ai |
| Storage Indexer | `https://indexer-storage-testnet-turbo.0g.ai` |
| Faucet | https://faucet.0g.ai |

---

### 0G Mainnet (Chain ID: 16661)

| Contract | Address |
|----------|---------|
| SoulBoundCredential | `0x5C097BfA3978EADF934F01390fAA205b7E509a30` |
| TrustFolioINFT | `0x85dBD18c7E4dfA980eA8aB5c6720955ac791cF07` |
| TrustFolioMarketplace | `0x9829e26c4778048414bdE8E8fD7B9C82b513910e` |
| TrustFolioHiringEscrow | `0x344B9Fd4cE4100dDEa745b16D59CA8ffB99D1C41` |

| Property | Value |
|----------|-------|
| RPC | `https://evmrpc.0g.ai` |
| Explorer | https://chainscan.0g.ai |
| Storage Explorer | https://storagescan.0g.ai |
| Storage Indexer | `https://indexer-storage-turbo.0g.ai` |
| Storage Flow Contract | `0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526` |

---

## Credential Tier System

| Tier | Score | Badge | Mintable |
|------|-------|-------|----------|
| Diamond | 90 – 100 | `💎` | INFT + SoulBound |
| Gold | 75 – 89 | `🥇` | INFT + SoulBound |
| Silver | 50 – 74 | `🥈` | INFT + SoulBound |
| Bronze | 0 – 49 | `🥉` | SoulBound only |

Diamond and Gold holders unlock achievement badges: `Highly Original`, `High Quality`, `Complex Work`, `Authentic` — based on individual axis scores.

---

## Hybrid Execution Model

TrustFolio splits execution between server and client by design — not convenience.

```
┌────────────────────────────┬────────────────────────────────────┐
│     SERVER SIDE            │          CLIENT SIDE               │
│   (Next.js API Routes)     │        (User's Wallet)             │
├────────────────────────────┼────────────────────────────────────┤
│ /api/upload                │ mintCredential()                   │
│   Server wallet signs the  │   User wallet signs directly.      │
│   0G Storage tx and pays   │   Soul-bound to their address.     │
│   the fee. User never      │   No server key involved.          │
│   touches the storage SDK. │                                    │
├────────────────────────────┼────────────────────────────────────┤
│ /api/verify                │ mintINFT()                         │
│   0G Compute broker runs   │   User wallet signs + pays the     │
│   on the server. API keys  │   0.001 0G minting fee directly    │
│   never exposed to client. │   to the contract.                 │
│   Returns score + JSON.    │                                    │
├────────────────────────────┼────────────────────────────────────┤
│ /api/nft-image             │ Marketplace / Hire / Governance    │
│   SVG token art generated  │   All contract interactions go     │
│   server-side so explorers │   through the user's wallet.       │
│   can render NFT metadata. │   Platform has zero custody.       │
└────────────────────────────┴────────────────────────────────────┘
```

---

## Network Architecture

TrustFolio runs on **both testnet and mainnet simultaneously** with complete data isolation:

```
┌──────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│          Next.js 14 (App Router) + wagmi + viem + RainbowKit     │
│                                                                  │
│  NetworkContext  ──  reads wallet chainId  ──  switches all data │
└──────────┬─────────────────────────────────────┬─────────────────┘
           │                                     │
   ┌───────▼────────┐                   ┌────────▼────────┐
   │  TESTNET MODE  │                   │  MAINNET MODE   │
   │  Chain 16602   │                   │  Chain 16661    │
   └───────┬────────┘                   └────────┬────────┘
           │                                     │
   ┌───────▼────────┐                   ┌────────▼────────┐
   │  0G Testnet    │                   │  0G Mainnet     │
   │  Contracts     │                   │  Contracts      │
   │  Storage       │                   │  Storage        │
   │  Compute       │                   │  Compute        │
   └────────────────┘                   └─────────────────┘
```

Switching networks by switching your wallet's chain automatically switches all dashboards, credential views, histories, and notifications — nothing bleeds across.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                             │
│   Next.js 14 (App Router) + wagmi + viem + RainbowKit           │
└──────────────────┬──────────────────────────┬───────────────────┘
                   │ Server API Routes         │ Direct RPC (wallet)
         ┌─────────▼──────────┐     ┌─────────▼──────────────────┐
         │   /api/upload      │     │       0G Chain (EVM)        │
         │  0G Storage SDK    │     │                             │
         │  server wallet     │     │  ┌─────────────────────┐   │
         │  pays storage fee  │     │  │ SoulBoundCredential  │   │
         └─────────┬──────────┘     │  │ (ERC-5192)          │   │
                   │                │  │ non-transferable     │   │
         ┌─────────▼──────────┐     │  ├─────────────────────┤   │
         │   /api/verify      │     │  │ TrustFolioINFT      │   │
         │   0G Compute       │────►│  │ (ERC-7857)          │   │
         │   LLM scoring      │     │  │ AI scores on-chain  │   │
         │   fallback: sim    │     │  ├─────────────────────┤   │
         └────────────────────┘     │  │ Marketplace         │   │
                                    │  │ 2.5% protocol fee   │   │
                                    │  ├─────────────────────┤   │
                                    │  │ HiringEscrow        │   │
                                    │  │ escrow + milestones │   │
                                    │  └─────────────────────┘   │
                                    └────────────────────────────┘
```

**Smart contracts — Solidity 0.8.24, OpenZeppelin v5, EVM cancun:**

| Contract | Standard | Key Feature |
|----------|----------|-------------|
| `SoulBoundCredential` | ERC-5192 | Transfers permanently blocked. Scores + both 0G root hashes stored on-chain. |
| `TrustFolioINFT` | ERC-7857 | AI breakdown (4 axes) + skill tier + badges embedded. Min score 60 enforced. 0.001 0G minting fee. |
| `TrustFolioMarketplace` | — | Peer-to-peer INFT trading. 2.5% fee to treasury. |
| `TrustFolioHiringEscrow` | — | Employer posts escrow. Matched against INFT scores on-chain. |

---

## 0G Modules Used

| Module | How TrustFolio Uses It |
|--------|------------------------|
| **0G Chain** | All smart contract deployment and execution. Credential issuance, marketplace trades, hiring escrow. Both testnet (16602) and mainnet (16661). |
| **0G Storage** | Decentralized file storage for portfolio files and AI proof JSONs. Server wallet handles the upload transaction; Merkle root hash is anchored in every on-chain token. |
| **0G Compute** | LLM inference for portfolio scoring. `/api/verify` calls a model via the 0G Compute broker. Falls back to deterministic simulation if no compute key is configured. |

---

## Revenue Model

TrustFolio is designed to be self-sustaining:

| Source | Fee | Trigger |
|--------|-----|---------|
| Marketplace | 2.5% | Every INFT sale |
| Hiring Escrow | 2.5% | Every payment release |
| INFT Minting | 0.001 0G | Per mint |
| fun.tf Launch | 0.1 0G | Per repo token deployment |
| fun.tf Trading | 1% | Per bonding curve trade |
| fun.tf Graduation | 0.5% | On DEX graduation |

All fees flow to the TrustFolio treasury — paying for 0G Compute, storage, and infrastructure indefinitely.

---

## Local Development

### Prerequisites
- Node.js 18+
- A wallet with 0G testnet tokens ([faucet.0g.ai](https://faucet.0g.ai))
- WalletConnect project ID ([cloud.walletconnect.com](https://cloud.walletconnect.com))

### 1. Clone and install

```bash
git clone https://github.com/zaxcoraider/trust-folio.git
cd trust-folio
npm install --legacy-peer-deps
```

### 2. Environment setup

```bash
cp .env.example .env.local
```

Minimum required variables:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

PRIVATE_KEY=0x_your_private_key

NEXT_PUBLIC_TESTNET_SOULBOUND_ADDRESS=0xa0fFE4b4FEC7f3fD0d4737385f7a97254B4D69ae
NEXT_PUBLIC_TESTNET_INFT_ADDRESS=0x7558AEa3b63254295288038942e1421D9117C38D
NEXT_PUBLIC_TESTNET_MARKETPLACE_ADDRESS=0x1d4C87Fe51E4774347546f51237Dce0E9317Bbd7
NEXT_PUBLIC_TESTNET_HIRING_ADDRESS=0xC2a13e00d1e3D89460fb6420ccaBCA7a900fF590

NEXT_PUBLIC_MAINNET_SOULBOUND_ADDRESS=0x5C097BfA3978EADF934F01390fAA205b7E509a30
NEXT_PUBLIC_MAINNET_INFT_ADDRESS=0x85dBD18c7E4dfA980eA8aB5c6720955ac791cF07
NEXT_PUBLIC_MAINNET_MARKETPLACE_ADDRESS=0x9829e26c4778048414bdE8E8fD7B9C82b513910e
NEXT_PUBLIC_MAINNET_HIRING_ADDRESS=0x344B9Fd4cE4100dDEa745b16D59CA8ffB99D1C41
NEXT_PUBLIC_MAINNET_STORAGE_FLOW=0x62D4144dB0F0a6fBBaeb6296c785C71B3D57C526
NEXT_PUBLIC_MAINNET_INDEXER_RPC=https://indexer-storage-turbo.0g.ai

# Optional — enables real AI scoring (falls back to simulation if not set)
COMPUTE_SERVICE_URL=https://your-provider/v1/proxy
COMPUTE_API_KEY=app-sk-your_secret_key
COMPUTE_MODEL=qwen-2.5-7b-instruct
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## User Flow

```
1. Connect wallet (MetaMask, OKX, Trust, Coinbase, Rainbow…)
        │
        ▼
2. App detects chain → activates Testnet or Mainnet mode automatically
        │
        ▼
3. Upload → drop any file (PDF, code, image, doc — up to 50 MB)
   Server wallet uploads to 0G Storage → returns root hash
        │
        ▼
4. Verify → AI scores your file via 0G Compute
   Proof JSON stored on 0G Storage → proof root hash returned
        │
        ▼
5. Score ≥ 50 → Mint SoulBound Credential (free, non-transferable)
   Score ≥ 60 → Mint INFT (0.001 0G fee, transferable)
        │
        ▼
6. View credentials on Profile page
   List INFT on Marketplace
   Apply to jobs via Hire
   Or visit fun.trustfolio.space to launch a repo token
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Web3 | wagmi v2, viem, ethers.js 6, RainbowKit |
| Smart Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin v5 |
| 0G Integration | `@0gfoundation/0g-ts-sdk` (storage), `@0glabs/0g-serving-broker` (compute) |
| State | localStorage (network-aware keys), React Context |

---

## Pages

| Route | Purpose | Auth |
|-------|---------|------|
| `/` | Landing page | No |
| `/upload` | Upload files to 0G Storage | Yes |
| `/dashboard` | Manage your portfolio | Yes |
| `/verify` | AI verification | Yes |
| `/mint` | Mint INFT | Yes |
| `/marketplace` | Browse & buy INFTs | No |
| `/hire` | Talent marketplace | No |
| `/profile/[wallet]` | Public profile | No |
| `/history` | Activity history | Yes |
| `/admin` | Revenue dashboard | Owner only |

---

## License

MIT
