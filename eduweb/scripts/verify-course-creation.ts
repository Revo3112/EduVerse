import {
  createThirdwebClient,
  getContract,
  prepareContractCall,
  readContract,
  defineChain,
} from "thirdweb";
import * as fs from "fs";
import * as path from "path";

// Manta Pacific Sepolia Testnet
const mantaPacificSepolia = defineChain({
  id: 3441006,
  name: "Manta Pacific Sepolia Testnet",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpc: "https://pacific-rpc.sepolia-testnet.manta.network/http",
});

// Load .env.local manually since this is not Next.js runtime
function loadEnv(): { clientId: string } {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const envContent = fs.readFileSync(envPath, "utf-8");

    // Parse lines and skip comments
    const lines = envContent.split("\n");
    let clientId = "";

    for (const line of lines) {
      if (line.trim().startsWith("#")) continue;
      const clientIdMatch = line.match(/^NEXT_PUBLIC_THIRDWEB_CLIENT_ID=(.+)/);
      if (clientIdMatch && clientIdMatch[1]) {
        clientId = clientIdMatch[1].trim();
        break;
      }
    }

    return { clientId };
  } catch (error) {
    console.warn("⚠️  Could not read .env.local");
    return { clientId: "" };
  }
}

const env = loadEnv();
const THIRDWEB_CLIENT_ID = env.clientId;
const COURSE_FACTORY_ADDRESS = "0x8596917Af32Ab154Ab4F48efD32Ef516D4110E72";

const client = createThirdwebClient({
  clientId: THIRDWEB_CLIENT_ID,
});

const courseFactoryContract = getContract({
  client,
  chain: mantaPacificSepolia,
  address: COURSE_FACTORY_ADDRESS,
});

async function verifyCourseData(courseId: string) {
  console.log("🔍 COURSE CREATION VERIFICATION");
  console.log("=".repeat(80));
  console.log(`Course ID: ${courseId}`);
  console.log(
    `Thirdweb Client ID: ${THIRDWEB_CLIENT_ID ? "✅ Loaded" : "❌ Missing"}`
  );
  console.log("=".repeat(80));

  if (!THIRDWEB_CLIENT_ID) {
    console.error("❌ THIRDWEB_CLIENT_ID not found in .env.local");
    console.error("Please add: NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id");
    process.exit(1);
  }

  try {
    console.log("\n📡 Reading course data from contract...\n");

    const courseData = await readContract({
      contract: courseFactoryContract,
      method:
        "function getCourse(uint256 courseId) view returns ((address creator, uint64 id, uint32 createdAt, uint128 pricePerMonth, uint8 category, uint8 difficulty, bool isActive, string title, string description, string thumbnailCID, string creatorName))",
      params: [BigInt(courseId)],
    });

    console.log("Course Data:");
    console.log(`   Creator: ${courseData.creator}`);
    console.log(`   ID: ${courseData.id}`);
    console.log(`   Title: ${courseData.title}`);
    console.log(`   Creator Name: ${courseData.creatorName}`);
    console.log(`   Description: ${courseData.description || "❌ EMPTY"}`);
    console.log(`   Thumbnail CID: ${courseData.thumbnailCID || "❌ EMPTY"}`);
    console.log(
      `   Category (enum): ${courseData.category} ${getCategoryName(
        Number(courseData.category)
      )}`
    );
    console.log(
      `   Difficulty (enum): ${courseData.difficulty} ${getDifficultyName(
        Number(courseData.difficulty)
      )}`
    );
    console.log(`   Price Per Month (wei): ${courseData.pricePerMonth}`);
    console.log(
      `   Price Per Month (ETH): ${Number(courseData.pricePerMonth) / 1e18}`
    );
    console.log(`   Active: ${courseData.isActive}`);
    console.log(
      `   Created At: ${courseData.createdAt} (${new Date(
        Number(courseData.createdAt) * 1000
      ).toISOString()})`
    );

    console.log("\n" + "=".repeat(80));
    console.log("VALIDATION CHECKS");
    console.log("=".repeat(80));

    const issues: string[] = [];

    if (!courseData.description) {
      issues.push("❌ Description is empty");
    }

    if (!courseData.thumbnailCID) {
      issues.push("❌ Thumbnail CID is empty");
    } else if (
      !courseData.thumbnailCID.startsWith("Qm") &&
      !courseData.thumbnailCID.startsWith("bafy")
    ) {
      issues.push(
        "⚠️  Thumbnail CID has unusual format: " + courseData.thumbnailCID
      );
    }

    if (courseData.pricePerMonth === BigInt(0)) {
      issues.push("⚠️  Price is 0 ETH");
    }

    if (Number(courseData.category) > 19) {
      issues.push("❌ Invalid category value: " + courseData.category);
    }

    if (Number(courseData.difficulty) > 2) {
      issues.push("❌ Invalid difficulty value: " + courseData.difficulty);
    }

    if (issues.length > 0) {
      console.log("\n⚠️  Issues found:");
      issues.forEach((issue) => console.log(`   ${issue}`));
    } else {
      console.log("\n✅ All validation checks passed!");
    }

    console.log("\n" + "=".repeat(80));
    console.log("GOLDSKY EXPECTATIONS");
    console.log("=".repeat(80));
    console.log("\nGoldsky indexer should receive:");
    console.log(
      `   category: "${getCategoryEnum(Number(courseData.category))}"`
    );
    console.log(
      `   difficulty: "${getDifficultyEnum(Number(courseData.difficulty))}"`
    );
    console.log(`   thumbnailCID: "${courseData.thumbnailCID}"`);
    console.log(`   priceInEth: "${Number(courseData.pricePerMonth) / 1e18}"`);

    console.log("\nFrontend will transform to:");
    console.log(
      `   categoryName: "${getCategoryName(Number(courseData.category))}"`
    );
    console.log(
      `   difficultyName: "${getDifficultyName(Number(courseData.difficulty))}"`
    );
    console.log(`   category (index): ${courseData.category}`);
    console.log(`   difficulty (index): ${courseData.difficulty}`);

    const sections = await readContract({
      contract: courseFactoryContract,
      method:
        "function getCourseSections(uint256 courseId) view returns ((uint256 id, uint256 courseId, string title, string contentCID, uint256 duration, uint256 orderId)[])",
      params: [BigInt(courseId)],
    });

    console.log("\n" + "=".repeat(80));
    console.log("COURSE SECTIONS");
    console.log("=".repeat(80));
    console.log(`Total sections: ${sections.length}`);

    if (sections.length > 0) {
      sections.forEach((section, index) => {
        console.log(`\nSection #${index + 1}:`);
        console.log(`   ID: ${section.id}`);
        console.log(`   Title: ${section.title}`);
        console.log(`   Content CID: ${section.contentCID || "❌ EMPTY"}`);
        console.log(`   Duration: ${section.duration}s`);
        console.log(`   Order: ${section.orderId}`);

        if (!section.contentCID) {
          issues.push(`❌ Section "${section.title}" has empty contentCID`);
        }
      });
    } else {
      console.log("⚠️  No sections found");
    }

    console.log("\n✅ Verification complete!");
  } catch (error: any) {
    console.error("❌ ERROR:", error.message);
    console.error(error);
  }
}

function getCategoryName(categoryId: number): string {
  const categories = [
    "Programming",
    "Design",
    "Business",
    "Marketing",
    "Data Science",
    "Finance",
    "Healthcare",
    "Language",
    "Arts",
    "Mathematics",
    "Science",
    "Engineering",
    "Technology",
    "Education",
    "Psychology",
    "Culinary",
    "Personal Development",
    "Legal",
    "Sports",
    "Other",
  ];
  return categories[categoryId] || "Unknown";
}

function getCategoryEnum(categoryId: number): string {
  const enums = [
    "Programming",
    "Design",
    "Business",
    "Marketing",
    "DataScience",
    "Finance",
    "Healthcare",
    "Language",
    "Arts",
    "Mathematics",
    "Science",
    "Engineering",
    "Technology",
    "Education",
    "Psychology",
    "Culinary",
    "PersonalDevelopment",
    "Legal",
    "Sports",
    "Other",
  ];
  return enums[categoryId] || "Other";
}

function getDifficultyName(difficultyId: number): string {
  const difficulties = ["Beginner", "Intermediate", "Advanced"];
  return difficulties[difficultyId] || "Unknown";
}

function getDifficultyEnum(difficultyId: number): string {
  const enums = ["Beginner", "Intermediate", "Advanced"];
  return enums[difficultyId] || "Beginner";
}

const courseId = process.argv[2];
if (!courseId) {
  console.error("Usage: npm run verify-course <courseId>");
  process.exit(1);
}

verifyCourseData(courseId).catch(console.error);
