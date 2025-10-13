/**
 * Pinata Certificate Generation API
 *
 * POST /api/certificate/generate-pinata
 *
 * Generates a personalized course completion certificate and uploads to Pinata private IPFS
 *
 * Request Body:
 * {
 *   studentName: string;
 *   courseName: string;
 *   courseId: string;
 *   completionDate?: string; (ISO 8601 date string, defaults to now)
 *   instructorName?: string;
 *   walletAddress?: string;
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   data: {
 *     cid: string;              // Certificate image CID
 *     metadataCid: string;      // Certificate metadata CID
 *     signedUrl: string;        // Signed URL for immediate viewing
 *     certificateId: string;    // Unique certificate ID
 *   }
 * }
 */

import type { CertificateData } from '@/lib/pinata-types';
import { generateAndUploadCertificate } from '@/services/certificate.service';
import { NextRequest, NextResponse } from 'next/server';

interface CertificateGenerationRequest {
  studentName: string;
  courseName: string;
  courseId: string;
  completionDate?: string;
  instructorName?: string;
  walletAddress?: string;
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

    // Prepare certificate data
    const certificateData: CertificateData = {
      studentName: body.studentName,
      courseName: body.courseName,
      courseId: body.courseId,
      completionDate: body.completionDate || new Date().toISOString(),
      certificateId,
      instructorName: body.instructorName || 'EduVerse Platform',
      walletAddress: body.walletAddress,
    };

    console.log('[Certificate Generation API] Generating certificate...');
    console.log('[Certificate Generation API] Certificate ID:', certificateId);

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

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        cid: result.data.cid,
        signedUrl: result.data.signedUrl,
        certificateId,
        expiresAt: result.data.expiresAt,
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
