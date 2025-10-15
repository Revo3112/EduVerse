/**
 * Pinata Certificate Generation API
 *
 * POST /api/certificate/generate-pinata
 *
 * Generates a personalized course completion certificate and uploads to Pinata private IPFS
 * Compatible with CertificateManager.sol (ERC-1155) blockchain structure
 *
 * Request Body:
 * {
 *   // === REQUIRED FIELDS ===
 *   studentName: string;          // Recipient name for display
 *   courseName: string;           // Primary course name
 *   courseId: string;             // Primary course ID
 *
 *   // === OPTIONAL LEGACY FIELDS ===
 *   completionDate?: string;      // ISO 8601 date string, defaults to now
 *   instructorName?: string;      // Defaults to 'EduVerse Platform'
 *   walletAddress?: string;       // DEPRECATED: Use recipientAddress
 *
 *   // === BLOCKCHAIN FIELDS (for CertificateManager.sol compatibility) ===
 *   tokenId?: number;             // ERC-1155 token ID from blockchain
 *   recipientAddress?: string;    // Blockchain wallet address
 *   completedCourses?: number[];  // Array of all completed course IDs
 *   issuedAt?: number;            // Unix timestamp (first mint)
 *   lastUpdated?: number;         // Unix timestamp (last update)
 *   paymentReceiptHash?: string;  // Keccak256 hash (0x...)
 *   platformName?: string;        // Platform name (e.g., "EduVerse Academy")
 *   baseRoute?: string;           // QR base route
 *   isValid?: boolean;            // Certificate validity status
 *   lifetimeFlag?: boolean;       // Lifetime certificate flag
 *   blockchainTxHash?: string;    // Transaction hash from minting
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   data: {
 *     cid: string;              // Certificate image CID
 *     metadataCID: string;      // Certificate metadata CID (blockchain-compatible)
 *     signedUrl: string;        // Signed URL for immediate viewing
 *     certificateId: string;    // Unique certificate ID
 *     tokenId?: number;         // Token ID if provided
 *     verificationUrl: string;  // URL for QR code verification
 *   }
 * }
 */

import type { CertificateData } from '@/lib/pinata-types';
import { generateAndUploadCertificate } from '@/services/certificate.service';
import { NextRequest, NextResponse } from 'next/server';

interface CertificateGenerationRequest {
  // Required fields
  studentName: string;
  courseName: string;
  courseId: string;

  // Optional legacy fields
  completionDate?: string;
  instructorName?: string;
  walletAddress?: string;

  // Blockchain fields (CertificateManager.sol compatibility)
  tokenId?: number;
  recipientAddress?: string;
  completedCourses?: number[];
  issuedAt?: number;
  lastUpdated?: number;
  paymentReceiptHash?: string;
  platformName?: string;
  baseRoute?: string;
  isValid?: boolean;
  lifetimeFlag?: boolean;
  blockchainTxHash?: string;
}

export async function POST(request: NextRequest) {
  console.log('[Certificate Generation API] POST request received');

  try {
    // Parse request body
    const body: CertificateGenerationRequest = await request.json();
    console.log('[Certificate Generation API] Request body:', {
      ...body,
      walletAddress: body.walletAddress ? `${body.walletAddress.slice(0, 6)}...` : undefined
    });

    // Validate required fields
    if (!body.studentName || !body.courseName || !body.courseId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: studentName, courseName, courseId',
        },
        { status: 400 }
      );
    }

    // Generate unique certificate ID
    const certificateId = `cert-${body.courseId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Prepare certificate data with blockchain compatibility
    const certificateData: CertificateData = {
      // Required fields
      studentName: body.studentName,
      courseName: body.courseName,
      courseId: body.courseId,
      completionDate: body.completionDate || new Date().toISOString(),
      certificateId,
      instructorName: body.instructorName || 'EduVerse Platform',

      // Legacy wallet field
      walletAddress: body.walletAddress || body.recipientAddress,

      // Blockchain fields (pass through if provided)
      tokenId: body.tokenId,
      recipientAddress: body.recipientAddress || body.walletAddress,
      completedCourses: body.completedCourses || [parseInt(body.courseId)],
      issuedAt: body.issuedAt || Math.floor(Date.now() / 1000),
      lastUpdated: body.lastUpdated || Math.floor(Date.now() / 1000),
      paymentReceiptHash: body.paymentReceiptHash,
      platformName: body.platformName || 'EduVerse',
      baseRoute: body.baseRoute || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      isValid: body.isValid !== false,
      lifetimeFlag: body.lifetimeFlag !== false,
      blockchainTxHash: body.blockchainTxHash,
    };

    console.log('[Certificate Generation API] Generating certificate...');
    console.log('[Certificate Generation API] Certificate ID:', certificateId);
    if (certificateData.tokenId) {
      console.log('[Certificate Generation API] Blockchain Token ID:', certificateData.tokenId);
    }

    // Generate and upload certificate
    const result = await generateAndUploadCertificate(certificateData);

    if (!result.success) {
      console.error('[Certificate Generation API] Certificate generation failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error.message,
          details: result.error.details,
        },
        { status: 500 }
      );
    }

    console.log('[Certificate Generation API] Certificate generated successfully');
    console.log('[Certificate Generation API] CID:', result.data.cid);

    // Construct verification URL for QR code
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const tokenId = certificateData.tokenId || 0;
    const address = certificateData.recipientAddress || '0x0';
    const verificationUrl = `${baseUrl}/certificates?tokenId=${tokenId}&address=${address}`;

    // Return success response with blockchain-compatible data
    return NextResponse.json({
      success: true,
      data: {
        cid: result.data.cid,
        metadataCID: result.data.metadataCID,
        signedUrl: result.data.signedUrl,
        metadataSignedUrl: result.data.metadataSignedUrl,
        certificateId,
        tokenId: certificateData.tokenId,
        verificationUrl,
        expiresAt: result.data.expiresAt,
        uploadedAt: result.data.uploadedAt,
      },
    });

  } catch (error) {
    console.error('[Certificate Generation API] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Pinata Certificate Generation API',
    version: '1.0.0',
  });
}
