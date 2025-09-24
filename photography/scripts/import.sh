#!/bin/bash

# Photo Import Script Wrapper
# Usage: ./import.sh [album-name]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if album name is provided
if [ -z "$1" ]; then
    echo "Usage: ./import.sh [album-name]"
    echo ""
    echo "Examples:"
    echo "  ./import.sh nature        # Import specific album"
    echo "  ./import.sh               # Scan and import ALL album folders"
    echo ""
    echo "The script will automatically detect album folders in assets/images/albums/"
    echo "and create new entries in albums.json if they don't exist."
    echo ""
    read -p "Would you like to scan and import all albums? (y/n): " response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "🔍 Scanning all album folders..."
        node import-photos.js
    else
        echo "Operation cancelled."
        exit 0
    fi
else
    # Run the import script for specific album
    echo "🚀 Starting photo import for album: $1"
    node import-photos.js "$1"
fi
