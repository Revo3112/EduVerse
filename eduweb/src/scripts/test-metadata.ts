import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { mantaPacificTestnet } from "thirdweb/chains";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const CERTIFICATE_MANAGER_ADDRESS =
  process.env.NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!;

async function testMetadata() {
  console.log("=".repeat(80));
  console.log("NFT METADATA TEST");
  console.log("=".repeat(80));

  const client = createThirdwebClient({
    clientId: CLIENT_ID,
  });

  const contract = getContract({
    client,
    chain: mantaPacificTestnet,
    address: CERTIFICATE_MANAGER_ADDRESS,
  });

  const tokenId = BigInt(1);

  console.log("\n[1] Testing Contract uri() Function");
  console.log("-".repeat(80));

  try {
    const contractUri = await readContract({
      contract,
      method: "function uri(uint256) view returns (string)",
      params: [tokenId],
    });

    console.log(`✅ Contract uri(${tokenId}):`, contractUri);

    console.log("\n[2] Testing Metadata Endpoint");
    console.log("-".repeat(80));

    const metadataUrl =
      contractUri || `${APP_URL}/api/metadata/${tokenId.toString()}`;
    console.log(`Fetching: ${metadataUrl}`);

    const response = await fetch(metadataUrl);

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      const errorText = await response.text();
      console.error("Response:", errorText);
      return;
    }

    const metadata = await response.json();
    console.log("✅ Metadata received");
    console.log("\nMetadata Structure:");
    console.log("  - name:", metadata.name);
    console.log(
      "  - description:",
      metadata.description?.substring(0, 100) + "..."
    );
    console.log("  - image:", metadata.image);
    console.log("  - external_url:", metadata.external_url);
    console.log("  - decimals:", metadata.decimals);
    console.log("  - attributes:", metadata.attributes?.length || 0, "traits");

    console.log("\n[3] Testing Image URL");
    console.log("-".repeat(80));

    if (!metadata.image) {
      console.error("❌ No image URL in metadata");
      return;
    }

    console.log(`Fetching: ${metadata.image}`);

    const imageResponse = await fetch(metadata.image, { method: "HEAD" });

    if (!imageResponse.ok) {
      console.error(
        `❌ Image HTTP ${imageResponse.status}: ${imageResponse.statusText}`
      );
      return;
    }

    console.log("✅ Image accessible");
    console.log("  - Content-Type:", imageResponse.headers.get("content-type"));
    console.log(
      "  - Content-Length:",
      imageResponse.headers.get("content-length")
    );

    console.log("\n[4] Validating ERC-1155 Compliance");
    console.log("-".repeat(80));

    const requiredFields = [
      "name",
      "description",
      "image",
      "decimals",
      "attributes",
    ];
    let compliant = true;

    for (const field of requiredFields) {
      if (metadata[field] === undefined) {
        console.error(`❌ Missing required field: ${field}`);
        compliant = false;
      } else {
        console.log(`✅ ${field}: present`);
      }
    }

    if (metadata.image && metadata.image.startsWith("ipfs://")) {
      console.error(
        "❌ Image uses ipfs:// protocol (wallets cannot resolve this)"
      );
      console.log(
        "   Should use HTTP gateway: https://gateway.pinata.cloud/ipfs/{cid}"
      );
      compliant = false;
    } else if (
      metadata.image &&
      (metadata.image.startsWith("http://") ||
        metadata.image.startsWith("https://"))
    ) {
      console.log("✅ Image uses HTTP/HTTPS protocol");
    }

    console.log("\n[5] Certificate Data Validation");
    console.log("-".repeat(80));

    const importantAttributes = [
      "Token ID",
      "Recipient Name",
      "Recipient Address",
      "Total Courses Completed",
      "Is Valid",
    ];

    for (const attrName of importantAttributes) {
      const attr = metadata.attributes?.find(
        (a: any) => a.trait_type === attrName
      );
      if (attr) {
        console.log(`✅ ${attrName}: ${attr.value}`);
      } else {
        console.log(`❌ ${attrName}: missing`);
      }
    }

    console.log("\n" + "=".repeat(80));
    if (compliant) {
      console.log("✅ ALL TESTS PASSED - NFT metadata is properly configured");
      console.log("\nMetaMask should display the certificate correctly.");
    } else {
      console.log("❌ TESTS FAILED - Fix the issues above");
    }
    console.log("=".repeat(80));
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error);
    console.error("\nPossible causes:");
    console.error("1. Contract defaultMetadataBaseURI not set");
    console.error("2. Certificate not minted (token doesn't exist)");
    console.error("3. API endpoint not deployed");
    console.error("4. Network connectivity issues");
    console.error("\nRun: npm run set-metadata-uri");
  }
}

testMetadata().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
