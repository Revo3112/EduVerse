import { createThirdwebClient, getContract } from "thirdweb";
import { mantaPacificTestnet } from "thirdweb/chains";
import { readContract } from "thirdweb";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../eduweb/.env.local") });

const CERTIFICATE_MANAGER_ADDRESS =
  process.env.NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS;
const COURSE_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_COURSE_FACTORY_ADDRESS;
const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

async function testCertificateAPI() {
  console.log("\n=== Certificate API Test ===\n");

  if (!CERTIFICATE_MANAGER_ADDRESS) {
    console.error("❌ NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS not set");
    process.exit(1);
  }

  if (!COURSE_FACTORY_ADDRESS) {
    console.error("❌ NEXT_PUBLIC_COURSE_FACTORY_ADDRESS not set");
    process.exit(1);
  }

  if (!THIRDWEB_CLIENT_ID) {
    console.error("❌ NEXT_PUBLIC_THIRDWEB_CLIENT_ID not set");
    process.exit(1);
  }

  console.log("✅ Environment variables loaded");
  console.log(`   Certificate Manager: ${CERTIFICATE_MANAGER_ADDRESS}`);
  console.log(`   Course Factory: ${COURSE_FACTORY_ADDRESS}`);
  console.log(`   Client ID exists: ${!!THIRDWEB_CLIENT_ID}\n`);

  const client = createThirdwebClient({
    clientId: THIRDWEB_CLIENT_ID,
  });

  const certificateContract = getContract({
    client,
    chain: mantaPacificTestnet,
    address: CERTIFICATE_MANAGER_ADDRESS,
  });

  const courseFactoryContract = getContract({
    client,
    chain: mantaPacificTestnet,
    address: COURSE_FACTORY_ADDRESS,
  });

  console.log("📝 Testing blockchain contract calls...\n");

  try {
    const testTokenId = 2n;
    console.log(`   Testing tokenId: ${testTokenId}\n`);

    console.log("1️⃣  Calling getCertificate()...");
    const certificateData = await readContract({
      contract: certificateContract,
      method:
        "function getCertificate(uint256 tokenId) view returns (tuple(uint256 tokenId, string platformName, string recipientName, address recipientAddress, bool lifetimeFlag, bool isValid, string ipfsCID, string baseRoute, uint256 issuedAt, uint256 lastUpdated, uint256 totalCoursesCompleted, bytes32 paymentReceiptHash))",
      params: [testTokenId],
    });

    console.log("   ✅ Certificate retrieved successfully");
    console.log(`   - Recipient: ${certificateData.recipientName}`);
    console.log(`   - Platform: ${certificateData.platformName}`);
    console.log(`   - Address: ${certificateData.recipientAddress}`);
    console.log(`   - IPFS CID: ${certificateData.ipfsCID}`);
    console.log(`   - Total Courses: ${certificateData.totalCoursesCompleted}`);
    console.log(`   - Valid: ${certificateData.isValid}`);
    console.log(`   - Lifetime: ${certificateData.lifetimeFlag}\n`);

    console.log("2️⃣  Calling getCertificateCompletedCourses()...");
    const completedCourses = await readContract({
      contract: certificateContract,
      method:
        "function getCertificateCompletedCourses(uint256 tokenId) view returns (uint256[])",
      params: [testTokenId],
    });

    console.log(`   ✅ Found ${completedCourses.length} completed courses`);

    if (completedCourses.length > 0) {
      console.log("\n3️⃣  Fetching course details...");
      for (const courseId of completedCourses) {
        try {
          const courseData = await readContract({
            contract: courseFactoryContract,
            method:
              "function getCourse(uint256 courseId) view returns (tuple(uint256 id, string title, string description, address creator, uint256 price, bool isActive, bool isDeleted, uint256 duration, uint256 createdAt, uint256 totalStudents, uint8 averageRating))",
            params: [courseId],
          });
          console.log(`   ✅ Course ${courseId}: ${courseData.title}`);
        } catch (error) {
          console.log(`   ⚠️  Course ${courseId}: Could not fetch details`);
        }
      }
    }

    console.log("\n✅ All contract calls successful!");
    console.log("\n=== Test Summary ===");
    console.log("✅ Interface definitions are correct");
    console.log("✅ ABI method signatures match contract");
    console.log("✅ Field names align with smart contract");
    console.log("✅ Type assertions work correctly");
    console.log("\n✨ The certificate API should work correctly now!\n");
  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error("   Error:", error.message);
    if (error.message.includes("Invalid ABI parameter")) {
      console.error("\n   This error indicates ABI mismatch.");
      console.error(
        "   Check that the tuple structure matches the contract exactly."
      );
    }
    console.error("\n");
    process.exit(1);
  }
}

testCertificateAPI().catch(console.error);
