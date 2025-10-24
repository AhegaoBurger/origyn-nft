# NFT Minting UI

This folder contains a React application for minting and managing ICRC7 NFTs locally.

## Prerequisites

- Node.js 18+ and npm
- Internet Computer SDK (dfx)
- Rust toolchain

## Setup Commands

1. **Start local Internet Computer network:**
```bash
cd ..  # Go to root nft folder
dfx start --background --clean
```

2. **Deploy NFT canisters locally:**
```bash
chmod +x scripts/deploy/local/deploy_all.sh
./scripts/deploy/local/deploy_all.sh
```

3. **Install React app dependencies:**
```bash
cd ui
npm install
```

4. **Start the React development server:**
```bash
npm start
```

The app will be available at http://localhost:3000

## Quick Mint Test

After deployment, you can test minting via CLI:

```bash
cd cmdline
cargo run -- \
  --network local \
  --canister $(dfx canister id core_nft --network local) \
  mint \
  --owner $(dfx identity get-principal --network local) \
  --interactive
```

## UI Features

- 🎨 Create NFT metadata interactively
- 📤 Upload images/assets to storage
- 🪙 Mint NFTs with custom metadata
- 📋 View your NFT collection
- 🔐 Manage permissions and access

## Canister IDs

After deployment, your canisters will be available at:
- Storage: `$(dfx canister id storage --network local)`
- Core NFT: `$(dfx canister id core_nft --network local)`
