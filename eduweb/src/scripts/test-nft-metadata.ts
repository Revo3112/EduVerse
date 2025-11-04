import { getContract, readContract } from "thirdweb";
import { mantaPacificTestnet } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const COURSE_LICENSE_ADDRESS = process.env.NEXT_PUBLIC_COURSE_LICENSE_ADDRESS!;
const CERTIFICATE_MANAGER_ADDRESS =
  process.env.NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS!;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function testCourseLicenseMetadata() {
  console.log("\n🧪 Testing CourseLicense Metadata...");
  console.log("═══════════════════════════════════════════════════════════");

  const contract = getContract({
    client,
    chain: mantaPacificTestnet,
    address: COURSE_LICENSE_ADDRESS,
  });

  try {
    const currentURI = await readContract({
      contract,
      method: "function uri(uint256 tokenId) view returns (string)",
      params: [BigInt(1)],
    });

    console.log(`📍 Current URI for token #1: ${currentURI}`);

    if (!currentURI || currentURI === "1.json" || currentURI === "") {
      console.log("❌ PROBLEM DETECTED: Base URI not set!");
      console.log("\n💡 Solution: Call setURI() with proper base URI:");
      console.log(`   Expected: ${BASE_URL}/api/nft/license/`);
      console.log(`   Current:  ${currentURI}`);
    } else {
      console.log("✅ Base URI is configured");
    }

    console.log("\n🌐 Testing metadata endpoint...");
    const metadataURL = `${BASE_URL}/api/nft/license/1`;
    console.log(`   URL: ${metadataURL}`);

    const response = await fetch(metadataURL);
    if (response.ok) {
      const metadata = await response.json();
      console.log("✅ Metadata endpoint working!");
      console.log(`   Name: ${metadata.name}`);
      console.log(
        `   Description: ${metadata.description?.substring(0, 50)}...`
      );
      console.log(`   Image: ${metadata.image}`);
      console.log(`   Attributes: ${metadata.attributes?.length} traits`);
    } else {
      console.log("❌ Metadata endpoint failed!");
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${await response.text()}`);
    }

    console.log("\n🖼️  Testing image endpoint...");
    const imageURL = `${BASE_URL}/api/nft/license/1/image`;
    console.log(`   URL: ${imageURL}`);

    const imageResponse = await fetch(imageURL);
    if (imageResponse.ok) {
      console.log("✅ Image endpoint working!");
      console.log(
        `   Content-Type: ${imageResponse.headers.get("content-type")}`
      );
    } else {
      console.log("❌ Image endpoint failed!");
      console.log(`   Status: ${imageResponse.status}`);
    }
  } catch (error) {
    console.error("❌ Error testing CourseLicense:", error);
  }
}

async function testCertificateMetadata() {
  console.log("\n🧪 Testing Certificate Metadata...");
  console.log("═══════════════════════════════════════════════════════════");

  const contract = getContract({
    client,
    chain: mantaPacificTestnet,
    address: CERTIFICATE_MANAGER_ADDRESS,
  });

  try {
    const currentURI = await readContract({
      contract,
      method: "function uri(uint256 tokenId) view returns (string)",
      params: [BigInt(1)],
    });

    console.log(`📍 Current URI for token #1: ${currentURI}`);

    if (!currentURI || currentURI === "1.json" || currentURI === "") {
      console.log("❌ PROBLEM DETECTED: Base URI not set!");
      console.log("\n💡 Solution: Call setTokenURI() for each certificate:");
      console.log(`   Expected: ${BASE_URL}/api/nft/certificate/1.json`);
      console.log(`   Current:  ${currentURI}`);
    } else {
      console.log("✅ Token URI is configured");
    }

    console.log("\n🌐 Testing metadata endpoint...");
    const metadataURL = `${BASE_URL}/api/nft/certificate/1`;
    console.log(`   URL: ${metadataURL}`);

    const response = await fetch(metadataURL);
    if (response.ok) {
      const metadata = await response.json();
      console.log("✅ Metadata endpoint working!");
      console.log(`   Name: ${metadata.name}`);
      console.log(
        `   Description: ${metadata.description?.substring(0, 50)}...`
      );
      console.log(`   Image: ${metadata.image}`);
      console.log(`   Attributes: ${metadata.attributes?.length} traits`);
    } else {
      console.log("❌ Metadata endpoint failed!");
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${await response.text()}`);
    }

    console.log("\n🖼️  Testing image endpoint...");
    const imageURL = `${BASE_URL}/api/nft/certificate/1/image`;
    console.log(`   URL: ${imageURL}`);

    const imageResponse = await fetch(imageURL);
    if (imageResponse.ok) {
      console.log("✅ Image endpoint working!");
      console.log(
        `   Content-Type: ${imageResponse.headers.get("content-type")}`
      );
    } else {
      console.log("❌ Image endpoint failed!");
      console.log(`   Status: ${imageResponse.status}`);
    }
  } catch (error) {
    console.error("❌ Error testing Certificate:", error);
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         NFT METADATA TEST SCRIPT                           ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  if (!process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID) {
    console.error("❌ NEXT_PUBLIC_THIRDWEB_CLIENT_ID not set");
    process.exit(1);
  }

  console.log(`\n🌐 Base URL: ${BASE_URL}`);
  console.log(`⛓️  Chain: Manta Pacific Testnet (${mantaPacificTestnet.id})`);

  await testCourseLicenseMetadata();
  await testCertificateMetadata();

  console.log(
    "\n╔════════════════════════════════════════════════════════════╗"
  );
  console.log("║         SUMMARY & NEXT STEPS                               ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  console.log("\n📋 Action Items:");
  console.log("\n1️⃣  If base URIs are not set, run: npm run set-nft-uris");
  console.log("2️⃣  Deploy frontend to production so endpoints are live");
  console.log("3️⃣  Call setURI() on CourseLicense contract with:");
  console.log(`    ${BASE_URL}/api/nft/license/`);
  console.log("4️⃣  For each certificate, call setTokenURI() with:");
  console.log(`    ${BASE_URL}/api/nft/certificate/[tokenId].json`);
  console.log("5️⃣  Wait 5-10 minutes for MetaMask to refresh metadata cache");
  console.log("6️⃣  Check NFT display in MetaMask wallet");

  console.log("\n✅ Test complete!\n");
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
