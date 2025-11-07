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
  completedCourses: readonly bigint[];
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

    console.log(`[NFT Metadata API] Fetching metadata for tokenId: ${tokenId}`);
    console.log(
      `[NFT Metadata API] Certificate Manager: ${CERTIFICATE_MANAGER_ADDRESS}`
    );
    console.log(`[NFT Metadata API] Course Factory: ${COURSE_FACTORY_ADDRESS}`);
    console.log(
      `[NFT Metadata API] Client ID exists: ${!!process.env
        .NEXT_PUBLIC_THIRDWEB_CLIENT_ID}`
    );

    if (!CERTIFICATE_MANAGER_ADDRESS || !COURSE_FACTORY_ADDRESS) {
      console.error(
        "[NFT Metadata API] Missing contract addresses in environment variables"
      );
      return NextResponse.json(
        {
          error: "Contract addresses not configured",
          details:
            "NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS or NEXT_PUBLIC_COURSE_FACTORY_ADDRESS missing",
        },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID) {
      console.error("[NFT Metadata API] Missing Thirdweb client ID");
      return NextResponse.json(
        {
          error: "Thirdweb client not configured",
          details: "NEXT_PUBLIC_THIRDWEB_CLIENT_ID missing",
        },
        { status: 500 }
      );
    }

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

    console.log(
      `[NFT Metadata API] Reading certificate data from blockchain...`
    );

    const certificateData = (await readContract({
      contract: certificateContract,
      method:
        "function getCertificate(uint256) view returns ((uint256,string,string,address,bool,bool,string,string,uint256,uint256,uint256,bytes32,uint256[]))",
      params: [tokenId],
    })) as unknown as CertificateData;

    console.log(
      `[NFT Metadata API] Certificate found: ${certificateData.recipientName}`
    );

    const completedCourses = [...certificateData.completedCourses];

    console.log(
      `[NFT Metadata API] Completed courses: ${completedCourses.length}`
    );

    const courseTitles: string[] = [];
    for (const courseId of completedCourses) {
      try {
        const courseData = (await readContract({
          contract: courseFactoryContract,
          method:
            "function getCourse(uint256) view returns ((uint256,string,string,address,uint256,bool,bool,uint256,uint256,uint256,uint8))",
          params: [courseId],
        })) as unknown as CourseData;
        courseTitles.push(courseData.title);
        console.log(
          `[NFT Metadata API] Course ${courseId}: ${courseData.title}`
        );
      } catch (error) {
        console.warn(
          `[NFT Metadata API] Could not fetch course ${courseId}:`,
          error
        );
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
    console.error(
      "[NFT Metadata API] Error fetching certificate metadata:",
      error
    );

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[NFT Metadata API] Error details:", {
      message: errorMessage,
      tokenId: params ? (await params).tokenId : "unknown",
      certificateManager: CERTIFICATE_MANAGER_ADDRESS,
      courseFactory: COURSE_FACTORY_ADDRESS,
      hasClientId: !!process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
    });

    return NextResponse.json(
      {
        error: "Failed to fetch certificate metadata",
        details: errorMessage,
        tokenId: params ? (await params).tokenId : "unknown",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
