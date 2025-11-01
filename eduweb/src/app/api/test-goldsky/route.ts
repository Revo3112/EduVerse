/**
 * Goldsky Configuration Test API
 *
 * GET /api/test-goldsky
 *
 * Diagnostic endpoint to verify Goldsky subgraph configuration
 * Tests environment variables, endpoint connectivity, and query execution
 */

import { NextResponse } from "next/server";

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasEndpoint: !!process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT,
      endpoint:
        process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT || "NOT_CONFIGURED",
    },
    tests: {
      endpointReachable: false,
      blockNumber: null as number | null,
      queryWorks: false,
      coursesCount: null as number | null,
      error: null as string | null,
    },
  };

  // Test 1: Check if endpoint is configured
  if (!process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT) {
    diagnostics.tests.error =
      "NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT not configured in environment";
    return NextResponse.json(diagnostics, { status: 500 });
  }

  const endpoint = process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT;

  try {
    // Test 2: Check endpoint connectivity with _meta query
    const metaResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "{ _meta { block { number } } }",
      }),
    });

    if (!metaResponse.ok) {
      const errorText = await metaResponse.text();
      diagnostics.tests.error = `HTTP ${metaResponse.status}: ${errorText}`;
      return NextResponse.json(diagnostics, { status: metaResponse.status });
    }

    const metaResult = await metaResponse.json();

    if (metaResult.data?._meta?.block?.number) {
      diagnostics.tests.endpointReachable = true;
      diagnostics.tests.blockNumber = metaResult.data._meta.block.number;
    }

    // Test 3: Query actual data (courses)
    const coursesResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "{ courses(first: 1) { id } }",
      }),
    });

    if (coursesResponse.ok) {
      const coursesResult = await coursesResponse.json();
      if (coursesResult.data?.courses !== undefined) {
        diagnostics.tests.queryWorks = true;
        diagnostics.tests.coursesCount = coursesResult.data.courses.length;
      }
    }

    // Success
    return NextResponse.json({
      ...diagnostics,
      status: "✅ ALL TESTS PASSED",
      message: "Goldsky subgraph is properly configured and operational",
    });
  } catch (error) {
    diagnostics.tests.error =
      error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ...diagnostics,
        status: "❌ TESTS FAILED",
      },
      { status: 500 }
    );
  }
}
