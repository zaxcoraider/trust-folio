/**
 * deploy-all.js
 * Deploys TrustFolioINFT, TrustFolioMarketplace, and TrustFolioHiringEscrow
 * to the 0G Galileo Testnet (chain ID 16602).
 *
 * Usage:
 *   npx hardhat run scripts/deploy-all.js --network 0g-testnet
 *
 * Prerequisites:
 *   - PRIVATE_KEY set in .env.local
 *   - Deployer wallet funded with 0G tokens (get from faucet)
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║     TrustFolio Phase 3 — Deploy All        ║");
  console.log("╚════════════════════════════════════════════╝\n");
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance: ", hre.ethers.formatEther(balance), "0G\n");

  if (balance === 0n) {
    throw new Error("Deployer has no 0G tokens. Fund at https://faucet.0g.ai");
  }

  // ── 1. TrustFolioINFT ─────────────────────────────────────────────────────

  console.log("Deploying TrustFolioINFT (ERC-7857)...");
  const INFTFactory = await hre.ethers.getContractFactory("TrustFolioINFT");
  const inft = await INFTFactory.deploy(deployer.address); // treasury = deployer initially
  await inft.waitForDeployment();
  const inftAddress = await inft.getAddress();
  console.log("✅ TrustFolioINFT deployed:", inftAddress);
  console.log("   Explorer:", `https://chainscan-galileo.0g.ai/address/${inftAddress}\n`);

  // ── 2. TrustFolioMarketplace ──────────────────────────────────────────────

  console.log("Deploying TrustFolioMarketplace...");
  const MarketFactory = await hre.ethers.getContractFactory("TrustFolioMarketplace");
  const marketplace = await MarketFactory.deploy(inftAddress, deployer.address);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ TrustFolioMarketplace deployed:", marketplaceAddress);
  console.log("   Explorer:", `https://chainscan-galileo.0g.ai/address/${marketplaceAddress}\n`);

  // ── 3. TrustFolioHiringEscrow ─────────────────────────────────────────────

  console.log("Deploying TrustFolioHiringEscrow...");
  const EscrowFactory = await hre.ethers.getContractFactory("TrustFolioHiringEscrow");
  const escrow = await EscrowFactory.deploy(deployer.address);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("✅ TrustFolioHiringEscrow deployed:", escrowAddress);
  console.log("   Explorer:", `https://chainscan-galileo.0g.ai/address/${escrowAddress}\n`);

  // ── Verification ──────────────────────────────────────────────────────────

  console.log("Verifying deployments...");
  const inftSupply = await inft.totalSupply();
  const inftFee    = await inft.mintingFee();
  const mktFee     = await marketplace.FEE_BPS();
  const minScore   = await inft.MIN_SCORE();
  console.log("  INFT total supply:", inftSupply.toString());
  console.log("  INFT minting fee:", hre.ethers.formatEther(inftFee), "0G");
  console.log("  INFT min score:  ", minScore.toString());
  console.log("  Marketplace fee: ", mktFee.toString(), "bps (2.5%)\n");

  // ── .env.local instructions ───────────────────────────────────────────────

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Add the following to your .env.local:                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`
NEXT_PUBLIC_INFT_CONTRACT=${inftAddress}
NEXT_PUBLIC_MARKETPLACE_CONTRACT=${marketplaceAddress}
NEXT_PUBLIC_HIRING_ESCROW_CONTRACT=${escrowAddress}
INFT_CONTRACT=${inftAddress}
MARKETPLACE_CONTRACT=${marketplaceAddress}
HIRING_ESCROW_CONTRACT=${escrowAddress}
`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
