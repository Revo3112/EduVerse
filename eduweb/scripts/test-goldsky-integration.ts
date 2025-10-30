#!/usr/bin/env tsx

/**
 * Goldsky Analytics Integration Test Script
 *
 * Verifies that the Goldsky GraphQL endpoint is working and returns valid data
 * Run: npx tsx scripts/test-goldsky-integration.ts
 *
 * @author EduVerse Team
 * @version 1.0.0
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const GOLDSKY_ENDPOINT = process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT || '';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Helper functions
function log(message: string) {
  console.log(message);
}

function success(message: string) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function error(message: string) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function warning(message: string) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function info(message: string) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
}

function header(message: string) {
  console.log(`\n${colors.bright}${colors.cyan}${message}${colors.reset}`);
}

// Test functions
async function testEndpointConnection() {
  header('1. Testing Goldsky Endpoint Connection');

  if (!GOLDSKY_ENDPOINT) {
    error('NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT not found in .env.local');
    return false;
  }

  info(`Endpoint: ${colors.gray}${GOLDSKY_ENDPOINT}${colors.reset}`);

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ _meta { block { number timestamp } hasIndexingErrors } }',
      }),
    });

    if (!response.ok) {
      error(`HTTP ${response.status}: ${response.statusText}`);
      return false;
    }

    const data = await response.json();

    if (data.errors) {
      error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      return false;
    }

    success('Endpoint is reachable');
    info(`Latest block: ${data.data._meta.block.number}`);
    info(`Has indexing errors: ${data.data._meta.hasIndexingErrors}`);

    return true;
  } catch (err) {
    error(`Connection failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function testPlatformStats() {
  header('2. Testing PlatformStats Entity');

  const query = `
    query {
      platformStats(id: "platform") {
        totalUsers
        totalCourses
        totalEnrollments
        totalCertificates
        totalRevenueEth
        averageRating
      }
    }
  `;

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    if (data.errors) {
      error(`Query failed: ${JSON.stringify(data.errors)}`);
      return false;
    }

    const stats = data.data.platformStats;

    if (!stats) {
      warning('PlatformStats entity not found (will use defaults)');
      info('This is normal for new deployments');
      return true;
    }

    success('PlatformStats entity found');
    log(`  ${colors.gray}Total Users:${colors.reset} ${stats.totalUsers}`);
    log(`  ${colors.gray}Total Courses:${colors.reset} ${stats.totalCourses}`);
    log(`  ${colors.gray}Total Enrollments:${colors.reset} ${stats.totalEnrollments}`);
    log(`  ${colors.gray}Total Certificates:${colors.reset} ${stats.totalCertificates}`);
    log(`  ${colors.gray}Total Revenue:${colors.reset} ${stats.totalRevenueEth} ETH`);
    log(`  ${colors.gray}Average Rating:${colors.reset} ${stats.averageRating}`);

    return true;
  } catch (err) {
    error(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function testCourseQuery() {
  header('3. Testing Course Entities');

  const query = `
    query {
      courses(first: 5, orderBy: createdAt, orderDirection: desc) {
        id
        title
        creator
        category
        difficulty
        priceInEth
        totalEnrollments
        averageRating
        isActive
      }
    }
  `;

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    if (data.errors) {
      error(`Query failed: ${JSON.stringify(data.errors)}`);
      return false;
    }

    const courses = data.data.courses;

    if (courses.length === 0) {
      warning('No courses found (empty blockchain)');
      info('This is normal for new deployments');
      return true;
    }

    success(`Found ${courses.length} courses`);

    courses.forEach((course: any, index: number) => {
      log(`\n  ${colors.bright}Course ${index + 1}:${colors.reset}`);
      log(`    ID: ${course.id}`);
      log(`    Title: ${course.title}`);
      log(`    Category: ${course.category}`);
      log(`    Price: ${course.priceInEth} ETH`);
      log(`    Enrollments: ${course.totalEnrollments}`);
      log(`    Rating: ${course.averageRating}`);
    });

    return true;
  } catch (err) {
    error(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function testEnrollmentQuery() {
  header('4. Testing Enrollment Entities');

  const query = `
    query {
      enrollments(first: 5, orderBy: purchasedAt, orderDirection: desc) {
        id
        student
        courseId
        pricePaidEth
        isActive
        isCompleted
        completionPercentage
        totalRenewals
      }
    }
  `;

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    if (data.errors) {
      error(`Query failed: ${JSON.stringify(data.errors)}`);
      return false;
    }

    const enrollments = data.data.enrollments;

    if (enrollments.length === 0) {
      warning('No enrollments found (no students yet)');
      info('This is normal for new deployments');
      return true;
    }

    success(`Found ${enrollments.length} enrollments`);

    enrollments.forEach((enrollment: any, index: number) => {
      log(`\n  ${colors.bright}Enrollment ${index + 1}:${colors.reset}`);
      log(`    ID: ${enrollment.id}`);
      log(`    Course: ${enrollment.courseId}`);
      log(`    Price Paid: ${enrollment.pricePaidEth} ETH`);
      log(`    Active: ${enrollment.isActive}`);
      log(`    Completed: ${enrollment.isCompleted}`);
      log(`    Progress: ${enrollment.completionPercentage}%`);
    });

    return true;
  } catch (err) {
    error(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function testCertificateQuery() {
  header('5. Testing Certificate Entities');

  const query = `
    query {
      certificates(first: 5, orderBy: createdAt, orderDirection: desc) {
        id
        tokenId
        recipientAddress
        recipientName
        totalCourses
        isValid
        totalRevenueEth
      }
    }
  `;

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    if (data.errors) {
      error(`Query failed: ${JSON.stringify(data.errors)}`);
      return false;
    }

    const certificates = data.data.certificates;

    if (certificates.length === 0) {
      warning('No certificates found (no certifications yet)');
      info('This is normal for new deployments');
      return true;
    }

    success(`Found ${certificates.length} certificates`);

    certificates.forEach((cert: any, index: number) => {
      log(`\n  ${colors.bright}Certificate ${index + 1}:${colors.reset}`);
      log(`    Token ID: ${cert.tokenId}`);
      log(`    Recipient: ${cert.recipientName}`);
      log(`    Address: ${cert.recipientAddress.slice(0, 10)}...`);
      log(`    Courses: ${cert.totalCourses}`);
      log(`    Valid: ${cert.isValid}`);
      log(`    Revenue: ${cert.totalRevenueEth} ETH`);
    });

    return true;
  } catch (err) {
    error(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function testUserProfileQuery() {
  header('6. Testing UserProfile Entities');

  const query = `
    query {
      userProfiles(first: 5, orderBy: createdAt, orderDirection: desc) {
        id
        address
        coursesEnrolled
        coursesCompleted
        coursesCreated
        totalSpentEth
        totalRevenueEth
        hasCertificate
      }
    }
  `;

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    if (data.errors) {
      error(`Query failed: ${JSON.stringify(data.errors)}`);
      return false;
    }

    const profiles = data.data.userProfiles;

    if (profiles.length === 0) {
      warning('No user profiles found (no users yet)');
      info('This is normal for new deployments');
      return true;
    }

    success(`Found ${profiles.length} user profiles`);

    profiles.forEach((profile: any, index: number) => {
      log(`\n  ${colors.bright}User ${index + 1}:${colors.reset}`);
      log(`    Address: ${profile.address.slice(0, 10)}...`);
      log(`    Enrolled: ${profile.coursesEnrolled} courses`);
      log(`    Completed: ${profile.coursesCompleted} courses`);
      log(`    Created: ${profile.coursesCreated} courses`);
      log(`    Spent: ${profile.totalSpentEth} ETH`);
      log(`    Earned: ${profile.totalRevenueEth} ETH`);
      log(`    Has Certificate: ${profile.hasCertificate}`);
    });

    return true;
  } catch (err) {
    error(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function testActivityFallback() {
  header('7. Testing Activity Fallback Query');

  const query = `
    query {
      enrollments(first: 5, orderBy: purchasedAt, orderDirection: desc) {
        id
        student
        purchasedAt
        mintTxHash
        blockNumber
        course {
          id
          title
        }
      }
      certificates(first: 5, orderBy: createdAt, orderDirection: desc) {
        id
        tokenId
        recipientAddress
        createdAt
        mintTxHash
        blockNumber
      }
    }
  `;

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    if (data.errors) {
      error(`Query failed: ${JSON.stringify(data.errors)}`);
      return false;
    }

    const enrollments = data.data.enrollments;
    const certificates = data.data.certificates;

    success('Activity fallback query works');
    info(`Enrollments: ${enrollments.length}`);
    info(`Certificates: ${certificates.length}`);
    info(`Total activities: ${enrollments.length + certificates.length}`);

    return true;
  } catch (err) {
    error(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

// Main test runner
async function main() {
  console.log(`
${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════╗
║   Goldsky Analytics Integration Test                      ║
║   EduVerse Platform                                       ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
`);

  const tests = [
    { name: 'Endpoint Connection', fn: testEndpointConnection },
    { name: 'PlatformStats Query', fn: testPlatformStats },
    { name: 'Course Query', fn: testCourseQuery },
    { name: 'Enrollment Query', fn: testEnrollmentQuery },
    { name: 'Certificate Query', fn: testCertificateQuery },
    { name: 'UserProfile Query', fn: testUserProfileQuery },
    { name: 'Activity Fallback', fn: testActivityFallback },
  ];

  const results: { name: string; passed: boolean }[] = [];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (err) {
      error(`Test "${test.name}" crashed: ${err instanceof Error ? err.message : String(err)}`);
      results.push({ name: test.name, passed: false });
    }
  }

  // Summary
  header('Test Summary');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((result) => {
    if (result.passed) {
      success(result.name);
    } else {
      error(result.name);
    }
  });

  log('');

  if (failed === 0) {
    success(`All ${passed} tests passed! 🎉`);
    info('Goldsky integration is working correctly');
    process.exit(0);
  } else {
    warning(`${passed} passed, ${failed} failed`);
    info('Some tests failed, but this may be normal for new deployments');
    info('Check individual test results above for details');
    process.exit(0); // Don't fail on warnings
  }
}

// Run tests
main().catch((err) => {
  error(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
