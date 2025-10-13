/**
 * Get Signed URL API Route
 * Generates signed URLs for private Pinata content
 *
 * @route POST /api/course/get-signed-url
 * @description Server-side endpoint to generate temporary access URLs for private IPFS content
 */

import type { SignedUrlResponse } from '@/lib/pinata-types';
import { batchGenerateSignedUrls, generateSignedUrl } from '@/services/pinata-upload.service';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

interface SignedUrlRequest {
  cid: string;
  expires?: number;
}

interface BatchSignedUrlRequest {
  cids: string[];
  expires?: number;
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    console.log('[Signed URL API] Received request');

    const body = await request.json();

    // Check if it's a batch request
    if ('cids' in body && Array.isArray(body.cids)) {
      return handleBatchRequest(body as BatchSignedUrlRequest);
    }

    // Single CID request
    if (!('cid' in body) || typeof body.cid !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: cid is required',
        },
        { status: 400 }
      );
    }

    return handleSingleRequest(body as SignedUrlRequest);
  } catch (error) {
    console.error('[Signed URL API] Request failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * Handles single CID signed URL generation
 */
async function handleSingleRequest(request: SignedUrlRequest): Promise<NextResponse> {
  console.log('[Signed URL API] Single CID request:', request.cid);

  const result = await generateSignedUrl(request.cid, request.expires);

  if (!result.success) {
    console.error('[Signed URL API] Failed to generate signed URL');
    return NextResponse.json(result, { status: 500 });
  }

  console.log('[Signed URL API] Signed URL generated successfully');
  console.log('[Signed URL API] Expires at:', result.expiresAt);

  return NextResponse.json(result, { status: 200 });
}

/**
 * Handles batch CID signed URL generation
 */
async function handleBatchRequest(request: BatchSignedUrlRequest): Promise<NextResponse> {
  console.log('[Signed URL API] Batch request for', request.cids.length, 'CIDs');

  if (request.cids.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'No CIDs provided',
      },
      { status: 400 }
    );
  }

  if (request.cids.length > 50) {
    return NextResponse.json(
      {
        success: false,
        error: 'Maximum 50 CIDs per batch request',
      },
      { status: 400 }
    );
  }

  const results = await batchGenerateSignedUrls(request.cids, request.expires);

  const successCount = results.filter((r: SignedUrlResponse) => r.success).length;
  console.log('[Signed URL API] Generated', successCount, 'of', results.length, 'URLs');  return NextResponse.json(
    {
      success: true,
      results,
      summary: {
        total: request.cids.length,
        successful: successCount,
        failed: request.cids.length - successCount,
      },
    },
    { status: 200 }
  );
}

// ============================================================================
// OPTIONS HANDLER (CORS)
// ============================================================================

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
