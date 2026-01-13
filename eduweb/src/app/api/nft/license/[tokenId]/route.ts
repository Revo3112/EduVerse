/**
 * License NFT Metadata API Endpoint
 *
 * GET /api/nft/license/[tokenId]
 *
 * Returns ERC-1155 compliant metadata JSON for course license NFTs
 * Called by smart contract's uri() function and NFT marketplaces
 *
 * Spec: https://eips.ethereum.org/EIPS/eip-1155#metadata
 */

import { NextRequest, NextResponse } from "next/server";
import { getContract, readContract } from "thirdweb";
import { mantaPacificTestnet } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";

const COURSE_LICENSE_ADDRESS = process.env.NEXT_PUBLIC_COURSE_LICENSE_ADDRESS!;
const COURSE_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_COURSE_FACTORY_ADDRESS!;

const client = createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

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

/**
 * Construct ERC-1155 compliant metadata JSON
 */
function constructMetadata(
    tokenId: string,
    license: LicenseData,
    course: CourseData
) {
    const isExpired =
        license.expiryTimestamp > 0 &&
        BigInt(Math.floor(Date.now() / 1000)) > license.expiryTimestamp;
    const status = isExpired ? "Expired" : license.isActive ? "Active" : "Inactive";

    const purchaseDate = new Date(
        Number(license.expiryTimestamp - license.durationLicense * BigInt(30 * 24 * 60 * 60)) * 1000
    ).toISOString();

    const expiryDate =
        license.expiryTimestamp > 0
            ? new Date(Number(license.expiryTimestamp) * 1000).toISOString()
            : null;

    // Build image URL - use the existing image endpoint
    const imageUrl = `https://edu-verse-blond.vercel.app/api/nft/license/${tokenId}/image`;

    // Build thumbnail from Pinata if available
    const thumbnailUrl = course.thumbnailCID
        ? `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${course.thumbnailCID}`
        : imageUrl;

    return {
        // Standard ERC-1155 fields
        name: `${course.title} - Course License`,
        description: `This NFT grants access to the course "${course.title}" on EduVerse Platform. License is ${status.toLowerCase()} and ${license.isActive ? "allows full course access" : "needs renewal"
            }.`,
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

/**
 * GET handler for license metadata endpoint
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ tokenId: string }> }
) {
    const params = await context.params;
    // Strip .json suffix if present (some wallets/explorers append it per ERC-1155 convention)
    const tokenId = params.tokenId.replace(/\.json$/i, '');

    console.log(`[License Metadata API] Fetching metadata for token #${tokenId}`);

    try {
        // Validate tokenId
        if (isNaN(parseInt(tokenId))) {
            return NextResponse.json(
                { error: "Invalid token ID", message: "Token ID must be a valid number" },
                { status: 400 }
            );
        }

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

        // Get courseId and student from tokenId mappings
        const courseId = await readContract({
            contract: courseLicenseContract,
            method: "function tokenIdToCourseId(uint256) view returns (uint256)",
            params: [BigInt(tokenId)],
        });

        const studentAddress = await readContract({
            contract: courseLicenseContract,
            method: "function tokenIdToStudent(uint256) view returns (address)",
            params: [BigInt(tokenId)],
        });

        if (!courseId || courseId === BigInt(0)) {
            return NextResponse.json(
                { error: "License not found", message: `No license exists with token ID ${tokenId}` },
                { status: 404 }
            );
        }

        // Get license details
        const licenseData = (await readContract({
            contract: courseLicenseContract,
            method:
                "function getLicense(address student, uint256 courseId) view returns ((uint256 courseId, address student, uint256 durationLicense, uint256 expiryTimestamp, bool isActive))",
            params: [studentAddress as string, courseId],
        })) as unknown as LicenseData;

        // Get course details
        const courseData = (await readContract({
            contract: courseFactoryContract,
            method:
                "function getCourse(uint256 courseId) view returns ((uint256 id, string title, string description, address creator, uint256 pricePerMonth, bool isActive, bool isDeleted, uint256 totalSections, uint256 createdAt, uint256 totalStudents, uint256 averageRating, uint256 totalRatings, string thumbnailCID))",
            params: [courseId],
        })) as unknown as CourseData;

        // Construct metadata
        const metadata = constructMetadata(tokenId, licenseData, courseData);

        console.log(`[License Metadata API] Metadata generated for token #${tokenId}`);

        return NextResponse.json(metadata, {
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
            },
        });
    } catch (error) {
        console.error(`[License Metadata API] Error for token #${tokenId}:`, error);

        return NextResponse.json(
            {
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Failed to fetch license metadata",
            },
            { status: 500 }
        );
    }
}

/**
 * HEAD handler for checking if metadata exists
 */
export async function HEAD(
    request: NextRequest,
    context: { params: Promise<{ tokenId: string }> }
) {
    try {
        const params = await context.params;
        // Strip .json suffix if present (some wallets/explorers append it per ERC-1155 convention)
        const tokenId = params.tokenId.replace(/\.json$/i, '');

        const courseLicenseContract = getContract({
            client,
            chain: mantaPacificTestnet,
            address: COURSE_LICENSE_ADDRESS,
        });

        const courseId = await readContract({
            contract: courseLicenseContract,
            method: "function tokenIdToCourseId(uint256) view returns (uint256)",
            params: [BigInt(tokenId)],
        });

        if (!courseId || courseId === BigInt(0)) {
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
        console.error("[License Metadata API] HEAD request error:", error);
        return new NextResponse(null, { status: 500 });
    }
}
