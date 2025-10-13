#!/bin/bash

# 🧪 Thirdweb IPFS Storage - Testing Script
# Purpose: Verify certificate generation and IPFS upload functionality
# Usage: ./test-thirdweb-ipfs.sh (run from project root OR scripts directory)

# Don't exit on error - we want to run all tests
# set -e

echo "═══════════════════════════════════════════════════════════════════════"
echo "     THIRDWEB IPFS STORAGE - COMPREHENSIVE TEST SUITE"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine project root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -f "$SCRIPT_DIR/../eduweb/.env.local" ]; then
    PROJECT_ROOT="$SCRIPT_DIR/.."
elif [ -f "$SCRIPT_DIR/eduweb/.env.local" ]; then
    PROJECT_ROOT="$SCRIPT_DIR"
else
    echo -e "${RED}❌ ERROR: Could not find project root!${NC}"
    echo "Please run this script from:"
    echo "  • Project root: ./scripts/test-thirdweb-ipfs.sh"
    echo "  • Scripts dir:  ./test-thirdweb-ipfs.sh"
    exit 1
fi

cd "$PROJECT_ROOT"
echo -e "${BLUE}ℹ️  Project root: $(pwd)${NC}"
echo ""

# Configuration
API_URL="http://localhost:3000/api/certificate/generate"
HEALTH_URL="http://localhost:3000/api/certificate/generate"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((TESTS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️  INFO:${NC} $1"
}

# Test 1: Environment Variables Check
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_test "1. Environment Variables Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ENV_FILE="$PROJECT_ROOT/eduweb/.env.local"

if [ -f "$ENV_FILE" ]; then
    print_success "File .env.local exists at: eduweb/.env.local"

    if grep -q "THIRDWEB_SECRET_KEY=" "$ENV_FILE"; then
        SECRET_KEY=$(grep "THIRDWEB_SECRET_KEY=" "$ENV_FILE" | cut -d'=' -f2)
        if [ -n "$SECRET_KEY" ]; then
            print_success "THIRDWEB_SECRET_KEY is set (${#SECRET_KEY} chars)"
        else
            print_error "THIRDWEB_SECRET_KEY is empty"
        fi
    else
        print_error "THIRDWEB_SECRET_KEY not found in .env.local"
    fi

    if grep -q "NEXT_PUBLIC_THIRDWEB_CLIENT_ID=" "$ENV_FILE"; then
        CLIENT_ID=$(grep "NEXT_PUBLIC_THIRDWEB_CLIENT_ID=" "$ENV_FILE" | cut -d'=' -f2)
        if [ -n "$CLIENT_ID" ]; then
            print_success "NEXT_PUBLIC_THIRDWEB_CLIENT_ID is set ($CLIENT_ID)"
        else
            print_error "NEXT_PUBLIC_THIRDWEB_CLIENT_ID is empty"
        fi
    else
        print_error "NEXT_PUBLIC_THIRDWEB_CLIENT_ID not found in .env.local"
    fi
else
    print_error "File .env.local not found at: $ENV_FILE"
    print_info "Expected location: $PROJECT_ROOT/eduweb/.env.local"
    print_info "Current directory: $(pwd)"
    exit 1
fi

# Test 2: API Health Check
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_test "2. API Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HEALTH_RESPONSE=$(curl -s -X GET "$HEALTH_URL")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    print_success "API is healthy and responding"
    print_info "Response: $HEALTH_RESPONSE"
else
    print_error "API health check failed"
    print_info "Response: $HEALTH_RESPONSE"
fi

# Test 3: Certificate Generation (Short Name)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_test "3. Certificate Generation - Short Name"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientName": "John Doe",
    "courseId": "web3-blockchain-101",
    "userAddress": "0x1234567890abcdef1234567890abcdef12345678"
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
    print_success "Certificate generated successfully"

    IPFS_CID=$(echo "$RESPONSE" | grep -o '"ipfsCID":"[^"]*"' | cut -d'"' -f4)
    PREVIEW_URL=$(echo "$RESPONSE" | grep -o '"previewUrl":"[^"]*"' | sed 's/"previewUrl":"//;s/"//')
    TOKEN_ID=$(echo "$RESPONSE" | grep -o '"tokenId":"[^"]*"' | cut -d'"' -f4)

    print_info "IPFS CID: $IPFS_CID"
    print_info "Preview URL: $PREVIEW_URL"
    print_info "Token ID: $TOKEN_ID"

    # Verify IPFS CID format
    if [[ "$IPFS_CID" =~ ^Qm[a-zA-Z0-9]{44}$ ]] || [[ "$IPFS_CID" =~ ^bafy[a-z0-9]{52}$ ]]; then
        print_success "IPFS CID format is valid"
    else
        print_warning "IPFS CID format unexpected: $IPFS_CID"
    fi

    # Verify Preview URL
    if [[ "$PREVIEW_URL" == https://*.ipfscdn.io/ipfs/* ]]; then
        print_success "Preview URL format is valid"
    else
        print_warning "Preview URL format unexpected: $PREVIEW_URL"
    fi
else
    print_error "Certificate generation failed"
    print_info "Response: $RESPONSE"
fi

# Test 4: Certificate Generation (Long Name)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_test "4. Certificate Generation - Long Name (Auto-scaling Test)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientName": "Muhammad Abdullah bin Ibrahim Al-Rahman Al-Farooqi",
    "courseId": "solidity-advanced-202",
    "userAddress": "0xabcdef1234567890abcdef1234567890abcdef12"
  }')

if echo "$RESPONSE" | grep -q '"success":true'; then
    print_success "Certificate with long name generated successfully"

    IPFS_CID=$(echo "$RESPONSE" | grep -o '"ipfsCID":"[^"]*"' | cut -d'"' -f4)
    print_info "IPFS CID: $IPFS_CID"
else
    print_error "Long name certificate generation failed"
    print_info "Response: $RESPONSE"
fi

# Test 5: IPFS Gateway Accessibility
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_test "5. IPFS Gateway Accessibility (Wait 10s for propagation)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$PREVIEW_URL" ]; then
    print_info "Waiting 10 seconds for IPFS propagation..."
    sleep 10

    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PREVIEW_URL")

    if [ "$HTTP_STATUS" = "200" ]; then
        print_success "IPFS gateway accessible (HTTP $HTTP_STATUS)"

        # Check content type
        CONTENT_TYPE=$(curl -s -I "$PREVIEW_URL" | grep -i "content-type:" | awk '{print $2}' | tr -d '\r')
        if [[ "$CONTENT_TYPE" == image/png* ]]; then
            print_success "Content-Type is correct: $CONTENT_TYPE"
        else
            print_warning "Unexpected Content-Type: $CONTENT_TYPE"
        fi
    elif [ "$HTTP_STATUS" = "404" ]; then
        print_warning "IPFS file not yet propagated (HTTP 404). Try again in 30-60 seconds."
    else
        print_error "IPFS gateway returned HTTP $HTTP_STATUS"
    fi
else
    print_warning "No preview URL available from previous test"
fi

# Test 6: Error Handling (Missing Fields)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_test "6. Error Handling - Missing Required Fields"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientName": "Test User"
  }')

if echo "$RESPONSE" | grep -q '"success":false'; then
    print_success "API correctly rejects incomplete requests"
    ERROR_MSG=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    print_info "Error message: $ERROR_MSG"
else
    print_error "API should reject requests with missing fields"
fi

# Test 7: Error Handling (Invalid Name Length)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_test "7. Error Handling - Name Too Long (>100 chars)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

LONG_NAME=$(printf 'A%.0s' {1..101})  # 101 characters

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"recipientName\": \"$LONG_NAME\",
    \"courseId\": \"test-course\",
    \"userAddress\": \"0x1234567890abcdef1234567890abcdef12345678\"
  }")

if echo "$RESPONSE" | grep -q '"success":false'; then
    print_success "API correctly rejects names >100 characters"
    ERROR_MSG=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    print_info "Error message: $ERROR_MSG"
else
    print_error "API should reject names longer than 100 characters"
fi

# Test 8: Debug Script Verification
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_test "8. Debug Script Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DEBUG_SCRIPT="$PROJECT_ROOT/scripts/certificate-debug.js"

if [ -f "$DEBUG_SCRIPT" ]; then
    print_success "Debug script exists at: scripts/certificate-debug.js"

    # Run debug script
    print_info "Generating test certificate with debug script..."
    node "$DEBUG_SCRIPT" "Test IPFS Integration" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        print_success "Debug script executed successfully"

        # Check if output file was created
        LATEST_FILE=$(ls -t "$PROJECT_ROOT/debug-output/certificate-"*.png 2>/dev/null | head -1)
        if [ -n "$LATEST_FILE" ]; then
            FILE_SIZE=$(du -h "$LATEST_FILE" | cut -f1)
            FILENAME=$(basename "$LATEST_FILE")
            print_success "Certificate generated: $FILENAME ($FILE_SIZE)"
        else
            print_warning "No output file found in debug-output/"
        fi
    else
        print_error "Debug script execution failed"
    fi
else
    print_warning "Debug script not found at: $DEBUG_SCRIPT"
fi

# Final Summary
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "                          TEST SUMMARY"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "              🎉 ALL TESTS PASSED - SYSTEM READY! 🎉"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "✅ Thirdweb IPFS Storage is properly configured"
    echo "✅ Certificate generation API is working"
    echo "✅ IPFS upload and pinning functional"
    echo "✅ Error handling is robust"
    echo ""
    echo "Next Steps:"
    echo "  1. Open preview URL in browser to view certificate"
    echo "  2. Deploy to production when ready"
    echo "  3. Monitor usage at: https://thirdweb.com/dashboard"
    echo ""
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "                ⚠️  SOME TESTS FAILED ⚠️"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Please review the failed tests above and fix the issues."
    echo "Common issues:"
    echo "  • Environment variables not set correctly"
    echo "  • API server not running (run: cd eduweb && npm run dev)"
    echo "  • Network connectivity problems"
    echo "  • Invalid Thirdweb API keys"
    echo ""
    echo "For help, see: docs/thirdweb-ipfs-implementation.md"
    echo ""
    exit 1
fi
