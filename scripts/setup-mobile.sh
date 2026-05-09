#!/bin/bash

##############################################################################
# Seargin Cybersecurity - Mobile App Setup
# Installs dependencies dla React Native/Expo mobile app
##############################################################################

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MOBILE_DIR="$PROJECT_ROOT/mobile"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Detector Mobile App - Setup${NC}"
echo -e "${BLUE}========================================${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed${NC}"
    echo -e "${YELLOW}Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}[OK] Node.js${NC} $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] npm is not installed${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}[OK] npm${NC} $NPM_VERSION"

# Navigate to mobile directory
cd "$MOBILE_DIR"

# Install dependencies
echo -e "\n${BLUE}Installing dependencies...${NC}"
npm install --legacy-peer-deps

# Check if Expo CLI is installed globally (optional but recommended)
if ! command -v expo &> /dev/null; then
    echo -e "${YELLOW}[WARNING] Expo CLI is not installed globally${NC}"
    echo -e "${YELLOW}Installing Expo CLI...${NC}"
    npm install -g expo-cli
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}[OK] Setup completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo -e "  iOS:     ${YELLOW}./scripts/run-mobile.sh ios${NC}"
echo -e "  Android: ${YELLOW}./scripts/run-mobile.sh android${NC}"
echo -e "  Web:     ${YELLOW}cd mobile && npm run web${NC}"
