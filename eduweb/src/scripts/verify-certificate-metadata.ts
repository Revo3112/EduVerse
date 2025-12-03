import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const CERTIFICATE_MANAGER_ADDRESS =
  process.env.NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const GOLDSKY_ENDPOINT = process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT!;
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY!;

async function verifyCertificateMetadata() {
  console.log("=".repeat(80));
  console.log("CERTIFICATE METADATA VERIFICATION");
  console.log("=".repeat(80));

  const tokenId = "1";

  console.log("\n[1] Configuration");
  console.log("-".repeat(80));
  console.log(`Contract Address: ${CERTIFICATE_MANAGER_ADDRESS}`);
  console.log(`App URL: ${APP_URL}`);
  console.log(`Goldsky Endpoint: ${GOLDSKY_ENDPOINT}`);
  console.log(`Pinata Gateway: ${PINATA_GATEWAY}`);
  console.log("\n⚠️  Skipping thirdweb contract calls (RPC issues)");
  console.log("Testing Goldsky + API endpoints directly...\n");

  try {
    console.log("\n[2] Goldsky Query Test");
    console.log("-".repeat(80));

    const query = `
      query GetCertificate($tokenId: BigInt!) {
        certificate(id: $tokenId) {
          tokenId
          platformName
          recipientName
          recipientAddress
          isValid
          ipfsCID
          baseRoute
          createdAt
          lastUpdated
          totalCourses
          completedCourses(orderBy: addedAt, orderDirection: asc) {
            course {
              id
            }
            addedAt
            txHash
          }
        }
      }
    `;

    const goldskyResponse = await fetch(GOLDSKY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { tokenId: tokenId.toString() },
      }),
    });

    if (!goldskyResponse.ok) {
      console.log(
        `❌ Goldsky query failed: ${goldskyResponse.status} ${goldskyResponse.statusText}`
      );
      return;
    }

    const goldskyData = await goldskyResponse.json();

    if (goldskyData.errors) {
      console.log("❌ Goldsky errors:", goldskyData.errors);
      return;
    }

    const certificate = goldskyData.data?.certificate;

    if (!certificate) {
      console.log("❌ Certificate not found in Goldsky");
      return;
    }

    console.log("✅ Goldsky query successful");
    console.log(`   Recipient: ${certificate.recipientName}`);
    console.log(`   Total Courses: ${certificate.totalCourses}`);
    console.log(`   IPFS CID: ${certificate.ipfsCID}`);

    console.log("\n[3] Metadata Endpoint Test");
    console.log("-".repeat(80));

    const metadataUrl = `${APP_URL}/api/metadata/${tokenId}`;
    console.log(`Fetching: ${metadataUrl}`);

    const metadataResponse = await fetch(metadataUrl);

    if (!metadataResponse.ok) {
      console.log(
        `❌ HTTP ${metadataResponse.status}: ${metadataResponse.statusText}`
      );
      const errorText = await metadataResponse.text();
      console.log("Response:", errorText.substring(0, 500));
      return;
    }

    const metadata = await metadataResponse.json();
    console.log("✅ Metadata received");

    console.log("\n[4] ERC-1155 Compliance Check");
    console.log("-".repeat(80));

    const requiredFields = [
      "name",
      "description",
      "image",
      "decimals",
      "attributes",
    ];
    let allValid = true;

    for (const field of requiredFields) {
      if (metadata[field] === undefined) {
        console.log(`❌ Missing field: ${field}`);
        allValid = false;
      } else {
        console.log(`✅ ${field}: present`);
      }
    }

    console.log("\n[5] Image URL Validation");
    console.log("-".repeat(80));

    if (!metadata.image) {
      console.log("❌ No image URL in metadata");
      allValid = false;
    } else if (metadata.image.startsWith("ipfs://")) {
      console.log(`❌ Image uses ipfs:// protocol: ${metadata.image}`);
      console.log(
        `   Should use: https://${PINATA_GATEWAY}/ipfs/${certificate.ipfsCID}`
      );
      allValid = false;
    } else if (
      metadata.image.startsWith("http://") ||
      metadata.image.startsWith("https://")
    ) {
      console.log(`✅ Image URL: ${metadata.image}`);

      console.log("\n[6] Image Accessibility Test");
      console.log("-".repeat(80));

      try {
        const imageResponse = await fetch(metadata.image, { method: "HEAD" });

        if (!imageResponse.ok) {
          console.log(
            `❌ Image not accessible: ${imageResponse.status} ${imageResponse.statusText}`
          );
          allValid = false;
        } else {
          console.log("✅ Image is accessible");
          console.log(
            `   Content-Type: ${imageResponse.headers.get("content-type")}`
          );
          const contentLength = imageResponse.headers.get("content-length");
          if (contentLength) {
            console.log(
              `   Size: ${(parseInt(contentLength) / 1024).toFixed(2)} KB`
            );
          }
        }
      } catch (error) {
        console.log(`❌ Failed to fetch image: ${error}`);
        allValid = false;
      }
    }

    console.log("\n[7] Metadata Attributes Check");
    console.log("-".repeat(80));

    const requiredAttributes = [
      "Token ID",
      "Recipient Name",
      "Recipient Address",
      "Total Courses Completed",
      "Is Valid",
      "Issued At",
      "Last Updated",
    ];

    for (const attrName of requiredAttributes) {
      const attr = metadata.attributes?.find(
        (a: { trait_type: string; value: string }) => a.trait_type === attrName
      );
      if (attr) {
        console.log(`✅ ${attrName}: ${attr.value}`);
      } else {
        console.log(`❌ ${attrName}: missing`);
        allValid = false;
      }
    }

    console.log("\n[8] Data Consistency Check");
    console.log("-".repeat(80));

    const nameMatch = metadata.name.includes(certificate.recipientName);
    const coursesMatch =
      parseInt(
        metadata.attributes.find(
          (a: { trait_type: string; value: string }) =>
            a.trait_type === "Total Courses Completed"
        )?.value
      ) === parseInt(certificate.totalCourses);

    console.log(
      nameMatch
        ? "✅ Recipient name matches in metadata"
        : "❌ Recipient name mismatch"
    );
    console.log(
      coursesMatch ? "✅ Course count matches" : "❌ Course count mismatch"
    );

    if (!nameMatch || !coursesMatch) {
      allValid = false;
    }

    console.log("\n" + "=".repeat(80));
    if (allValid) {
      console.log("✅ ALL CHECKS PASSED");
      console.log("\nMetaMask will display this certificate correctly.");
      console.log("NFT marketplaces can properly index the metadata.");
    } else {
      console.log("❌ VERIFICATION FAILED");
      console.log("\nIssues found:");
      console.log("1. Check contract defaultMetadataBaseURI configuration");
      console.log("2. Verify Goldsky indexer is synced");
      console.log("3. Ensure image URLs use HTTP gateway");
      console.log("4. Check API endpoint returns correct field names");
    }
    console.log("=".repeat(80));
  } catch (error) {
    console.error("\n❌ Verification failed:");
    console.error(error);
    console.error("\nPossible causes:");
    console.error("1. Contract not deployed or address wrong");
    console.error("2. Certificate token doesn't exist");
    console.error("3. Goldsky not synced");
    console.error("4. API endpoint not deployed");
    console.error("5. Environment variables missing");
  }
}

verifyCertificateMetadata().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
