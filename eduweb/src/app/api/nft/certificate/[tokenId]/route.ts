import { NextRequest, NextResponse } from "next/server";
import { getContract, readContract } from "thirdweb";
import { mantaPacificTestnet } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const CERTIFICATE_MANAGER_ADDRESS = "0xC7a6EA3B185328A61B30c209e98c1EeC817acFf5";
const COURSE_FACTORY_ADDRESS = "0x8596917Af32Ab154Ab4F48efD32Ef516D4110E72";

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
  { params }: { params: { tokenId: string } },
) {
  try {
    const tokenId = BigInt(params.tokenId);

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

    const certificateData = await readContract({
      contract: certificateContract,
      method:
        "function getCertificate(uint256 tokenId) view returns (tuple(uint256 tokenId, string recipientName, string institutionName, address recipient, bool isValid, bool isMinted, string baseRoute, string qrData, uint256 mintedAt, uint256 lastUpdated, uint256 totalCourses, bytes32 paymentReceiptHash))",
      params: [tokenId],
    });

    const completedCourses = await readContract({
      contract: certificateContract,
      method:
        "function getCertificateCompletedCourses(uint256 tokenId) view returns (uint256[])",
      params: [tokenId],
    });

    const courseTitles: string[] = [];
    for (const courseId of completedCourses) {
      try {
        const courseData = await readContract({
          contract: courseFactoryContract,
          method:
            "function getCourse(uint256 courseId) view returns (tuple(uint256 id, string title, string description, address creator, uint256 price, bool isActive, bool isDeleted, uint256 duration, uint256 createdAt, uint256 totalStudents, uint8 averageRating))",
          params: [courseId],
        });
        courseTitles.push(courseData.title);
      } catch (err) {
        courseTitles.push(`Course #${courseId}`);
      }
    }

    const metadata: CertificateMetadata = {
      name: `${certificateData.institutionName} Certificate - ${certificateData.recipientName}`,
      description: `This certificate verifies that ${certificateData.recipientName} has successfully completed ${certificateData.totalCourses} course${certificateData.totalCourses > 1 ? "s" : ""} from ${certificateData.institutionName}. Courses completed: ${courseTitles.join(", ")}.`,
      image: `${process.env.NEXT_PUBLIC_APP_URL}/api/nft/certificate/${params.tokenId}/image`,
      external_url: `${process.env.NEXT_PUBLIC_APP_URL}/certificates?verify=${tokenId}`,
      attributes: [
        {
          trait_type: "Recipient",
          value: certificateData.recipientName,
        },
        {
          trait_type: "Institution",
          value: certificateData.institutionName,
        },
        {
          trait_type: "Total Courses",
          value: Number(certificateData.totalCourses),
          display_type: "number",
        },
        {
          trait_type: "Courses Completed",
          value: courseTitles.join(", "),
        },
        {
          trait_type: "Minted Date",
          value: new Date(Number(certificateData.mintedAt) * 1000).toISOString(),
        },
        {
          trait_type: "Last Updated",
          value: new Date(Number(certificateData.lastUpdated) * 1000).toISOString(),
        },
        {
          trait_type: "Status",
          value: certificateData.isValid ? "Valid" : "Revoked",
        },
        {
          trait_type: "Recipient Address",
          value: certificateData.recipient,
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
      { status: 500 },
    );
  }
}
