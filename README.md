# TrustFolio

> **Decentralized AI-Verified Professional Portfolio Platform — Live on 0G Testnet & Mainnet**

TrustFolio lets professionals mint their portfolios as on-chain credentials with AI-generated trust scores. Every file is stored on 0G's decentralized storage, scored by an LLM running on 0G Compute, and issued as a verifiable token on 0G Chain — creating a tamper-proof, portable professional identity that works across both testnet and mainnet with fully isolated data.

---

## Live Networks

### 0G Galileo Testnet (Chain ID: 16602)

| Contract | Address |
|----------|---------|
| SoulBoundCredential | `0x...` *(deploy via `scripts/deploy-all.js`)* |
| TrustFolioINFT | `0x...` |
| TrustFolioMarketplace | `0x...` |
| TrustFolioHiringEscrow | `0x...` |

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

## What is TrustFolio?

The traditional portfolio system is broken — PDFs get lost, credentials can be faked, and there is no universal way to verify skill claims. TrustFolio fixes this with three 0G modules working in concert:

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

**1. AI Verification** — files are scored across four axes by an LLM running on 0G Compute:
- **Originality** — how unique and creative is the work?
- **Quality** — code standards, design polish, writing clarity
- **Complexity** — depth and technical sophistication
- **Authenticity** — evidence this is real, original human work

**2. Decentralized Storage** — the original file and AI proof JSON are stored on 0G Storage. The SDK returns a Merkle root hash that is anchored in every on-chain token — anyone can verify the file is untampered.

**3. On-Chain Credentials** — verified portfolios are minted as:
- **SoulBoundCredential (ERC-5192)** — permanently tied to the creator's wallet. Non-transferable. Serves as a verifiable professional identity.
- **Intelligent NFT / INFT (ERC-7857)** — transferable with AI scores embedded. Tradeable on the built-in marketplace. Minimum score of 60 enforced at the contract level.

---

## Network Architecture

TrustFolio runs on **both testnet and mainnet simultaneously** with complete data isolation:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Browser                                │
│          Next.js 14 (App Router) + wagmi + viem + RainbowKit        │
│                                                                     │
│  NetworkContext  ──  reads wallet chainId  ──  switches all data    │
└──────────┬──────────────────────────────────────┬───────────────────┘
           │                                      │
   ┌───────▼────────┐                    ┌────────▼────────┐
   │  TESTNET MODE  │                    │  MAINNET MODE   │
   │  Chain 16602   │                    │  Chain 16661    │
   │                │                    │                 │
   │  /api/upload   │                    │  /api/upload    │
   │  skipTx: true  │                    │  skipTx: false  │
   │  (free)        │                    │  (server wallet │
   │                │                    │   pays fee)     │
   │  /api/verify   │                    │  /api/verify    │
   │  testnet RPC   │                    │  mainnet RPC    │
   └───────┬────────┘                    └────────┬────────┘
           │                                      │
   ┌───────▼────────┐                    ┌────────▼────────┐
   │  0G Testnet    │                    │  0G Mainnet     │
   │  Contracts     │                    │  Contracts      │
   │  Storage       │                    │  Storage        │
   │  Compute       │                    │  Compute        │
   └────────────────┘                    └─────────────────┘
```

**What is isolated per-network in localStorage:**

| Store | Testnet Key | Mainnet Key |
|-------|------------|-------------|
| Portfolio files | `trustfolio_files_testnet_<addr>` | `trustfolio_files_mainnet_<addr>` |
| Verification history | `trustfolio_verifications_testnet_<addr>` | `trustfolio_verifications_mainnet_<addr>` |
| Minted INFTs | `trustfolio_all_infts_testnet` | `trustfolio_all_infts_mainnet` |
| Notifications | `trustfolio_notifications_testnet_<addr>` | `trustfolio_notifications_mainnet_<addr>` |

Switching networks (by switching your wallet's chain) automatically switches all dashboards, credential views, histories, and notifications — nothing bleeds across.

---

## System Architecture — Deep Dive

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

| Contract | Standard | Key feature |
|----------|----------|-------------|
| `SoulBoundCredential` | ERC-5192 | Transfers permanently blocked. Scores + both 0G root hashes stored on-chain. |
| `TrustFolioINFT` | ERC-7857 | AI breakdown (4 axes) + skill tier + badges embedded. Min score 60 enforced. 0.001 0G minting fee. |
| `TrustFolioMarketplace` | — | Peer-to-peer INFT trading. 2.5% fee to treasury. |
| `TrustFolioHiringEscrow` | — | Employer posts escrow. Matched against INFT scores on-chain. |

---

## Credential Tier System

| Tier | Score Range | Token | Color |
|------|-------------|-------|-------|
| Diamond | 90 – 100 | `💎` | Neon White |
| Gold | 75 – 89 | `🥇` | Neon Amber |
| Silver | 50 – 74 | `🥈` | Neon Cyan |
| Bronze | 0 – 49 | `🥉` | Neon Purple (display only, not mintable) |

Diamond and Gold holders unlock `Highly Original`, `High Quality`, `Complex Work`, and `Authentic` badges based on individual axis scores.

---

## 0G Modules Used

| Module | How TrustFolio Uses It |
|--------|------------------------|
| **0G Chain** | All smart contract deployment and execution. Credential issuance, marketplace trades, hiring escrow, and governance. Both testnet (16602) and mainnet (16661). |
| **0G Storage** | Decentralized file storage for portfolio files and AI proof JSONs. Server wallet handles the upload transaction; Merkle root hash is anchored in every on-chain token. |
| **0G Compute** | LLM inference for portfolio scoring. `/api/verify` calls a model (default: `qwen-2.5-7b-instruct`) via the 0G Compute broker. Falls back to deterministic simulation if no compute key is configured. |

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
# Wallet Connect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Server wallet (pays 0G Storage fees)
PRIVATE_KEY=0x_your_private_key

# Testnet contract addresses (after deploying — Step 3)
NEXT_PUBLIC_TESTNET_SOULBOUND_ADDRESS=0x...
NEXT_PUBLIC_TESTNET_INFT_ADDRESS=0x...
NEXT_PUBLIC_TESTNET_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_TESTNET_HIRING_ADDRESS=0x...

# Mainnet contract addresses (already deployed — copy from above)
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

### 3. Deploy testnet contracts

```bash
npx hardhat run scripts/deploy-all.js --network 0g-testnet
```

The script prints all four contract addresses. Copy them into `.env.local`.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## User Flow

```
1. Connect wallet (MetaMask, Rabby, OKX, Coinbase…)
        │
        ▼
2. App detects chain → activates Testnet or Mainnet mode automatically
        │
        ▼
3. Go to Upload → drop any file (PDF, code, image, doc, zip — up to 50 MB)
   Server wallet uploads to 0G Storage → returns root hash
        │
        ▼
4. Go to Verify → AI scores your file via 0G Compute
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
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS |
| Web3 | wagmi v2, viem, ethers.js 6, RainbowKit |
| Smart Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin v5 (EVM: cancun) |
| 0G Integration | `@0gfoundation/0g-ts-sdk` (storage), `@0glabs/0g-serving-broker` (compute) |
| State | localStorage (network-aware keys), React Context (NetworkContext) |

---

## License

MIT
