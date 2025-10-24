#!/usr/bin/env bash

show_help() {
  cat << EOF
Generate the candid file and declarations for the mentioned wasm canister.
Must be run from the repository's root folder.

Usage:
  scripts/generate_did [options] <wasm>

Options:
  -h, --help        Show this message and exit
  -o, --output PATH The path where to write the resulting candid file (Must be a folder)
  -d, --dry-run     Only output the result, without actually writing on disk
EOF
}

if [[ $# -gt 0 ]]; then
  while [[ "$1" =~ ^- && ! "$1" == "--" ]]; do
    case $1 in
      -h | --help )
        show_help
        exit
        ;;
      -o | --output )
        outpath=$2
        shift 2
        ;;
      -d | --dry-run )
        dryrun=1
        shift
        ;;
      *)
        echo "Error: Unknown option $1"
        show_help
        exit 1
        ;;
    esac;
  done
  if [[ "$1" == '--' ]]; then shift; fi
else
  echo "Error: not enough arguments."
  show_help
  exit 1
fi

# Set default output path if not provided
if [[ -z "$outpath" ]]; then
  output_path="./src"
else
  output_path="$outpath"
fi

echo "output_path: ${output_path}"

# Check if output path exists and is a directory
if [[ ! -d "$output_path" ]]; then
  echo "Error: Output path '$output_path' is not a valid directory"
  exit 1
fi

# Extract the wasm filename without extension for the .did file
wasm_file="$1"
if [[ ! -f "$wasm_file" ]]; then
  echo "Error: Wasm file '$wasm_file' not found"
  exit 1
fi

# Generate .did filename from wasm filename
did_filename=$(basename "$wasm_file" .wasm).did
did_filepath="${output_path}/${did_filename}"

if [[ $dryrun -eq 1 ]]; then
  echo -e "This would be written to ${did_filepath} :\n"
  candid-extractor "$wasm_file"
else
  echo "Generating DID file: ${did_filepath}"
  candid-extractor "$wasm_file" > "$did_filepath"
fi
