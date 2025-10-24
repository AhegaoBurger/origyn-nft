#!/bin/bash

# Quick Start Script for NFT Minting UI
# This script will set up everything you need to start minting NFTs locally

set -e

echo "🚀 Setting up NFT Minting Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v dfx &> /dev/null; then
    print_error "dfx is not installed. Please install the Internet Computer SDK first."
    echo "Visit: https://internetcomputer.org/docs/current/developer-docs/setup/install"
    exit 1
fi
print_status "dfx is installed"

if ! command -v cargo &> /dev/null; then
    print_error "Rust/Cargo is not installed. Please install Rust first."
    echo "Visit: https://rustup.rs/"
    exit 1
fi
print_status "Rust/Cargo is installed"

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi
print_status "Node.js is installed"

# Stop any existing dfx network
echo "🛑 Stopping any existing dfx network..."
dfx stop || true
sleep 2

# Start local dfx network
echo "🌐 Starting local dfx network..."
dfx start --background --clean
sleep 10

if ! dfx ping &> /dev/null; then
    print_error "Failed to start dfx network"
    exit 1
fi
print_status "Local dfx network is running"

# Build and deploy canisters
echo "🏗️  Building and deploying canisters..."
chmod +x scripts/deploy/local/deploy_all.sh
./scripts/deploy/local/deploy_all.sh

if [ $? -ne 0 ]; then
    print_error "Failed to deploy canisters"
    exit 1
fi
print_status "Canisters deployed successfully"

# Get canister IDs
CORE_NFT_ID=$(dfx canister id core_nft)
STORAGE_ID=$(dfx canister id storage)

echo "📝 Canister IDs:"
echo "   Core NFT: $CORE_NFT_ID"
echo "   Storage:   $STORAGE_ID"

# Setup UI
echo "🎨 Setting up React UI..."
cd ui

# Create .env file with actual canister IDs
cat > .env << EOF
REACT_APP_CORE_NFT_CANISTER_ID=$CORE_NFT_ID
REACT_APP_STORAGE_CANISTER_ID=$STORAGE_ID
REACT_APP_DFX_NETWORK=local
REACT_APP_DFX_HOST=http://localhost:4943
EOF

print_status "Environment variables configured"

# Install dependencies
echo "📦 Installing UI dependencies..."
npm install

if [ $? -ne 0 ]; then
    print_error "Failed to install npm dependencies"
    exit 1
fi
print_status "Dependencies installed"

# Test minting with CLI
echo "🪙 Testing CLI minting..."
cd ../cmdline

# Create test metadata
cat > test_metadata.json << EOF
{
  "name": "Test NFT",
  "description": "A test NFT created via CLI",
  "attributes": [
    {
      "trait_type": "created_by",
      "value": "quick_start_script"
    }
  ]
}
EOF

# Mint test NFT
echo "Minting test NFT..."
cargo run -- \
    --network local \
    --canister $CORE_NFT_ID \
    mint \
    --owner $(dfx identity get-principal) \
    --name "Test NFT" \
    --metadata "name:Test NFT" \
    --metadata "description:A test NFT created via CLI" \
    --metadata "created_by:quick_start_script"

if [ $? -eq 0 ]; then
    print_status "Test NFT minted successfully"
else
    print_warning "Test minting failed, but setup is complete"
fi

# Go back to UI directory
cd ../ui

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Start the React development server:"
echo "   cd ui && npm start"
echo ""
echo "2. Open your browser to: http://localhost:3000"
echo ""
echo "3. Click 'Connect Wallet' to connect to your local identity"
echo ""
echo "4. Start minting NFTs through the UI!"
echo ""
echo "🔧 Useful Commands:"
echo "   View canister logs: dfx canister logs core_nft"
echo "   View NFT collection: dfx canister call core_nft icrc7_owner_of '(principal \"$(dfx identity get-principal)\")'"
echo "   Stop local network: dfx stop"
echo ""
echo "📁 File Locations:"
echo "   UI Source: ./ui/src/"
echo "   Canister Code: ./src/"
echo "   CLI Tool: ./cmdline/"
echo ""
echo "🚀 Happy minting!"
