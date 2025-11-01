import { GraphQLClient } from "graphql-request";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually since this is not Next.js runtime
function loadEnv(): string {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const envContent = fs.readFileSync(envPath, "utf-8");
    // Match only non-commented lines (skip lines starting with #)
    const lines = envContent.split("\n");
    for (const line of lines) {
      if (line.trim().startsWith("#")) continue;
      const match = line.match(/^NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=(.+)/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (error) {
    console.warn("⚠️  Could not read .env.local");
  }
  return "https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/1.3.0/gn";
}

const GOLDSKY_ENDPOINT = loadEnv();

const DIAGNOSTIC_QUERY = `
  query DiagnosticQuery {
    courses(first: 5, orderBy: createdAt, orderDirection: desc) {
      id
      title
      creator
      category
      difficulty
      price
      priceInEth
      thumbnailCID
      description
      isActive
      isDeleted
      sectionsCount
      totalEnrollments
      createdAt
    }
  }
`;

async function diagnose() {
  console.log("🔍 GOLDSKY DIAGNOSTIC TOOL");
  console.log("=".repeat(80));
  console.log(`Endpoint: ${GOLDSKY_ENDPOINT}`);
  console.log("=".repeat(80));

  const client = new GraphQLClient(GOLDSKY_ENDPOINT, {
    headers: { "Content-Type": "application/json" },
  });

  try {
    console.log("\n📡 Fetching courses from Goldsky...\n");
    const data: any = await client.request(DIAGNOSTIC_QUERY);

    if (!data.courses || data.courses.length === 0) {
      console.log("❌ NO COURSES FOUND");
      console.log("   - Subgraph may not be synced");
      console.log("   - No courses created yet");
      console.log("   - Check deployment status");
      return;
    }

    console.log(`✅ Found ${data.courses.length} courses\n`);

    data.courses.forEach((course: any, index: number) => {
      console.log(`Course #${index + 1}: ${course.title}`);
      console.log(`   ID: ${course.id}`);
      console.log(`   Creator: ${course.creator}`);
      console.log(
        `   Category: ${course.category} ${validateCategory(course.category)}`
      );
      console.log(
        `   Difficulty: ${course.difficulty} ${validateDifficulty(
          course.difficulty
        )}`
      );
      console.log(`   Price: ${course.price} wei`);
      console.log(
        `   Price ETH: ${course.priceInEth} ${validatePrice(course.priceInEth)}`
      );
      console.log(
        `   Thumbnail: ${course.thumbnailCID} ${validateThumbnail(
          course.thumbnailCID
        )}`
      );
      console.log(
        `   Description: ${course.description ? "✅ Present" : "❌ Empty"}`
      );
      console.log(`   Active: ${course.isActive}`);
      console.log(`   Deleted: ${course.isDeleted}`);
      console.log(`   Sections: ${course.sectionsCount}`);
      console.log(`   Enrollments: ${course.totalEnrollments}`);
      console.log("");
    });

    console.log("\n" + "=".repeat(80));
    console.log("TRANSFORMATION TEST");
    console.log("=".repeat(80));

    const testCourse = data.courses[0];
    console.log("\nRaw GraphQL Data:");
    console.log(JSON.stringify(testCourse, null, 2));

    console.log("\n\nTransformed Data:");
    const transformed = transformCourse(testCourse);
    console.log(JSON.stringify(transformed, null, 2));

    console.log("\n\n✅ Diagnostic complete!");
  } catch (error: any) {
    console.error("❌ ERROR:", error.message);
    console.error(error);
  }
}

function validateCategory(category: string): string {
  const validCategories = [
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
  return validCategories.includes(category) ? "✅" : "❌ INVALID";
}

function validateDifficulty(difficulty: string): string {
  const validDifficulties = ["Beginner", "Intermediate", "Advanced"];
  return validDifficulties.includes(difficulty) ? "✅" : "❌ INVALID";
}

function validatePrice(priceInEth: string): string {
  const price = parseFloat(priceInEth);
  if (isNaN(price)) return "❌ NaN";
  if (price === 0) return "⚠️  ZERO";
  return "✅";
}

function validateThumbnail(thumbnailCID: string): string {
  if (!thumbnailCID) return "❌ Empty";
  if (thumbnailCID.startsWith("Qm") || thumbnailCID.startsWith("bafy")) {
    return "✅ Valid CID";
  }
  return "⚠️  Unusual format";
}

function categoryEnumToDisplayName(enumValue: string): string {
  const mapping: Record<string, string> = {
    Programming: "Programming",
    Design: "Design",
    Business: "Business",
    Marketing: "Marketing",
    DataScience: "Data Science",
    Finance: "Finance",
    Healthcare: "Healthcare",
    Language: "Language",
    Arts: "Arts",
    Mathematics: "Mathematics",
    Science: "Science",
    Engineering: "Engineering",
    Technology: "Technology",
    Education: "Education",
    Psychology: "Psychology",
    Culinary: "Culinary",
    PersonalDevelopment: "Personal Development",
    Legal: "Legal",
    Sports: "Sports",
    Other: "Other",
  };
  return mapping[enumValue] || "Unknown";
}

function categoryEnumToNumber(enumValue: string): number {
  const mapping: Record<string, number> = {
    Programming: 0,
    Design: 1,
    Business: 2,
    Marketing: 3,
    DataScience: 4,
    Finance: 5,
    Healthcare: 6,
    Language: 7,
    Arts: 8,
    Mathematics: 9,
    Science: 10,
    Engineering: 11,
    Technology: 12,
    Education: 13,
    Psychology: 14,
    Culinary: 15,
    PersonalDevelopment: 16,
    Legal: 17,
    Sports: 18,
    Other: 19,
  };
  return mapping[enumValue] ?? 0;
}

function difficultyEnumToDisplayName(enumValue: string): string {
  const mapping: Record<string, string> = {
    Beginner: "Beginner",
    Intermediate: "Intermediate",
    Advanced: "Advanced",
  };
  return mapping[enumValue] || "Unknown";
}

function difficultyEnumToNumber(enumValue: string): number {
  const mapping: Record<string, number> = {
    Beginner: 0,
    Intermediate: 1,
    Advanced: 2,
  };
  return mapping[enumValue] ?? 0;
}

function transformCourse(raw: any): any {
  const categoryEnum = raw.category as string;
  const difficultyEnum = raw.difficulty as string;

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    thumbnailCID: raw.thumbnailCID,
    creator: raw.creator.toLowerCase(),
    category: categoryEnumToNumber(categoryEnum),
    categoryName: categoryEnumToDisplayName(categoryEnum),
    difficulty: difficultyEnumToNumber(difficultyEnum),
    difficultyName: difficultyEnumToDisplayName(difficultyEnum),
    price: raw.price,
    priceInEth: raw.priceInEth,
    isActive: raw.isActive,
  };
}

diagnose().catch(console.error);
