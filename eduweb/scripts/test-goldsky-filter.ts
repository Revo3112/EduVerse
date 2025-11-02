import { config } from "dotenv";
import path from "path";

config({ path: path.join(__dirname, "../.env.local") });

const GOLDSKY_ENDPOINT = process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT;

async function testActiveCoursesFilter(userAddress: string) {
  if (!GOLDSKY_ENDPOINT) {
    console.error("❌ GOLDSKY_ENDPOINT not configured");
    process.exit(1);
  }

  console.log("🔍 Testing Active Courses Filter");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("User Address:", userAddress);
  console.log("Endpoint:", GOLDSKY_ENDPOINT);
  console.log("");

  const query = `
    query TestActiveCoursesFilter($userAddress: String!) {
      allCourses: courses(
        where: { creator: $userAddress }
        first: 1000
        orderBy: createdAt
        orderDirection: desc
      ) {
        id
        title
        isActive
        isDeleted
        createdAt
        totalEnrollments
        activeEnrollments
      }

      activeCourses: courses(
        where: { creator: $userAddress, isActive: true, isDeleted: false }
        first: 1000
        orderBy: createdAt
        orderDirection: desc
      ) {
        id
        title
        isActive
        isDeleted
        createdAt
        totalEnrollments
        activeEnrollments
      }
    }
  `;

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { userAddress: userAddress.toLowerCase() },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ HTTP Error:", response.status, errorText);
      process.exit(1);
    }

    const result = await response.json();

    if (result.errors) {
      console.error("❌ GraphQL Errors:", JSON.stringify(result.errors, null, 2));
      process.exit(1);
    }

    const allCourses = result.data.allCourses || [];
    const activeCourses = result.data.activeCourses || [];

    console.log("📊 RESULTS:");
    console.log("───────────────────────────────────────────────────────────");
    console.log(`Total Courses Created: ${allCourses.length}`);
    console.log(`Active Courses (filtered): ${activeCourses.length}`);
    console.log("");

    console.log("📋 ALL COURSES:");
    console.log("───────────────────────────────────────────────────────────");
    allCourses.forEach((course: any, index: number) => {
      const statusIcon = course.isActive && !course.isDeleted ? "✅" : "❌";
      const statusText = course.isDeleted
        ? "DELETED"
        : course.isActive
        ? "ACTIVE"
        : "INACTIVE";

      console.log(
        `${index + 1}. ${statusIcon} [${statusText}] ${course.title.substring(0, 50)}`
      );
      console.log(`   ID: ${course.id}`);
      console.log(`   isActive: ${course.isActive}, isDeleted: ${course.isDeleted}`);
      console.log(
        `   Enrollments: ${course.totalEnrollments} total, ${course.activeEnrollments} active`
      );
      console.log(
        `   Created: ${new Date(parseInt(course.createdAt) * 1000).toLocaleString()}`
      );
      console.log("");
    });

    console.log("✅ ACTIVE COURSES ONLY (Dashboard shows these):");
    console.log("───────────────────────────────────────────────────────────");
    if (activeCourses.length === 0) {
      console.log("   No active courses found.");
      console.log("   Only published (isActive=true, isDeleted=false) courses appear in Teaching Overview.");
    } else {
      activeCourses.forEach((course: any, index: number) => {
        console.log(`${index + 1}. ✅ ${course.title.substring(0, 50)}`);
        console.log(`   ID: ${course.id}`);
        console.log(
          `   Enrollments: ${course.totalEnrollments} total, ${course.activeEnrollments} active`
        );
        console.log(
          `   Created: ${new Date(parseInt(course.createdAt) * 1000).toLocaleString()}`
        );
        console.log("");
      });
    }

    console.log("═══════════════════════════════════════════════════════════");
    console.log("✅ Test completed successfully");
    console.log("");
    console.log("🔍 FILTER LOGIC:");
    console.log("   Dashboard shows only: isActive=true AND isDeleted=false");
    console.log("   Inactive/deleted courses are automatically hidden");
    console.log("═══════════════════════════════════════════════════════════");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

const userAddress = process.argv[2];

if (!userAddress) {
  console.error("Usage: tsx scripts/test-goldsky-filter.ts <userAddress>");
  console.error("Example: tsx scripts/test-goldsky-filter.ts 0x1234...");
  process.exit(1);
}

testActiveCoursesFilter(userAddress);
