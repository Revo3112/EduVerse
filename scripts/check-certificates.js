require("dotenv").config();
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deployedPath = path.join(__dirname, "..", "deployed-contracts.json");
  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  
  const CertificateManager = await ethers.getContractAt(
    "CertificateManager",
    deployed.certificateManager
  );

  console.log("\n📊 Checking Certificates on Blockchain...\n");
  
  try {
    console.log("Attempting to read certificate #1...\n");
    try {
      const cert = await CertificateManager.getCertificate(1);
      console.log("✅ Certificate #1 EXISTS:");
      console.log(`  Recipient: ${cert.recipientName}`);
      console.log(`  Address: ${cert.recipientAddress}`);
      console.log(`  Courses: ${cert.totalCoursesCompleted}`);
      console.log(`  Valid: ${cert.isValid}`);
      console.log(`  IPFS CID: ${cert.ipfsCID}`);
      console.log(`  Platform: ${cert.platformName}`);
    } catch (e) {
      if (e.message.includes("CertificateNotFound")) {
        console.log("❌ Certificate #1 does not exist yet");
        console.log("   This is why the API returns an error");
        console.log("\n💡 To test NFT display:");
        console.log("   1. Complete a course");
        console.log("   2. Mint your first certificate");
        console.log("   3. Check MetaMask NFT tab");
      } else {
        console.log("Error:", e.message);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
