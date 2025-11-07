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

    // @ts-expect-error - thirdweb v5 type inference issue with Next.js 15
    const certificateData = (await readContract({
      contract: certificateContract,
      method:
        "function getCertificate(uint256 tokenId) view returns (tuple(uint256 tokenId, string platformName, string recipientName, address recipientAddress, bool lifetimeFlag, bool isValid, string ipfsCID, string baseRoute, uint256 issuedAt, uint256 lastUpdated, uint256 totalCoursesCompleted, bytes32 paymentReceiptHash))",
      params: [tokenId],
    })) as CertificateData;

    if (!certificateData.ipfsCID || certificateData.ipfsCID === "") {
      return NextResponse.json(
        { error: "Certificate image not available" },
        { status: 404 }
      );
    }

    const pinataGateway =
      process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";
    const imageUrl = `${pinataGateway}/ipfs/${certificateData.ipfsCID}`;

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
