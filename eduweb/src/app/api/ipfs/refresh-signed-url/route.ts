import { generateSignedUrl } from '@/services/pinata-upload.service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Refresh Signed URL API Endpoint
 *
 * Generates a new signed URL for an existing IPFS CID.
 * Used when signed URLs are about to expire during long video sessions.
 *
 * Request Body (JSON):
 * - cid: string (IPFS CID)
 * - expirySeconds: number (optional, default: 7200 for videos)
 *
 * Response:
 * - signedUrl: string (new signed URL)
 * - expiresAt: number (expiry timestamp in milliseconds)
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/ipfs/refresh-signed-url', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ cid: 'bafybeigbxz...' }),
 * });
 *
 * const { signedUrl, expiresAt } = await response.json();
 * ```
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { cid, expirySeconds = 7200 } = body;

    console.log('[Refresh Signed URL] Request:', { cid, expirySeconds });

    // Validate CID
    if (!cid || typeof cid !== 'string') {
      return NextResponse.json(
        { error: 'Valid CID is required' },
        { status: 400 }
      );
    }

    // Validate expiry
    if (typeof expirySeconds !== 'number' || expirySeconds <= 0) {
      return NextResponse.json(
        { error: 'expirySeconds must be a positive number' },
        { status: 400 }
      );
    }

    // Maximum expiry: 30 days (Pinata limit)
    const MAX_EXPIRY = 30 * 24 * 60 * 60; // 30 days in seconds
    if (expirySeconds > MAX_EXPIRY) {
      return NextResponse.json(
        { error: `expirySeconds cannot exceed ${MAX_EXPIRY} (30 days)` },
        { status: 400 }
      );
    }

    // Generate new signed URL
    console.log(`[Refresh Signed URL] Generating signed URL for CID: ${cid}`);
    const result = await generateSignedUrl(cid, expirySeconds);

    if (!result.success) {
      console.error('[Refresh Signed URL] Generation failed:', result.error);
      return NextResponse.json(
        { error: typeof result.error === 'string' ? result.error : 'Failed to generate signed URL' },
        { status: 500 }
      );
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(3);
    console.log(`[Refresh Signed URL] Success in ${duration}s`);
    console.log(`[Refresh Signed URL] Expires at: ${new Date(result.expiresAt!).toISOString()}`);

    return NextResponse.json({
      signedUrl: result.signedUrl,
      expiresAt: result.expiresAt,
      cid,
      duration: `${duration}s`,
    });

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(3);
    console.error(`[Refresh Signed URL] Error after ${duration}s:`, error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to refresh signed URL',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for testing and documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/ipfs/refresh-signed-url',
    method: 'POST',
    description: 'Generate a new signed URL for an existing IPFS CID',
    requestBody: {
      cid: 'string (required) - IPFS CID',
      expirySeconds: 'number (optional, default: 7200) - Seconds until expiry (max: 2,592,000 = 30 days)',
    },
    response: {
      signedUrl: 'string - New signed URL',
      expiresAt: 'number - Expiry timestamp in milliseconds',
      cid: 'string - Original CID',
      duration: 'string - Processing time',
    },
    example: {
      request: {
        cid: 'bafybeigbxztbxewqyddso76boh27p3ptlnnqz3rwwmg5pg2juoulb5t3tq',
        expirySeconds: 7200,
      },
      response: {
        signedUrl: 'https://copper-far-firefly-220.mypinata.cloud/files/bafybeigbxztbxewqyddso76boh27p3ptlnnqz3rwwmg5pg2juoulb5t3tq?X-Algorithm=PINATA1&X-Date=...',
        expiresAt: 1760292334758,
        cid: 'bafybeigbxztbxewqyddso76boh27p3ptlnnqz3rwwmg5pg2juoulb5t3tq',
        duration: '0.234s',
      },
    },
    notes: [
      'Signed URLs are automatically refreshed by the useSignedUrl hook',
      'Default expiry is 2 hours (7200 seconds) for videos',
      'Maximum expiry is 30 days (2,592,000 seconds)',
      'Refresh before expiry to prevent playback interruption',
    ],
  });
}
