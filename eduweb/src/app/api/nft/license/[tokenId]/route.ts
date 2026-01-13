/**
 * License NFT Metadata API Endpoint
 *
 * GET /api/nft/license/[tokenId]
 *
 * Returns ERC-1155 compliant metadata JSON for course license NFTs
 * Called by smart contract's uri() function and NFT marketplaces
 *
 * Spec: https://eips.ethereum.org/EIPS/eip-1155#metadata
 *
 * Optimizations:
 * - In-memory cache for error responses (prevents repeated failed RPC calls)
 * - Success response caching via HTTP headers
 * - Graceful error handling for RPC failures
 */

import { NextRequest, NextResponse } from "next/server";
import { getContract, readContract } from "thirdweb";
import { mantaPacificTestnet } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";

// =============================================================================
// CONFIGURATION
// =============================================================================

const COURSE_LICENSE_ADDRESS = process.env.NEXT_PUBLIC_COURSE_LICENSE_ADDRESS!;
const COURSE_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_COURSE_FACTORY_ADDRESS!;

const client = createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

// Cache configuration
const CACHE_TTL_SUCCESS = 60; // 1 minute for success responses
const CACHE_TTL_NOT_FOUND = 300; // 5 minutes for not found responses
const CACHE_TTL_ERROR = 120; // 2 minutes for RPC error responses

// =============================================================================
// IN-MEMORY CACHE (prevents repeated failed RPC calls)
// =============================================================================

interface CacheEntry {
    data: unknown;
    status: number;
    expiry: number;
}

const responseCache = new Map<string, CacheEntry>();

function getCacheKey(tokenId: string): string {
    return `license:${tokenId}`;
}

function getCachedResponse(tokenId: string): CacheEntry | null {
    const key = getCacheKey(tokenId);
    const entry = responseCache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiry) {
        responseCache.delete(key);
        return null;
    }

    return entry;
}

function setCachedResponse(
    tokenId: string,
    data: unknown,
    status: number,
    ttlSeconds: number
): void {
    const key = getCacheKey(tokenId);
    responseCache.set(key, {
        data,
        status,
        expiry: Date.now() + ttlSeconds * 1000,
    });

    // Cleanup old entries periodically (keep cache size manageable)
    if (responseCache.size > 1000) {
        const now = Date.now();
        for (const [k, v] of responseCache.entries()) {
            if (now > v.expiry) {
                responseCache.delete(k);
            }
        }
    }
}

// =============================================================================
// TYPES
// =============================================================================

interface LicenseData {
    courseId: bigint;
    student: string;
    durationLicense: bigint;
    expiryTimestamp: bigint;
    isActive: boolean;
}

interface CourseData {
    id: bigint;
    title: string;
    description: string;
    creator: string;
    pricePerMonth: bigint;
    isActive: boolean;
    isDeleted: boolean;
    totalSections: bigint;
    createdAt: bigint;
    totalStudents: bigint;
    averageRating: bigint;
    totalRatings: bigint;
    thumbnailCID: string;
}

// =============================================================================
// METADATA CONSTRUCTION
// =============================================================================

function constructMetadata(
    tokenId: string,
    license: LicenseData,
    course: CourseData
) {
    const isExpired =
        license.expiryTimestamp > 0 &&
        BigInt(Math.floor(Date.now() / 1000)) > license.expiryTimestamp;

    const status = isExpired
        ? "Expired"
        : license.isActive
            ? "Active"
            : "Inactive";

    const purchaseTimestamp =
        license.expiryTimestamp -
        license.durationLicense * BigInt(30 * 24 * 60 * 60);
    const purchaseDate = new Date(Number(purchaseTimestamp) * 1000).toISOString();

    const expiryDate =
        license.expiryTimestamp > 0
            ? new Date(Number(license.expiryTimestamp) * 1000).toISOString()
            : null;

    const imageUrl = `https://edu-verse-blond.vercel.app/api/nft/license/${tokenId}/image`;

    const thumbnailUrl = course.thumbnailCID
        ? `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${course.thumbnailCID}`
        : imageUrl;

    return {
        // Standard ERC-1155 fields
        name: `${course.title} - Course License`,
        description: `This NFT grants access to the course "${course.title}" on EduVerse Platform. License is ${status.toLowerCase()} and ${license.isActive ? "allows full course access" : "needs renewal"}.`,
        image: imageUrl,
        external_url: `https://edu-verse-blond.vercel.app/learning?courseId=${course.id.toString()}`,
        decimals: 0,

        // Blockchain-compatible attributes
        attributes: [
            {
                trait_type: "Token ID",
                display_type: "number",
                value: parseInt(tokenId),
            },
            {
                trait_type: "Course ID",
                display_type: "number",
                value: Number(course.id),
            },
            {
                trait_type: "Course Title",
                value: course.title,
            },
            {
                trait_type: "Status",
                value: status,
            },
            {
                trait_type: "Is Active",
                display_type: "boolean",
                value: license.isActive && !isExpired,
            },
            {
                trait_type: "Duration (Months)",
                display_type: "number",
                value: Number(license.durationLicense),
            },
            {
                trait_type: "Total Sections",
                display_type: "number",
                value: Number(course.totalSections),
            },
            ...(expiryDate
                ? [
                    {
                        trait_type: "Expiry Date",
                        display_type: "date",
                        value: Math.floor(Number(license.expiryTimestamp)),
                    },
                ]
                : []),
        ],

        // Additional properties
        properties: {
            course_id: course.id.toString(),
            course_title: course.title,
            course_creator: course.creator,
            license_status: status,
            is_soulbound: true,
            blockchain_network: "Manta Pacific Testnet",
            platform: "EduVerse",
            thumbnail: thumbnailUrl,
            purchase_date: purchaseDate,
            expiry_date: expiryDate,
        },
    };
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

function createSuccessResponse(data: unknown): NextResponse {
    return NextResponse.json(data, {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, s-maxage=${CACHE_TTL_SUCCESS}, stale-while-revalidate=300`,
        },
    });
}

function createNotFoundResponse(tokenId: string): NextResponse {
    return NextResponse.json(
        {
            error: "License not found",
            message: `No license exists with token ID ${tokenId}`,
        },
        {
            status: 404,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": `public, s-maxage=${CACHE_TTL_NOT_FOUND}`,
            },
        }
    );
}

function createErrorResponse(message: string): NextResponse {
    return NextResponse.json(
        {
            error: "Service temporarily unavailable",
            message: message,
        },
        {
            status: 503,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": `public, s-maxage=${CACHE_TTL_ERROR}`,
                "Retry-After": String(CACHE_TTL_ERROR),
            },
        }
    );
}

function createBadRequestResponse(message: string): NextResponse {
    return NextResponse.json(
        { error: "Bad request", message },
        {
            status: 400,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": `public, s-maxage=${CACHE_TTL_NOT_FOUND}`,
            },
        }
    );
}

// =============================================================================
// CONTRACT HELPERS
// =============================================================================

function getContracts() {
    const courseLicenseContract = getContract({
        client,
        chain: mantaPacificTestnet,
        address: COURSE_LICENSE_ADDRESS,
    });

    const courseFactoryContract = getContract({
        client,
        chain: mantaPacificTestnet,
        address: COURSE_FACTORY_ADDRESS,
    });

    return { courseLicenseContract, courseFactoryContract };
}

async function fetchTokenData(tokenId: string): Promise<{
    success: boolean;
    courseId?: bigint;
    studentAddress?: string;
    error?: string;
}> {
    const { courseLicenseContract } = getContracts();

    try {
        const [courseId, studentAddress] = await Promise.all([
            readContract({
                contract: courseLicenseContract,
                method: "function tokenIdToCourseId(uint256) view returns (uint256)",
                params: [BigInt(tokenId)],
            }),
            readContract({
                contract: courseLicenseContract,
                method: "function tokenIdToStudent(uint256) view returns (address)",
                params: [BigInt(tokenId)],
            }),
        ]);

        return { success: true, courseId, studentAddress: studentAddress as string };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "RPC call failed";
        console.error(`[License API] RPC error for token #${tokenId}:`, errorMessage);
        return { success: false, error: errorMessage };
    }
}

async function fetchLicenseAndCourse(
    studentAddress: string,
    courseId: bigint
): Promise<{
    success: boolean;
    license?: LicenseData;
    course?: CourseData;
    error?: string;
}> {
    const { courseLicenseContract, courseFactoryContract } = getContracts();

    try {
        const [licenseData, courseData] = await Promise.all([
            readContract({
                contract: courseLicenseContract,
                method:
                    "function getLicense(address student, uint256 courseId) view returns ((uint256 courseId, address student, uint256 durationLicense, uint256 expiryTimestamp, bool isActive))",
                params: [studentAddress, courseId],
            }),
            readContract({
                contract: courseFactoryContract,
                method:
                    "function getCourse(uint256 courseId) view returns ((uint256 id, string title, string description, address creator, uint256 pricePerMonth, bool isActive, bool isDeleted, uint256 totalSections, uint256 createdAt, uint256 totalStudents, uint256 averageRating, uint256 totalRatings, string thumbnailCID))",
                params: [courseId],
            }),
        ]);

        return {
            success: true,
            license: licenseData as unknown as LicenseData,
            course: courseData as unknown as CourseData,
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "RPC call failed";
        return { success: false, error: errorMessage };
    }
}

// =============================================================================
// MAIN HANDLERS
// =============================================================================

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ tokenId: string }> }
) {
    const params = await context.params;
    const tokenId = params.tokenId.replace(/\.json$/i, "");

    // Validate tokenId format
    const tokenIdNum = parseInt(tokenId);
    if (isNaN(tokenIdNum) || tokenIdNum < 0) {
        return createBadRequestResponse("Token ID must be a valid positive number");
    }

    // Check cache first
    const cached = getCachedResponse(tokenId);
    if (cached) {
        console.log(`[License API] Cache hit for token #${tokenId}`);
        return NextResponse.json(cached.data, {
            status: cached.status,
            headers: {
                "Content-Type": "application/json",
                "X-Cache": "HIT",
                "Cache-Control":
                    cached.status === 200
                        ? `public, s-maxage=${CACHE_TTL_SUCCESS}`
                        : `public, s-maxage=${CACHE_TTL_ERROR}`,
            },
        });
    }

    console.log(`[License API] Fetching metadata for token #${tokenId}`);

    // Step 1: Get token data (courseId and student)
    const tokenData = await fetchTokenData(tokenId);

    if (!tokenData.success) {
        // RPC error - cache and return 503
        const response = {
            error: "Service temporarily unavailable",
            message: "Unable to fetch token data. Please try again later.",
        };
        setCachedResponse(tokenId, response, 503, CACHE_TTL_ERROR);
        return createErrorResponse(tokenData.error || "RPC call failed");
    }

    // Step 2: Check if token exists
    if (!tokenData.courseId || tokenData.courseId === BigInt(0)) {
        const response = {
            error: "License not found",
            message: `No license exists with token ID ${tokenId}`,
        };
        setCachedResponse(tokenId, response, 404, CACHE_TTL_NOT_FOUND);
        return createNotFoundResponse(tokenId);
    }

    // Step 3: Fetch license and course details
    const details = await fetchLicenseAndCourse(
        tokenData.studentAddress!,
        tokenData.courseId
    );

    if (!details.success) {
        const response = {
            error: "Service temporarily unavailable",
            message: "Unable to fetch license details. Please try again later.",
        };
        setCachedResponse(tokenId, response, 503, CACHE_TTL_ERROR);
        return createErrorResponse(details.error || "RPC call failed");
    }

    // Step 4: Construct and return metadata
    const metadata = constructMetadata(tokenId, details.license!, details.course!);

    // Cache success response (short TTL since data can change)
    setCachedResponse(tokenId, metadata, 200, CACHE_TTL_SUCCESS);

    console.log(`[License API] Metadata generated for token #${tokenId}`);
    return createSuccessResponse(metadata);
}

export async function HEAD(
    request: NextRequest,
    context: { params: Promise<{ tokenId: string }> }
) {
    const params = await context.params;
    const tokenId = params.tokenId.replace(/\.json$/i, "");

    // Validate tokenId format
    const tokenIdNum = parseInt(tokenId);
    if (isNaN(tokenIdNum) || tokenIdNum < 0) {
        return new NextResponse(null, { status: 400 });
    }

    // Check cache first
    const cached = getCachedResponse(tokenId);
    if (cached) {
        return new NextResponse(null, {
            status: cached.status === 200 ? 200 : cached.status === 404 ? 404 : 503,
            headers: {
                "Content-Type": "application/json",
                "X-Cache": "HIT",
            },
        });
    }

    // Fetch token data
    const tokenData = await fetchTokenData(tokenId);

    if (!tokenData.success) {
        return new NextResponse(null, {
            status: 503,
            headers: { "Retry-After": String(CACHE_TTL_ERROR) },
        });
    }

    if (!tokenData.courseId || tokenData.courseId === BigInt(0)) {
        return new NextResponse(null, {
            status: 404,
            headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL_NOT_FOUND}` },
        });
    }

    return new NextResponse(null, {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, s-maxage=${CACHE_TTL_SUCCESS}`,
        },
    });
}
