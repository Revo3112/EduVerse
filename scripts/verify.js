const { run, network } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Starting contract verification on Manta Pacific...");

  try {
    // Load contract addresses
    const addressFile = `deployed-contracts.json`;
    let addresses;

    if (fs.existsSync(addressFile)) {
      addresses = JSON.parse(fs.readFileSync(addressFile, "utf8"));
    } else if (fs.existsSync("deployed-contracts.json")) {
      console.log("Using fallback deployed-contracts.json");
      addresses = JSON.parse(
        fs.readFileSync("deployed-contracts.json", "utf8")
      );
    } else {
      throw new Error("No deployed contracts file found!");
    }

    console.log(`Verifying contracts on ${addresses.network}...`);

    // 1. Verify CourseFactory (NO CONSTRUCTOR ARGS)
    console.log("\n1️⃣ Verifying CourseFactory...");
    try {
      await run("verify:verify", {
        address: addresses.courseFactory,
        constructorArguments: [], // No arguments
      });
      console.log("✅ CourseFactory verified");
    } catch (error) {
      console.log("⚠️ CourseFactory verification failed:", error.message);
    }

    // 2. Verify CourseLicense (2 ARGS)
    console.log("\n2️⃣ Verifying CourseLicense...");
    try {
      await run("verify:verify", {
        address: addresses.courseLicense,
        constructorArguments: [
          addresses.courseFactory,
          addresses.deployer, // platform wallet
        ],
      });
      console.log("✅ CourseLicense verified");
    } catch (error) {
      console.log("⚠️ CourseLicense verification failed:", error.message);
    }

    // 3. Verify ProgressTracker (2 ARGS)
    console.log("\n3️⃣ Verifying ProgressTracker...");
    try {
      await run("verify:verify", {
        address: addresses.progressTracker,
        constructorArguments: [
          addresses.courseFactory,
          addresses.courseLicense,
        ],
      });
      console.log("✅ ProgressTracker verified");
    } catch (error) {
      console.log("⚠️ ProgressTracker verification failed:", error.message);
    }

    // 4. Verify CertificateManager (3 ARGS)
    console.log("\n4️⃣ Verifying CertificateManager...");
    try {
      await run("verify:verify", {
        address: addresses.certificateManager,
        constructorArguments: [
          addresses.courseFactory,
          addresses.progressTracker,
          addresses.deployer, // platform wallet
        ],
      });
      console.log("✅ CertificateManager verified");
    } catch (error) {
      console.log("⚠️ CertificateManager verification failed:", error.message);
    }

    console.log("\n✅ Verification process completed!");
    console.log(
      "\nNote: Some contracts may already be verified or verification may not be available on this network."
    );
  } catch (error) {
    console.error("\n❌ Verification failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
