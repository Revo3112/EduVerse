import { NextResponse } from "next/server";
import { pinata } from "@/lib/pinata";
import { uploadFileToPublicIPFS } from "@/services/pinata-upload.service";

export async function GET() {
  const tests: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      hasGlobalBlob: typeof Blob !== "undefined",
      hasGlobalFile: typeof File !== "undefined",
    },
    credentials: {
      jwtExists: !!process.env.PINATA_JWT,
      jwtLength: process.env.PINATA_JWT?.length || 0,
      gateway: process.env.PINATA_GATEWAY || "NOT SET",
    },
    sdk: {
      available: typeof pinata !== "undefined",
      uploadAvailable: typeof pinata?.upload !== "undefined",
      publicUploadAvailable: typeof pinata?.upload?.public !== "undefined",
    },
    metamaskCompatibility: {
      checked: false,
      imageUrlFormat: "",
      publiclyAccessible: false,
    },
  };

  try {
    console.log("[Pinata Test] Testing connection...");
    const listResult = await pinata.files.public.list().limit(1);
    tests.connection = {
      success: true,
      filesFound: listResult.files?.length ?? 0,
    };
    console.log("[Pinata Test] Connection successful");
  } catch (error) {
    tests.connection = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    console.error("[Pinata Test] Connection failed:", error);
  }

  try {
    console.log("[Pinata Test] Testing simple text upload...");
    const testText = `Pinata test file created at ${new Date().toISOString()}`;
    const testBuffer = Buffer.from(testText, "utf-8");
    const uint8Array = new Uint8Array(testBuffer);
    const blob = new Blob([uint8Array], { type: "text/plain" });

    let file: File;
    if (typeof File !== "undefined") {
      file = new File([blob], "test.txt", { type: "text/plain" });
    } else {
      file = blob as any;
    }

    const uploadResult = await uploadFileToPublicIPFS(file, {
      name: "pinata-test.txt",
      keyvalues: {
        testType: "connection-test",
        timestamp: new Date().toISOString(),
      },
    });

    if (uploadResult.success) {
      tests.upload = {
        success: true,
        cid: uploadResult.data.cid,
        pinataId: uploadResult.data.pinataId,
        url: uploadResult.data.signedUrl,
        network: uploadResult.data.network,
      };
      console.log("[Pinata Test] Upload successful:", uploadResult.data.cid);
    } else {
      tests.upload = {
        success: false,
        error: uploadResult.error,
      };
      console.error("[Pinata Test] Upload failed:", uploadResult.error);
    }
  } catch (error) {
    tests.upload = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    console.error("[Pinata Test] Upload exception:", error);
  }

  if (tests.upload?.success && tests.upload?.cid) {
    try {
      console.log("[Pinata Test] Testing MetaMask compatibility...");
      const publicUrl = `https://${process.env.PINATA_GATEWAY}/ipfs/${tests.upload.cid}`;
      tests.metamaskCompatibility.imageUrlFormat = publicUrl;

      console.log("[Pinata Test] Fetching public URL:", publicUrl);
      const urlTest = await fetch(publicUrl, {
        method: "HEAD",
        cache: "no-store",
      });

      tests.metamaskCompatibility.checked = true;
      tests.metamaskCompatibility.publiclyAccessible = urlTest.ok;
      tests.metamaskCompatibility.statusCode = urlTest.status;
      tests.metamaskCompatibility.contentType =
        urlTest.headers.get("content-type");

      if (urlTest.ok) {
        console.log(
          "[Pinata Test] ✅ Public URL accessible - MetaMask compatible"
        );
      } else {
        console.error(
          "[Pinata Test] ❌ Public URL not accessible - MetaMask will fail"
        );
      }
    } catch (error) {
      tests.metamaskCompatibility.checked = true;
      tests.metamaskCompatibility.error =
        error instanceof Error ? error.message : String(error);
      console.error(
        "[Pinata Test] MetaMask compatibility check failed:",
        error
      );
    }
  }

  const allTestsPassed =
    tests.connection?.success &&
    tests.upload?.success &&
    tests.metamaskCompatibility?.publiclyAccessible;

  return NextResponse.json(
    {
      status: allTestsPassed
        ? "✅ ALL TESTS PASSED - METAMASK COMPATIBLE"
        : "❌ SOME TESTS FAILED",
      tests,
      metamaskReady: tests.metamaskCompatibility?.publiclyAccessible === true,
    },
    { status: allTestsPassed ? 200 : 500 }
  );
}

export async function POST(request: Request) {
  const testResults: Record<string, any> = {
    timestamp: new Date().toISOString(),
    testType: "Complete Certificate Flow Test",
  };

  try {
    const body = await request.json();
    const { cid } = body;

    if (!cid) {
      return NextResponse.json(
        {
          success: false,
          error: "CID is required in request body",
        },
        { status: 400 }
      );
    }

    console.log("[Pinata Test POST] Testing CID:", cid);

    const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    const cidV1Regex = /^(bafy|bafk|bafz|baf2)[a-z0-9]{52,}$/i;
    const isValidFormat = cidV0Regex.test(cid) || cidV1Regex.test(cid);

    testResults.cidValidation = {
      cid,
      validFormat: isValidFormat,
      cidVersion: cid.startsWith("Qm") ? "v0" : "v1",
    };

    if (!isValidFormat) {
      console.error("[Pinata Test POST] ❌ Invalid CID format");
      return NextResponse.json(
        {
          success: false,
          error: "Invalid CID format",
          testResults,
        },
        { status: 400 }
      );
    }

    const gateway = process.env.PINATA_GATEWAY;
    const publicUrl = `https://${gateway}/ipfs/${cid}`;

    testResults.urlTest = {
      gateway,
      publicUrl,
    };

    console.log("[Pinata Test POST] Testing URL:", publicUrl);

    try {
      const response = await fetch(publicUrl, {
        method: "HEAD",
        cache: "no-store",
      });

      testResults.urlTest.accessible = response.ok;
      testResults.urlTest.status = response.status;
      testResults.urlTest.contentType = response.headers.get("content-type");
      testResults.urlTest.cacheControl = response.headers.get("cache-control");

      if (response.ok) {
        console.log("[Pinata Test POST] ✅ CID accessible");
        testResults.metamaskCompatible = true;
        testResults.verdict =
          "✅ CID is valid and accessible - MetaMask will display image";

        try {
          const imageResponse = await fetch(publicUrl, {
            method: "GET",
            cache: "no-store",
          });
          const imageSize = parseInt(
            imageResponse.headers.get("content-length") || "0"
          );
          testResults.imageInfo = {
            size: imageSize,
            sizeFormatted: `${(imageSize / 1024).toFixed(2)} KB`,
          };
        } catch {
          testResults.imageInfo = { error: "Could not fetch size" };
        }

        return NextResponse.json({
          success: true,
          testResults,
        });
      } else {
        console.error("[Pinata Test POST] ❌ CID not accessible");
        testResults.metamaskCompatible = false;
        testResults.verdict =
          "❌ CID exists but not accessible - Check gateway settings";

        return NextResponse.json(
          {
            success: false,
            error: `URL returned status ${response.status}`,
            testResults,
          },
          { status: 500 }
        );
      }
    } catch (fetchError) {
      console.error("[Pinata Test POST] ❌ Fetch failed:", fetchError);
      testResults.urlTest.error =
        fetchError instanceof Error ? fetchError.message : String(fetchError);
      testResults.metamaskCompatible = false;
      testResults.verdict =
        "❌ Could not access URL - Gateway may be unreachable";

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch URL",
          testResults,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Pinata Test POST] Exception:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        testResults,
      },
      { status: 500 }
    );
  }
}
