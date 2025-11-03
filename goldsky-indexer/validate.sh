#!/bin/bash

# set -e disabled to allow arithmetic operations that may return non-zero
set +e  # Temporarily disable exit on error for arithmetic operations

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Updated paths for new directory structure
SUBGRAPH_DIR="./subgraph-custom"
CONFIG_FILE="$SUBGRAPH_DIR/configs/eduverse-subgraph.json"
ABI_SOURCE_DIR="../abis"
ABI_TARGET_DIR="$SUBGRAPH_DIR/abis"
ENV_FILE="../.env.local"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  EduVerse Goldsky Subgraph Validation${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check 1: Goldsky CLI
echo -e "${YELLOW}[1/9]${NC} Checking Goldsky CLI..."
if ! command -v goldsky &> /dev/null; then
    echo -e "${RED}✗ Goldsky CLI not found${NC}"
    echo -e "${YELLOW}  Install: curl https://goldsky.com | sh${NC}"
    ERRORS=$((ERRORS + 1))
else
    GOLDSKY_VERSION=$(goldsky --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✓ Goldsky CLI installed${NC} (${GOLDSKY_VERSION})"
fi
echo ""

# Check 2: Config file
echo -e "${YELLOW}[2/9]${NC} Validating configuration file..."
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}✗ Config file not found: $CONFIG_FILE${NC}"
    ERRORS=$((ERRORS + 1))
else
    if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
        echo -e "${RED}✗ Invalid JSON in config file${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓ Config file is valid JSON${NC}"

        # Check config structure
        VERSION=$(jq -r '.version' "$CONFIG_FILE")
        NAME=$(jq -r '.name' "$CONFIG_FILE")
        echo -e "${BLUE}  Version: ${VERSION}${NC}"
        echo -e "${BLUE}  Name: ${NAME}${NC}"
    fi
fi
echo ""

# Check 3: Source ABI files
echo -e "${YELLOW}[3/9]${NC} Checking source ABI files..."
if [ ! -d "$ABI_SOURCE_DIR" ]; then
    echo -e "${RED}✗ Source ABI directory not found: $ABI_SOURCE_DIR${NC}"
    ERRORS=$((ERRORS + 1))
else
    ABI_FILES=("CourseFactory.json" "CourseLicense.json" "ProgressTracker.json" "CertificateManager.json")
    for abi in "${ABI_FILES[@]}"; do
        if [ ! -f "$ABI_SOURCE_DIR/$abi" ]; then
            echo -e "${RED}✗ Missing: $abi${NC}"
            ERRORS=$((ERRORS + 1))
        else
            if ! jq empty "$ABI_SOURCE_DIR/$abi" 2>/dev/null; then
                echo -e "${RED}✗ Invalid JSON: $abi${NC}"
                ERRORS=$((ERRORS + 1))
            else
                SIZE=$(du -h "$ABI_SOURCE_DIR/$abi" | cut -f1)
                echo -e "${GREEN}✓ $abi${NC} (${SIZE})"
            fi
        fi
    done
fi
echo ""

# Check 4: Target ABI directory setup
echo -e "${YELLOW}[4/9]${NC} Checking target ABI directory..."
if [ ! -d "$ABI_TARGET_DIR" ]; then
    echo -e "${YELLOW}⚠ Target ABI directory will be created${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    TARGET_FILES=("coursefactory.json" "courselicense.json" "progresstracker.json" "certificatemanager.json")
    MISSING=0
    for abi in "${TARGET_FILES[@]}"; do
        if [ ! -f "$ABI_TARGET_DIR/$abi" ]; then
            MISSING=$((MISSING + 1))
        fi
    done

    if [ $MISSING -eq 0 ]; then
        echo -e "${GREEN}✓ All 4 ABI files present${NC}"
    else
        echo -e "${YELLOW}⚠ $MISSING ABI file(s) missing (will be copied during deployment)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
fi
echo ""

# Check 5: Environment variables
echo -e "${YELLOW}[5/9]${NC} Checking environment variables..."
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}✗ Environment file not found: $ENV_FILE${NC}"
    ERRORS=$((ERRORS + 1))
else
    GOLDSKY_API_KEY=$(grep "^GOLDSKY_API_KEY=" "$ENV_FILE" | cut -d '=' -f2)
    GOLDSKY_PROJECT_ID=$(grep "^GOLDSKY_PROJECT_ID=" "$ENV_FILE" | cut -d '=' -f2)

    if [ -z "$GOLDSKY_API_KEY" ]; then
        echo -e "${RED}✗ GOLDSKY_API_KEY not set${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓ GOLDSKY_API_KEY set${NC}"
    fi

    if [ -z "$GOLDSKY_PROJECT_ID" ]; then
        echo -e "${YELLOW}⚠ GOLDSKY_PROJECT_ID not set (endpoint URL may not be updated)${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✓ GOLDSKY_PROJECT_ID set${NC}"
    fi
fi
echo ""

# Check 6: Contract addresses
echo -e "${YELLOW}[6/9]${NC} Validating contract addresses..."
if [ -f "$CONFIG_FILE" ]; then
    COUNT=0
    INVALID=0

    for addr in $(jq -r '.instances[].address' "$CONFIG_FILE"); do
        COUNT=$((COUNT + 1))
        if [[ ! $addr =~ ^0x[a-fA-F0-9]{40}$ ]]; then
            echo -e "${RED}✗ Invalid address format: $addr${NC}"
            ERRORS=$((ERRORS + 1))
            INVALID=$((INVALID + 1))
        fi
    done

    if [ $INVALID -eq 0 ]; then
        echo -e "${GREEN}✓ All $COUNT contract addresses valid${NC}"
    fi
fi
echo ""

# Check 7: Start blocks
echo -e "${YELLOW}[7/9]${NC} Validating start blocks..."
if [ -f "$CONFIG_FILE" ]; then
    echo -e "${BLUE}Contract start blocks:${NC}"
    jq -r '.instances[] | "  \(.address | .[0:10])... → Block \(.startBlock) (\(.chain))"' "$CONFIG_FILE"

    MIN_BLOCK=$(jq '[.instances[].startBlock] | min' "$CONFIG_FILE")
    if [ "$MIN_BLOCK" -lt 5326000 ]; then
        echo -e "${YELLOW}⚠ Start block seems low ($MIN_BLOCK) - verify deployment blocks${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✓ Start blocks look reasonable${NC}"
    fi
fi
echo ""

# Check 8: Network configuration
echo -e "${YELLOW}[8/9]${NC} Checking network configuration..."
if [ -f "$CONFIG_FILE" ]; then
    CHAINS=$(jq -r '.instances[].chain' "$CONFIG_FILE" | sort -u)
    echo -e "${BLUE}Networks:${NC}"
    echo "$CHAINS" | sed 's/^/  /'

    CHAIN_COUNT=$(echo "$CHAINS" | wc -l)
    if [ "$CHAIN_COUNT" -gt 1 ]; then
        echo -e "${YELLOW}⚠ Multiple chains detected - ensure this is intentional${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✓ Single network deployment${NC}"
    fi
fi
echo ""

# Check 9: TypeScript setup
echo -e "${YELLOW}[9/9]${NC} Checking TypeScript setup..."
if [ ! -f "$SUBGRAPH_DIR/tsconfig.json" ]; then
    echo -e "${RED}✗ tsconfig.json not found${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ tsconfig.json present${NC}"
fi

if [ ! -f "$SUBGRAPH_DIR/package.json" ]; then
    echo -e "${RED}✗ package.json not found${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ package.json present${NC}"
fi

if [ ! -d "$SUBGRAPH_DIR/src/mappings" ]; then
    echo -e "${RED}✗ src/mappings directory not found${NC}"
    ERRORS=$((ERRORS + 1))
else
    MAPPING_COUNT=$(find "$SUBGRAPH_DIR/src/mappings" -name "*.ts" | wc -l)
    echo -e "${GREEN}✓ Found $MAPPING_COUNT mapping files${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}================================================${NC}"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}  ✓ All checks passed!${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}  ⚠ Validation passed with ${WARNINGS} warning(s)${NC}"
else
    echo -e "${RED}  ✗ Validation failed: ${ERRORS} error(s), ${WARNINGS} warning(s)${NC}"
fi
echo -e "${BLUE}================================================${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}Please fix the errors above before deploying${NC}"
    exit 1
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Warnings detected - review before deploying${NC}"
fi

exit 0
