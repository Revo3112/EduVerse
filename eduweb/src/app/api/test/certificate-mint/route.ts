import { NextRequest, NextResponse } from "next/server";
import { generateAndUploadCertificate } from "@/services/certificate.service";
import type { CertificateData } from "@/lib/pinata-types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      walletAddress,
      studentName = "Test Student",
      courseName = "Test Course",
      courseId = "1",
    } = body;

    if (!walletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "walletAddress is required",
        },
        { status: 400 }
      );
    }

    console.log(
      "[Test Certificate Mint] ========================================"
    );
    console.log("[Test Certificate Mint] Starting test...");
    console.log("[Test Certificate Mint] Wallet:", walletAddress);
    console.log("[Test Certificate Mint] Student:", studentName);
    console.log("[Test Certificate Mint] Course:", courseName);
    console.log("[Test Certificate Mint] Course ID:", courseId);

    const certificateId = `cert-${courseId}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const certificateData: CertificateData = {
      studentName,
      courseName,
      courseId,
      completionDate: new Date().toISOString(),
      certificateId,
      instructorName: "EduVerse Platform",
      walletAddress,
      recipientAddress: walletAddress,
      tokenId: 0,
      completedCourses: [parseInt(courseId)],
      issuedAt: Math.floor(Date.now() / 1000),
      lastUpdated: Math.floor(Date.now() / 1000),
      paymentReceiptHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      platformName: "EduVerse Academy",
      baseRoute:
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000/certificates",
      isValid: true,
      lifetimeFlag: true,
      blockchainTxHash: undefined,
    };

    console.log(
      "[Test Certificate Mint] Generating certificate with PUBLIC IPFS..."
    );
    console.log("[Test Certificate Mint] Using EXACT same flow as production");
    console.log("[Test Certificate Mint] Certificate ID:", certificateId);

    const result = await generateAndUploadCertificate(certificateData);

    if (!result.success) {
      console.error(
        "[Test Certificate Mint] ❌ Certificate generation failed:",
        result.error
      );
      return NextResponse.json(
        {
          success: false,
          error: result.error.message,
          details: result.error.details,
        },
        { status: 500 }
      );
    }

    console.log("[Test Certificate Mint] ✅ Certificate generated!");
    console.log("[Test Certificate Mint] ✅ CID:", result.data.cid);
    console.log(
      "[Test Certificate Mint] ✅ Metadata CID:",
      result.data.metadataCID
    );
    console.log("[Test Certificate Mint] ✅ Network:", result.data.network);
    console.log("[Test Certificate Mint] ✅ Pinata ID:", result.data.pinataId);

    const imageUrl = `https://${process.env.PINATA_GATEWAY}/ipfs/${result.data.cid}`;
    const metadataUrl = `https://${process.env.PINATA_GATEWAY}/ipfs/${result.data.metadataCID}`;

    console.log("[Test Certificate Mint] ✅ Image URL:", imageUrl);
    console.log("[Test Certificate Mint] ✅ Metadata URL:", metadataUrl);
    console.log(
      "[Test Certificate Mint] ========================================"
    );

    return NextResponse.json({
      success: true,
      message: "Certificate generated successfully on PUBLIC IPFS",
      data: {
        certificateId,
        walletAddress,
        studentName,
        courseName,
        courseId,
        cid: result.data.cid,
        metadataCID: result.data.metadataCID,
        pinataId: result.data.pinataId,
        network: result.data.network,
        imageUrl,
        metadataUrl,
        uploadedAt: result.data.uploadedAt,
        size: result.data.size,
        mimeType: result.data.mimeType,
        nextSteps: {
          step1: "✅ Certificate image uploaded to PUBLIC IPFS",
          step2: "✅ Metadata uploaded to PUBLIC IPFS",
          step3: `Copy this CID: ${result.data.cid}`,
          step4: "Use GetCertificateModal in UI to mint to blockchain",
          step5: `Or call: mintOrUpdateCertificate(${courseId}, "${studentName}", "${result.data.cid}", paymentHash, baseRoute)`,
          step6: "Certificate will be minted to: " + walletAddress,
        },
        verification: {
          imageAccessible: `curl -I ${imageUrl}`,
          metadataAccessible: `curl ${metadataUrl}`,
          viewInBrowser: imageUrl,
          expectedHTTPStatus: "200 OK",
        },
        contractData: {
          ipfsCID: result.data.cid,
          recipientAddress: walletAddress,
          courseId: parseInt(courseId),
          platformName: "EduVerse Academy",
          isValid: true,
          lifetimeFlag: true,
        },
      },
    });
  } catch (error) {
    console.error("[Test Certificate Mint] ❌ Error:", error);
    console.error(
      "[Test Certificate Mint] ❌ Stack:",
      error instanceof Error ? error.stack : "N/A"
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/test/certificate-mint",
    method: "POST",
    description:
      "Test certificate generation with PUBLIC IPFS - EXACT same flow as production",
    usage: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        walletAddress: "0x... (REQUIRED)",
        studentName: "John Doe (optional, default: Test Student)",
        courseName: "Blockchain 101 (optional, default: Test Course)",
        courseId: "1 (optional, default: 1)",
      },
    },
    example: {
      curl: `curl -X POST http://localhost:3000/api/test/certificate-mint \\
  -H "Content-Type: application/json" \\
  -d '{"walletAddress":"0xb5075eB5734bc8A6a9bbC1Ca299Fd8C0bd4Cff58","studentName":"Your Name","courseName":"Your Course"}'`,
      fetch: `fetch('http://localhost:3000/api/test/certificate-mint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: '0xb5075eB5734bc8A6a9bbC1Ca299Fd8C0bd4Cff58',
    studentName: 'Your Name',
    courseName: 'Your Course',
    courseId: '1'
  })
}).then(r => r.json()).then(console.log)`,
    },
    notes: [
      "✅ Uses generateAndUploadCertificate() - SAME as production",
      "✅ Uploads to PUBLIC IPFS via pinata.upload.public.file()",
      "✅ Returns permanent gateway URLs (no expiration)",
      "✅ Returns CID that should be stored on blockchain",
      "❌ Does NOT perform blockchain transaction",
      "💡 Use returned CID with useCertificate.mintOrUpdateCertificate()",
      "💡 Or use GetCertificateModal in UI for full flow",
    ],
    flow: [
      "1. Receive wallet address + certificate data",
      "2. Call generateAndUploadCertificate() (SAME as production)",
      "3. Service generates certificate image (Canvas)",
      "4. Service uploads image to PUBLIC IPFS → IMAGE CID",
      "5. Service uploads metadata to PUBLIC IPFS → METADATA CID",
      "6. Return both CIDs + public URLs",
      "7. Verify URLs are publicly accessible",
      "8. Use IMAGE CID for blockchain minting",
    ],
  });
}
