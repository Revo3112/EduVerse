import { NextRequest, NextResponse } from "next/server";
import { getContract, readContract } from "thirdweb";
import { mantaPacificTestnet } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const COURSE_LICENSE_ADDRESS = process.env.NEXT_PUBLIC_COURSE_LICENSE_ADDRESS!;
const COURSE_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_COURSE_FACTORY_ADDRESS!;

interface LicenseData {
  courseId: bigint;
  student: string;
  purchaseDate: bigint;
  expiryDate: bigint;
  active: boolean;
}

interface CourseData {
  id: bigint;
  title: string;
  description: string;
  creator: string;
  price: bigint;
  isActive: boolean;
  isDeleted: boolean;
  duration: bigint;
  createdAt: bigint;
  totalStudents: bigint;
  averageRating: number;
}

interface LicenseMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId: tokenIdStr } = await params;
    const tokenId = BigInt(tokenIdStr);

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

    const courseIdFromToken = (tokenId >> BigInt(160)) & BigInt(0xffffffff);
    const studentFromToken =
      tokenId & BigInt("0xffffffffffffffffffffffffffffffffffffffff");

    // @ts-ignore - thirdweb v5 type inference issue with Next.js 15
    const licenseData = (await readContract({
      contract: courseLicenseContract,
      method:
        "function getLicense(uint256 courseId, address student) view returns (tuple(uint256 courseId, address student, uint256 purchaseDate, uint256 expiryDate, bool active))",
      params: [
        courseIdFromToken,
        `0x${studentFromToken.toString(16).padStart(40, "0")}`,
      ],
    })) as LicenseData;

    // @ts-expect-error - thirdweb v5 type inference issue with Next.js 15
    const courseData = (await readContract({
      contract: courseFactoryContract,
      method:
        "function getCourse(uint256 courseId) view returns (tuple(uint256 id, string title, string description, address creator, uint256 price, bool isActive, bool isDeleted, uint256 duration, uint256 createdAt, uint256 totalStudents, uint8 averageRating))",
      params: [courseIdFromToken],
    })) as CourseData;

    const isActive = licenseData.active;
    const isExpired =
      licenseData.expiryDate > 0 &&
      BigInt(Date.now()) / BigInt(1000) > licenseData.expiryDate;

    const metadata: LicenseMetadata = {
      name: `Course License: ${courseData.title}`,
      description: `Active license for "${courseData.title}". This NFT grants you access to all course materials and content.`,
      image: `${process.env.NEXT_PUBLIC_APP_URL}/api/nft/license/${tokenIdStr}/image`,
      external_url: `${process.env.NEXT_PUBLIC_APP_URL}/learning/course-details?id=${courseIdFromToken}`,
      attributes: [
        {
          trait_type: "Course ID",
          value: courseIdFromToken.toString(),
        },
        {
          trait_type: "Course Title",
          value: courseData.title,
        },
        {
          trait_type: "Status",
          value: isExpired ? "Expired" : isActive ? "Active" : "Inactive",
        },
        {
          trait_type: "Purchase Date",
          value: new Date(
            Number(licenseData.purchaseDate) * 1000
          ).toISOString(),
        },
        {
          trait_type: "Expiry Date",
          value:
            licenseData.expiryDate > 0
              ? new Date(Number(licenseData.expiryDate) * 1000).toISOString()
              : "Never",
        },
        {
          trait_type: "Student",
          value: licenseData.student,
        },
      ],
    };

    return NextResponse.json(metadata, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error fetching license metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch license metadata" },
      { status: 500 }
    );
  }
}
