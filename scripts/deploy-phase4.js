/**
 * deploy-phase4.js
 * Deploys all TrustFolio Phase 4 contracts to 0G Chain.
 *
 * Contracts deployed (in order):
 *   1. TrustToken          — ERC-20 / ERC20Votes governance token
 *   2. TimeLock            — 2-day DAO timelock
 *   3. TrustGovernor       — OpenZeppelin Governor
 *   4. Staking             — TRUST staking with 8% APY
 *   5. RewardsDistributor  — Verify-to-earn TRUST rewards
 *   6. Treasury            — DAO fee treasury (native 0G)
 *   7. CrossChainVerifier  — Cross-chain credential proof registry
 *   8. APIKeyRegistry      — On-chain API key management
 *
 * Usage:
 *   npx hardhat run scripts/deploy-phase4.js --network 0g-testnet
 *
 * Prerequisites:
 *   - PRIVATE_KEY set in .env.local
 *   - Deployer wallet funded with 0G tokens
 */

const hre  = require("hardhat");
const fs   = require("fs");
const path = require("path");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function explorerUrl(address) {
  return `https://chainscan-galileo.0g.ai/address/${address}`;
}

function log(label, address) {
  console.log(`  ✅ ${label}`);
  console.log(`     Address : ${address}`);
  console.log(`     Explorer: ${explorerUrl(address)}\n`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║         TrustFolio Phase 4 — Deploy All Contracts        ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");
  console.log("Deployer :", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance  :", hre.ethers.formatEther(balance), "0G\n");

  if (balance === 0n) {
    throw new Error("Deployer has no 0G tokens. Fund at https://faucet.0g.ai");
  }

  // ── 1. TrustToken ──────────────────────────────────────────────────────────
  // For the deploy script, deployer acts as all allocation addresses.
  // In production, replace with real multi-sig / pool addresses.
  console.log("1/8  Deploying TrustToken...");
  const TrustTokenFactory = await hre.ethers.getContractFactory("TrustToken");
  const trustToken = await TrustTokenFactory.deploy(
    deployer.address,  // rewardsPool
    deployer.address,  // treasury
    deployer.address,  // team   (locked via vesting)
    deployer.address,  // ecosystem
    deployer.address   // liquidityPool
  );
  await trustToken.waitForDeployment();
  const trustTokenAddress = await trustToken.getAddress();
  log("TrustToken (TRUST)", trustTokenAddress);

  // ── 2. TimeLock ────────────────────────────────────────────────────────────
  // proposers / executors are set to deployer initially; Governor address is
  // added as proposer after deployment via TimelockController.grantRole().
  console.log("2/8  Deploying TimeLock...");
  const TimeLockFactory = await hre.ethers.getContractFactory("TimeLock");
  const timeLock = await TimeLockFactory.deploy(
    [deployer.address],  // proposers
    [deployer.address],  // executors
    deployer.address     // admin
  );
  await timeLock.waitForDeployment();
  const timeLockAddress = await timeLock.getAddress();
  log("TimeLock", timeLockAddress);

  // ── 3. TrustGovernor ───────────────────────────────────────────────────────
  console.log("3/8  Deploying TrustGovernor...");
  const GovernorFactory = await hre.ethers.getContractFactory("TrustGovernor");
  const governor = await GovernorFactory.deploy(
    trustTokenAddress,
    timeLockAddress
  );
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  log("TrustGovernor", governorAddress);

  // Grant Governor the PROPOSER_ROLE on TimeLock so it can queue operations
  console.log("   Granting PROPOSER_ROLE to Governor on TimeLock...");
  const PROPOSER_ROLE = await timeLock.PROPOSER_ROLE();
  const grantTx = await timeLock.grantRole(PROPOSER_ROLE, governorAddress);
  await grantTx.wait();
  console.log("   ✅ PROPOSER_ROLE granted\n");

  // ── 4. Staking ─────────────────────────────────────────────────────────────
  console.log("4/8  Deploying Staking...");
  const StakingFactory = await hre.ethers.getContractFactory("Staking");
  const staking = await StakingFactory.deploy(trustTokenAddress);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  log("Staking", stakingAddress);

  // ── 5. RewardsDistributor ──────────────────────────────────────────────────
  console.log("5/8  Deploying RewardsDistributor...");
  const RDFactory = await hre.ethers.getContractFactory("RewardsDistributor");
  const rewardsDistributor = await RDFactory.deploy(trustTokenAddress);
  await rewardsDistributor.waitForDeployment();
  const rewardsDistributorAddress = await rewardsDistributor.getAddress();
  log("RewardsDistributor", rewardsDistributorAddress);

  // Transfer TrustToken ownership to RewardsDistributor so it can call mint()
  // (In production you may use a more sophisticated role system.)
  console.log("   Transferring TrustToken ownership to RewardsDistributor...");
  const ownershipTx = await trustToken.transferOwnership(rewardsDistributorAddress);
  await ownershipTx.wait();
  console.log("   ✅ Ownership transferred\n");

  // ── 6. Treasury ────────────────────────────────────────────────────────────
  console.log("6/8  Deploying Treasury...");
  const TreasuryFactory = await hre.ethers.getContractFactory("Treasury");
  const treasury = await TreasuryFactory.deploy();
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  log("Treasury", treasuryAddress);

  // Transfer Treasury ownership to TimeLock (DAO controls spending)
  console.log("   Transferring Treasury ownership to TimeLock...");
  const tOwnershipTx = await treasury.transferOwnership(timeLockAddress);
  await tOwnershipTx.wait();
  console.log("   ✅ Treasury ownership transferred to TimeLock\n");

  // ── 7. CrossChainVerifier ──────────────────────────────────────────────────
  console.log("7/8  Deploying CrossChainVerifier...");
  const CCVFactory = await hre.ethers.getContractFactory("CrossChainVerifier");
  const crossChainVerifier = await CCVFactory.deploy();
  await crossChainVerifier.waitForDeployment();
  const crossChainVerifierAddress = await crossChainVerifier.getAddress();
  log("CrossChainVerifier", crossChainVerifierAddress);

  // ── 8. APIKeyRegistry ──────────────────────────────────────────────────────
  console.log("8/8  Deploying APIKeyRegistry...");
  const APIFactory = await hre.ethers.getContractFactory("APIKeyRegistry");
  const apiKeyRegistry = await APIFactory.deploy();
  await apiKeyRegistry.waitForDeployment();
  const apiKeyRegistryAddress = await apiKeyRegistry.getAddress();
  log("APIKeyRegistry", apiKeyRegistryAddress);

  // ── Summary ────────────────────────────────────────────────────────────────
  const addresses = {
    network:              hre.network.name,
    chainId:              (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployedAt:           new Date().toISOString(),
    deployer:             deployer.address,
    // Phase 1-3 (existing)
    SoulBoundCredential:  "0xA4948e4512dC57Da24d7367FEb6e2f54aF0C200E",
    TrustFolioINFT:       "0xb5aA5d6Ef8eC7a6B2DD32dA223Db79114f92F19E",
    Marketplace:          "0xB765b6d8d828897F47Defd0132cb359Cc6d4EDff",
    HiringEscrow:         "0xb627Eac1A6f55EDD851763FFBF1206F64F676513",
    // Phase 4 (new)
    TrustToken:           trustTokenAddress,
    TimeLock:             timeLockAddress,
    TrustGovernor:        governorAddress,
    Staking:              stakingAddress,
    RewardsDistributor:   rewardsDistributorAddress,
    Treasury:             treasuryAddress,
    CrossChainVerifier:   crossChainVerifierAddress,
    APIKeyRegistry:       apiKeyRegistryAddress,
  };

  // Save to deployments/phase4.json
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  const outFile = path.join(deploymentsDir, "phase4.json");
  fs.writeFileSync(outFile, JSON.stringify(addresses, null, 2));
  console.log(`\n📄 Addresses saved to: ${outFile}\n`);

  // ── Print env vars ─────────────────────────────────────────────────────────
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Add the following to your .env.local:                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`
NEXT_PUBLIC_TRUST_TOKEN_CONTRACT=${trustTokenAddress}
NEXT_PUBLIC_TIMELOCK_CONTRACT=${timeLockAddress}
NEXT_PUBLIC_TRUST_GOVERNOR_CONTRACT=${governorAddress}
NEXT_PUBLIC_STAKING_CONTRACT=${stakingAddress}
NEXT_PUBLIC_REWARDS_DISTRIBUTOR_CONTRACT=${rewardsDistributorAddress}
NEXT_PUBLIC_TREASURY_CONTRACT=${treasuryAddress}
NEXT_PUBLIC_CROSS_CHAIN_VERIFIER_CONTRACT=${crossChainVerifierAddress}
NEXT_PUBLIC_API_KEY_REGISTRY_CONTRACT=${apiKeyRegistryAddress}

TRUST_TOKEN_CONTRACT=${trustTokenAddress}
TIMELOCK_CONTRACT=${timeLockAddress}
TRUST_GOVERNOR_CONTRACT=${governorAddress}
STAKING_CONTRACT=${stakingAddress}
REWARDS_DISTRIBUTOR_CONTRACT=${rewardsDistributorAddress}
TREASURY_CONTRACT=${treasuryAddress}
CROSS_CHAIN_VERIFIER_CONTRACT=${crossChainVerifierAddress}
API_KEY_REGISTRY_CONTRACT=${apiKeyRegistryAddress}
`);

  // ── Final summary table ───────────────────────────────────────────────────
  console.log("╔══════════════════════════════════════════════════════════════════════════╗");
  console.log("║                   Phase 4 Deployment Summary                             ║");
  console.log("╠══════════════════════════════════════════════════════════════════════════╣");
  const rows = [
    ["TrustToken",         trustTokenAddress],
    ["TimeLock",           timeLockAddress],
    ["TrustGovernor",      governorAddress],
    ["Staking",            stakingAddress],
    ["RewardsDistributor", rewardsDistributorAddress],
    ["Treasury",           treasuryAddress],
    ["CrossChainVerifier", crossChainVerifierAddress],
    ["APIKeyRegistry",     apiKeyRegistryAddress],
  ];
  for (const [name, addr] of rows) {
    const padded = name.padEnd(20);
    console.log(`║  ${padded} ${addr}  ║`);
  }
  console.log("╚══════════════════════════════════════════════════════════════════════════╝\n");
}

// ─── Run ──────────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
