require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🔍 Checking User Certificate NFTs\n");
  console.log("=".repeat(70));

  const deployedPath = path.join(__dirname, "..", "deployed-contracts.json");
  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));

  const CertificateManager = await ethers.getContractAt(
    "CertificateManager",
    deployed.certificateManager
  );

  const [signer] = await ethers.getSigners();
  const userAddress = process.argv[2] || signer.address;

  console.log(`\n📋 Contract: ${deployed.certificateManager}`);
  console.log(`📋 User Address: ${userAddress}\n`);

  try {
    console.log("1️⃣ Checking if user has certificate...\n");
    const tokenId = await CertificateManager.getUserCertificate(userAddress);
    console.log(`   Token ID: ${tokenId}`);

    if (tokenId.toString() === "0") {
      console.log("\n❌ User does NOT have a certificate yet");
      console.log("   This is why NFT doesn't appear in MetaMask\n");
      console.log("💡 To mint your first certificate:");
      console.log("   1. Complete a course");
      console.log("   2. Make sure you own the course license");
      console.log("   3. Go to certificate page and mint");
      console.log("   4. Certificate NFT will appear in MetaMask\n");
      return;
    }

    console.log(`\n✅ User HAS certificate with Token ID: ${tokenId}\n`);

    console.log("2️⃣ Checking NFT balance...\n");
    const balance = await CertificateManager.balanceOf(
      userAddress,
      tokenId
    );
    console.log(`   Balance: ${balance}`);

    if (balance.toString() === "0") {
      console.log("\n❌ CRITICAL ISSUE: Balance is 0!");
      console.log("   Certificate exists in mapping but NOT minted as NFT");
      console.log("   This indicates a minting failure");
    } else {
      console.log("\n✅ NFT Balance is correct (should be 1)");
    }

    console.log("\n3️⃣ Fetching certificate details...\n");
    const cert = await CertificateManager.getCertificate(tokenId);
    console.log(`   Recipient Name: ${cert.recipientName}`);
    console.log(`   Recipient Address: ${cert.recipientAddress}`);
    console.log(`   Platform: ${cert.platformName}`);
    console.log(`   Total Courses: ${cert.totalCoursesCompleted}`);
    console.log(`   Is Valid: ${cert.isValid}`);
    console.log(`   IPFS CID: ${cert.ipfsCID}`);
    console.log(`   Base Route: ${cert.baseRoute}`);
    console.log(
      `   Issued At: ${new Date(Number(cert.issuedAt) * 1000).toISOString()}`
    );
    console.log(
      `   Last Updated: ${new Date(
        Number(cert.lastUpdated) * 1000
      ).toISOString()}`
    );

    console.log("\n4️⃣ Checking token URI (metadata)...\n");
    const uri = await CertificateManager.uri(tokenId);
    console.log(`   URI: ${uri}`);

    console.log("\n5️⃣ Fetching recent CertificateMinted events...\n");
    const deployBlock = deployed.certificateManagerBlock || 0;
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log(`   Scanning from block ${deployBlock} to ${currentBlock}...`);

    const filter = CertificateManager.filters.CertificateMinted(userAddress);
    const events = await CertificateManager.queryFilter(
      filter,
      deployBlock,
      currentBlock
    );

    if (events.length === 0) {
      console.log("\n⚠️  No CertificateMinted events found for this user");
      console.log("   This might indicate:");
      console.log("   - Certificate was minted before contract deployment");
      console.log("   - Event scanning issue");
      console.log("   - Certificate created through different mechanism");
    } else {
      console.log(`\n✅ Found ${events.length} CertificateMinted event(s):\n`);
      events.forEach((event, index) => {
        console.log(`   Event #${index + 1}:`);
        console.log(`     Block: ${event.blockNumber}`);
        console.log(`     Transaction: ${event.transactionHash}`);
        console.log(`     Recipient: ${event.args.recipient}`);
        console.log(`     Token ID: ${event.args.tokenId}`);
        console.log(`     Name: ${event.args.recipientName}`);
        console.log(`     IPFS CID: ${event.args.ipfsCID}`);
        console.log(
          `     Payment Hash: ${event.args.paymentReceiptHash || "N/A"}`
        );
        console.log(
          `     Certificate Price: ${
            event.args.certificatePrice
              ? ethers.formatEther(event.args.certificatePrice) + " ETH"
              : "N/A"
          }`
        );
        console.log("");
      });
    }

    console.log("6️⃣ Checking TransferSingle events (ERC1155 mint)...\n");
    const transferFilter = CertificateManager.filters.TransferSingle(
      null,
      ethers.ZeroAddress,
      userAddress
    );
    const transferEvents = await CertificateManager.queryFilter(
      transferFilter,
      deployBlock,
      currentBlock
    );

    if (transferEvents.length === 0) {
      console.log("\n❌ CRITICAL: No TransferSingle events found!");
      console.log("   This means the NFT was NEVER minted to user's wallet");
      console.log("   Certificate data exists but ERC1155 _mint() failed or didn't execute");
    } else {
      console.log(`\n✅ Found ${transferEvents.length} TransferSingle event(s):\n`);
      transferEvents.forEach((event, index) => {
        console.log(`   Transfer #${index + 1}:`);
        console.log(`     Block: ${event.blockNumber}`);
        console.log(`     Transaction: ${event.transactionHash}`);
        console.log(`     From: ${event.args.from} (should be 0x0 for mint)`);
        console.log(`     To: ${event.args.to}`);
        console.log(`     Token ID: ${event.args.id}`);
        console.log(`     Amount: ${event.args.value}`);
        console.log("");
      });
    }

    console.log("=".repeat(70));
    console.log("\n📊 DIAGNOSIS:\n");

    if (balance.toString() === "0") {
      console.log("❌ PROBLEM IDENTIFIED:");
      console.log("   Certificate mapping exists but NFT balance is 0");
      console.log("   The _mint() function did not execute successfully\n");
      console.log("🔧 POSSIBLE CAUSES:");
      console.log("   1. Transaction reverted after creating certificate mapping");
      console.log("   2. _update() hook blocked the mint");
      console.log("   3. Gas ran out before _mint completed");
      console.log("   4. Reentrancy or state issue\n");
      console.log("💡 SOLUTION:");
      console.log("   Check the transaction hash from CertificateMinted event");
      console.log("   Look for revert or error in block explorer");
      console.log("   Verify _update() function allows minting (from == address(0))");
    } else if (transferEvents.length === 0) {
      console.log("⚠️  UNUSUAL SITUATION:");
      console.log("   Balance is correct but no TransferSingle events found");
      console.log("   This might be a block scanning issue\n");
      console.log("💡 TRY:");
      console.log("   1. Refresh MetaMask (close and reopen)");
      console.log("   2. Re-import account in MetaMask");
      console.log("   3. Wait 5-10 minutes for MetaMask to detect NFT");
      console.log(
        "   4. Manually add NFT: Contract address + Token ID in MetaMask"
      );
    } else {
      console.log("✅ EVERYTHING LOOKS GOOD!");
      console.log("   Certificate is properly minted as NFT");
      console.log("   Balance is correct (1)");
      console.log("   Metadata URI is set");
      console.log("   TransferSingle events exist\n");
      console.log("💡 IF NFT STILL NOT IN METAMASK:");
      console.log("   1. Make sure you're on Manta Pacific Testnet");
      console.log("   2. Go to MetaMask > NFT tab");
      console.log("   3. Click 'Refresh list' or enable 'Autodetect NFTs'");
      console.log("   4. Wait 5-10 minutes");
      console.log("   5. Close and reopen MetaMask");
      console.log("   6. Try re-importing your account");
      console.log("\n   OR manually add NFT:");
      console.log(`   - Contract: ${deployed.certificateManager}`);
      console.log(`   - Token ID: ${tokenId}`);
    }

    console.log("\n" + "=".repeat(70) + "\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("CertificateNotFound")) {
      console.log("\n   Certificate does not exist for this user");
    } else {
      console.error("\n   Full error:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
