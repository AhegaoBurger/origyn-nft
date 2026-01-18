#!/bin/bash

# Grant all permissions to a principal for testing

if [ -z "$1" ]; then
    echo "Usage: ./grant_all_permissions.sh <principal>"
    echo "Example: ./grant_all_permissions.sh pmdaz-iwydg-bskph-kmyuf-vwtro-sr6om-qnt4n-po2yo-kgsp3-f2cuu-tae"
    exit 1
fi

PRINCIPAL=$1
NETWORK=${2:-local}

echo "Granting all permissions to $PRINCIPAL on network $NETWORK..."

PERMISSIONS=("Minting" "UpdateUploads" "UpdateMetadata" "UpdateCollectionMetadata" "ReadUploads" "ManageAuthorities")

for PERMISSION in "${PERMISSIONS[@]}"; do
    echo "Granting $PERMISSION..."
    dfx canister call nft --network "$NETWORK" grant_permission \
        "(record { \"principal\" = principal \"$PRINCIPAL\"; permission = variant { $PERMISSION } })"
done

echo ""
echo "Verifying permissions..."
dfx canister call nft --network "$NETWORK" get_user_permissions \
    "(record { \"principal\" = principal \"$PRINCIPAL\" })"

echo ""
echo "Done!"
