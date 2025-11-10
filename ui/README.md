# NFT Minting UI

A React-based web application for minting and managing ICRC7 NFTs on the Internet Computer. This UI provides an intuitive interface for creating NFTs with images, metadata, and custom attributes.

## Prerequisites

- **Node.js 18+** and npm
- **Internet Computer SDK** (dfx) - [Install here](https://internetcomputer.org/docs/current/developer-docs/setup/install/)
- **Rust toolchain** - For building the CLI tools (optional)

## Quick Start Guide

### Step 1: Deploy Your NFT Collection Locally

The easiest way to get started is using the automated deployment script:

```bash
cd ../example
./deploy_collection_local.sh
```

This script will:
- ✅ Start the local dfx replica (if not already running)
- ✅ Deploy Internet Identity for authentication
- ✅ Deploy your NFT canister with your chosen name and symbol
- ✅ Grant all necessary permissions to your dfx identity
- ✅ Add cycles to the canister for storage operations
- ✅ Build the CLI tools
- ✅ Test file upload functionality
- ✅ Optionally mint some test NFTs
- ✅ Generate UI configuration files (if requested)

**What you'll be asked:**
- Collection name (e.g., "MyCollection")
- Collection symbol (e.g., "MC")
- Collection description
- Whether to mint test NFTs
- Whether to configure the UI

### Step 2: Install UI Dependencies

```bash
cd ../ui
npm install
```

### Step 3: Start the Development Server

```bash
npm start
```

The app will open at **http://localhost:3000**

### Step 4: Login with Internet Identity

1. Click **"Connect Wallet"** in the UI
2. You'll be redirected to Internet Identity
3. Create a new identity or use an existing one
4. Approve the connection
5. You'll be redirected back to the UI, now logged in

### Step 5: Grant Permissions to Your Internet Identity

**Important:** The deployment script grants permissions to your **dfx identity**, but when you login with Internet Identity, you're using a **different principal**. You need to grant permissions to your II principal.

#### Get Your Internet Identity Principal

After logging in, your principal will be displayed in the UI header. It looks like:
```
vo4lw-b7qka-xbycw-2gd42-ucnbm-uo3c4-lqk45-boskv-bsbck-ar3ul-zae
```

#### Grant All Permissions

Run these commands from the `example` directory:

```bash
# Replace YOUR_II_PRINCIPAL with your actual Internet Identity principal
YOUR_II_PRINCIPAL="fo2jw-eajwz-3qaox-5jo5a-4rsvp-vmsqe-jqivi-gtygu-secdo-xsk56-jqe"

# Grant Minting permission
dfx canister call nft --network local grant_permission \
  '(record { "principal" = principal "'$YOUR_II_PRINCIPAL'"; permission = variant { Minting } })'

# Grant UpdateUploads permission (required for image uploads)
dfx canister call nft --network local grant_permission \
  '(record { "principal" = principal "'$YOUR_II_PRINCIPAL'"; permission = variant { UpdateUploads } })'

# Grant UpdateMetadata permission
dfx canister call nft --network local grant_permission \
  '(record { "principal" = principal "'$YOUR_II_PRINCIPAL'"; permission = variant { UpdateMetadata } })'

# Grant UpdateCollectionMetadata permission
dfx canister call nft --network local grant_permission \
  '(record { "principal" = principal "'$YOUR_II_PRINCIPAL'"; permission = variant { UpdateCollectionMetadata } })'

# Grant ReadUploads permission
dfx canister call nft --network local grant_permission \
  '(record { "principal" = principal "'$YOUR_II_PRINCIPAL'"; permission = variant { ReadUploads } })'

# Grant ManageAuthorities permission (allows checking permissions)
dfx canister call nft --network local grant_permission \
  '(record { "principal" = principal "'$YOUR_II_PRINCIPAL'"; permission = variant { ManageAuthorities } })'
```

**Verify permissions were granted:**

```bash
dfx canister call nft --network local get_user_permissions \
  '(record { "principal" = principal "'$YOUR_II_PRINCIPAL'" })'
```

You should see all 6 permissions listed:
```
(variant { Ok = vec { variant { Minting }; variant { UpdateUploads }; variant { UpdateMetadata }; variant { UpdateCollectionMetadata }; variant { ReadUploads }; variant { ManageAuthorities } } })
```

### Step 6: Mint Your First NFT!

1. **Refresh the UI** - You should see a green banner: "✓ All permissions verified - Ready to mint!"
2. Fill in the NFT details:
   - **Name:** "My First NFT"
   - **Description:** "A beautiful NFT created with the IC"
   - **Image:** Select an image file (up to 10MB)
   - **Attributes (Optional):** Add custom traits like "Rarity: Common", "Edition: 1", etc.
3. Click **"Mint NFT"**
4. Watch the console logs showing the upload and mint progress
5. You'll see toast notifications for each step:
   - "Starting image upload..."
   - "Initializing upload..."
   - "Uploading chunk 1/1..."
   - "Finalizing upload..."
   - "Image uploaded successfully!"
   - "Minting NFT..."
   - "NFT minted successfully! Token ID: 1"

## Understanding the Permission System

The NFT canister uses a role-based permission system. Users need specific permissions to perform certain operations:

### Available Permissions

| Permission | Description | Required For |
|------------|-------------|--------------|
| **Minting** | Allows minting new NFTs | Creating new tokens |
| **UpdateUploads** | Allows uploading files to storage | Image uploads |
| **UpdateMetadata** | Allows updating NFT metadata | Modifying token metadata |
| **UpdateCollectionMetadata** | Allows updating collection info | Modifying collection details |
| **ReadUploads** | Allows viewing upload status | Checking file upload progress |
| **ManageAuthorities** | Allows granting/revoking permissions | Managing user permissions, checking permissions |

### Permission Checks in the UI

When you load the minting page, the UI automatically:
1. Checks if you have `Minting` permission
2. Checks if you have `UpdateUploads` permission
3. Displays appropriate banners:
   - **Green:** "✓ All permissions verified - Ready to mint!"
   - **Red:** "Missing Permission: ..." with instructions
   - **Blue:** "Checking permissions..." (loading state)

### What Happens Without Permissions?

**Without Minting Permission:**
- Mint button will be disabled
- Error banner displayed

**Without UpdateUploads Permission:**
- Image upload field will be disabled
- You can still mint NFTs without images
- Error banner displayed

## UI Features

### Minting Page
- 🎨 **Create NFT Metadata** - Name, description, and custom attributes
- 📤 **Upload Images** - Up to 10MB, automatically chunked and stored
- 🪙 **Mint NFTs** - Creates tokens owned by your Internet Identity
- 📊 **Real-time Progress** - Toast notifications for each step
- 🔍 **Console Logging** - Detailed logs for debugging

### Gallery Page
- 📋 **View Your Collection** - All NFTs owned by your principal
- 🖼️ **Display Metadata** - Names, descriptions, attributes
- 🔄 **Refresh** - Reload your collection

## How Storage Works

The NFT canister includes built-in storage management:

1. **File Upload Process:**
   - UI calculates SHA-256 hash of the file
   - Calls `init_upload()` on the NFT canister
   - Splits file into 1MB chunks
   - Calls `store_chunk()` for each chunk
   - Calls `finalize_upload()` to get the final URL

2. **Storage Subcanisters:**
   - The NFT canister automatically creates storage subcanisters as needed
   - Each subcanister costs 5T cycles to create
   - Files are stored in these subcanisters
   - URLs are in the format: `https://{canister-id}.raw.icp0.io/{path}`

3. **Metadata:**
   - Image URL is stored in the NFT metadata
   - Metadata is queried via `icrc7_token_metadata()`

## Troubleshooting

### "Caller does not have update uploads permission"

**Cause:** Your Internet Identity principal doesn't have the `UpdateUploads` permission.

**Solution:** Follow Step 5 above to grant all permissions to your II principal.

### "Caller does not have manage authorities permission"

**Cause:** The permission check itself requires `ManageAuthorities` permission.

**Solution:** Grant the `ManageAuthorities` permission using the command in Step 5.

### NFT canister not found

**Cause:** The canister hasn't been deployed yet.

**Solution:** Run the deployment script from Step 1.

### Can't connect to Internet Identity

**Cause:** Internet Identity wasn't deployed or dfx isn't running.

**Solution:**
```bash
cd ../example
dfx start --background
./deploy_collection_local.sh
```

### Image upload fails with no error

**Cause:** Check the browser console for detailed error messages.

**Common fixes:**
- Ensure cycles were added to the canister (deployment script does this)
- Check file size is under 10MB
- Verify you have `UpdateUploads` permission

## Advanced: Manual Deployment

If you prefer manual control over the deployment:

### 1. Start dfx
```bash
dfx start --background
```

### 2. Deploy Internet Identity
```bash
cd ..  # Go to root nft folder
dfx deps init
dfx deps pull
dfx deps deploy internet_identity --network local
```

### 3. Deploy NFT Canister
```bash
dfx deploy nft --network local --argument '...'  # See deploy script for full args
```

### 4. Configure UI
```bash
cd ui
cat > .env.local << EOF
REACT_APP_INTERNET_IDENTITY_CANISTER_ID=$(dfx canister id internet_identity --network local)
REACT_APP_CORE_NFT_CANISTER_ID=$(dfx canister id nft --network local)
REACT_APP_DFX_NETWORK=local
REACT_APP_DFX_HOST=http://localhost:4943
EOF
```

### 5. Start UI
```bash
npm install
npm start
```

## Useful Commands

### Check NFT Collection Info
```bash
# Get total supply
dfx canister call nft --network local icrc7_total_supply '()'

# Get collection symbol
dfx canister call nft --network local icrc7_symbol '()'

# Get collection name
dfx canister call nft --network local icrc7_name '()'
```

### Check Your NFTs
```bash
# Get your principal
YOUR_PRINCIPAL=$(dfx identity get-principal)

# Get your token IDs
dfx canister call nft --network local icrc7_tokens_of \
  "(record { owner = principal \"$YOUR_PRINCIPAL\"; subaccount = null }, null, null)"

# Get metadata for token ID 1
dfx canister call nft --network local icrc7_token_metadata '(vec { 1 })'
```

### Check Storage Subcanisters
```bash
# List all storage subcanisters
dfx canister call nft --network local get_all_storage_subcanisters '()'
```

### Check Canister Status
```bash
# Check cycles balance
dfx canister status nft --network local

# Add more cycles if needed
dfx ledger fabricate-cycles --canister nft --t 10 --network local
```

## Development Notes

- The UI automatically hot-reloads when you make changes
- Check browser console for detailed logging
- All canister calls are logged with request/response details
- Permission checks happen on component mount
- Images are chunked automatically for efficient storage

## Need Help?

- Check the browser console for detailed error messages
- Look at the dfx logs: `dfx canister logs nft --network local`
- Verify permissions: Use the `get_user_permissions` command shown above
- Check canister status: Use `dfx canister status nft --network local`
