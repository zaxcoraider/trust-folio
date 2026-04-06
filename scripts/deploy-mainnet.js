/**
 * deploy-mainnet.js
 * Deploys all TrustFolio contracts to 0G Mainnet (chain ID 16661).
 *
 * Usage:
 *   npx hardhat run scripts/deploy-mainnet.js --network 0g-mainnet
 *
 * Deploys (in order):
 *   1. SoulBoundCredential
 *   2. TrustFolioINFT        (treasury = deployer)
 *   3. TrustFolioMarketplace (linked to INFT)
 *   4. TrustFolioHiringEscrow
 *
 * After deploy, sets mintingFee = 0.001 0G on INFT.
 */

const hre = require("hardhat");

const MINTING_FEE = hre.ethers.parseEther("0.001"); // 0.001 0G per INFT mint

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("\n╔═══════════════════════════════════════════════════╗");
  console.log("║      TrustFolio — Mainnet Full Deployment          ║");
  console.log("╚═══════════════════════════════════════════════════╝\n");
  console.log("Network:  0G Mainnet (chain 16661)");
  console.log("Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance: ", hre.ethers.formatEther(balance), "0G\n");

  if (balance === 0n) {
    throw new Error("Deployer wallet has no 0G tokens.");
  }

  // ── 1. SoulBoundCredential ────────────────────────────────────────────────

  console.log("1/4  Deploying SoulBoundCredential...");
  const SBCFactory = await hre.ethers.getContractFactory("SoulBoundCredential");
  const sbc = await SBCFactory.deploy();
  await sbc.waitForDeployment();
  const sbcAddress = await sbc.getAddress();
  console.log("     ✅", sbcAddress);
  console.log("     https://chainscan.0g.ai/address/" + sbcAddress + "\n");

  // ── 2. TrustFolioINFT ─────────────────────────────────────────────────────

  console.log("2/4  Deploying TrustFolioINFT...");
  const INFTFactory = await hre.ethers.getContractFactory("TrustFolioINFT");
  const inft = await INFTFactory.deploy(deployer.address); // treasury = deployer
  await inft.waitForDeployment();
  const inftAddress = await inft.getAddress();
  console.log("     ✅", inftAddress);
  console.log("     https://chainscan.0g.ai/address/" + inftAddress + "\n");

  // ── 3. TrustFolioMarketplace ──────────────────────────────────────────────

  console.log("3/4  Deploying TrustFolioMarketplace...");
  const MarketFactory = await hre.ethers.getContractFactory("TrustFolioMarketplace");
  const marketplace = await MarketFactory.deploy(inftAddress, deployer.address);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("     ✅", marketplaceAddress);
  console.log("     https://chainscan.0g.ai/address/" + marketplaceAddress + "\n");

  // ── 4. TrustFolioHiringEscrow ─────────────────────────────────────────────

  console.log("4/4  Deploying TrustFolioHiringEscrow...");
  const EscrowFactory = await hre.ethers.getContractFactory("TrustFolioHiringEscrow");
  const escrow = await EscrowFactory.deploy(deployer.address);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("     ✅", escrowAddress);
  console.log("     https://chainscan.0g.ai/address/" + escrowAddress + "\n");

  // ── Set mintingFee on INFT ────────────────────────────────────────────────

  console.log("Setting INFT mintingFee →", hre.ethers.formatEther(MINTING_FEE), "0G...");
  const feeTx = await inft.setMintingFee(MINTING_FEE);
  await feeTx.wait();
  console.log("     ✅ mintingFee set\n");

  // ── Verify ────────────────────────────────────────────────────────────────

  console.log("Verifying on-chain state...");
  const inftFee    = await inft.mintingFee();
  const mktFee     = await marketplace.FEE_BPS();
  const minScore   = await inft.MIN_SCORE();
  console.log("  INFT minting fee:  ", hre.ethers.formatEther(inftFee), "0G");
  console.log("  INFT min score:    ", minScore.toString());
  console.log("  Marketplace fee:   ", mktFee.toString(), "bps (2.5%)\n");

  // ── .env output ───────────────────────────────────────────────────────────

  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║  Copy these into .env.local (mainnet section):                   ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  console.log(`
# 0G Mainnet contract addresses
NEXT_PUBLIC_MAINNET_CREDENTIAL_ADDRESS=${sbcAddress}
NEXT_PUBLIC_MAINNET_INFT_ADDRESS=${inftAddress}
NEXT_PUBLIC_MAINNET_MARKETPLACE_ADDRESS=${marketplaceAddress}
NEXT_PUBLIC_MAINNET_HIRING_ADDRESS=${escrowAddress}
`);

  console.log("All contracts deployed to 0G Mainnet.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
