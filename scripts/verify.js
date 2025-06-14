const { run } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Memulai verifikasi kontrak Eduverse...");

  try {
    // Load contract addresses
    const addresses = JSON.parse(fs.readFileSync("deployed-contracts.json", "utf8"));

    // Verify MockV3Aggregator
    console.log("\n1️⃣ Verifikasi MockV3Aggregator...");
    await run("verify:verify", {
      address: addresses.mockPriceFeed,
      constructorArguments: [8, 200000000000], // 8 decimals, $2000 per ETH
    });

    // Verify CourseFactory
    console.log("\n2️⃣ Verifikasi CourseFactory...");
    await run("verify:verify", {
      address: addresses.courseFactory,
      constructorArguments: [addresses.mockPriceFeed],
    });

    // Verify CourseLicense
    console.log("\n3️⃣ Verifikasi CourseLicense...");
    await run("verify:verify", {
      address: addresses.courseLicense,
      constructorArguments: [
        addresses.courseFactory,
        addresses.deployer, // Platform wallet
        addresses.mockPriceFeed
      ],
    });

    // Verify ProgressTracker
    console.log("\n4️⃣ Verifikasi ProgressTracker...");
    await run("verify:verify", {
      address: addresses.progressTracker,
      constructorArguments: [
        addresses.courseFactory,
        addresses.courseLicense
      ],
    });

    // Verify CertificateManager
    console.log("\n5️⃣ Verifikasi CertificateManager...");
    await run("verify:verify", {
      address: addresses.certificateManager,
      constructorArguments: [
        addresses.courseFactory,
        addresses.progressTracker,
        addresses.deployer // Platform wallet
      ],
    });

    // Verify PlatformRegistry
    console.log("\n6️⃣ Verifikasi PlatformRegistry...");
    await run("verify:verify", {
      address: addresses.platformRegistry,
      constructorArguments: [],
    });

    console.log("\n✅ Verifikasi kontrak selesai!");

  } catch (error) {
    console.error("\n❌ Verifikasi gagal:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
