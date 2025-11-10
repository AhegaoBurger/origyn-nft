#!/bin/bash

# Script to deploy an NFT collection on local Internet Computer replica
# Usage: ./deploy_collection_local.sh

set -e  # Stop script on error

# Colors for messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Display local development info
display_info() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║            LOCAL DEVELOPMENT DEPLOYMENT                     ║${NC}"
    echo -e "${BLUE}╠══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║  This script will deploy to your local dfx replica         ║${NC}"
    echo -e "${BLUE}║                                                              ║${NC}"
    echo -e "${BLUE}║  - Deploys Internet Identity for authentication           ║${NC}"
    echo -e "${BLUE}║  - Deploys NFT canister with test mode                    ║${NC}"
    echo -e "${BLUE}║  - Adds cycles for storage operations                     ║${NC}"
    echo -e "${BLUE}║  - Perfect for testing and development                    ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check if dfx is installed
    if ! command -v dfx &> /dev/null; then
        print_error "dfx is not installed. Please install it from https://internetcomputer.org/docs/current/developer-docs/setup/install/"
        exit 1
    fi

    # Check if default identity exists
    if ! dfx identity whoami &> /dev/null; then
        print_error "No dfx identity configured. Please create an identity with 'dfx identity new <name>'"
        exit 1
    fi

    print_success "Prerequisites verified"
}

# Start local dfx replica
start_local_replica() {
    print_info "Checking local dfx replica status..."

    # Check if dfx is already running
    if dfx ping local &> /dev/null; then
        print_success "Local dfx replica is already running"
    else
        print_info "Starting local dfx replica in background..."
        dfx start --background --clean

        # Wait a few seconds for replica to be ready
        sleep 3

        if dfx ping local &> /dev/null; then
            print_success "Local dfx replica started successfully"
        else
            print_error "Failed to start local dfx replica"
            exit 1
        fi
    fi
}

# Deploy Internet Identity for authentication
deploy_internet_identity() {
    print_info "Deploying Internet Identity..."

    # dfx deps commands must run from project root where dfx.json exists
    cd ..

    # Initialize dfx dependencies system
    print_info "Initializing dfx dependencies..."
    if dfx deps init &> /dev/null; then
        print_success "Dependencies initialized"
    else
        print_warning "Dependencies already initialized or init failed"
    fi

    # Pull Internet Identity canister
    print_info "Pulling Internet Identity canister..."
    if dfx deps pull &> /dev/null; then
        print_success "Internet Identity canister pulled"
    else
        print_warning "Failed to pull Internet Identity, it may already be cached"
    fi

    # Deploy Internet Identity from dfx dependencies
    if dfx deps deploy internet_identity --network local; then
        print_success "Internet Identity deployed successfully"
        INTERNET_IDENTITY_CANISTER_ID=$(dfx canister id internet_identity --network local)
    else
        print_warning "Failed to deploy Internet Identity via deps, trying direct deployment..."
        # Fallback: Try to create and deploy as regular canister
        dfx canister create internet_identity --network local || true
        INTERNET_IDENTITY_CANISTER_ID=$(dfx canister id internet_identity --network local 2>/dev/null || echo "")

        if [ -z "$INTERNET_IDENTITY_CANISTER_ID" ]; then
            print_warning "Internet Identity deployment failed, authentication features may not work"
            INTERNET_IDENTITY_CANISTER_ID="rdmx6-jaaaa-aaaaa-aaadq-cai"  # Default local II canister ID
        fi
    fi

    # Return to example directory
    cd example

    export INTERNET_IDENTITY_CANISTER_ID
    print_info "Internet Identity Canister ID: $INTERNET_IDENTITY_CANISTER_ID"
}

# Setup environment variables
setup_environment() {
    print_info "Setting up environment variables..."

    # Ask for necessary information
    read -p "Collection name (e.g., MyCollection): " COLLECTION_NAME
    read -p "Collection symbol (e.g., MC): " COLLECTION_SYMBOL
    read -p "Collection description (optional): " COLLECTION_DESCRIPTION

    # Use default values if empty
    COLLECTION_NAME=${COLLECTION_NAME:-"MyCollection"}
    COLLECTION_SYMBOL=${COLLECTION_SYMBOL:-"MC"}
    COLLECTION_DESCRIPTION=${COLLECTION_DESCRIPTION:-"A beautiful NFT collection"}

    # Get current identity principal
    YOUR_PRINCIPAL_ID=$(dfx identity get-principal)
    IDENTITY_NAME=$(dfx identity whoami)

    # Export variables
    export COLLECTION_NAME
    export COLLECTION_SYMBOL
    export COLLECTION_DESCRIPTION
    export YOUR_PRINCIPAL_ID
    export IDENTITY_FILE="${IDENTITY_NAME}.pem"

    # Export identity to .pem file for CLI tool
    dfx identity export $IDENTITY_NAME > $IDENTITY_FILE

    print_success "Environment variables configured:"
    echo "  Collection: $COLLECTION_NAME ($COLLECTION_SYMBOL)"
    echo "  Description: $COLLECTION_DESCRIPTION"
    echo "  Principal: $YOUR_PRINCIPAL_ID"
    echo "  Identity: $IDENTITY_NAME"
}

# Deploy collection
deploy_collection() {
    print_info "Deploying NFT collection to local replica..."

    # Deploy canister with install mode (not reinstall for first deployment)
    if dfx deploy --network local nft --argument "(
        variant {
            Init = record {
                permissions = record {
                    user_permissions = vec {
                        record {
                            principal \"$YOUR_PRINCIPAL_ID\";
                            vec {
                                variant { UpdateMetadata };
                                variant { Minting };
                                variant { UpdateCollectionMetadata };
                                variant { UpdateUploads };
                                variant { ManageAuthorities };
                                variant { ReadUploads };
                            };
                        };
                    };
                };
                supply_cap = null;
                tx_window = null;
                test_mode = true;
                default_take_value = null;
                max_canister_storage_threshold = null;
                logo = null;
                permitted_drift = null;
                name = \"$COLLECTION_NAME\";
                description = opt \"$COLLECTION_DESCRIPTION\";
                version = record {
                    major = 1 : nat32;
                    minor = 1 : nat32;
                    patch = 1 : nat32;
                };
                max_take_value = null;
                max_update_batch_size = null;
                max_query_batch_size = null;
                commit_hash = \"$(git rev-parse HEAD 2>/dev/null || echo 'aaa')\";
                max_memo_size = null;
                atomic_batch_transfers = null;
                collection_metadata = vec {};
                symbol = \"$COLLECTION_SYMBOL\";
                approval_init = record {
                    max_approvals_per_token_or_collection = null;
                    max_revoke_approvals = null;
                };
            }
        }
    )"; then
        print_success "Collection deployed successfully!"

        # Get the canister ID
        CANISTER_ID=$(dfx canister id nft --network local)
        export CANISTER_ID
        print_info "Canister ID: $CANISTER_ID"
    else
        print_error "Deployment failed!"
        exit 1
    fi
}

# Add cycles to NFT canister for storage operations
fund_canister_cycles() {
    print_info "Adding cycles to NFT canister for storage operations..."

    # In local development, canisters need sufficient cycles to create storage subcanisters
    # The NFT canister requires 5T cycles to create each storage subcanister
    if dfx ledger fabricate-cycles --canister nft --t 10 --network local; then
        print_success "Added 10 trillion cycles to NFT canister"
        print_info "This allows the canister to create storage subcanisters for file uploads"
    else
        print_warning "Failed to add cycles. File uploads may fail."
        print_info "You can manually add cycles later with: dfx ledger fabricate-cycles --canister nft --t 10 --network local"
    fi
}

# Update canister_ids.json
update_canister_ids() {
    print_info "Updating canister_ids.json file..."

    # Get canister ID
    CANISTER_ID=$(dfx canister id nft --network local)

    # Create or update canister_ids.json
    cat > canister_ids.json << EOF
{
  "nft": {
    "local": "$CANISTER_ID"
  }
}
EOF

    print_success "canister_ids.json file updated"
}

# Build CLI tool
build_cli_tool() {
    print_info "Building CLI tool..."

    cd ../cmdline
    cargo build --release

    if [ -f "../target/release/origyn_icrc7_cmdlinetools" ]; then
        print_success "CLI tool built successfully"
    else
        print_error "Failed to build CLI tool"
        exit 1
    fi

    cd ../example
}

# Test file upload
test_upload() {
    print_info "Testing file upload..."

    # Check if test file exists
    if [ -f "origynlogo.png" ]; then
        print_info "Uploading origynlogo.png (this will create a storage subcanister)..."

        if ../target/release/origyn_icrc7_cmdlinetools \
            --network local \
            --identity "$IDENTITY_FILE" \
            --canister "$CANISTER_ID" \
            upload-file ./origynlogo.png origynlogo.png; then
            print_success "Upload test successful"
            print_info "A storage subcanister was automatically created by the NFT canister"
        else
            print_error "Upload test failed"
            print_warning "This is usually due to insufficient cycles. Make sure cycles were added successfully."
            print_info "You can retry the upload after adding more cycles:"
            print_info "  dfx ledger fabricate-cycles --canister nft --t 10 --network local"
        fi
    else
        print_warning "origynlogo.png file not found, upload test skipped"
    fi
}

# Setup NFT minting
setup_nft_minting() {
    print_info "Setting up NFT minting..."

    # Ask if user wants to mint NFTs
    read -p "Do you want to mint some NFTs now? (y/n): " MINT_NFTS

    if [[ $MINT_NFTS =~ ^[Yy]$ ]]; then
        # Ask for number of NFTs to mint
        read -p "How many NFTs do you want to mint? (default: 3): " NFT_COUNT
        NFT_COUNT=${NFT_COUNT:-3}

        # Ask for NFT type
        echo ""
        echo "NFT types available:"
        echo "1. Simple NFTs with basic metadata"
        echo "2. Interactive NFTs (you'll be prompted for each)"
        echo "3. Predefined collection (e.g., CryptoPunks style)"
        read -p "Choose NFT type (1-3): " NFT_TYPE

        case $NFT_TYPE in
            1)
                mint_simple_nfts
                ;;
            2)
                mint_interactive_nfts
                ;;
            3)
                mint_predefined_collection
                ;;
            *)
                print_warning "Invalid choice, skipping NFT minting"
                ;;
        esac
    else
        print_info "NFT minting skipped"
    fi
}

# Mint simple NFTs with basic metadata
mint_simple_nfts() {
    print_info "Minting $NFT_COUNT simple NFTs..."

    for i in $(seq 1 $NFT_COUNT); do
        print_info "Minting NFT #$i..."

        ../target/release/origyn_icrc7_cmdlinetools \
            --network local \
            --identity "$IDENTITY_FILE" \
            --canister "$CANISTER_ID" \
            mint \
            --owner "$YOUR_PRINCIPAL_ID" \
            --name "$COLLECTION_NAME #$i" \
            --metadata "description:This is NFT #$i from the $COLLECTION_NAME collection" \
            --metadata "rarity:Common" \
            --metadata "edition:$i" \
            --metadata "total_supply:$NFT_COUNT" \
            --memo "Minted via local deployment script"

        print_success "NFT #$i minted successfully"
    done
}

# Mint interactive NFTs
mint_interactive_nfts() {
    print_info "Minting $NFT_COUNT interactive NFTs..."

    for i in $(seq 1 $NFT_COUNT); do
        echo ""
        print_info "Creating NFT #$i..."

        read -p "NFT name: " NFT_NAME
        read -p "NFT description: " NFT_DESCRIPTION
        read -p "Rarity (Common/Rare/Epic/Legendary): " NFT_RARITY
        read -p "Special attribute (optional): " NFT_ATTRIBUTE

        NFT_NAME=${NFT_NAME:-"$COLLECTION_NAME #$i"}
        NFT_DESCRIPTION=${NFT_DESCRIPTION:-"Interactive NFT #$i"}
        NFT_RARITY=${NFT_RARITY:-"Common"}

        ../target/release/origyn_icrc7_cmdlinetools \
            --network local \
            --identity "$IDENTITY_FILE" \
            --canister "$CANISTER_ID" \
            mint \
            --owner "$YOUR_PRINCIPAL_ID" \
            --name "$NFT_NAME" \
            --metadata "description:$NFT_DESCRIPTION" \
            --metadata "rarity:$NFT_RARITY" \
            --metadata "edition:$i" \
            --metadata "total_supply:$NFT_COUNT" \
            --memo "Interactive NFT #$i"

        if [ ! -z "$NFT_ATTRIBUTE" ]; then
            ../target/release/origyn_icrc7_cmdlinetools \
                --network local \
                --identity "$IDENTITY_FILE" \
                --canister "$CANISTER_ID" \
                mint \
                --owner "$YOUR_PRINCIPAL_ID" \
                --name "$NFT_NAME" \
                --metadata "special:$NFT_ATTRIBUTE"
        fi

        print_success "Interactive NFT #$i minted successfully"
    done
}

# Mint predefined collection (CryptoPunks style)
mint_predefined_collection() {
    print_info "Minting predefined collection ($NFT_COUNT NFTs)..."

    # Predefined attributes for variety
    BACKGROUNDS=("Blue" "Purple" "Green" "Red" "Yellow" "Orange" "Pink" "Brown")
    SKIN_TONES=("Light" "Dark" "Medium" "Pale" "Tan")
    EYES=("Blue" "Green" "Brown" "Hazel" "Gray")
    HAIR=("Blonde" "Brown" "Black" "Red" "Gray" "Bald")
    ACCESSORIES=("Hat" "Glasses" "Earring" "Necklace" "Scarf" "None")

    for i in $(seq 1 $NFT_COUNT); do
        print_info "Minting NFT #$i..."

        # Generate random attributes
        BACKGROUND=${BACKGROUNDS[$((RANDOM % ${#BACKGROUNDS[@]}))]}
        SKIN_TONE=${SKIN_TONES[$((RANDOM % ${#SKIN_TONES[@]}))]}
        EYE_COLOR=${EYES[$((RANDOM % ${#EYES[@]}))]}
        HAIR_COLOR=${HAIR[$((RANDOM % ${#HAIR[@]}))]}
        ACCESSORY=${ACCESSORIES[$((RANDOM % ${#ACCESSORIES[@]}))]}

        # Determine rarity based on attributes
        RARITY="Common"
        if [[ "$ACCESSORY" != "None" ]]; then
            RARITY="Rare"
        fi
        if [[ "$BACKGROUND" == "Purple" && "$ACCESSORY" != "None" ]]; then
            RARITY="Epic"
        fi
        if [[ "$BACKGROUND" == "Purple" && "$ACCESSORY" == "Hat" && "$HAIR_COLOR" == "Red" ]]; then
            RARITY="Legendary"
        fi

        ../target/release/origyn_icrc7_cmdlinetools \
            --network local \
            --identity "$IDENTITY_FILE" \
            --canister "$CANISTER_ID" \
            mint \
            --owner "$YOUR_PRINCIPAL_ID" \
            --name "$COLLECTION_NAME #$i" \
            --metadata "description:A unique character from the $COLLECTION_NAME collection" \
            --metadata "rarity:$RARITY" \
            --metadata "background:$BACKGROUND" \
            --metadata "skin_tone:$SKIN_TONE" \
            --metadata "eye_color:$EYE_COLOR" \
            --metadata "hair_color:$HAIR_COLOR" \
            --metadata "accessory:$ACCESSORY" \
            --metadata "edition:$i" \
            --metadata "total_supply:$NFT_COUNT" \
            --memo "Predefined collection NFT #$i"

        print_success "NFT #$i minted successfully (Rarity: $RARITY)"
    done
}

# Setup UI configuration (optional)
setup_ui_config() {
    print_info "Setting up UI configuration..."

    # Ask if user wants to configure the UI
    read -p "Do you want to generate UI configuration files? (y/n): " SETUP_UI

    if [[ $SETUP_UI =~ ^[Yy]$ ]]; then
        # Check if UI directory exists
        if [ -d "../ui" ]; then
            # Change to project root directory
            cd ..

            # Ensure build script has run to download storage WASM
            print_info "Checking for storage canister WASM files..."
            if [ ! -f "src/storage_canister/wasm/storage_canister_canister.wasm.gz" ]; then
                print_info "Building canisters and downloading storage WASM..."
                if ./scripts/build.sh; then
                    print_success "Build completed"
                else
                    print_warning "Build script failed, continuing anyway..."
                fi
            fi

            # Generate declarations for core_nft
            print_info "Generating declarations for core_nft..."
            if dfx generate core_nft --network local; then
                print_success "core_nft declarations generated"
            else
                print_warning "Failed to generate core_nft declarations"
            fi

            # Generate declarations for storage
            print_info "Generating declarations for storage..."
            if dfx generate storage --network local; then
                print_success "storage declarations generated"
            else
                print_warning "Failed to generate storage declarations"
            fi

            # Create UI declarations directory
            mkdir -p ui/src/declarations

            # Copy core_nft declarations
            if [ -d "src/core_nft/api/declarations" ]; then
                print_info "Copying core_nft declarations to UI..."
                cp -r src/core_nft/api/declarations ui/src/declarations/core_nft
                print_success "core_nft declarations copied to ui/src/declarations/core_nft"
            else
                print_error "core_nft declarations not found at src/core_nft/api/declarations"
            fi

            # Copy storage declarations
            if [ -d "src/storage_canister/api/declarations" ]; then
                print_info "Copying storage declarations to UI..."
                cp -r src/storage_canister/api/declarations ui/src/declarations/storage
                print_success "storage declarations copied to ui/src/declarations/storage"
            else
                print_error "storage declarations not found at src/storage_canister/api/declarations"
            fi

            # Get storage canister ID (if deployed)
            STORAGE_CANISTER_ID=$(dfx canister id storage --network local 2>/dev/null || echo "not_deployed")

            # Generate ui/.env.local file
            print_info "Generating ui/.env.local file..."
            cat > ui/.env.local << EOF
REACT_APP_INTERNET_IDENTITY_CANISTER_ID=$INTERNET_IDENTITY_CANISTER_ID
REACT_APP_CORE_NFT_CANISTER_ID=$CANISTER_ID
REACT_APP_STORAGE_CANISTER_ID=$STORAGE_CANISTER_ID
REACT_APP_DFX_NETWORK=local
REACT_APP_DFX_HOST=http://localhost:4943
EOF

            print_success "UI environment file created at ui/.env.local"

            # Return to example directory
            cd example

            print_success "UI configuration complete"
            print_info "You can now run the UI with: cd ../ui && npm start"
        else
            print_warning "UI directory not found at ../ui, skipping UI configuration"
        fi
    else
        print_info "UI configuration skipped"
    fi
}

# Display final information
show_final_info() {
    print_success "=== LOCAL DEPLOYMENT COMPLETED ==="
    echo ""
    echo "Your collection information:"
    echo "  Name: $COLLECTION_NAME"
    echo "  Symbol: $COLLECTION_SYMBOL"
    echo "  NFT Canister ID: $CANISTER_ID"
    echo "  Internet Identity ID: $INTERNET_IDENTITY_CANISTER_ID"
    echo "  Principal: $YOUR_PRINCIPAL_ID"
    echo "  Network: local"
    echo "  Test Mode: true"
    echo ""
    echo "Created files:"
    echo "  - canister_ids.json (updated)"
    echo "  - $IDENTITY_FILE (PEM identity)"
    if [ -f "../ui/.env.local" ]; then
        echo "  - ../ui/.env.local (UI configuration)"
    fi
    echo ""
    echo "Environment variables to use:"
    echo "  export CANISTER_ID=\"$CANISTER_ID\""
    echo "  export INTERNET_IDENTITY_CANISTER_ID=\"$INTERNET_IDENTITY_CANISTER_ID\""
    echo "  export YOUR_PRINCIPAL_ID=\"$YOUR_PRINCIPAL_ID\""
    echo "  export COLLECTION_NAME=\"$COLLECTION_NAME\""
    echo "  export COLLECTION_SYMBOL=\"$COLLECTION_SYMBOL\""
    echo "  export IDENTITY_FILE=\"$IDENTITY_FILE\""
    echo ""
    echo "Important URLs:"
    echo "  NFT Canister Dashboard: http://localhost:8000/?canisterId=$CANISTER_ID"
    echo "  Internet Identity: http://$INTERNET_IDENTITY_CANISTER_ID.localhost:4943"
    echo ""
    echo "Useful commands:"
    echo "  # Check total supply"
    echo "  dfx canister call nft --network local icrc7_total_supply '()'"
    echo ""
    echo "  # Check token metadata"
    echo "  dfx canister call nft --network local icrc7_token_metadata '(vec { 1 })'"
    echo ""
    echo "  # List all tokens"
    echo "  dfx canister call nft --network local icrc7_tokens '(null, null)'"
    echo ""
    echo "  # Check storage subcanisters (created automatically when uploading files)"
    echo "  dfx canister call nft --network local get_all_storage_subcanisters '()'"
    echo ""
    echo "  # Check canister cycles balance"
    echo "  dfx canister status nft --network local"
    echo ""
    echo "  # Add more cycles if needed"
    echo "  dfx ledger fabricate-cycles --canister nft --t 10 --network local"
    echo ""
    echo "  # Mint additional NFTs"
    echo "  ../target/release/origyn_icrc7_cmdlinetools \\"
    echo "    --network local \\"
    echo "    --identity \$IDENTITY_FILE \\"
    echo "    --canister \$CANISTER_ID \\"
    echo "    mint \\"
    echo "    --owner \$YOUR_PRINCIPAL_ID \\"
    echo "    --name \"My NFT\" \\"
    echo "    --interactive"
    echo ""
    echo "  # Upload files"
    echo "  ../target/release/origyn_icrc7_cmdlinetools \\"
    echo "    --network local \\"
    echo "    --identity \$IDENTITY_FILE \\"
    echo "    --canister \$CANISTER_ID \\"
    echo "    upload-file <file_path> <remote_name>"
    echo ""
    print_info "Note: Storage subcanisters are created automatically when you upload files."
    print_info "Each subcanister requires 5T cycles, which were pre-funded during deployment."
    echo ""
}

# Main function
main() {
    echo "=== NFT COLLECTION LOCAL DEPLOYMENT SCRIPT ==="
    echo ""

    display_info
    check_prerequisites
    start_local_replica
    deploy_internet_identity
    setup_environment
    deploy_collection
    fund_canister_cycles
    update_canister_ids
    build_cli_tool
    test_upload
    setup_nft_minting
    setup_ui_config
    show_final_info
}

# Execute main function
main "$@"
