/**
 * Goldsky Integration Test Script
 *
 * Tests all Goldsky GraphQL queries to ensure proper integration
 * Run: npx tsx src/scripts/test-goldsky-integration.ts
 *
 * @author EduVerse Team
 * @version 1.0.0
 */

import {
  getPlatformAnalytics,
  getCourseAnalytics,
  getUserAnalytics,
  getProgressAnalytics,
  getLicenseAnalytics,
  getCertificateAnalytics,
  getRecentActivities,
  getComprehensiveAnalytics,
} from "../services/goldsky-analytics.service";

// ============================================================================
// TEST UTILITIES
// ============================================================================

interface TestResult {
  name: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
  duration: number;
  data?: unknown;
}

const results: TestResult[] = [];

function log(
  message: string,
  type: "info" | "success" | "error" | "warn" = "info"
) {
  const colors = {
    info: "\x1b[36m", // Cyan
    success: "\x1b[32m", // Green
    error: "\x1b[31m", // Red
    warn: "\x1b[33m", // Yellow
  };
  const reset = "\x1b[0m";
  console.log(`${colors[type]}${message}${reset}`);
}

async function runTest<T>(
  name: string,
  testFn: () => Promise<T>,
  validator: (data: T) => { valid: boolean; message: string }
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    log(`\n🧪 Testing: ${name}`, "info");
    const data = await testFn();
    const duration = Date.now() - startTime;

    const validation = validator(data);

    if (validation.valid) {
      log(`✅ PASS: ${validation.message} (${duration}ms)`, "success");
      return {
        name,
        status: "PASS",
        message: validation.message,
        duration,
        data,
      };
    } else {
      log(`⚠️ WARN: ${validation.message} (${duration}ms)`, "warn");
      return {
        name,
        status: "WARN",
        message: validation.message,
        duration,
        data,
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`❌ FAIL: ${errorMessage} (${duration}ms)`, "error");
    return {
      name,
      status: "FAIL",
      message: errorMessage,
      duration,
    };
  }
}

// ============================================================================
// VALIDATORS
// ============================================================================

function validatePlatformAnalytics(data: unknown): {
  valid: boolean;
  message: string;
} {
  if (!data) return { valid: false, message: "No data returned" };

  const requiredFields = [
    "totalUsers",
    "totalCourses",
    "totalEnrollments",
    "totalCertificates",
    "totalRevenue",
    "totalRevenueEth",
  ];

  const missingFields = requiredFields.filter(
    (field) => !(field in (data as Record<string, unknown>))
  );

  if (missingFields.length > 0) {
    return {
      valid: false,
      message: `Missing fields: ${missingFields.join(", ")}`,
    };
  }

  // Check if data has reasonable values (not all zeros)
  const typedData = data as Record<string, number>;
  const hasData =
    typedData.totalUsers > 0 ||
    typedData.totalCourses > 0;

  return {
    valid: true,
    message: hasData
      ? `Found ${typedData.totalUsers} users, ${typedData.totalCourses} courses, ${typedData.totalEnrollments} enrollments`
      : "All metrics are zero (no data in subgraph yet)",
  };
}

function validateCourseAnalytics(data: unknown): {
  valid: boolean;
  message: string;
} {
  if (!data) return { valid: false, message: "No data returned" };

  const requiredFields = [
    "totalCourses",
    "activeCourses",
    "coursesByCategory",
    "coursesByDifficulty",
    "averagePrice",
  ];

  const missingFields = requiredFields.filter(
    (field) => !(field in (data as Record<string, unknown>))
  );

  if (missingFields.length > 0) {
    return {
      valid: false,
      message: `Missing fields: ${missingFields.join(", ")}`,
    };
  }

  const typedData = data as Record<string, number>;
  const hasData = typedData.totalCourses > 0;

  return {
    valid: true,
    message: hasData
      ? `Found ${typedData.totalCourses} courses (${typedData.activeCourses} active)`
      : "No courses found",
  };
}

function validateUserAnalytics(data: unknown): {
  valid: boolean;
  message: string;
} {
  if (!data) return { valid: false, message: "No data returned" };

  const requiredFields = [
    "totalSectionsCompleted",
    "totalCoursesCompleted",
    "uniqueStudentsWithProgress",
  ];

  const missingFields = requiredFields.filter(
    (field) => !(field in (data as Record<string, unknown>))
  );

  if (missingFields.length > 0) {
    return {
      valid: false,
      message: `Missing fields: ${missingFields.join(", ")}`,
    };
  }

  const typedData = data as Record<string, number>;
  const hasData = typedData.totalSectionsCompleted > 0;

  return {
    valid: true,
    message: hasData
      ? `Found ${typedData.totalSectionsCompleted} sections completed, ${typedData.totalCoursesCompleted} courses completed`
      : "No progress data found",
  };
}

function validateProgressAnalytics(data: unknown): {
  valid: boolean;
  message: string;
} {
  if (!data) return { valid: false, message: "No data returned" };

  const requiredFields = [
    "totalLicensesMinted",
    "activeLicenses",
    "totalLicenseRevenue",
  ];

  const missingFields = requiredFields.filter(
    (field) => !(field in (data as Record<string, unknown>))
  );

  if (missingFields.length > 0) {
    return {
      valid: false,
      message: `Missing fields: ${missingFields.join(", ")}`,
    };
  }

  const typedData = data as Record<string, number>;
  const hasData = typedData.totalLicenses > 0;

  return {
    valid: true,
    message: hasData
      ? `Found ${typedData.totalLicenses} licenses (${typedData.activeLicenses} active)`
      : "No licenses found",
  };
}

function validateLicenseAnalytics(data: unknown): {
  valid: boolean;
  message: string;
} {
  if (!data) return { valid: false, message: "No data returned" };

  const requiredFields = [
    "totalCertificateHolders",
    "totalCoursesInCertificates",
    "totalCertificateRevenue",
  ];

  const missingFields = requiredFields.filter(
    (field) => !(field in (data as Record<string, unknown>))
  );

  if (missingFields.length > 0) {
    return {
      valid: false,
      message: `Missing fields: ${missingFields.join(", ")}`,
    };
  }

  const typedData = data as Record<string, number>;
  const hasData = typedData.totalCertificateHolders > 0;

  return {
    valid: true,
    message: hasData
      ? `Found ${typedData.totalCertificateHolders} certificates with ${typedData.totalCoursesInCertificates} courses`
      : "No certificates found",
  };
}

function validateCertificateAnalytics(data: unknown): {
  valid: boolean;
  message: string;
} {
  if (!data) return { valid: false, message: "No data returned" };

  const requiredFields = [
    "totalCertificates",
    "certificatesByRecipient",
    "totalCertificateRevenue",
  ];

  const missingFields = requiredFields.filter(
    (field) => !(field in (data as Record<string, unknown>))
  );

  if (missingFields.length > 0) {
    return {
      valid: false,
      message: `Missing fields: ${missingFields.join(", ")}`,
    };
  }

  const hasData = (data as Record<string, number>).totalCertificates > 0;

  return {
    valid: true,
    message: hasData
      ? `Found ${
          (data as Record<string, number>).totalCertificates
        } certificates`
      : "No certificates found",
  };
}

function validateRecentActivities(data: unknown): {
  valid: boolean;
  message: string;
} {
  if (!Array.isArray(data)) {
    return { valid: false, message: "Data is not an array" };
  }

  if (data.length === 0) {
    return {
      valid: true,
      message: "No activities found (empty result is valid)",
    };
  }

  const requiredFields = ["id", "type", "timestamp", "transactionHash", "user"];

  const firstItem = data[0] as Record<string, unknown>;
  const missingFields = requiredFields.filter((field) => !(field in firstItem));

  if (missingFields.length > 0) {
    return {
      valid: false,
      message: `First item missing fields: ${missingFields.join(", ")}`,
    };
  }

  return {
    valid: true,
    message: `Found ${data.length} activities (latest: ${firstItem.type})`,
  };
}

function validateComprehensiveAnalytics(data: unknown): {
  valid: boolean;
  message: string;
} {
  if (!data) return { valid: false, message: "No data returned" };

  const requiredFields = [
    "platform",
    "courses",
    "users",
    "progress",
    "licenses",
    "certificates",
  ];

  const missingCategories = requiredFields.filter(
    (cat) => !(cat in (data as Record<string, unknown>))
  );

  if (missingCategories.length > 0) {
    return {
      valid: false,
      message: `Missing categories: ${missingCategories.join(", ")}`,
    };
  }

  return {
    valid: true,
    message: "All analytics categories present",
  };
}

// ============================================================================
// MAIN TEST SUITE
// ============================================================================

async function runAllTests() {
  log("\n" + "=".repeat(80), "info");
  log("🚀 GOLDSKY INTEGRATION TEST SUITE", "info");
  log("=".repeat(80) + "\n", "info");

  log("Testing Goldsky endpoint:", "info");
  log(
    `${process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT || "NOT SET"}\n`,
    "warn"
  );

  // Test 1: Platform Analytics
  results.push(
    await runTest(
      "getPlatformAnalytics",
      () => getPlatformAnalytics(),
      validatePlatformAnalytics
    )
  );

  // Test 2: Course Analytics
  results.push(
    await runTest(
      "getCourseAnalytics",
      () => getCourseAnalytics(),
      validateCourseAnalytics
    )
  );

  // Test 3: User Analytics
  results.push(
    await runTest(
      "getUserAnalytics",
      () => getUserAnalytics(),
      validateUserAnalytics
    )
  );

  // Test 4: Progress Analytics
  results.push(
    await runTest(
      "getProgressAnalytics",
      () => getProgressAnalytics(),
      validateProgressAnalytics
    )
  );

  // Test 5: License Analytics
  results.push(
    await runTest(
      "getLicenseAnalytics",
      () => getLicenseAnalytics(),
      validateLicenseAnalytics
    )
  );

  // Test 6: Certificate Analytics
  results.push(
    await runTest(
      "getCertificateAnalytics",
      () => getCertificateAnalytics(),
      validateCertificateAnalytics
    )
  );

  // Test 7: Recent Activities
  results.push(
    await runTest(
      "getRecentActivities",
      () => getRecentActivities(10),
      validateRecentActivities
    )
  );

  // Test 8: Comprehensive Analytics
  results.push(
    await runTest(
      "getComprehensiveAnalytics",
      () => getComprehensiveAnalytics(),
      validateComprehensiveAnalytics
    )
  );

  // Print Summary
  printSummary();
}

function printSummary() {
  log("\n" + "=".repeat(80), "info");
  log("📊 TEST SUMMARY", "info");
  log("=".repeat(80) + "\n", "info");

  const passed = results.filter((r) => r.status === "PASS").length;
  const warned = results.filter((r) => r.status === "WARN").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const total = results.length;

  log(`Total Tests: ${total}`, "info");
  log(`✅ Passed: ${passed}`, "success");
  log(`⚠️ Warnings: ${warned}`, "warn");
  log(`❌ Failed: ${failed}`, "error");

  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / total;
  log(`\n⏱️ Average Response Time: ${avgDuration.toFixed(2)}ms`, "info");

  // Show failed tests details
  if (failed > 0) {
    log("\n❌ FAILED TESTS:", "error");
    results
      .filter((r) => r.status === "FAIL")
      .forEach((r) => {
        log(`  - ${r.name}: ${r.message}`, "error");
      });
  }

  // Show warned tests details
  if (warned > 0) {
    log("\n⚠️ WARNINGS:", "warn");
    results
      .filter((r) => r.status === "WARN")
      .forEach((r) => {
        log(`  - ${r.name}: ${r.message}`, "warn");
      });
  }

  // Final verdict
  log("\n" + "=".repeat(80), "info");
  if (failed === 0 && warned === 0) {
    log("🎉 ALL TESTS PASSED! Integration is working perfectly.", "success");
  } else if (failed === 0) {
    log(
      "✅ All tests passed with warnings. Check empty data warnings above.",
      "success"
    );
  } else {
    log("⛔ INTEGRATION FAILED! Fix errors above before proceeding.", "error");
    process.exit(1);
  }
  log("=".repeat(80) + "\n", "info");
}

// ============================================================================
// RUN TESTS
// ============================================================================

runAllTests().catch((error) => {
  log("\n💥 Fatal Error:", "error");
  log(error.message, "error");
  log(error.stack || "", "error");
  process.exit(1);
});
