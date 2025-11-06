import { NextRequest, NextResponse } from "next/server";
import { getContract, readContract } from "thirdweb";
import { mantaPacificTestnet } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const CERTIFICATE_MANAGER_ADDRESS =
  process.env.NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS!;
const COURSE_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_COURSE_FACTORY_ADDRESS!;

interface CertificateData {
  tokenId: bigint;
  platformName: string;
  recipientName: string;
  recipientAddress: string;
  lifetimeFlag: boolean;
  isValid: boolean;
  ipfsCID: string;
  baseRoute: string;
  issuedAt: bigint;
  lastUpdated: bigint;
  totalCoursesCompleted: bigint;
  paymentReceiptHash: string;
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

interface CertificateMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId: tokenIdStr } = await params;
    const tokenId = BigInt(tokenIdStr);

    const certificateContract = getContract({
      client,
      chain: mantaPacificTestnet,
      address: CERTIFICATE_MANAGER_ADDRESS,
    });

    const courseFactoryContract = getContract({
      client,
      chain: mantaPacificTestnet,
      address: COURSE_FACTORY_ADDRESS,
    });

    // @ts-ignore - thirdweb v5 type inference issue with Next.js 15
    const certificateData = (await readContract({
      contract: certificateContract,
      method:
        "function getCertificate(uint256 tokenId) view returns (tuple(uint256 tokenId, string platformName, string recipientName, address recipientAddress, bool lifetimeFlag, bool isValid, string ipfsCID, string baseRoute, uint256 issuedAt, uint256 lastUpdated, uint256 totalCoursesCompleted, bytes32 paymentReceiptHash))",
      params: [tokenId],
    })) as CertificateData;

    // @ts-ignore - thirdweb v5 type inference issue with Next.js 15
    const completedCourses = (await readContract({
      contract: certificateContract,
      method:
        "function getCertificateCompletedCourses(uint256 tokenId) view returns (uint256[])",
      params: [tokenId],
    })) as bigint[];

    const courseTitles: string[] = [];
    for (const courseId of completedCourses) {
      try {
        // @ts-ignore - thirdweb v5 type inference issue with Next.js 15
        const courseData = (await readContract({
          contract: courseFactoryContract,
          method:
            "function getCourse(uint256 courseId) view returns (tuple(uint256 id, string title, string description, address creator, uint256 price, bool isActive, bool isDeleted, uint256 duration, uint256 createdAt, uint256 totalStudents, uint8 averageRating))",
          params: [courseId],
        })) as CourseData;
        courseTitles.push(courseData.title);
      } catch {
        courseTitles.push(`Course #${courseId}`);
      }
    }

    const metadata: CertificateMetadata = {
      name: `${certificateData.platformName} Certificate - ${certificateData.recipientName}`,
      description: `This certificate verifies that ${
        certificateData.recipientName
      } has successfully completed ${
        certificateData.totalCoursesCompleted
      } course${certificateData.totalCoursesCompleted > 1 ? "s" : ""} from ${
        certificateData.platformName
      }. Courses completed: ${courseTitles.join(", ")}.`,
      image: `${process.env.NEXT_PUBLIC_APP_URL}/api/nft/certificate/${tokenIdStr}/image`,
      external_url: `${process.env.NEXT_PUBLIC_APP_URL}/certificates?verify=${tokenId}`,
      attributes: [
        {
          trait_type: "Recipient",
          value: certificateData.recipientName,
        },
        {
          trait_type: "Platform",
          value: certificateData.platformName,
        },
        {
          trait_type: "Total Courses",
          value: Number(certificateData.totalCoursesCompleted),
          display_type: "number",
        },
        {
          trait_type: "Courses Completed",
          value: courseTitles.join(", "),
        },
        {
          trait_type: "Issued Date",
          value: new Date(
            Number(certificateData.issuedAt) * 1000
          ).toISOString(),
        },
        {
          trait_type: "Last Updated",
          value: new Date(
            Number(certificateData.lastUpdated) * 1000
          ).toISOString(),
        },
        {
          trait_type: "Status",
          value: certificateData.isValid ? "Valid" : "Revoked",
        },
        {
          trait_type: "Lifetime Certificate",
          value: certificateData.lifetimeFlag ? "Yes" : "No",
        },
        {
          trait_type: "Recipient Address",
          value: certificateData.recipientAddress,
        },
        {
          trait_type: "IPFS CID",
          value: certificateData.ipfsCID,
        },
        {
          trait_type: "Token ID",
          value: Number(tokenId),
          display_type: "number",
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
    console.error("Error fetching certificate metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch certificate metadata" },
      { status: 500 }
    );
  }
}
