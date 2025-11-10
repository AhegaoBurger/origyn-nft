# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the first complete, production-ready implementation of the ICRC7/ICRC37 NFT standards for the Internet Computer. The project consists of a Rust-based NFT canister (smart contract) that handles all NFT operations, automatically manages storage subcanisters, and includes a React web UI for minting and managing NFTs.

## Technology Stack

**Backend:**
- Rust with IC-CDK (Internet Computer Canister Development Kit)
- Bity IC libraries: icrc3, stable-memory, utils, types
- Candid for interface definitions
- Stable structures for persistent storage across upgrades

**Frontend:**
- React 18.2.0
- @dfinity/agent and @dfinity/auth-client for IC integration
- Internet Identity for authentication

**Testing:**
- PocketIC 9.0.2 for integration testing
- Comprehensive test suite in `integrations_tests/`

**Build Tools:**
- Cargo workspace with 4 members: integrations_tests, core_nft, index_icrc7, cmdline
- Scripts in `scripts/` directory for building and testing

## Development Workflow

### Local Development (Actual Workflow Used)

**1. Deploy locally and start UI:**
```bash
# From project root
cd example
./deploy_collection_local.sh   # Automated deployment - handles everything
cd ../ui
npm install
npm start                       # UI runs on http://localhost:3000
```

The `deploy_collection_local.sh` script:
- Starts local dfx replica
- Deploys Internet Identity
- Deploys NFT canister with initial permissions
- Funds canister with cycles (needed for storage subcanisters)
- Builds CLI tools
- Tests file upload
- Optionally configures UI and mints test NFTs

**2. Deploy to mainnet:**
```bash
cd example
./deploy_collection.sh         # For production deployment
```

### Important Notes About Permissions

**Critical distinction:** The deployment script grants permissions to your **dfx identity principal**, but when you log in to the UI with Internet Identity, you're using a **different principal**.

After logging into the UI, you MUST grant permissions to your Internet Identity principal:
```bash
# Get your II principal from the UI header, then from example/ directory:
dfx canister call nft --network local grant_permission \
  '(record { "principal" = principal "YOUR_II_PRINCIPAL"; permission = variant { Minting } })'
dfx canister call nft --network local grant_permission \
  '(record { "principal" = principal "YOUR_II_PRINCIPAL"; permission = variant { UpdateUploads } })'
# Repeat for UpdateMetadata, UpdateCollectionMetadata, ReadUploads, ManageAuthorities
```

## Architecture

### NFT Canister (Core Component)

**Location:** `src/core_nft/`

The NFT canister is the single main component that handles:
1. **ICRC7/ICRC37 NFT operations** - minting, transfers, approvals, metadata
2. **Storage management** - automatically spawns storage subcanisters on demand
3. **Permission system** - role-based access control
4. **Transaction history** - ICRC3 transaction log
5. **File uploads** - chunked upload with hash verification

**Key insight:** There is no separate "storage canister" in the workflow. The NFT canister creates storage subcanisters automatically when needed. These appear dynamically at runtime, not deployment time.

### Storage Subcanister Architecture

The NFT canister manages storage subcanisters (not just one storage canister):

**How it works:**
1. NFT canister monitors its own storage capacity
2. When storage threshold is reached, it automatically creates a new storage subcanister
3. Each storage subcanister costs 5T cycles to create (handled automatically)
4. Files are distributed across subcanisters
5. Query `get_all_storage_subcanisters()` to see all storage subcanisters

**Upload workflow (from UI perspective):**
1. UI calculates SHA-256 hash of file
2. Call `init_upload(file_path, file_hash, file_size, chunk_size)`
3. Split file into 1MB chunks
4. Call `store_chunk(chunk_id, file_path, chunk_data)` for each chunk
5. Call `finalize_upload(file_path)` to verify and get URL
6. NFT canister forwards these calls to appropriate storage subcanister
7. URL format: `https://{storage-subcanister-id}.raw.icp0.io/{path}`

### Permission System

**Six permissions defined in .did file:**
- `Minting` - Create new NFTs
- `UpdateUploads` - Upload files to storage
- `UpdateMetadata` - Modify NFT metadata
- `UpdateCollectionMetadata` - Modify collection-level metadata
- `ReadUploads` - View upload status
- `ManageAuthorities` - Grant/revoke permissions (also required to check permissions)

**Permission guards:** All sensitive canister methods check permissions before execution. The UI checks permissions on mount to show/hide features.

### ICRC Standards Implementation

**ICRC7 (NFT Standard):**
- Core NFT operations: mint, burn, transfer, balance_of, owner_of
- Token metadata: icrc7_token_metadata, icrc7_tokens_of
- Collection metadata: icrc7_collection_metadata, icrc7_name, icrc7_symbol

**ICRC37 (Approval/Delegation):**
- Token approvals: icrc37_approve_tokens, icrc37_revoke_token_approvals
- Collection approvals: icrc37_approve_collection, icrc37_revoke_collection_approvals
- Transfer from: icrc37_transfer_from (delegated transfers)

**ICRC3 (Transaction History):**
- Complete transaction log for all operations
- Archive canisters created automatically when needed
- Queries: icrc3_get_blocks, icrc3_get_archives

**ICRC21 (Consent Messages):**
- User-friendly transaction descriptions
- icrc21_canister_call_consent_message

### State Management and Upgrades

The canister uses IC stable memory for persistence across upgrades:
- `pre_upgrade()` - Serializes state to stable memory
- `post_upgrade()` - Deserializes state from stable memory
- Stable structures used for efficient memory access
- State includes: NFT ledger, permissions, storage references, transaction log

## Build and Test Commands

**Build all canisters:**
```bash
bash ./scripts/build.sh
```

**Run integration tests (requires PocketIC):**
```bash
export POCKET_IC_BIN=/path/to/pocket-ic
bash ./scripts/run_integrations_tests.sh
```

**Generate Candid interface files:**
```bash
bash ./scripts/generate_did.sh
```

**Build CLI tool:**
```bash
cd cmdline
cargo build --release
# Binary: ../target/release/origyn_icrc7_cmdlinetools
```

## CLI Tool Usage

**Location:** `cmdline/` directory

The CLI provides command-line access to all canister functions:

```bash
# Mint NFT
./target/release/origyn_icrc7_cmdlinetools \
  --network local \
  --identity default.pem \
  --canister CANISTER_ID \
  mint \
  --owner PRINCIPAL_ID \
  --name "My NFT" \
  --metadata "description:Beautiful NFT" \
  --metadata "rarity:Rare"

# Upload file
./target/release/origyn_icrc7_cmdlinetools \
  --network local \
  --identity default.pem \
  --canister CANISTER_ID \
  upload-file local_path.png remote_name.png

# Grant permission
dfx canister call nft grant_permission \
  '(record { "principal" = principal "PRINCIPAL"; permission = variant { Minting } })'

# Check permissions
dfx canister call nft get_user_permissions \
  '(record { "principal" = principal "PRINCIPAL" })'
```

## UI Architecture

**Location:** `ui/` directory

**Key files:**
- `src/App.js` - Main component with routing
- `src/components/MintingForm.js` - NFT creation interface
- `src/components/NFTGallery.js` - Display user's NFTs
- `src/components/ConnectionStatus.js` - Permission status banner
- `src/declarations/` - Auto-generated canister interfaces (from dfx generate)

**Environment configuration (ui/.env.local):**
```
REACT_APP_INTERNET_IDENTITY_CANISTER_ID=rdmx6-jaaaa-aaaaa-aaadq-cai
REACT_APP_CORE_NFT_CANISTER_ID=<your-nft-canister-id>
REACT_APP_DFX_NETWORK=local
REACT_APP_DFX_HOST=http://localhost:4943
```

**Authentication flow:**
1. User clicks "Connect Wallet"
2. Redirect to Internet Identity canister
3. II returns principal to frontend
4. Frontend creates agent with authenticated identity
5. Agent makes canister calls with user's principal

**Minting flow:**
1. User fills form: name, description, image, attributes
2. UI checks permissions (shows banner if missing)
3. If image: calculate hash → init_upload → chunk file → store_chunk (loop) → finalize_upload → get URL
4. Construct metadata with image URL
5. Call mint() with metadata
6. Display success with token ID

## Project Structure

```
/
├── src/
│   ├── core_nft/          # Main NFT canister (Rust)
│   │   ├── src/
│   │   │   ├── queries/   # Query methods (icrc7_*, icrc37_*)
│   │   │   ├── updates/   # Update methods (mint, transfer, approve)
│   │   │   ├── lifecycle/ # init, pre/post_upgrade
│   │   │   ├── types/     # Data structures
│   │   │   └── state.rs   # Global state management
│   │   └── wasm/          # Compiled WASM and .did files
│   ├── index_icrc7/       # Indexing canister (not in main workflow)
│   └── storage_canister/  # Downloaded WASM (not built locally)
├── ui/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   └── declarations/ # Generated interfaces
│   └── .env.local        # Generated by deployment script
├── cmdline/              # CLI tool (Rust)
├── integrations_tests/   # PocketIC test suite
├── example/              # Deployment scripts (IMPORTANT)
│   ├── deploy_collection_local.sh   # Local deployment
│   └── deploy_collection.sh         # Mainnet deployment
└── scripts/              # Build scripts
    ├── build.sh
    └── run_integrations_tests.sh
```

## Important Technical Details

**Workspace structure:**
- Root `Cargo.toml` defines workspace with 4 members
- Shared dependencies managed at workspace level
- All crates use Bity IC libraries for common functionality

**Memory management:**
- Stable memory for NFT ledger, permissions, transaction log
- Heap caching for performance on frequently accessed data
- Storage subcanisters use stable memory + heap caching pattern

**Cycles management:**
- NFT canister needs cycles to create storage subcanisters (5T each)
- Local development: use `dfx ledger fabricate-cycles --canister nft --t 10`
- Production: monitor with `dfx canister status nft`

**Transaction deduplication:**
- ICRC7/37 operations support `created_at_time` for deduplication
- Tx window configurable at init (prevents replay attacks)

**Batch operations:**
- Most ICRC7/37 methods support batch operations (vectors)
- Configurable batch size limits: max_query_batch_size, max_update_batch_size

## Common Issues and Solutions

**"Caller does not have [permission] permission"**
- Remember: dfx identity ≠ Internet Identity principal
- Grant permissions to II principal after logging in (see UI README)

**Storage subcanister creation fails**
- Check cycles balance: `dfx canister status nft`
- Add cycles: `dfx ledger fabricate-cycles --canister nft --t 10 --network local`

**UI can't connect to canister**
- Verify `.env.local` has correct canister IDs
- Check dfx is running: `dfx ping local`
- Regenerate declarations: `dfx generate core_nft --network local`

**Upload fails silently**
- Check browser console for detailed errors
- Verify UpdateUploads permission granted
- Ensure file is under 10MB

## Key Differences from Typical NFT Projects

1. **Automatic storage scaling:** Storage subcanisters created on-demand by the NFT canister itself (not pre-deployed)
2. **Permission-based access:** Every operation checks granular permissions (not just owner/admin)
3. **Two principals to manage:** dfx identity for CLI, Internet Identity for UI
4. **ICRC3 transaction log:** Complete audit trail of all operations
5. **Certified responses:** Uses IC certification for tamper-proof queries
6. **Stable memory:** Survives canister upgrades (no state loss)

## Source Files Reference Format

When referencing specific code locations, use the format `file_path:line_number`:
- `src/core_nft/src/state.rs:45` - State initialization
- `src/core_nft/src/updates/mint.rs:120` - Minting logic
- `ui/src/components/MintingForm.js:156` - Upload implementation
