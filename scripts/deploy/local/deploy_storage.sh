#!/usr/bin/env bash

# Function to check if a canister exists and is running
check_canister_running() {
    local canister_name=$1
    if dfx canister status "$canister_name" > /dev/null 2>&1; then
        return 0  # Canister is running
    else
        return 1  # Canister is not running or doesn't exist
    fi
}

# Check if canister is already running before building
if check_canister_running "storage"; then
    echo "Storage canister is already running, skipping deployment..."
    exit 0
fi

echo "Building and deploying storage canister..."
./scripts/build.sh ./src storage_canister
./scripts/generate_did.sh storage_canister

dfx deploy --network local storage --argument "(variant { Init = record {
    test_mode = true;
    version = record {
     major = 0:nat32;
     minor = 0:nat32;
     patch = 0:nat32;
    };
    commit_hash = \"stagingcommit\";
    authorized_principals = vec { principal \"6i6da-t3dfv-vteyg-v5agl-tpgrm-63p4y-t5nmm-gi7nl-o72zu-jd3sc-7qe\" };
}})" --mode reinstall
