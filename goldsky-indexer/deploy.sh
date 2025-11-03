#!/bin/bash

# Enable exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Constants
SUBGRAPH_DIR="./subgraph-custom"
CONFIG_DIR="$SUBGRAPH_DIR/configs"
CONFIG_FILE="$CONFIG_DIR/eduverse-subgraph.json"
ABI_TARGET_DIR="$SUBGRAPH_DIR/abis"
ABI_SOURCE_DIR="../abis"
ENV_FILE="../.env.local"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  EduVerse Goldsky Subgraph Deployment${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if validation should be skipped
SKIP_VALIDATION=false
if [ "$1" == "--skip-validation" ]; then
    SKIP_VALIDATION=true
    echo -e "${YELLOW}Skipping validation...${NC}"
fi

# Run validation unless skipped
if [ "$SKIP_VALIDATION" = false ]; then
    echo -e "${BLUE}Running validation...${NC}"
    ./validate.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}Validation failed. Fix errors before deploying.${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}Starting deployment...${NC}"

# 1. Create abis directory if it doesn't exist
if [ ! -d "$ABI_TARGET_DIR" ]; then
    echo -e "${BLUE}Creating ABI directory...${NC}"
    mkdir -p "$ABI_TARGET_DIR"
fi

# 2. Copy & rename ABI files
echo -e "${BLUE}Copying ABI files...${NC}"
cp "$ABI_SOURCE_DIR/CourseFactory.json" "$ABI_TARGET_DIR/coursefactory.json"
cp "$ABI_SOURCE_DIR/CourseLicense.json" "$ABI_TARGET_DIR/courselicense.json"
cp "$ABI_SOURCE_DIR/ProgressTracker.json" "$ABI_TARGET_DIR/progresstracker.json"
cp "$ABI_SOURCE_DIR/CertificateManager.json" "$ABI_TARGET_DIR/certificatemanager.json"

# 3. Load configuration
echo -e "${BLUE}Loading configuration...${NC}"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}Configuration file not found: $CONFIG_FILE${NC}"
    exit 1
fi

VERSION=$(jq -r '.version' "$CONFIG_FILE")
NAME=$(jq -r '.name' "$CONFIG_FILE")

echo -e "${BLUE}Deploying:${NC}"
echo -e "  Name: $NAME"
echo -e "  Version: $VERSION"

# 4. Change to subgraph directory
cd "$SUBGRAPH_DIR"

# 5. Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install
fi

# 6. Generate types
echo -e "${BLUE}Generating types...${NC}"
npm run codegen

# 7. Build subgraph
echo -e "${BLUE}Building subgraph...${NC}"
npm run build

# 8. Deploy to Goldsky
echo -e "${BLUE}Deploying to Goldsky...${NC}"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
fi

if [ -z "$GOLDSKY_API_KEY" ]; then
    echo -e "${RED}Error: GOLDSKY_API_KEY not set in $ENV_FILE${NC}"
    exit 1
fi

# Deploy using Goldsky CLI
DEPLOYMENT_NAME="${NAME}/v${VERSION}"
echo -e "${BLUE}Deploying as: $DEPLOYMENT_NAME${NC}"

goldsky subgraph deploy "$DEPLOYMENT_NAME" --path .

# Update project endpoint if project ID is set
if [ ! -z "$GOLDSKY_PROJECT_ID" ]; then
    echo -e "${BLUE}Updating project endpoint...${NC}"
    goldsky project:update "$GOLDSKY_PROJECT_ID" --subgraph "$DEPLOYMENT_NAME"
fi

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${BLUE}================================================${NC}"

# Return to original directory
cd -

exit 0
