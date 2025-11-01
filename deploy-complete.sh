#!/bin/bash

# ============================================================================
# EduVerse Complete Deployment Script
# ============================================================================
# This script automates the entire deployment process:
# 1. Deploy smart contracts to Manta Pacific Sepolia
# 2. Update indexer configuration automatically
# 3. Build and deploy Goldsky indexer
# 4. Verify deployment success
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="/home/miku/Documents/Project/Web3/Eduverse"
INDEXER_DIR="$PROJECT_ROOT/goldsky-indexer/subgraph-custom"

# Version tracking
INDEXER_VERSION="1.4.0"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

print_header "🚀 EDUVERSE COMPLETE DEPLOYMENT SCRIPT"

print_info "Performing pre-flight checks..."

# Check required commands
check_command "node"
check_command "npm"
check_command "npx"
check_command "goldsky"

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/hardhat.config.js" ]; then
    print_error "hardhat.config.js not found. Are you in the correct directory?"
    exit 1
fi

# Check environment variables
if [ ! -f "$PROJECT_ROOT/eduweb/.env.local" ]; then
    print_warning ".env.local not found. Some features may not work correctly."
fi

print_success "Pre-flight checks completed"

# ============================================================================
# CONFIRMATION
# ============================================================================

print_header "⚠️  DEPLOYMENT CONFIRMATION"

echo "This script will:"
echo "  1. Clean and compile all smart contracts"
echo "  2. Deploy contracts to Manta Pacific Sepolia Testnet"
echo "  3. Verify contracts on block explorer"
echo "  4. Update indexer configuration automatically"
echo "  5. Build and deploy Goldsky indexer (version ${INDEXER_VERSION})"
echo ""
echo "Network: Manta Pacific Sepolia Testnet"
echo "Indexer Version: ${INDEXER_VERSION}"
echo ""

read -p "Do you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    print_warning "Deployment cancelled by user"
    exit 0
fi

# ============================================================================
# PHASE 1: SMART CONTRACT DEPLOYMENT
# ============================================================================

print_header "PHASE 1: SMART CONTRACT DEPLOYMENT"

cd "$PROJECT_ROOT"

# Clean previous builds
print_info "Cleaning previous builds..."
npm run clean || true
rm -rf artifacts cache

# Compile contracts
print_info "Compiling smart contracts..."
npx hardhat compile

if [ $? -ne 0 ]; then
    print_error "Contract compilation failed"
    exit 1
fi
print_success "Contracts compiled successfully"

# Deploy contracts
print_info "Deploying contracts to Manta Pacific Sepolia..."
npx hardhat run scripts/deploy.js --network mantaPacificTestnet

if [ $? -ne 0 ]; then
    print_error "Contract deployment failed"
    exit 1
fi
print_success "Contracts deployed successfully"

# Verify deployed-contracts.json exists
if [ ! -f "$PROJECT_ROOT/eduweb/deployed-contracts.json" ]; then
    print_error "deployed-contracts.json not found after deployment"
    exit 1
fi

# ============================================================================
# PHASE 2: UPDATE INDEXER CONFIGURATION
# ============================================================================

print_header "PHASE 2: UPDATE INDEXER CONFIGURATION"

print_info "Updating indexer configuration from deployed contracts..."
node "$PROJECT_ROOT/scripts/update-indexer-config.js"

if [ $? -ne 0 ]; then
    print_error "Indexer configuration update failed"
    exit 1
fi
print_success "Indexer configuration updated successfully"

# ============================================================================
# PHASE 3: BUILD AND DEPLOY INDEXER
# ============================================================================

print_header "PHASE 3: BUILD AND DEPLOY GOLDSKY INDEXER"

cd "$INDEXER_DIR"

# Clean previous builds
print_info "Cleaning previous indexer builds..."
rm -rf build generated

# Generate types
print_info "Generating AssemblyScript types..."
npm run codegen

if [ $? -ne 0 ]; then
    print_error "Codegen failed"
    exit 1
fi
print_success "Types generated successfully"

# Build subgraph
print_info "Building subgraph..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Subgraph build failed"
    exit 1
fi
print_success "Subgraph built successfully"

# Deploy to Goldsky
print_info "Deploying to Goldsky (version ${INDEXER_VERSION})..."
goldsky subgraph deploy "eduverse-manta-pacific-sepolia/${INDEXER_VERSION}" --path .

if [ $? -ne 0 ]; then
    print_error "Goldsky deployment failed"
    print_warning "You may need to authenticate first: goldsky login"
    exit 1
fi
print_success "Indexer deployed to Goldsky successfully"

# ============================================================================
# PHASE 4: VERIFICATION
# ============================================================================

print_header "PHASE 4: POST-DEPLOYMENT VERIFICATION"

# Wait for indexer to initialize
print_info "Waiting for indexer to initialize (10 seconds)..."
sleep 10

# Check indexer status
print_info "Checking indexer status..."
goldsky subgraph list | grep "eduverse-manta-pacific-sepolia/${INDEXER_VERSION}" || print_warning "Could not verify indexer status"

# Read deployed contracts
DEPLOYED_JSON="$PROJECT_ROOT/eduweb/deployed-contracts.json"

if [ -f "$DEPLOYED_JSON" ]; then
    print_success "Deployment data saved successfully"

    # Extract and display contract addresses
    COURSE_FACTORY=$(node -pe "JSON.parse(require('fs').readFileSync('$DEPLOYED_JSON')).courseFactory")
    COURSE_LICENSE=$(node -pe "JSON.parse(require('fs').readFileSync('$DEPLOYED_JSON')).courseLicense")
    PROGRESS_TRACKER=$(node -pe "JSON.parse(require('fs').readFileSync('$DEPLOYED_JSON')).progressTracker")
    CERTIFICATE_MANAGER=$(node -pe "JSON.parse(require('fs').readFileSync('$DEPLOYED_JSON')).certificateManager")

    echo ""
    print_info "Deployed Contract Addresses:"
    echo "  CourseFactory:      ${COURSE_FACTORY}"
    echo "  CourseLicense:      ${COURSE_LICENSE}"
    echo "  ProgressTracker:    ${PROGRESS_TRACKER}"
    echo "  CertificateManager: ${CERTIFICATE_MANAGER}"
fi

# ============================================================================
# COMPLETION
# ============================================================================

print_header "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY"

echo "All phases completed successfully!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Wait 2-5 minutes for indexer to fully sync"
echo "   Check status: goldsky subgraph list"
echo ""
echo "2. Verify indexer health:"
echo "   https://app.goldsky.com/dashboard/eduverse-manta-pacific-sepolia"
echo ""
echo "3. Update frontend .env.local (if not auto-updated):"
echo "   NEXT_PUBLIC_GOLDSKY_GRAPHQL_ENDPOINT=https://api.goldsky.com/api/public/project_cmezpe79yxzxt01sxhkaz5fq2/subgraphs/eduverse-manta-pacific-sepolia/${INDEXER_VERSION}/gn"
echo ""
echo "4. Restart frontend development server:"
echo "   cd eduweb && rm -rf .next && npm run dev"
echo ""
echo "5. Test the following:"
echo "   - Create a new course"
echo "   - Add sections"
echo "   - Delete course (verify sections are deleted)"
echo "   - Check Goldsky queries return correct data"
echo ""
echo "📊 Monitoring:"
echo "   - Goldsky Dashboard: https://app.goldsky.com"
echo "   - Block Explorer: https://pacific-explorer.sepolia-testnet.manta.network"
echo ""
echo "📝 Deployment Summary:"
echo "   - Contracts: ✅ Deployed and Verified"
echo "   - Indexer: ✅ Built and Deployed (v${INDEXER_VERSION})"
echo "   - Configuration: ✅ Auto-Updated"
echo ""
print_success "Deployment script completed successfully!"
echo ""

# Return to project root
cd "$PROJECT_ROOT"

exit 0
