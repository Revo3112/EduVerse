/**
 * Test Gateway Optimization
 * Testing dedicated gateway detection and URL optimization
 */

const { pinataService } = require("./src/services/PinataService.js");

async function testGatewayOptimization() {
  console.log("🧪 Testing Gateway Optimization for Video Playback");
  console.log("==================================================");

  // Test CID from the actual video upload
  const testCid = "bafybeiffnr3jq3gxaesi4rpxpbvi2nhlqvosztpvoxx6cognsqyfbkhvuq";

  console.log("1. Testing basic video streaming URL...");
  try {
    const basicUrl = await pinataService.getVideoStreamingUrl(testCid);
    console.log("  📡 Basic URL:", basicUrl);
  } catch (error) {
    console.log("  ❌ Error getting basic URL:", error.message);
  }

  console.log("\n2. Testing faster streaming URL...");
  try {
    const fasterUrl = await pinataService.getFasterStreamingUrl(testCid);
    console.log("  🚀 Faster URL:", fasterUrl);

    // Compare URLs
    const basicUrl = await pinataService.getVideoStreamingUrl(testCid);
    const isOptimized =
      fasterUrl !== basicUrl && fasterUrl.includes(".mypinata.cloud");

    console.log("  📊 URL Comparison:");
    console.log("    Basic:  ", basicUrl);
    console.log("    Faster: ", fasterUrl);
    console.log("    ✅ Optimized:", isOptimized ? "YES" : "NO");

    if (isOptimized) {
      console.log(
        "  🎉 SUCCESS: Using dedicated gateway for faster streaming!"
      );
    } else {
      console.log("  ⚠️  WARNING: Still using public gateway (slower)");
    }
  } catch (error) {
    console.log("  ❌ Error getting faster URL:", error.message);
  }

  console.log("\n3. Testing gateway detection...");
  try {
    const originalGateway = pinataService.DEDICATED_GATEWAY;
    console.log(
      "  🏛️ Current dedicated gateway:",
      originalGateway || "Not detected"
    );

    // Force re-detection
    pinataService._gatewayDetected = false;
    await pinataService._detectDedicatedGateway();

    const newGateway = pinataService.DEDICATED_GATEWAY;
    console.log("  🔍 After detection:", newGateway || "Still not detected");

    if (
      newGateway &&
      newGateway.includes("copper-far-firefly-220.mypinata.cloud")
    ) {
      console.log("  ✅ SUCCESS: Dedicated gateway properly detected!");
    } else {
      console.log("  ❌ ISSUE: Dedicated gateway not properly detected");
    }
  } catch (error) {
    console.log("  ❌ Error in gateway detection:", error.message);
  }

  console.log("\n4. Testing URL construction...");
  const expectedFastUrl = `https://copper-far-firefly-220.mypinata.cloud/ipfs/${testCid}`;
  const actualFastUrl = await pinataService.getFasterStreamingUrl(testCid);

  console.log("  🎯 Expected fast URL:", expectedFastUrl);
  console.log("  🔗 Actual fast URL:  ", actualFastUrl);
  console.log(
    "  ✅ URLs match:",
    expectedFastUrl === actualFastUrl ? "YES" : "NO"
  );

  console.log("\n📋 Optimization Test Summary:");
  console.log(
    "  🏛️ Dedicated gateway detected:",
    pinataService.DEDICATED_GATEWAY ? "YES" : "NO"
  );
  console.log(
    "  🚀 Fast URL generation:",
    actualFastUrl.includes(".mypinata.cloud") ? "YES" : "NO"
  );
  console.log(
    "  📊 Performance improvement:",
    actualFastUrl !== pinataService.getVideoStreamingUrl(testCid) ? "YES" : "NO"
  );

  console.log("\n🎉 Gateway optimization test completed!");
}

// Run the test
testGatewayOptimization().catch(console.error);
