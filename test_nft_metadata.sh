#!/bin/bash

# NFT Metadata API Test Script
# Tests the fixed /api/nft/certificate/[tokenId] endpoint

set -e

echo "=========================================="
echo "NFT Metadata API Test"
echo "=========================================="
echo ""

# Configuration
BASE_URL="https://edu-verse-blond.vercel.app"
TOKEN_ID="1"
API_ENDPOINT="${BASE_URL}/api/nft/certificate/${TOKEN_ID}"
IMAGE_ENDPOINT="${BASE_URL}/api/nft/certificate/${TOKEN_ID}/image"

echo "Testing NFT Token ID: ${TOKEN_ID}"
echo "API Endpoint: ${API_ENDPOINT}"
echo ""

# Test 1: Check if metadata endpoint returns 200
echo "Test 1: Checking metadata endpoint status..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_ENDPOINT}")

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ PASS - Metadata endpoint returned 200 OK"
else
    echo "❌ FAIL - Metadata endpoint returned ${HTTP_CODE} (expected 200)"
    exit 1
fi
echo ""

# Test 2: Fetch and validate JSON structure
echo "Test 2: Fetching and validating JSON structure..."
METADATA=$(curl -s "${API_ENDPOINT}")

# Check if response is valid JSON
if echo "$METADATA" | jq empty 2>/dev/null; then
    echo "✅ PASS - Response is valid JSON"
else
    echo "❌ FAIL - Response is not valid JSON"
    echo "Response: ${METADATA}"
    exit 1
fi

# Check required fields
REQUIRED_FIELDS=("name" "description" "image" "external_url" "attributes")
for field in "${REQUIRED_FIELDS[@]}"; do
    if echo "$METADATA" | jq -e ".${field}" > /dev/null 2>&1; then
        echo "  ✓ Field '${field}' exists"
    else
        echo "  ✗ Field '${field}' missing"
        exit 1
    fi
done
echo ""

# Test 3: Validate metadata content
echo "Test 3: Validating metadata content..."

NAME=$(echo "$METADATA" | jq -r '.name')
DESCRIPTION=$(echo "$METADATA" | jq -r '.description')
IMAGE_URL=$(echo "$METADATA" | jq -r '.image')
ATTRIBUTES_COUNT=$(echo "$METADATA" | jq '.attributes | length')

echo "  Name: ${NAME}"
echo "  Description: ${DESCRIPTION:0:100}..."
echo "  Image URL: ${IMAGE_URL}"
echo "  Attributes count: ${ATTRIBUTES_COUNT}"

if [ -n "$NAME" ] && [ "$NAME" != "null" ]; then
    echo "✅ PASS - Name is present"
else
    echo "❌ FAIL - Name is missing or null"
    exit 1
fi

if [ "$ATTRIBUTES_COUNT" -gt 0 ]; then
    echo "✅ PASS - Attributes array has ${ATTRIBUTES_COUNT} items"
else
    echo "❌ FAIL - Attributes array is empty"
    exit 1
fi
echo ""

# Test 4: Check specific attributes from new struct
echo "Test 4: Checking new Certificate struct fields..."

PLATFORM_NAME=$(echo "$METADATA" | jq -r '.attributes[] | select(.trait_type=="Platform") | .value')
LIFETIME_FLAG=$(echo "$METADATA" | jq -r '.attributes[] | select(.trait_type=="Lifetime Certificate") | .value')
IPFS_CID=$(echo "$METADATA" | jq -r '.attributes[] | select(.trait_type=="IPFS CID") | .value')
ISSUED_DATE=$(echo "$METADATA" | jq -r '.attributes[] | select(.trait_type=="Issued Date") | .value')

echo "  Platform Name: ${PLATFORM_NAME}"
echo "  Lifetime Flag: ${LIFETIME_FLAG}"
echo "  IPFS CID: ${IPFS_CID}"
echo "  Issued Date: ${ISSUED_DATE}"

if [ -n "$PLATFORM_NAME" ] && [ "$PLATFORM_NAME" != "null" ]; then
    echo "✅ PASS - Platform name exists (new struct field)"
else
    echo "❌ FAIL - Platform name missing (should exist in new struct)"
    exit 1
fi

if [ -n "$IPFS_CID" ] && [ "$IPFS_CID" != "null" ]; then
    echo "✅ PASS - IPFS CID exists (new struct field)"
else
    echo "❌ FAIL - IPFS CID missing (should exist in new struct)"
    exit 1
fi
echo ""

# Test 5: Check image endpoint
echo "Test 5: Checking image endpoint..."
IMAGE_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${IMAGE_ENDPOINT}")

if [ "$IMAGE_HTTP_CODE" -eq 200 ]; then
    echo "✅ PASS - Image endpoint returned 200 OK"
else
    echo "❌ FAIL - Image endpoint returned ${IMAGE_HTTP_CODE} (expected 200)"
    exit 1
fi

# Check content type
CONTENT_TYPE=$(curl -s -I "${IMAGE_ENDPOINT}" | grep -i "content-type" | awk '{print $2}' | tr -d '\r')
if [[ "$CONTENT_TYPE" == image/* ]]; then
    echo "✅ PASS - Image endpoint returns image content type (${CONTENT_TYPE})"
else
    echo "❌ FAIL - Image endpoint does not return image content type (got: ${CONTENT_TYPE})"
    exit 1
fi
echo ""

# Test 6: Verify no old struct fields
echo "Test 6: Verifying old struct fields are not present..."

# These fields should NOT exist in the new struct
OLD_FIELDS=("Institution" "Minted Date")
OLD_FIELD_FOUND=false

for old_field in "${OLD_FIELDS[@]}"; do
    if echo "$METADATA" | jq -e ".attributes[] | select(.trait_type==\"${old_field}\")" > /dev/null 2>&1; then
        echo "  ⚠️  WARNING: Old field '${old_field}' still present"
        OLD_FIELD_FOUND=true
    else
        echo "  ✓ Old field '${old_field}' correctly removed"
    fi
done

if [ "$OLD_FIELD_FOUND" = false ]; then
    echo "✅ PASS - No old struct fields detected"
fi
echo ""

# Summary
echo "=========================================="
echo "✅ ALL TESTS PASSED"
echo "=========================================="
echo ""
echo "NFT metadata is now working correctly!"
echo ""
echo "Next steps:"
echo "1. Check MetaMask: Open wallet and view NFT"
echo "2. Refresh metadata: Click NFT → ⋮ → 'Refresh metadata'"
echo "3. Wait 30-60 seconds for cache to clear"
echo ""
echo "Full metadata response:"
echo "----------------------------------------"
echo "$METADATA" | jq '.'
echo "----------------------------------------"
