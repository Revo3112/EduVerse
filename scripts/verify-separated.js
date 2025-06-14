const { run } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Memulai verifikasi kontrak Eduverse...");

  try {
    // Load contract addresses
    const addresses = JSON.parse(fs.readFileSync("deployed-contracts.json", "utf8"));

    // 1. Verify MockV3Aggregator
    console.log("\n1️⃣ Verifying MockV3Aggregator...");
    await run("verify:verify", {
      address: addresses.mockPriceFeed,
      constructorArguments: [8, 200000000000],
    });

    // 2. Verify CourseFactory
    console.log("\n2️⃣ Verifying CourseFactory...");
    await run("verify:verify", {
      address: addresses.courseFactory,
      constructorArguments: [addresses.mockPriceFeed],
    });

    // 3. Verify CourseLicense
    console.log("\n3️⃣ Verifying CourseLicense...");
    await run("verify:verify", {
      address: addresses.courseLicense,
      constructorArguments: [
        addresses.courseFactory,
        addresses.deployer,
        addresses.mockPriceFeed
      ],
    });

    // 4. Verify ProgressTracker
    console.log("\n4️⃣ Verifying ProgressTracker...");
    await run("verify:verify", {
      address: addresses.progressTracker,
      constructorArguments: [
        addresses.courseFactory,
        addresses.courseLicense
      ],
    });

    // 5. Verify CertificateManager
    console.log("\n5️⃣ Verifying CertificateManager...");
    await run("verify:verify", {
      address: addresses.certificateManager,
      constructorArguments: [
        addresses.courseFactory,
        addresses.progressTracker,
        addresses.deployer
      ],
    });

    // 6. Verify PlatformRegistry
    console.log("\n6️⃣ Verifying PlatformRegistry...");
    await run("verify:verify", {
      address: addresses.platformRegistry,
      constructorArguments: [],
    });

    console.log("\n✅ All contracts verified successfully!");

  } catch (error) {
    console.error("\n❌ Verification failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
