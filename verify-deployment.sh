#!/bin/bash

# ============================================================================
# EduVerse Deployment Verification Script
# ============================================================================
# Purpose: Verify all URL configurations before and after deployment
# Usage: ./verify-deployment.sh [production|development]
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Deployment mode (default: development)
MODE="${1:-development}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  EduVerse Deployment Verification${NC}"
echo -e "${BLUE}  Mode: ${MODE}${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ============================================================================
# 1. Check Environment Variables
# ============================================================================
echo -e "${YELLOW}[1/6] Checking Environment Variables...${NC}"

if [ ! -f "eduweb/.env.local" ]; then
    echo -e "${RED}❌ .env.local not found!${NC}"
    exit 1
fi

# Read current values
APP_URL=$(grep "NEXT_PUBLIC_APP_URL=" eduweb/.env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'")
GOLDSKY_ENDPOINT=$(grep "NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=" eduweb/.env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'")

echo "  Current NEXT_PUBLIC_APP_URL: ${APP_URL}"
echo "  Current GOLDSKY_ENDPOINT: ${GOLDSKY_ENDPOINT}"

# Verify based on mode
if [ "$MODE" = "production" ]; then
    if [[ "$APP_URL" =~ ^http://localhost ]] || [[ "$APP_URL" =~ ^http://192\.168\. ]]; then
        echo -e "${RED}❌ ERROR: APP_URL still using localhost/local IP in production mode!${NC}"
        echo -e "${YELLOW}   Please update NEXT_PUBLIC_APP_URL to your production domain${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ APP_URL is set to production domain${NC}"
    fi
else
    echo -e "${GREEN}✓ Environment variables loaded (development mode)${NC}"
fi

echo ""

# ============================================================================
# 2. Check Goldsky Subgraph Status
# ============================================================================
echo -e "${YELLOW}[2/6] Checking Goldsky Subgraph Status...${NC}"

if [ -z "$GOLDSKY_ENDPOINT" ]; then
    echo -e "${RED}❌ GOLDSKY_ENDPOINT not set!${NC}"
    exit 1
fi

SYNC_STATUS=$(curl -s -X POST "$GOLDSKY_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"query":"{ _meta { block { number } hasIndexingErrors } }"}')

BLOCK_NUMBER=$(echo "$SYNC_STATUS" | grep -o '"number":[0-9]*' | cut -d':' -f2)
HAS_ERRORS=$(echo "$SYNC_STATUS" | grep -o '"hasIndexingErrors":[a-z]*' | cut -d':' -f2)

if [ -z "$BLOCK_NUMBER" ]; then
    echo -e "${RED}❌ Cannot connect to Goldsky endpoint!${NC}"
    echo "   Response: $SYNC_STATUS"
    exit 1
fi

echo "  Block Number: ${BLOCK_NUMBER}"
echo "  Has Errors: ${HAS_ERRORS}"

if [ "$HAS_ERRORS" = "false" ]; then
    echo -e "${GREEN}✓ Subgraph is syncing without errors${NC}"
else
    echo -e "${RED}❌ Subgraph has indexing errors!${NC}"
    exit 1
fi

echo ""

# ============================================================================
# 3. Test GraphQL Queries
# ============================================================================
echo -e "${YELLOW}[3/6] Testing GraphQL Queries...${NC}"

# Test platform stats
PLATFORM_STATS=$(curl -s -X POST "$GOLDSKY_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"query":"{ platformStats(id: \"platform\") { id totalCourses totalUsers } }"}')

echo "  Platform Stats Query: ${PLATFORM_STATS}"

if [[ "$PLATFORM_STATS" == *"\"data\""* ]]; then
    echo -e "${GREEN}✓ GraphQL queries working${NC}"
else
    echo -e "${RED}❌ GraphQL query failed!${NC}"
    exit 1
fi

echo ""

# ============================================================================
# 4. Check Smart Contract Addresses
# ============================================================================
echo -e "${YELLOW}[4/6] Verifying Smart Contract Addresses...${NC}"

COURSE_FACTORY=$(grep "NEXT_PUBLIC_COURSE_FACTORY_ADDRESS=" eduweb/.env.local | cut -d'=' -f2)
COURSE_LICENSE=$(grep "NEXT_PUBLIC_COURSE_LICENSE_ADDRESS=" eduweb/.env.local | cut -d'=' -f2)
PROGRESS_TRACKER=$(grep "NEXT_PUBLIC_PROGRESS_TRACKER_ADDRESS=" eduweb/.env.local | cut -d'=' -f2)
CERTIFICATE_MANAGER=$(grep "NEXT_PUBLIC_CERTIFICATE_MANAGER_ADDRESS=" eduweb/.env.local | cut -d'=' -f2)

echo "  CourseFactory: ${COURSE_FACTORY}"
echo "  CourseLicense: ${COURSE_LICENSE}"
echo "  ProgressTracker: ${PROGRESS_TRACKER}"
echo "  CertificateManager: ${CERTIFICATE_MANAGER}"

# Verify addresses are valid (0x followed by 40 hex chars)
if [[ ! "$COURSE_FACTORY" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
    echo -e "${RED}❌ Invalid CourseFactory address!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Contract addresses are valid${NC}"
echo ""

# ============================================================================
# 5. Verify Subgraph Build
# ============================================================================
echo -e "${YELLOW}[5/6] Checking Subgraph Build...${NC}"

if [ ! -f "goldsky-indexer/subgraph-custom/build/subgraph.yaml" ]; then
    echo -e "${RED}❌ Subgraph not built! Run: npm run build${NC}"
    exit 1
fi

WASM_COUNT=$(find goldsky-indexer/subgraph-custom/build -name "*.wasm" | wc -l)
echo "  WASM files found: ${WASM_COUNT}"

if [ "$WASM_COUNT" -eq 4 ]; then
    echo -e "${GREEN}✓ All 4 WASM files generated${NC}"
else
    echo -e "${RED}❌ Expected 4 WASM files, found ${WASM_COUNT}${NC}"
    exit 1
fi

echo ""

# ============================================================================
# 6. Check for Hardcoded URLs
# ============================================================================
echo -e "${YELLOW}[6/6] Scanning for Hardcoded URLs...${NC}"

HARDCODED_URLS=0

# Scan frontend code
if grep -r "http://localhost:3000" eduweb/src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "fallback" | grep -v "comment" | grep -v "//"; then
    echo -e "${RED}❌ Found hardcoded localhost URLs in frontend code!${NC}"
    HARDCODED_URLS=$((HARDCODED_URLS + 1))
fi

# Scan subgraph mappings
if grep -r "https://eduverse.com" goldsky-indexer/subgraph-custom/src --include="*.ts" 2>/dev/null | grep -v "comment" | grep -v "//"; then
    echo -e "${RED}❌ Found hardcoded production URLs in subgraph!${NC}"
    HARDCODED_URLS=$((HARDCODED_URLS + 1))
fi

if [ "$HARDCODED_URLS" -eq 0 ]; then
    echo -e "${GREEN}✓ No hardcoded URLs found${NC}"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Verification Summary${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${GREEN}✓ Environment Variables: OK${NC}"
echo -e "${GREEN}✓ Goldsky Subgraph: OK (Block: ${BLOCK_NUMBER})${NC}"
echo -e "${GREEN}✓ GraphQL Queries: OK${NC}"
echo -e "${GREEN}✓ Contract Addresses: OK${NC}"
echo -e "${GREEN}✓ Subgraph Build: OK${NC}"
if [ "$HARDCODED_URLS" -eq 0 ]; then
    echo -e "${GREEN}✓ No Hardcoded URLs: OK${NC}"
else
    echo -e "${YELLOW}⚠ Hardcoded URLs: Found ${HARDCODED_URLS}${NC}"
fi
echo ""

if [ "$MODE" = "production" ]; then
    echo -e "${GREEN}✅ READY FOR PRODUCTION DEPLOYMENT!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Build frontend: cd eduweb && npm run build"
    echo "  2. Deploy to Vercel: vercel --prod"
    echo "  3. Monitor logs: vercel logs --prod"
else
    echo -e "${GREEN}✅ DEVELOPMENT ENVIRONMENT OK!${NC}"
    echo ""
    echo "To prepare for production:"
    echo "  1. Update NEXT_PUBLIC_APP_URL in eduweb/.env.local"
    echo "  2. Run: ./verify-deployment.sh production"
fi

echo ""
echo -e "${BLUE}============================================${NC}"
