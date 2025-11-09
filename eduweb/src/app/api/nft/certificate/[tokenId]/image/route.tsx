import { NextRequest, NextResponse } from "next/server";
import { getContract, readContract } from "thirdweb";
import { mantaPacificTestnet } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const CERTIFICATE_MANAGER_ADDRESS =
  process.env.NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS!;

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

    const certificateData = (await readContract({
      contract: certificateContract,
      method:
        "function getCertificate(uint256) view returns ((uint256,string,string,address,bool,bool,string,string,uint256,uint256,uint256,bytes32,uint256[]))",
      params: [tokenId],
    })) as unknown as CertificateData;

    if (!certificateData.ipfsCID || certificateData.ipfsCID === "") {
      return NextResponse.json(
        { error: "Certificate image not available" },
        { status: 404 }
      );
    }

    const pinataGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY;
    const imageUrl = `https://${pinataGateway}/ipfs/${certificateData.ipfsCID}`;

    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      throw new Error(
        `Failed to fetch image from IPFS: ${imageResponse.status}`
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving certificate image:", error);

    return NextResponse.json(
      { error: "Failed to load certificate image" },
      { status: 500 }
    );
  }
}
