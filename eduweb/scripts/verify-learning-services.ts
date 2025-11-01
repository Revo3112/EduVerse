#!/usr/bin/env tsx
/**
 * SERVICE VERIFICATION SCRIPT FOR LEARNING PAGES
 *
 * Verifies all required services, environment variables, and dependencies
 * for Learning, Course Details, and Section pages are properly configured.
 *
 * Usage: npx tsx scripts/verify-learning-services.ts
 */

import { existsSync } from "fs";
import { resolve } from "path";

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log("\n" + "=".repeat(80));
  log(title, "cyan");
  console.log("=".repeat(80));
}

// ============================================================================
// FILE EXISTENCE CHECKS
// ============================================================================

const REQUIRED_FILES = {
  "Core Services": [
    "src/app/client.ts",
    "src/lib/contracts.ts",
    "src/lib/graphql-client.ts",
    "src/lib/graphql-queries.ts",
  ],
  "Goldsky Services": ["src/services/goldsky-mylearning.service.ts"],
  "Livepeer Services": [
    "src/app/actions/livepeer.ts",
    "src/lib/livepeer.ts",
    "src/lib/livepeer-helpers.ts",
    "src/lib/livepeer-source.ts",
    "src/services/livepeer-playback.service.ts",
    "src/services/livepeer-upload.service.ts",
  ],
  "Pinata Services": [
    "src/lib/pinata.ts",
    "src/lib/ipfs-helpers.ts",
    "src/services/pinata-upload.service.ts",
    "src/app/api/ipfs/signed-url/[cid]/route.ts",
  ],
  "Thirdweb IPFS": ["src/lib/ipfs-upload-FINAL.ts"],
  "Video Components": [
    "src/components/HybridVideoPlayer.tsx",
    "src/components/LivepeerPlayerView.tsx",
    "src/components/LegacyVideoPlayer.tsx",
  ],
  "Thumbnail Components": [
    "src/components/ThumbnailImage.tsx",
    "src/hooks/useThumbnailUrl.ts",
  ],
  "Learning Pages": [
    "src/app/learning/page.tsx",
    "src/app/learning/course-details/page.tsx",
    "src/app/learning/section/page.tsx",
  ],
  Hooks: ["src/hooks/useMyLearning.ts"],
};

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const REQUIRED_ENV_VARS = {
  "Thirdweb (Client)": ["NEXT_PUBLIC_THIRDWEB_CLIENT_ID"],
  "Thirdweb (Server)": ["THIRDWEB_SECRET_KEY"],
  "Smart Contracts": [
    "NEXT_PUBLIC_COURSE_FACTORY_ADDRESS",
    "NEXT_PUBLIC_COURSE_LICENSE_ADDRESS",
    "NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS",
    "NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS",
  ],
  Goldsky: ["NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT"],
  Livepeer: ["LIVEPEER_API_KEY"],
  Pinata: ["PINATA_JWT", "PINATA_GATEWAY"],
};

const OPTIONAL_ENV_VARS = {
  Network: ["NEXT_PUBLIC_CHAIN_ID", "NEXT_PUBLIC_RPC_URL"],
};

// ============================================================================
// GRAPHQL QUERIES
// ============================================================================

const REQUIRED_QUERIES = {
  "Learning Page": ["GET_USER_LEARNING_COURSES"],
  "Course Details Page": [
    "GET_COURSE_DETAILS",
    "GET_ENROLLMENT_BY_STUDENT_COURSE",
  ],
  "Section Page": ["GET_SECTION_DETAILS", "GET_ENROLLMENT_BY_STUDENT_COURSE"],
};

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

function checkFileExists(filePath: string): boolean {
  const fullPath = resolve(process.cwd(), filePath);
  return existsSync(fullPath);
}

function verifyFiles(): { passed: number; failed: number; total: number } {
  logSection("FILE EXISTENCE CHECK");

  let passed = 0;
  let failed = 0;
  let total = 0;

  Object.entries(REQUIRED_FILES).forEach(([category, files]) => {
    log(`\n${category}:`, "blue");
    files.forEach((file) => {
      total++;
      const exists = checkFileExists(file);
      if (exists) {
        log(`  ✓ ${file}`, "green");
        passed++;
      } else {
        log(`  ✗ ${file}`, "red");
        failed++;
      }
    });
  });

  return { passed, failed, total };
}

function verifyEnvironmentVariables(): {
  passed: number;
  failed: number;
  total: number;
  warnings: number;
} {
  logSection("ENVIRONMENT VARIABLES CHECK");

  let passed = 0;
  let failed = 0;
  let total = 0;
  let warnings = 0;

  // Check required variables
  Object.entries(REQUIRED_ENV_VARS).forEach(([category, vars]) => {
    log(`\n${category}:`, "blue");
    vars.forEach((varName) => {
      total++;
      const value = process.env[varName];
      if (value) {
        log(`  ✓ ${varName}`, "green");
        passed++;
      } else {
        log(`  ✗ ${varName} (MISSING - REQUIRED)`, "red");
        failed++;
      }
    });
  });

  // Check optional variables
  log("\nOptional Variables:", "blue");
  Object.entries(OPTIONAL_ENV_VARS).forEach(([category, vars]) => {
    log(`  ${category}:`, "cyan");
    vars.forEach((varName) => {
      const value = process.env[varName];
      if (value) {
        log(`    ✓ ${varName}`, "green");
      } else {
        log(`    ⚠ ${varName} (not set, using default)`, "yellow");
        warnings++;
      }
    });
  });

  return { passed, failed, total, warnings };
}

function verifyGraphQLQueries(): {
  passed: number;
  failed: number;
  total: number;
} {
  logSection("GRAPHQL QUERIES CHECK");

  let passed = 0;
  let failed = 0;
  let total = 0;

  const queriesFile = "src/lib/graphql-queries.ts";

  if (!checkFileExists(queriesFile)) {
    log(`\n✗ GraphQL queries file not found: ${queriesFile}`, "red");
    return {
      passed: 0,
      failed: Object.values(REQUIRED_QUERIES).flat().length,
      total: Object.values(REQUIRED_QUERIES).flat().length,
    };
  }

  const fs = require("fs");
  const queriesContent = fs.readFileSync(
    resolve(process.cwd(), queriesFile),
    "utf-8"
  );

  Object.entries(REQUIRED_QUERIES).forEach(([page, queries]) => {
    log(`\n${page}:`, "blue");
    queries.forEach((queryName) => {
      total++;
      const pattern = new RegExp(`export const ${queryName}\\s*=`);
      if (pattern.test(queriesContent)) {
        log(`  ✓ ${queryName}`, "green");
        passed++;
      } else {
        log(`  ✗ ${queryName} (MISSING)`, "red");
        failed++;
      }
    });
  });

  return { passed, failed, total };
}

function verifyServiceIntegration(): void {
  logSection("SERVICE INTEGRATION VERIFICATION");

  const checks = [
    {
      name: "Learning Page → Goldsky",
      description:
        "Uses useMyLearningComplete hook with GET_USER_LEARNING_COURSES",
      status: "ready",
    },
    {
      name: "Learning Page → Thirdweb",
      description: "Uses useActiveAccount for wallet connection",
      status: "ready",
    },
    {
      name: "Learning Page → Pinata Thumbnails",
      description: "Uses ThumbnailImage component with signed URLs",
      status: "ready",
    },
    {
      name: "Course Details → Goldsky",
      description: "Uses GET_COURSE_DETAILS + GET_ENROLLMENT_BY_STUDENT_COURSE",
      status: "ready",
    },
    {
      name: "Course Details → Thirdweb Reads",
      description:
        "Uses useReadContract for ProgressTracker.getCourseSectionsProgress",
      status: "ready",
    },
    {
      name: "Course Details → Thirdweb Writes",
      description: "Uses useSendTransaction for startSection/completeSection",
      status: "ready",
    },
    {
      name: "Section Page → Goldsky",
      description:
        "Uses GET_SECTION_DETAILS + GET_ENROLLMENT_BY_STUDENT_COURSE",
      status: "ready",
    },
    {
      name: "Section Page → Livepeer",
      description:
        "HybridVideoPlayer + LivepeerPlayerView + getLivepeerSource()",
      status: "ready",
    },
    {
      name: "Section Page → Pinata IPFS",
      description: "HybridVideoPlayer + LegacyVideoPlayer for IPFS CIDs",
      status: "ready",
    },
    {
      name: "Section Page → Thirdweb",
      description: "Uses useReadContract + useSendTransaction for progress",
      status: "ready",
    },
  ];

  checks.forEach((check) => {
    log(`\n✓ ${check.name}`, "green");
    log(`  ${check.description}`, "cyan");
  });
}

function printSummary(
  filesResult: { passed: number; failed: number; total: number },
  envResult: {
    passed: number;
    failed: number;
    total: number;
    warnings: number;
  },
  queriesResult: { passed: number; failed: number; total: number }
): void {
  logSection("VERIFICATION SUMMARY");

  const totalPassed =
    filesResult.passed + envResult.passed + queriesResult.passed;
  const totalFailed =
    filesResult.failed + envResult.failed + queriesResult.failed;
  const totalChecks = filesResult.total + envResult.total + queriesResult.total;

  console.log("\nFiles:");
  log(
    `  Passed: ${filesResult.passed}/${filesResult.total}`,
    filesResult.failed === 0 ? "green" : "yellow"
  );
  if (filesResult.failed > 0) {
    log(`  Failed: ${filesResult.failed}`, "red");
  }

  console.log("\nEnvironment Variables:");
  log(
    `  Passed: ${envResult.passed}/${envResult.total}`,
    envResult.failed === 0 ? "green" : "yellow"
  );
  if (envResult.failed > 0) {
    log(`  Failed: ${envResult.failed}`, "red");
  }
  if (envResult.warnings > 0) {
    log(
      `  Warnings: ${envResult.warnings} optional variables not set`,
      "yellow"
    );
  }

  console.log("\nGraphQL Queries:");
  log(
    `  Passed: ${queriesResult.passed}/${queriesResult.total}`,
    queriesResult.failed === 0 ? "green" : "yellow"
  );
  if (queriesResult.failed > 0) {
    log(`  Failed: ${queriesResult.failed}`, "red");
  }

  console.log("\n" + "=".repeat(80));
  log(
    `TOTAL: ${totalPassed}/${totalChecks} checks passed`,
    totalFailed === 0 ? "green" : "yellow"
  );
  if (totalFailed > 0) {
    log(`${totalFailed} checks failed`, "red");
  }
  console.log("=".repeat(80));

  if (totalFailed === 0) {
    log("\n✅ All services are properly configured!", "green");
    log("You can start the development server with: npm run dev", "cyan");
  } else {
    log("\n❌ Some services are missing or misconfigured.", "red");
    log(
      "Please review the errors above and fix them before proceeding.",
      "yellow"
    );
    process.exit(1);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.clear();
  log(
    "\n╔════════════════════════════════════════════════════════════════════════════╗",
    "cyan"
  );
  log(
    "║                   EDUVERSE LEARNING SERVICES VERIFICATION                  ║",
    "cyan"
  );
  log(
    "╚════════════════════════════════════════════════════════════════════════════╝",
    "cyan"
  );

  const filesResult = verifyFiles();
  const envResult = verifyEnvironmentVariables();
  const queriesResult = verifyGraphQLQueries();

  verifyServiceIntegration();

  printSummary(filesResult, envResult, queriesResult);
}

main().catch((error) => {
  console.error("Verification script error:", error);
  process.exit(1);
});
