/**
 * ERC-1155 Metadata API Endpoint
 *
 * GET /api/metadata/[tokenId]
 *
 * Returns ERC-1155 compliant metadata JSON for certificate NFTs
 * Called by smart contract's uri() function and NFT marketplaces (OpenSea, Rarible, etc.)
 *
 * Spec: https://eips.ethereum.org/EIPS/eip-1155#metadata
 * OpenSea: https://docs.opensea.io/docs/metadata-standards
 *
 * Expected by CertificateManager.sol:
 * ```solidity
 * function uri(uint256 tokenId) public view override returns (string memory) {
 *     return string(abi.encodePacked(defaultBaseRoute, "/api/metadata/", Strings.toString(tokenId)));
 * }
 * ```
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * TypeScript interfaces for certificate data structure
 */
interface CertificateCourse {
  course: {
    id: string;
  };
  addedAt: string;
  txHash: string;
}

interface Certificate {
  tokenId: string;
  platformName: string;
  recipientName: string;
  recipientAddress: string;
  isValid: boolean;
  ipfsCID: string;
  baseRoute: string;
  createdAt: string;
  lastUpdated: string;
  totalCourses: number;
  completedCourses: CertificateCourse[];
}

/**
 * Goldsky GraphQL query to fetch certificate data from blockchain
 */
async function getCertificateFromGoldsky(tokenId: string) {
  const GOLDSKY_ENDPOINT = process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT;

  if (!GOLDSKY_ENDPOINT) {
    throw new Error("NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT not configured");
  }

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

  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { tokenId },
    }),
    // Cache for 1 minute to reduce load on Goldsky
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Goldsky query failed: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors) {
    console.error("[Metadata API] Goldsky errors:", result.errors);
    throw new Error("Failed to fetch certificate data from blockchain");
  }

  return result.data?.certificate;
}

/**
 * Construct ERC-1155 compliant metadata JSON from certificate data
 */
function constructMetadata(certificate: Certificate) {
  const {
    tokenId,
    platformName,
    recipientName,
    recipientAddress,
    isValid,
    ipfsCID,
    baseRoute,
    createdAt,
    lastUpdated,
    totalCourses,
    completedCourses,
  } = certificate;

  // Construct verification URL for QR code
  const verificationUrl = `${baseRoute}?tokenId=${tokenId}&address=${recipientAddress}`;

  return {
    // Standard ERC-1155 fields
    name: `${platformName} Certificate #${tokenId}`,
    description: `This evolving certificate represents the complete learning journey of ${recipientName} on ${platformName}. It grows automatically with each completed course, creating a permanent record of continuous education. Currently includes ${totalCourses} verified course${
      totalCourses > 1 ? "s" : ""
    }.`,
    image: `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${ipfsCID}`,
    external_url: verificationUrl,
    decimals: 0, // Non-fungible (ERC-1155 with supply=1)

    // Blockchain-compatible attributes matching Certificate struct
    attributes: [
      {
        trait_type: "Token ID",
        display_type: "number",
        value: parseInt(tokenId),
      },
      {
        trait_type: "Platform Name",
        value: platformName,
      },
      {
        trait_type: "Recipient Name",
        value: recipientName,
      },
      {
        trait_type: "Recipient Address",
        value: recipientAddress,
      },
      {
        trait_type: "Lifetime Flag",
        display_type: "boolean",
        value: true,
      },
      {
        trait_type: "Is Valid",
        display_type: "boolean",
        value: isValid,
      },
      {
        trait_type: "Status",
        value: isValid ? "Active" : "Revoked",
      },
      {
        trait_type: "Total Courses Completed",
        display_type: "number",
        value: totalCourses,
      },
      {
        trait_type: "Completed Course IDs",
        value: completedCourses
          .map((c: CertificateCourse) => c.course.id)
          .join(", "),
      },
      {
        trait_type: "Issued At",
        display_type: "date",
        value: parseInt(createdAt),
      },
      {
        trait_type: "Last Updated",
        display_type: "date",
        value: parseInt(lastUpdated),
      },
      {
        trait_type: "Base Route",
        value: baseRoute,
      },
    ],

    // Additional properties for enhanced functionality
    properties: {
      qr_verification_url: verificationUrl,
      base_route: baseRoute,
      certificate_version: "2.0",
      supports_multiple_courses: true,
      is_soulbound: true,
      blockchain_network: "Manta Pacific",
      certificate_type: "Evolving Learning Certificate",
      courses: completedCourses.map((c: CertificateCourse) => ({
        courseId: c.course.id,
        addedAt: c.addedAt,
        transactionHash: c.txHash,
      })),
    },
  };
}

/**
 * GET handler for metadata endpoint
 * Next.js 15: params is now a Promise
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  const params = await context.params;
  const tokenId = params.tokenId;

  console.log(`[Metadata API] Fetching metadata for token #${tokenId}`);

  try {
    // Validate tokenId is a valid number
    if (isNaN(parseInt(tokenId))) {
      return NextResponse.json(
        {
          error: "Invalid token ID",
          message: "Token ID must be a valid number",
        },
        { status: 400 }
      );
    }

    // Fetch certificate data from Goldsky (blockchain indexer)
    const certificate = await getCertificateFromGoldsky(tokenId);

    if (!certificate) {
      console.log(`[Metadata API] Certificate #${tokenId} not found`);
      return NextResponse.json(
        {
          error: "Certificate not found",
          message: `No certificate exists with token ID ${tokenId}`,
        },
        { status: 404 }
      );
    }

    // Check if certificate is revoked
    if (!certificate.isValid) {
      console.log(`[Metadata API] Certificate #${tokenId} is revoked`);
      // Still return metadata but with revoked status in attributes
      // NFT marketplaces can display "Revoked" status
    }

    // Construct ERC-1155 compliant metadata
    const metadata = constructMetadata(certificate);

    console.log(`[Metadata API] Metadata generated for token #${tokenId}`);

    // Return metadata with proper caching headers
    return NextResponse.json(metadata, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300", // Cache 1 min, stale 5 min
      },
    });
  } catch (error) {
    console.error(
      `[Metadata API] Error fetching metadata for token #${tokenId}:`,
      error
    );

    // Return error response
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch certificate metadata",
      },
      { status: 500 }
    );
  }
}

/**
 * HEAD handler (for NFT marketplaces checking if metadata exists)
 * Next.js 15: params is now a Promise
 */
export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
) {
  try {
    const params = await context.params;
    const certificate = await getCertificateFromGoldsky(params.tokenId);

    if (!certificate) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=60",
      },
    });
  } catch (error) {
    // Log error for debugging
    console.error("[Metadata API] HEAD request error:", error);
    return new NextResponse(null, { status: 500 });
  }
}
