/**
 * Goldsky GraphQL Client for Certificate Queries
 * Implements business logic for certificate verification and display
 */

// Type definitions matching Goldsky schema
export interface BlockchainCertificate {
  tokenId: string;
  platformName: string;
  recipientName: string;
  recipientAddress: string;
  lifetimeFlag: boolean;
  isValid: boolean;
  ipfsCID: string;
  baseRoute: string;
  issuedAt: string; // Unix timestamp as string
  lastUpdated: string; // Unix timestamp as string
  totalCoursesCompleted: number;
  courses: BlockchainCertificateCourse[];
}

export interface BlockchainCertificateCourse {
  courseId: string;
  addedAt: string; // Unix timestamp as string
  ipfsCID: string;
  transactionHash: string;
}

// Goldsky endpoint configuration
const GOLDSKY_ENDPOINT = process.env.NEXT_PUBLIC_GOLDSKY_ENDPOINT || '';

/**
 * Query certificate by tokenId (for QR code verification)
 * Business Logic: Validates certificate exists and belongs to claimed address
 *
 * @param tokenId - ERC-1155 token ID from smart contract
 * @param expectedAddress - Address from QR code URL parameter
 * @returns Certificate data or null if not found/invalid
 */
export async function getCertificateByTokenId(
  tokenId: number,
  expectedAddress?: string
): Promise<BlockchainCertificate | null> {
  const query = `
    query GetCertificateByToken($tokenId: BigInt!) {
      certificate(id: $tokenId) {
        tokenId
        platformName
        recipientName
        recipientAddress
        lifetimeFlag
        isValid
        ipfsCID
        baseRoute
        issuedAt
        lastUpdated
        totalCoursesCompleted
        courses(orderBy: addedAt, orderDirection: asc) {
          courseId
          addedAt
          ipfsCID
          transactionHash
        }
      }
    }
  `;

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { tokenId: tokenId.toString() },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error('[Goldsky] Query errors:', result.errors);
      return null;
    }

    const certificate = result.data?.certificate;

    if (!certificate) {
      console.warn('[Goldsky] Certificate not found:', tokenId);
      return null;
    }

    // Business Logic Validation: Verify address if provided
    if (expectedAddress) {
      const normalizedExpected = expectedAddress.toLowerCase();
      const normalizedActual = certificate.recipientAddress.toLowerCase();

      if (normalizedExpected !== normalizedActual) {
        console.error('[Goldsky] Address mismatch:', {
          expected: normalizedExpected,
          actual: normalizedActual,
        });
        throw new Error('Certificate belongs to a different address');
      }
    }

    // Business Logic Validation: Check if certificate is revoked
    if (!certificate.isValid) {
      console.warn('[Goldsky] Certificate revoked:', tokenId);
      throw new Error('This certificate has been revoked');
    }

    return certificate;
  } catch (error) {
    console.error('[Goldsky] Failed to fetch certificate:', error);
    throw error;
  }
}

/**
 * Query user's certificate by wallet address
 * Business Logic: Each user has ONE certificate that grows with courses
 *
 * @param address - User's wallet address (connected wallet)
 * @returns User's certificate or null if none exists
 */
export async function getUserCertificate(
  address: string
): Promise<BlockchainCertificate | null> {
  const query = `
    query GetUserCertificate($address: Bytes!) {
      certificates(where: { recipientAddress: $address }) {
        tokenId
        platformName
        recipientName
        recipientAddress
        lifetimeFlag
        isValid
        ipfsCID
        baseRoute
        issuedAt
        lastUpdated
        totalCoursesCompleted
        courses(orderBy: addedAt, orderDirection: desc) {
          courseId
          addedAt
          ipfsCID
          transactionHash
        }
      }
    }
  `;

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { address: address.toLowerCase() },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error('[Goldsky] Query errors:', result.errors);
      return null;
    }

    const certificates = result.data?.certificates || [];

    // Business Logic: User should have 0 or 1 certificate
    if (certificates.length === 0) {
      console.log('[Goldsky] No certificate found for address:', address);
      return null;
    }

    if (certificates.length > 1) {
      console.error('[Goldsky] Multiple certificates found (data inconsistency):', address);
      // Return the most recent one
      return certificates[0];
    }

    return certificates[0];
  } catch (error) {
    console.error('[Goldsky] Failed to fetch user certificate:', error);
    throw error;
  }
}

/**
 * Get certificate timeline (all course additions with timestamps)
 * Useful for displaying learning journey progression
 *
 * @param tokenId - Certificate token ID
 * @returns Array of course additions in chronological order
 */
export async function getCertificateTimeline(tokenId: number) {
  const query = `
    query GetCertificateTimeline($tokenId: BigInt!) {
      certificate(id: $tokenId) {
        tokenId
        recipientName
        courses(orderBy: addedAt, orderDirection: asc) {
          courseId
          addedAt
          ipfsCID
          transactionHash
        }
      }
      courseAddedToCertificateEvents(
        where: { tokenId: $tokenId }
        orderBy: blockTimestamp
        orderDirection: asc
      ) {
        courseId
        blockTimestamp
        newIpfsCID
        paymentReceiptHash
        transactionHash
      }
    }
  `;

  try {
    const response = await fetch(GOLDSKY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { tokenId: tokenId.toString() },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error('[Goldsky] Query errors:', result.errors);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('[Goldsky] Failed to fetch certificate timeline:', error);
    throw error;
  }
}

/**
 * Verify certificate authenticity and eligibility
 * Business Logic: Certificate must exist, be valid, and match claimed owner
 *
 * @param tokenId - Certificate token ID from QR code
 * @param claimedAddress - Address from QR code URL
 * @returns Verification result with certificate data
 */
export async function verifyCertificateAuthenticity(
  tokenId: number,
  claimedAddress: string
): Promise<{
  valid: boolean;
  certificate: BlockchainCertificate | null;
  error?: string;
}> {
  try {
    const certificate = await getCertificateByTokenId(tokenId, claimedAddress);

    if (!certificate) {
      return {
        valid: false,
        certificate: null,
        error: 'Certificate not found on blockchain',
      };
    }

    // All validations passed in getCertificateByTokenId
    return {
      valid: true,
      certificate,
    };
  } catch (error) {
    return {
      valid: false,
      certificate: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if user can claim certificate for a course
 * Business Logic: Course must be completed, license must have been owned
 *
 * NOTE: This is a frontend check - actual eligibility is enforced by smart contract
 * The smart contract will check:
 * 1. progressTracker.isCourseCompleted(user, courseId) == true
 * 2. courseLicense.getLicense(user, courseId).courseId != 0
 * 3. License expiration doesn't matter (course was completed during valid period)
 *
 * @param userAddress - User's wallet address
 * @param courseId - Course ID to check
 * @returns Whether user can attempt to claim certificate
 */
export async function canClaimCertificate(
  userAddress: string,
  courseId: number
): Promise<{
  canClaim: boolean;
  reason?: string;
  existingTokenId?: number;
}> {
  // Check if user already has a certificate
  const existingCertificate = await getUserCertificate(userAddress);

  if (existingCertificate) {
    // Check if this course is already in the certificate
    const courseExists = existingCertificate.courses.some(
      (c) => parseInt(c.courseId) === courseId
    );

    if (courseExists) {
      return {
        canClaim: false,
        reason: 'Course already added to your certificate',
        existingTokenId: parseInt(existingCertificate.tokenId),
      };
    }

    // User has certificate, but this course not added yet
    return {
      canClaim: true,
      reason: 'Will add course to existing certificate (2% fee)',
      existingTokenId: parseInt(existingCertificate.tokenId),
    };
  }

  // User has no certificate yet
  return {
    canClaim: true,
    reason: 'Will create new certificate (10% fee)',
  };
}
