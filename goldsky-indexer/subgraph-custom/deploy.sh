#!/bin/bash
# ============================================================================
# EduVerse Subgraph Deployment Script v1.1.0
# ============================================================================
# This script handles deployment to both Goldsky and The Graph Studio
# with proper validation and error handling
# ============================================================================

# Exit on error
set -e

# Load environment variables
if [ -f .env ]; then
  source .env
else
  echo "⚠️  No .env file found. Using environment variables..."
fi

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to display step header
step() {
  echo -e "\n${BLUE}==>${NC} $1"
}

# Function to check if command exists
check_command() {
  if ! command -v $1 &> /dev/null; then
    echo -e "${RED}Error: $1 is required but not installed.${NC}"
    exit 1
  fi
}

# Validate requirements
step "Validating requirements..."
check_command node
check_command npm
check_command graph
check_command goldsky

# Clean previous builds
step "Cleaning previous builds..."
rm -rf generated/
rm -rf build/
npm run clean

# Install dependencies
step "Installing dependencies..."
npm install

# Run validation script
step "Validating events..."
npm run validate

# Generate types from schema and ABIs
step "Generating types..."
npm run codegen

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Type generation failed${NC}"
  exit 1
fi

# Build subgraph
step "Building subgraph..."
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Build failed${NC}"
  exit 1
fi

# Function to deploy to Goldsky
deploy_to_goldsky() {
  local env=$1
  local version=$2

  step "Deploying to Goldsky ($env)..."

  if [ -z "$GOLDSKY_API_KEY" ]; then
    echo -e "${RED}Error: GOLDSKY_API_KEY not set${NC}"
    exit 1
  }

  if [ "$env" == "prod" ]; then
    goldsky subgraph deploy eduverse/$version --path .
  else
    goldsky subgraph deploy eduverse-dev/$version --path .
  fi

  if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Goldsky deployment failed${NC}"
    exit 1
  }
}

# Function to deploy to The Graph Studio
deploy_to_graph_studio() {
  step "Deploying to The Graph Studio..."

  if [ -z "$GRAPH_DEPLOY_KEY" ]; then
    echo -e "${RED}Error: GRAPH_DEPLOY_KEY not set${NC}"
    exit 1
  }

  # Authenticate with The Graph
  graph auth --studio $GRAPH_DEPLOY_KEY

  # Deploy to The Graph Studio
  npm run deploy:studio

  if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Graph Studio deployment failed${NC}"
    exit 1
  }
}

# Parse command line arguments
ENV="dev"
VERSION="1.1.0"
PLATFORM="both"

while getopts "e:v:p:" opt; do
  case $opt in
    e) ENV="$OPTARG"
    ;;
    v) VERSION="$OPTARG"
    ;;
    p) PLATFORM="$OPTARG"
    ;;
    \?) echo "Invalid option -$OPTARG" >&2
    exit 1
    ;;
  esac
done

# Validate environment
if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
  echo -e "${RED}Error: Environment must be 'dev' or 'prod'${NC}"
  exit 1
fi

# Validate platform
if [ "$PLATFORM" != "goldsky" ] && [ "$PLATFORM" != "graph" ] && [ "$PLATFORM" != "both" ]; then
  echo -e "${RED}Error: Platform must be 'goldsky', 'graph', or 'both'${NC}"
  exit 1
fi

# Deploy based on platform selection
if [ "$PLATFORM" == "goldsky" ] || [ "$PLATFORM" == "both" ]; then
  deploy_to_goldsky $ENV $VERSION
fi

if [ "$PLATFORM" == "graph" ] || [ "$PLATFORM" == "both" ]; then
  if [ "$ENV" == "prod" ]; then
    deploy_to_graph_studio
  else
    echo -e "${YELLOW}Skipping Graph Studio deployment for dev environment${NC}"
  fi
fi

# Verify deployment
step "Verifying deployment..."
node scripts/verify-indexing.js

# Run performance tests
step "Running performance tests..."
npm run benchmark

echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"

# Show subgraph URLs
if [ "$PLATFORM" == "goldsky" ] || [ "$PLATFORM" == "both" ]; then
  echo -e "\n${BLUE}Goldsky Subgraph URL:${NC}"
  if [ "$ENV" == "prod" ]; then
    echo "https://api.goldsky.com/api/public/project_clhk4u90sqqrw39tcd6ux639f/subgraphs/eduverse/$VERSION"
  else
    echo "https://api.goldsky.com/api/public/project_clhk4u90sqqrw39tcd6ux639f/subgraphs/eduverse-dev/$VERSION"
  fi
fi

if [ "$PLATFORM" == "graph" ] || [ "$PLATFORM" == "both" ]; then
  if [ "$ENV" == "prod" ]; then
    echo -e "\n${BLUE}Graph Studio URL:${NC}"
    echo "https://thegraph.com/studio/subgraph/eduverse-manta-pacific"
  fi
fi

# Usage instructions
echo -e "\n${YELLOW}Usage:${NC}"
echo "- Development deployment:"
echo "  ./deploy.sh -e dev -v 1.1.0 -p goldsky"
echo "- Production deployment:"
echo "  ./deploy.sh -e prod -v 1.1.0 -p both"
