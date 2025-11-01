#!/bin/bash

# ============================================================================
# Goldsky 404 Error Fix Script
# ============================================================================
# This script automatically fixes the Goldsky GraphQL endpoint 404 error
# by retrieving the correct endpoint and updating .env.local
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Goldsky 404 Error Fix Script${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

cd "$(dirname "$0")/.."

echo -e "${YELLOW}[1/6] Checking Goldsky CLI...${NC}"
if ! command -v goldsky &> /dev/null; then
    echo -e "${RED}❌ Goldsky CLI not found. Install: npm install -g @goldsky/cli${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Goldsky CLI found${NC}"
echo ""

echo -e "${YELLOW}[2/6] Retrieving deployed subgraph endpoint...${NC}"
cd ../goldsky-indexer/subgraph-custom

SUBGRAPH_LIST=$(goldsky subgraph list 2>&1)

if echo "$SUBGRAPH_LIST" | grep -q "eduverse-manta-pacific-sepolia"; then
    ENDPOINT=$(echo "$SUBGRAPH_LIST" | grep -oP 'GraphQL API: \K.*(?=\s|$)' | head -1)

    if [ -z "$ENDPOINT" ]; then
        echo -e "${RED}❌ Could not extract GraphQL endpoint from goldsky output${NC}"
        echo ""
        echo "Raw output:"
        echo "$SUBGRAPH_LIST"
        exit 1
    fi

    echo -e "${GREEN}✅ Found endpoint:${NC}"
    echo -e "${BLUE}   $ENDPOINT${NC}"
else
    echo -e "${RED}❌ No deployed subgraph found${NC}"
    echo ""
    echo "Please deploy the subgraph first:"
    echo "  cd goldsky-indexer/subgraph-custom"
    echo "  npm run codegen && npm run build"
    echo "  goldsky subgraph deploy eduverse-manta-pacific-sepolia/1.4.0 --path ."
    exit 1
fi
echo ""

cd ../../eduweb

echo -e "${YELLOW}[3/6] Updating .env.local...${NC}"

if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  .env.local not found, creating...${NC}"
    touch .env.local
fi

if grep -q "NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT" .env.local; then
    sed -i.bak "s|NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=.*|NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=$ENDPOINT|" .env.local
    echo -e "${GREEN}✅ Updated existing endpoint${NC}"
else
    echo "" >> .env.local
    echo "# Goldsky GraphQL Endpoint (auto-configured)" >> .env.local
    echo "NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=$ENDPOINT" >> .env.local
    echo -e "${GREEN}✅ Added new endpoint${NC}"
fi
echo ""

echo -e "${YELLOW}[4/6] Verifying endpoint connectivity...${NC}"
CURL_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ _meta { block { number } hasIndexingErrors } }"}' \
  "$ENDPOINT")

if echo "$CURL_RESPONSE" | grep -q '"data"'; then
    BLOCK_NUMBER=$(echo "$CURL_RESPONSE" | grep -oP '"number":\K[0-9]+' | head -1)
    HAS_ERRORS=$(echo "$CURL_RESPONSE" | grep -oP '"hasIndexingErrors":\K(true|false)' | head -1)

    echo -e "${GREEN}✅ Endpoint is reachable${NC}"
    echo -e "${BLUE}   Block: $BLOCK_NUMBER${NC}"
    echo -e "${BLUE}   Indexing Errors: $HAS_ERRORS${NC}"
else
    echo -e "${RED}❌ Endpoint returned invalid response${NC}"
    echo "Response: $CURL_RESPONSE"
    exit 1
fi
echo ""

echo -e "${YELLOW}[5/6] Clearing Next.js cache...${NC}"
if [ -d .next ]; then
    rm -rf .next
    echo -e "${GREEN}✅ Cleared .next cache${NC}"
else
    echo -e "${BLUE}ℹ️  No .next cache found${NC}"
fi
echo ""

echo -e "${YELLOW}[6/6] Final verification...${NC}"
echo ""
echo -e "${GREEN}✅ Configuration complete!${NC}"
echo ""
echo -e "${BLUE}Current .env.local configuration:${NC}"
grep "NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT" .env.local | sed 's/^/   /'
echo ""

echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}Next Steps:${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "1. ${YELLOW}Restart your Next.js dev server:${NC}"
echo -e "   ${BLUE}Ctrl+C${NC} (in dev terminal)"
echo -e "   ${BLUE}npm run dev${NC}"
echo ""
echo -e "2. ${YELLOW}Clear browser cache:${NC}"
echo -e "   - Open DevTools (F12)"
echo -e "   - Right-click Reload → 'Empty Cache and Hard Reload'"
echo -e "   - Or use Incognito mode"
echo ""
echo -e "3. ${YELLOW}Test endpoints:${NC}"
echo -e "   - Server test: ${BLUE}http://localhost:3000/api/test-goldsky${NC}"
echo -e "   - Client test: ${BLUE}http://localhost:3000/test-env${NC}"
echo -e "   - Browse page: ${BLUE}http://localhost:3000/courses${NC}"
echo ""
echo -e "4. ${YELLOW}Expected results:${NC}"
echo -e "   - No 404 errors in console"
echo -e "   - 'Showing 0 of 0 courses' (until courses are created)"
echo -e "   - All filters and search UI work"
echo ""
echo -e "${GREEN}✅ Goldsky endpoint configuration fixed!${NC}"
echo -e "${BLUE}============================================================================${NC}"
