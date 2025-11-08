import { NextResponse } from "next/server";

export async function GET() {
  const gateway = process.env.PINATA_GATEWAY;

  if (!gateway) {
    return NextResponse.json({
      error: "PINATA_GATEWAY not configured",
      metamaskCompatible: false,
    }, { status: 500 });
  }

  const testCIDs = [
    "bafybeiaibxpgjjcjr3dgfyhhg365rt47xl2nwwrnesr6zshpompucxgn3q",
    "bafkreib4pqtikzdjlj4zigobmd63lig7u6oxlug24snlr6atjlmlza45dq",
  ];

  const results: any[] = [];

  for (const cid of testCIDs) {
    const url = `https://${gateway}/ipfs/${cid}`;

    try {
      const response = await fetch(url, {
        method: "HEAD",
        cache: "no-store",
      });

      results.push({
        cid,
        url,
        accessible: response.ok,
        status: response.status,
        contentType: response.headers.get("content-type"),
      });
    } catch (error) {
      results.push({
        cid,
        url,
        accessible: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const allAccessible = results.every(r => r.accessible);

  return NextResponse.json({
    gateway,
    gatewayFormat: `https://${gateway}/ipfs/{CID}`,
    metamaskCompatible: allAccessible,
    publicAccessEnabled: allAccessible,
    testResults: results,
    verdict: allAccessible
      ? "✅ Gateway configured correctly for MetaMask"
      : "❌ Gateway not accessible - MetaMask will fail to display images",
    recommendation: allAccessible
      ? "Certificate images will display in MetaMask"
      : "Check Pinata gateway settings - ensure public access is enabled",
  });
}
