const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  TrustFolio — SoulBoundCredential Deploy");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Network:   ", network.name);
  console.log("Deployer:  ", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:   ", ethers.formatEther(balance), "0G");
  console.log("─────────────────────────────────────────────");

  if (balance === 0n) {
    console.error("⚠  Deployer has no 0G tokens. Get some at https://faucet.0g.ai");
    process.exit(1);
  }

  console.log("Deploying SoulBoundCredential...");

  const SoulBoundCredential = await ethers.getContractFactory("SoulBoundCredential");
  const contract = await SoulBoundCredential.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log("─────────────────────────────────────────────");
  console.log("✅ Deployed!");
  console.log("Contract:  ", contractAddress);
  console.log("TX Hash:   ", deployTx?.hash);
  console.log("─────────────────────────────────────────────");
  console.log("");
  console.log("Add to .env.local:");
  console.log(`NEXT_PUBLIC_CREDENTIAL_CONTRACT=${contractAddress}`);
  console.log(`CREDENTIAL_CONTRACT=${contractAddress}`);
  console.log("");
  console.log("Explorer:");
  console.log(`https://chainscan-galileo.0g.ai/address/${contractAddress}`);
  console.log("─────────────────────────────────────────────");

  // Verify contract interface
  console.log("\nVerifying deployment...");
  const totalSupply = await contract.totalSupply();
  console.log("Total supply:", totalSupply.toString(), "(should be 0)");
  console.log("✅ Deployment verified.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
