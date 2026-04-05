# TrustFolio

**Decentralized AI-Verified Professional Portfolio Platform on 0G Network**

TrustFolio lets professionals mint their portfolios as on-chain NFTs with AI-generated trust scores. Every uploaded file is stored on 0G's decentralized storage, scored by an AI model running on 0G Compute, and issued as a verifiable credential on 0G Chain — creating a tamper-proof, portable professional identity.

---

## Project Overview

The traditional portfolio system is broken: PDFs get lost, credentials can be faked, and there's no universal way to verify skill claims. TrustFolio solves this with three components working together:

1. **AI Verification** — uploads are scored across originality, quality, complexity, and authenticity using an LLM running on 0G Compute (falls back to deterministic simulation if no compute key is configured).
2. **Decentralized Storage** — the original file and AI proof JSON are uploaded to 0G Storage. The resulting root hashes are anchored on-chain, making them tamper-proof.
3. **On-Chain Credentials** — verified portfolios are minted as either:
   - **SoulBound Credential** (ERC-5192): non-transferable identity token tied to the creator forever.
   - **INFT — Intelligent NFT** (ERC-7857): transferable token with AI scores embedded, tradeable on the built-in marketplace.

Additional features built on top:
- **Marketplace** — buy and sell INFTs with 0G token payments
- **Hire** — employers post hiring requests matched to verified talent via INFT scores
- **Governance** — TRUST token holders vote on protocol proposals
- **Staking** — stake TRUST tokens to earn rewards
- **Stats dashboard** — live network and platform analytics

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                             │
│   Next.js 14 (App Router) + wagmi + viem + RainbowKit           │
└───────────────────┬────────────────────────────┬────────────────┘
                    │ API Routes                  │ Direct RPC
          ┌─────────▼──────────┐        ┌────────▼────────────┐
          │   /api/verify      │        │   0G Chain (EVM)    │
          │  (AI Scoring)      │        │   Chain ID: 16602   │
          │                    │        │                     │
          │  0G Compute ───────┼──────► │  SoulBoundCredential│
          │  (LLM inference)   │        │  TrustFolioINFT     │
          │  fallback: sim     │        │  Marketplace        │
          └─────────┬──────────┘        │  HiringEscrow       │
                    │                   └─────────────────────┘
          ┌─────────▼──────────┐
          │   0G Storage       │
          │  (client-side SDK) │
          │                    │
          │  - Portfolio file  │
          │  - AI proof JSON   │
          │  → root hash       │
          │    anchored on-chain│
          └────────────────────┘
```

**Data flow for minting:**
1. User uploads file → client sends to 0G Storage via `@0gfoundation/0g-ts-sdk`
2. File root hash sent to `/api/verify` → AI scores it via 0G Compute
3. Score + root hash returned → user confirms mint on 0G Chain
4. Smart contract stores root hash, scores, tier, and badges on-chain
5. SoulBound or INFT token issued to user's wallet

---

## 0G Modules Used

| Module | Usage in TrustFolio |
|--------|---------------------|
| **0G Chain** | Smart contract deployment (EVM, chainId 16602). All credential issuance, marketplace trades, hiring escrow, and governance live here. |
| **0G Storage** | Decentralized file storage for portfolio files and AI verification proof JSONs. Root hashes returned by the SDK are anchored in every on-chain token. |
| **0G Compute** | AI inference endpoint powering the portfolio scoring engine. The `/api/verify` route calls a model (default: `qwen-2.5-7b-instruct`) via the 0G Compute broker API to score uploads. |

---

## How 0G Modules Support the Product

### 0G Chain
All trust is enforced at the contract level on 0G Chain:
- `SoulBoundCredential.sol` — ERC-5192 compliant, transfers are permanently blocked. Score and both 0G Storage root hashes live on-chain.
- `TrustFolioINFT.sol` — ERC-7857 Intelligent NFT. Embeds AI scores (originality, quality, complexity, authenticity), skill tier (diamond/gold/silver), badges, and both proof + file root hashes. Min score of 60 enforced at the contract level — low-quality work cannot be minted.
- `TrustFolioMarketplace.sol` — peer-to-peer INFT trading with a 2.5% protocol fee.
- `TrustFolioHiringEscrow.sol` — escrow-based hiring contracts between employers and verified talent.

### 0G Storage
The `@0gfoundation/0g-ts-sdk` is used client-side (user signs the storage transaction from their own wallet — no server private key needed). Two files are stored per credential:
1. The original portfolio file (code, design, document, etc.)
2. A JSON proof object containing the AI breakdown and metadata

The returned root hashes serve as cryptographic commitments that the file content is immutable and verifiable by anyone.

### 0G Compute
The `/api/verify` route connects to a 0G Compute inference provider. It sends the file metadata and root hash to an LLM with a structured scoring prompt, receiving a JSON breakdown of `originality`, `quality`, `complexity`, and `authenticity` scores. The weighted average becomes the final trust score determining the credential tier. If no compute credentials are configured, a deterministic simulation runs instead so the app is always usable.

---

## Local Deployment

### Prerequisites
- Node.js 18+
- A wallet with 0G testnet tokens ([faucet](https://faucet.0g.ai))
- WalletConnect project ID ([cloud.walletconnect.com](https://cloud.walletconnect.com))

### 1. Clone and install

```bash
git clone https://github.com/<your-repo>/trustfolio.git
cd trustfolio
npm install --legacy-peer-deps
```

### 2. Environment setup

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
# Required
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# After deploying contracts (Step 3):
NEXT_PUBLIC_TESTNET_INFT_ADDRESS=0x...
NEXT_PUBLIC_TESTNET_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_TESTNET_HIRING_ADDRESS=0x...

# Optional — enables real AI scoring via 0G Compute:
COMPUTE_SERVICE_URL=https://your-provider-url/v1/proxy
COMPUTE_API_KEY=app-sk-your_secret_key
COMPUTE_MODEL=qwen-2.5-7b-instruct
```

### 3. Deploy smart contracts

Add your deployer wallet private key to `.env.local`:

```env
PRIVATE_KEY=0x_your_private_key_here
```

Then deploy to 0G Galileo Testnet:

```bash
npx hardhat run scripts/deploy-all.js --network 0g-testnet
```

The script will print the three contract addresses. Copy them into `.env.local`.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Reviewer Notes

### Test Account
- Use any EVM-compatible wallet (MetaMask, Rabby, etc.)
- Switch to **0G Galileo Testnet** (Chain ID: 16602, RPC: `https://evmrpc-testnet.0g.ai`)
- The app will prompt you to switch networks automatically if you're on the wrong chain

### Getting Testnet Tokens
- Faucet: [https://faucet.0g.ai](https://faucet.0g.ai)
- You need a small amount of 0G tokens to:
  - Upload files to 0G Storage (gas)
  - Mint a credential (0.001 0G minting fee)
  - Trade on the marketplace

### AI Scoring Without Compute Credentials
If `COMPUTE_SERVICE_URL` and `COMPUTE_API_KEY` are not set, the app falls back to a deterministic score simulator. Scores are derived from the file's root hash so they are consistent across sessions. The UI shows `Powered by: Simulation` vs `Powered by: 0G Compute` to distinguish the two modes.

### Key User Flow
1. Connect wallet → switch to 0G testnet
2. Go to **Mint** → upload any portfolio file (PDF, code, image, doc)
3. Wait for 0G Storage upload + AI verification
4. If score ≥ 60: mint as INFT (transferable) or SoulBound Credential
5. View your credential on your profile
6. List it on the **Marketplace** or apply to jobs via **Hire**

### Network Details
| Property | Value |
|----------|-------|
| Network Name | 0G Galileo Testnet |
| Chain ID | 16602 |
| RPC URL | https://evmrpc-testnet.0g.ai |
| Explorer | https://chainscan-galileo.0g.ai |
| Storage Explorer | https://storagescan-galileo.0g.ai |
| Faucet | https://faucet.0g.ai |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, Framer Motion |
| Web3 | wagmi v2, viem, ethers.js 6, RainbowKit |
| Smart Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin v5 |
| 0G Integration | `@0gfoundation/0g-ts-sdk`, `@0glabs/0g-serving-broker` |
| Charts | Recharts |

---

## License

MIT
