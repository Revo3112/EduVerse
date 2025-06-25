/**
 * test-video-upload.js
 * Test script untuk memvalidasi video upload functionality
 */

import React from "react";
import { View, Text, Alert } from "react-native";
import { videoService } from "./src/services/VideoService";
import { pinataService } from "./src/services/PinataService";

// Test video upload functionality
export const testVideoUpload = async () => {
  console.log("=== TESTING VIDEO UPLOAD FUNCTIONALITY ===");

  try {
    // 1. Test Pinata connection
    console.log("1. Testing Pinata connection...");
    const connectionResult = await pinataService.testConnection();
    console.log("Connection result:", connectionResult);

    if (!connectionResult.success) {
      throw new Error(`Connection failed: ${connectionResult.error}`);
    }

    // 2. Test video service initialization
    console.log("2. Testing VideoService initialization...");
    const usageInfo = await videoService.getCurrentUsage();
    console.log("Usage info:", usageInfo);

    // 3. Test video validation
    console.log("3. Testing video validation...");
    const testVideoFile = {
      uri: "test://video.mp4",
      type: "video/mp4",
      name: "test-video.mp4",
      size: 25 * 1024 * 1024, // 25MB
    };

    const validationResult = videoService.validateVideoFile(testVideoFile);
    console.log("Validation result:", validationResult);

    // 4. Test small file upload (simulated)
    console.log("4. Testing small file upload...");
    const testResult = await pinataService.testUpload();
    console.log("Test upload result:", testResult);

    console.log("=== ALL TESTS PASSED ===");
    return {
      success: true,
      message: "All video upload tests passed successfully",
      results: {
        connection: connectionResult,
        usage: usageInfo,
        validation: validationResult,
        testUpload: testResult,
      },
    };
  } catch (error) {
    console.error("=== TEST FAILED ===");
    console.error("Error:", error.message);

    return {
      success: false,
      error: error.message,
      message: "Video upload test failed",
    };
  }
};

// Test Colors import
export const testColorsImport = () => {
  console.log("=== TESTING COLORS IMPORT ===");

  try {
    const { Colors } = require("./src/constants/Colors");

    console.log("Colors object:", Colors);
    console.log("Colors.light:", Colors.light);
    console.log("Colors.light.background:", Colors.light?.background);
    console.log("Colors.light.tint:", Colors.light?.tint);
    console.log("Colors.light.text:", Colors.light?.text);

    const requiredProperties = [
      "background",
      "text",
      "tint",
      "tabIconDefault",
      "border",
    ];

    const missingProperties = [];

    for (const prop of requiredProperties) {
      if (!Colors.light || Colors.light[prop] === undefined) {
        missingProperties.push(prop);
      }
    }

    if (missingProperties.length > 0) {
      throw new Error(
        `Missing Colors.light properties: ${missingProperties.join(", ")}`
      );
    }

    console.log("✓ All required Colors.light properties are available");

    return {
      success: true,
      message: "Colors import test passed",
      colors: Colors.light,
    };
  } catch (error) {
    console.error("Colors import test failed:", error.message);
    return {
      success: false,
      error: error.message,
      message: "Colors import test failed",
    };
  }
};

// Combined test function
export const runAllTests = async () => {
  console.log("🧪 Starting comprehensive video upload tests...");

  // Test 1: Colors import
  const colorsTest = testColorsImport();
  console.log("Colors test result:", colorsTest);

  if (!colorsTest.success) {
    Alert.alert("Test Failed", `Colors test failed: ${colorsTest.error}`);
    return colorsTest;
  }

  // Test 2: Video upload functionality
  const videoTest = await testVideoUpload();
  console.log("Video test result:", videoTest);

  if (!videoTest.success) {
    Alert.alert("Test Failed", `Video test failed: ${videoTest.error}`);
    return videoTest;
  }

  Alert.alert("Tests Passed", "All video upload tests passed successfully!");

  return {
    success: true,
    message: "All tests passed",
    results: {
      colors: colorsTest,
      video: videoTest,
    },
  };
};

export default {
  testVideoUpload,
  testColorsImport,
  runAllTests,
};
