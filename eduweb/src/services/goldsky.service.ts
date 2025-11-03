export const GOLDSKY_ENDPOINT =
  process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT || "";

if (!GOLDSKY_ENDPOINT && typeof window !== "undefined") {
  console.error(
    "═══════════════════════════════════════════════════════════════════════════"
  );
  console.error("❌ GOLDSKY ENDPOINT NOT CONFIGURED");
  console.error(
    "═══════════════════════════════════════════════════════════════════════════"
  );
  console.error("Please add to your .env.local file:");
  console.error("");
  console.error("NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=\\");
  console.error(
    "https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/latest/gn"
  );
  console.error("");
  console.error("Then restart your Next.js dev server:");
  console.error("  npm run dev");
  console.error(
    "═══════════════════════════════════════════════════════════════════════════"
  );
}

interface BlockchainCertificate {
  tokenId: string;
  owner: string;
  studentName: string;
  platformName: string;
  totalCourses: string;
  courseTitles: string[];
  completedCourses: string[];
  completionDates: string[];
  certificateHash: string;
  baseRoute: string;
  mintedAt: string;
  lastUpdated: string;
}

interface BlockchainCertificateCourse {
  courseId: string;
  title: string;
  completedAt: string;
  addedToCertificateAt: string;
}

export async function fetchGraphQL(
  query: string,
  variables: Record<string, unknown>,
  operationName: string
) {
  if (!GOLDSKY_ENDPOINT) {
    throw new Error(
      "[Goldsky] GraphQL endpoint not configured. Please set NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT in your environment variables."
    );
  }

  try {
    console.log(`[Goldsky] ${operationName} - Endpoint:`, GOLDSKY_ENDPOINT);

    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "═══════════════════════════════════════════════════════════════════════════"
      );
      console.error(`❌ GOLDSKY HTTP ERROR ${response.status}`);
      console.error(
        "═══════════════════════════════════════════════════════════════════════════"
      );
      console.error(`Operation: ${operationName}`);
      console.error(`Endpoint: ${GOLDSKY_ENDPOINT}`);
      console.error(`Status: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      console.error("");

      if (response.status === 404) {
        console.error("🔍 POSSIBLE CAUSES:");
        console.error("  1. Subgraph version deleted/not deployed");
        console.error("  2. Wrong endpoint URL in .env.local");
        console.error("  3. Network mismatch");
        console.error("");
        console.error("✅ SOLUTION:");
        console.error("  Update .env.local with correct endpoint:");
        console.error("");
        console.error("  NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=\\");
        console.error(
          "  https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/latest/gn"
        );
        console.error("");
        console.error("  Then restart: npm run dev");
        console.error("");
        console.error(
          "  Test endpoint: http://localhost:3000/api/test-goldsky"
        );
      }

      console.error(
        "═══════════════════════════════════════════════════════════════════════════"
      );

      throw new Error(
        `GraphQL request failed with status ${response.status}: ${response.statusText}`
      );
    }

    const responseText = await response.text();

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        `[Goldsky] ${operationName} - JSON Parse Error:`,
        parseError
      );
      console.error(
        `[Goldsky] ${operationName} - Response Text:`,
        responseText.substring(0, 500)
      );
      throw new Error(
        `Failed to parse GraphQL response as JSON. Response: ${responseText.substring(
          0,
          200
        )}`
      );
    }

    if (result.errors) {
      console.error(
        `[Goldsky] ${operationName} - GraphQL Errors:`,
        result.errors
      );
      throw new Error(result.errors[0]?.message || "GraphQL query failed");
    }

    console.log(`[Goldsky] ${operationName} - Success ✅`);
    return result.data;
  } catch (error) {
    console.error(`[Goldsky] ${operationName} - Failed:`, error);
    throw error;
  }
}

export async function getCertificateByTokenId(
  tokenId: string
): Promise<BlockchainCertificate | null> {
  console.log("[Goldsky] Fetching certificate by tokenId:", tokenId);

  const query = `
    query GetCertificate($tokenId: String!) {
      certificate(id: $tokenId) {
        id
        tokenId
        owner
        studentName
        platformName
        totalCourses
        certificateHash
        baseRoute
        createdAt
        updatedAt
        courses {
          courseId
          title
          completedAt
          addedAt
        }
      }
    }
  `;

  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: {
        tokenId,
      },
    }),
  });

  const result = await response.json();

  if (!response.ok || result.errors) {
    console.error("[Goldsky] Certificate query failed:", result.errors);
    return null;
  }

  const certificate = result.data?.certificate;
  if (!certificate) {
    console.log("[Goldsky] Certificate not found for tokenId:", tokenId);
    return null;
  }

  const normalizedExpected = certificate.certificateHash.toLowerCase();
  const normalizedActual = certificate.certificateHash.toLowerCase();

  if (normalizedExpected !== normalizedActual) {
    console.warn("[Goldsky] Certificate hash mismatch:", {
      expected: certificate.certificateHash,
      actual: certificate.certificateHash,
    });
  }

  return {
    tokenId: certificate.tokenId,
    owner: certificate.owner,
    studentName: certificate.studentName,
    platformName: certificate.platformName,
    totalCourses: certificate.totalCourses,
    courseTitles:
      certificate.courses?.map((c: { title: string }) => c.title) || [],
    completedCourses:
      certificate.courses?.map((c: { courseId: string }) => c.courseId) || [],
    completionDates:
      certificate.courses?.map((c: { completedAt: string }) => c.completedAt) ||
      [],
    certificateHash: certificate.certificateHash,
    baseRoute: certificate.baseRoute,
    mintedAt: certificate.createdAt,
    lastUpdated: certificate.updatedAt,
  };
}

export async function getUserCertificate(
  userAddress: string
): Promise<BlockchainCertificate | null> {
  console.log("[Goldsky] Fetching certificate for user:", userAddress);

  const query = `
    query GetUserCertificate($address: String!) {
      certificates(where: { owner: $address }, first: 1) {
        id
        tokenId
        owner
        studentName
        platformName
        totalCourses
        certificateHash
        baseRoute
        createdAt
        updatedAt
        courses {
          courseId
          title
          completedAt
          addedAt
        }
      }
    }
  `;

  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: {
        address: userAddress.toLowerCase(),
      },
    }),
  });

  const result = await response.json();

  if (!response.ok || result.errors) {
    console.error("[Goldsky] User certificate query failed:", result.errors);
    return null;
  }

  const certificates = result.data?.certificates;
  if (!certificates || certificates.length === 0) {
    console.log("[Goldsky] No certificate found for user:", userAddress);
    return null;
  }

  const certificate = certificates[0];
  return {
    tokenId: certificate.tokenId,
    owner: certificate.owner,
    studentName: certificate.studentName,
    platformName: certificate.platformName,
    totalCourses: certificate.totalCourses,
    courseTitles:
      certificate.courses?.map((c: { title: string }) => c.title) || [],
    completedCourses:
      certificate.courses?.map((c: { courseId: string }) => c.courseId) || [],
    completionDates:
      certificate.courses?.map((c: { completedAt: string }) => c.completedAt) ||
      [],
    certificateHash: certificate.certificateHash,
    baseRoute: certificate.baseRoute,
    mintedAt: certificate.createdAt,
    lastUpdated: certificate.updatedAt,
  };
}

export async function getCertificateTimeline(
  tokenId: string
): Promise<BlockchainCertificateCourse[]> {
  const query = `
    query GetCertificateTimeline($tokenId: String!) {
      certificate(id: $tokenId) {
        courses {
          courseId
          title
          completedAt
          addedAt
        }
      }
    }
  `;

  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: {
        tokenId,
      },
    }),
  });

  const result = await response.json();

  if (!response.ok || result.errors) {
    console.error("[Goldsky] Timeline query failed:", result.errors);
    return [];
  }

  const courses = result.data?.certificate?.courses || [];
  return courses.map((course: BlockchainCertificateCourse) => ({
    courseId: course.courseId,
    title: course.title,
    completedAt: course.completedAt,
    addedToCertificateAt: course.addedToCertificateAt,
  }));
}

export async function verifyCertificateAuthenticity(
  tokenId: string,
  expectedHash: string
): Promise<{
  valid: boolean;
  certificate?: BlockchainCertificate;
  error?: string;
}> {
  try {
    const certificate = await getCertificateByTokenId(tokenId);

    if (!certificate) {
      return {
        valid: false,
        certificate: undefined,
        error: "Certificate not found on blockchain",
      };
    }

    const normalizedExpected = expectedHash.toLowerCase();
    const normalizedActual = certificate.certificateHash.toLowerCase();

    if (normalizedExpected !== normalizedActual) {
      return {
        valid: false,
      };
    }

    return {
      valid: true,
      certificate,
    };
  } catch (error) {
    return {
      valid: false,
      certificate: undefined,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

export async function canClaimCertificate(
  userAddress: string,
  courseId?: string
): Promise<{
  canClaim: boolean;
  reason?: string;
  existingTokenId?: string;
}> {
  try {
    const existingCertificate = await getUserCertificate(userAddress);

    if (existingCertificate && courseId) {
      const courseExists =
        existingCertificate.completedCourses.includes(courseId);
      if (courseExists) {
        return {
          canClaim: false,
          reason: "Course already added to certificate",
          existingTokenId: existingCertificate.tokenId,
        };
      }
    }

    if (existingCertificate && !courseId) {
      return {
        canClaim: false,
        reason: "Certificate already minted",
        existingTokenId: existingCertificate.tokenId,
      };
    }

    return {
      canClaim: true,
    };
  } catch (error) {
    console.error("[Goldsky] Error checking claim eligibility:", error);
    return {
      canClaim: false,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getDashboardStats(userAddress: string) {
  const query = `
    query GetDashboardStats($userAddress: String!) {
      userProfile(id: $userAddress) {
        coursesEnrolled
        coursesCreated
        coursesCompleted
        totalRevenueEth
        enrollmentsThisMonth
        completionsThisMonth
        revenueThisMonth
      }
      enrollments: enrollments(where: { student: $userAddress }, first: 1000) {
        id
        courseId
        status
        completionPercentage
        sectionsCompleted
        course {
          title
          thumbnailCID
          sectionsCount
        }
      }
      courses: courses(where: { creator: $userAddress }, first: 1000) {
        id
        title
        thumbnailCID
        totalEnrollments
        activeEnrollments
        totalRevenueEth
        averageRating
        isActive
      }
    }
  `;

  return await fetchGraphQL(query, { userAddress }, "GetDashboardStats");
}

export async function getUserEnrollments(
  userAddress: string,
  first: number = 50
) {
  const query = `
    query GetUserEnrollments($userAddress: String!, $first: Int!) {
      enrollments(where: { student: $userAddress }, first: $first, orderBy: purchasedAt, orderDirection: desc) {
        id
        courseId
        status
        completionPercentage
        sectionsCompleted
        licenseExpiry
        isActive
        course {
          title
          thumbnailCID
          sectionsCount
        }
      }
    }
  `;

  const data = await fetchGraphQL(
    query,
    { userAddress, first },
    "GetUserEnrollments"
  );
  return data.enrollments || [];
}

export async function getUserCreatedCourses(
  userAddress: string,
  first: number = 50
) {
  const query = `
    query GetUserCreatedCourses($userAddress: String!, $first: Int!) {
      courses(where: { creator: $userAddress, isActive: true, isDeleted: false }, first: $first, orderBy: createdAt, orderDirection: desc) {
        id
        title
        thumbnailCID
        totalEnrollments
        activeEnrollments
        totalRevenueEth
        averageRating
        isActive
        isDeleted
        createdAt
      }
    }
  `;

  const data = await fetchGraphQL(
    query,
    { userAddress, first },
    "GetUserCreatedCourses"
  );
  return data.courses || [];
}

export async function getUserActivities(
  userAddress: string,
  first: number = 20
) {
  const query = `
    query GetUserActivities($userAddress: String!, $first: Int!) {
      enrollments: enrollments(
        where: { student: $userAddress }
        first: $first
        orderBy: purchasedAt
        orderDirection: desc
      ) {
        id
        courseId
        purchasedAt
        status
        mintTxHash
        course {
          title
        }
      }
      certificates: certificates(
        where: { owner: $userAddress }
        first: $first
        orderBy: createdAt
        orderDirection: desc
      ) {
        id
        tokenId
        totalCourses
        createdAt
        mintTxHash
      }
      activityEvents: activityEvents(
        where: { user: $userAddress }
        first: $first
        orderBy: timestamp
        orderDirection: desc
      ) {
        id
        type
        timestamp
        description
        transactionHash
        course {
          title
        }
      }
    }
  `;

  return await fetchGraphQL(query, { userAddress, first }, "GetUserActivities");
}
