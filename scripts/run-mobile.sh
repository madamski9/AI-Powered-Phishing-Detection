#!/bin/bash

##############################################################################
# Seargin Cybersecurity - Mobile App Runner
# Uruchamia React Native/Expo aplikację na iOS lub Android
# Usage: ./scripts/run-mobile.sh [ios|android|web]
##############################################################################

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MOBILE_DIR="$PROJECT_ROOT/mobile"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

print_success() {
    echo -e "${GREEN}[OK] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

print_info() {
    echo -e "${CYAN}[INFO] $1${NC}"
}

# Check arguments
PLATFORM="${1:-ios}"

if [[ ! "$PLATFORM" =~ ^(ios|android|web|start)$ ]]; then
    print_error "Invalid platform: $PLATFORM"
    echo -e "\n${BLUE}Usage:${NC}"
    echo -e "  ${YELLOW}./scripts/run-mobile.sh [ios|android|web|start]${NC}"
    echo -e "\n${BLUE}Platforms:${NC}"
    echo -e "  ${CYAN}ios${NC}     - Run on iOS simulator/device"
    echo -e "  ${CYAN}android${NC} - Run on Android emulator/device"
    echo -e "  ${CYAN}web${NC}    - Run on web browser"
    echo -e "  ${CYAN}start${NC}   - Start Expo dev server only"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "$MOBILE_DIR/node_modules" ]; then
    print_warning "Dependencies not installed"
    print_info "Running setup..."
    bash "$SCRIPT_DIR/setup-mobile.sh"
fi

# Navigate to mobile directory
cd "$MOBILE_DIR"

print_header "Detector Mobile - $PLATFORM"

case "$PLATFORM" in
    ios)
        print_info "Starting iOS build and run..."
        print_warning "Ensure you have Xcode installed and iOS simulator/device connected"
        print_info "Running: npx expo run:ios --device"
        print_info "Select device when prompted..."
        npx expo run:ios --device
        print_success "iOS app launched!"
        ;;
    android)
        print_info "Starting Android build and run..."
        print_warning "Ensure you have Android SDK installed and emulator/device connected"
        print_info "Running: npx expo run:android --device"
        print_info "Select device when prompted..."
        npx expo run:android --device
        print_success "Android app launched!"
        ;;
    web)
        print_info "Starting web build..."
        print_info "Running: npm run web"
        npm run web
        print_success "Web app launched in browser!"
        ;;
    start)
        print_info "Starting Expo dev server..."
        print_info "Running: npm start"
        npm start
        ;;
esac

print_success "Done!"
