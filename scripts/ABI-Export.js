const fs = require("fs");
const { Network } = require("inspector/promises");
const path = require("path");

async function main() {
    console.log("📜 Exporting ABI files...");

    // Create frontend directory if it doesn't exist
    const frontendDir = path.join(__dirname, "../frontend_website/eduverse");
    const abiDir = path.join(frontendDir, "abis");

    if (!fs.existsSync(frontendDir)) {
        fs.mkdirSync(frontendDir, { recursive: true });
    }
    if (!fs.existsSync(abiDir)) {
        fs.mkdirSync(abiDir, { recursive: true });
    }

    // List of contract to export
    const contracts = [
        "CourseFactory",
        "CourseLicense",
        "ProgressTracker",
        "CertificateManager"
    ]

    // Export each contract's ABI
    for (const contract of contracts) {
        const artifact = require(`../artifacts/contracts/${contract}.sol/${contract}.json`);
        fs.writeFileSync(
            path.join(abiDir, `${contract}.json`),
            JSON.stringify(artifact.abi, null, 2)
        )
        console.log(`✅ Exported ${contract} ABI to ${abiDir}/${contract}.json`);
    }

    //  Export contract addresses
    const addresses = JSON.parse(fs.readFileSync("deployed-contracts.json", "utf8"));
    fs.writeFileSync(
        path.join(abiDir, "contract-addresses.json"),
        JSON.stringify({
            networkName : addresses.network,
            chainId : addresses.chainId,
            addresses : {
                courseFactory: addresses.courseFactory,
                courseLicense: addresses.courseLicense,
                progressTracker: addresses.progressTracker,
                certificateManager: addresses.certificateManager,
            }
        }, null, 2)
    );
    console.log(`✅ Exported contract addresses to ${abiDir}/contract-addresses.json`);
    console.log("✅ ABI export completed successfully.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error exporting ABI:", error);
        process.exit(1);
    });
