import { NextRequest, NextResponse } from "next/server";

interface CertificateCourse {
  course: {
    id: string;
  };
  addedAt: string;
  txHash: string;
}

interface CertificateData {
  tokenId: string;
  platformName: string;
  recipientName: string;
  recipientAddress: string;
  isValid: boolean;
  ipfsCID: string;
  baseRoute: string;
  createdAt: string;
  lastUpdated: string;
  totalCourses: string;
  completedCourses: CertificateCourse[];
}

async function getCertificateFromGoldsky(
  tokenId: string
): Promise<CertificateData | null> {
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
  });

  if (!response.ok) {
    throw new Error(`Goldsky query failed: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors) {
    console.error("Goldsky errors:", result.errors);
    throw new Error("Failed to fetch certificate data from blockchain");
  }

  return result.data?.certificate;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("tokenId");

    if (!tokenId) {
      return NextResponse.json(
        { success: false, error: "Missing tokenId parameter" },
        { status: 400 }
      );
    }

    if (isNaN(parseInt(tokenId))) {
      return NextResponse.json(
        { success: false, error: "Invalid tokenId format" },
        { status: 400 }
      );
    }

    const certificate = await getCertificateFromGoldsky(tokenId);

    if (!certificate) {
      return NextResponse.json(
        { success: false, error: "Certificate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        tokenId: certificate.tokenId,
        platformName: certificate.platformName,
        recipientName: certificate.recipientName,
        recipientAddress: certificate.recipientAddress,
        lifetimeFlag: true,
        isValid: certificate.isValid,
        ipfsCID: certificate.ipfsCID,
        baseRoute: certificate.baseRoute,
        issuedAt: certificate.createdAt,
        lastUpdated: certificate.lastUpdated,
        totalCoursesCompleted: certificate.totalCourses,
        paymentReceiptHash:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        completedCourses: certificate.completedCourses.map(
          (c: CertificateCourse) => c.course.id
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching certificate details:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch certificate details",
      },
      { status: 500 }
    );
  }
}
