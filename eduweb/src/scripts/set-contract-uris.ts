import { prepareContractCall, getContract } from "thirdweb";
import { mantaPacificTestnet } from "thirdweb/chains";
import { privateKeyToAccount } from "thirdweb/wallets";
import { createThirdwebClient } from "thirdweb";

// ============================================================================
// NFT CONTRACT URI CONFIGURATION SCRIPT
// ============================================================================
// This script sets the base URIs for CourseLicense and CertificateManager
// contracts so MetaMask can properly display NFT images and metadata.
// ============================================================================

const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY!;

const CONTRACT_ADDRESSES = {
  courseLicense: "0xcEcB4D9A2c051086530D614de4cF4D0f03eDd578",
  certificateManager: "0xC7a6EA3B185328A61B30c209e98c1EeC817acFf5",
};

// Base URIs - UPDATE THESE WITH YOUR ACTUAL METADATA HOSTING
const BASE_URIS = {
  courseLicense: "https://eduverse-nft-metadata.vercel.app/api/license/",
  certificateManager:
    "https://eduverse-nft-metadata.vercel.app/api/certificate/",
};

async function setCourseLicenseURI() {
  console.log("\n📝 Setting CourseLicense base URI...");

  const client = createThirdwebClient({
    clientId: THIRDWEB_CLIENT_ID,
  });

  const account = privateKeyToAccount({
    client,
    privateKey: DEPLOYER_PRIVATE_KEY,
  });

  const contract = getContract({
    client,
    chain: mantaPacificTestnet,
    address: CONTRACT_ADDRESSES.courseLicense,
  });

  const transaction = prepareContractCall({
    contract,
    method: "function setURI(string newBaseURI)",
    params: [BASE_URIS.courseLicense],
  });

  console.log(`🔗 Contract: ${CONTRACT_ADDRESSES.courseLicense}`);
  console.log(`🌐 Base URI: ${BASE_URIS.courseLicense}`);
  console.log(`👤 Caller: ${account.address}`);

  console.log("\n⏳ Sending transaction...");

  // Note: In production, use sendTransaction with account
  // For this script, just show the prepared call
  console.log("✅ Transaction prepared successfully!");
  console.log("\nTo execute, run:");
  console.log(
    `thirdweb deploy --contract ${CONTRACT_ADDRESSES.courseLicense} --function setURI --args "${BASE_URIS.courseLicense}"`,
  );
}

async function setCertificateManagerURI() {
  console.log("\n📝 Setting CertificateManager token URIs...");
  console.log("⚠️  CertificateManager uses ERC1155 with custom uri() function");
  console.log(
    "✅ You can set custom URIs per tokenId using setTokenURI(tokenId, uri)",
  );
  console.log("\nExample for token #1:");
  console.log(
    `thirdweb deploy --contract ${CONTRACT_ADDRESSES.certificateManager} --function setTokenURI --args "1" "${BASE_URIS.certificateManager}1.json"`,
  );
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     NFT CONTRACT URI CONFIGURATION SCRIPT                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  if (!THIRDWEB_CLIENT_ID) {
    console.error("❌ NEXT_PUBLIC_THIRDWEB_CLIENT_ID not set");
    process.exit(1);
  }

  if (!DEPLOYER_PRIVATE_KEY) {
    console.error("❌ DEPLOYER_PRIVATE_KEY not set");
    console.log(
      "\n⚠️  For security, run this script with environment variable:",
    );
    console.log("   DEPLOYER_PRIVATE_KEY=0x... npm run set-uris");
    process.exit(1);
  }

  console.log("\n🔧 Configuration:");
  console.log(`   Chain: Manta Pacific Testnet (${mantaPacificTestnet.id})`);
  console.log(`   CourseLicense: ${CONTRACT_ADDRESSES.courseLicense}`);
  console.log(
    `   CertificateManager: ${CONTRACT_ADDRESSES.certificateManager}`,
  );

  await setCourseLicenseURI();
  await setCertificateManagerURI();

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║     NEXT STEPS                                             ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n1️⃣  Deploy metadata API endpoints:");
  console.log("   - /api/license/[tokenId]");
  console.log("   - /api/certificate/[tokenId]");
  console.log("\n2️⃣  Each endpoint should return ERC1155 metadata JSON:");
  console.log("   {");
  console.log('     "name": "Course License #1",');
  console.log('     "description": "License for course...",');
  console.log('     "image": "ipfs://... or https://...",');
  console.log('     "attributes": [...]');
  console.log("   }");
  console.log("\n3️⃣  Execute the setURI transaction using thirdweb CLI");
  console.log("\n4️⃣  Test in MetaMask - NFT should now display properly!");
  console.log("\n✅ Done!\n");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
