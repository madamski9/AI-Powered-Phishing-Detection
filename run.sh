#!/bin/bash

##############################################################################
# Seargin Cybersecurity
# Runs whole project: API (Docker) + Mobile (Expo)
# Usage: ./run.sh [ios|android|web]
##############################################################################

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

print_error() {
    echo -e "${RED}$1${NC}"
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

print_info() {
    echo -e "${CYAN}$1${NC}"
}

print_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Check Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        print_info "Install from: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
}

# Check Docker Compose
check_docker_compose() {
    if ! docker compose version &> /dev/null 2>&1; then
        if ! command -v docker-compose &> /dev/null; then
            print_error "Docker Compose is not installed"
            exit 1
        fi
    fi
}

# Start API in background
start_api() {
    print_step "STARTING API SERVICE (Docker)"

    print_info "Checking Docker..."
    check_docker
    check_docker_compose

    # Stop old containers first (clean start)
    print_info "Cleaning up old containers..."
    docker compose down 2>/dev/null || true

    # Start containers
    print_info "Starting Docker Compose..."
    docker compose up -d

    if [ $? -ne 0 ]; then
        print_error "Failed to start Docker services"
        exit 1
    fi

    # Wait for API to be ready
    print_info "Waiting for API and ML-service to be ready (checking health endpoints)..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -sf http://localhost:8080/health > /dev/null 2>&1 && \
           curl -sf http://localhost:8000/health > /dev/null 2>&1; then
            print_success "API and ML-service are ready!"
            echo -e "${GREEN}[OK] API running at http://localhost:8080${NC}"
            echo -e "${GREEN}[OK] ML-service running at http://localhost:8000${NC}"
            return 0
        fi

        echo -ne "\r${CYAN}Waiting for services... (${attempt}/${max_attempts})${NC}"
        sleep 1
        ((attempt++))
    done

    print_warning "API or ML-service health check timed out (it may still be starting)"
    return 0
}

# Setup mobile dependencies
setup_mobile() {
    print_step "SETTING UP MOBILE DEPENDENCIES"

    if [ ! -d "$SCRIPT_DIR/mobile/node_modules" ]; then
        print_info "Installing mobile dependencies..."
        bash "$SCRIPT_DIR/scripts/setup-mobile.sh" || {
            print_error "Failed to setup mobile"
            exit 1
        }
    else
        print_success "Mobile dependencies already installed"
    fi
}

# Interactive platform selection
select_platform() {
    if [ -n "$1" ]; then
        PLATFORM="$1"
        return
    fi

    print_step "SELECT TARGET PLATFORM"

    echo -e "${CYAN}Which platform would you like to run?${NC}\n"
    echo -e "  ${YELLOW}1)${NC} iOS (Simulator/Device)"
    echo -e "  ${YELLOW}2)${NC} Android (Emulator/Device)"
    echo -e "  ${YELLOW}3)${NC} Web Browser"
    echo -e "  ${YELLOW}4)${NC} Exit"
    echo ""

    read -p "$(echo -e ${CYAN}Enter choice [1-4]:${NC} )" choice

    case $choice in
        1) PLATFORM="ios" ;;
        2) PLATFORM="android" ;;
        3) PLATFORM="web" ;;
        4)
            print_info "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            select_platform
            ;;
    esac
}

# Start mobile app
start_mobile() {
    print_step "LAUNCHING MOBILE APP - $PLATFORM"

    case "$PLATFORM" in
        ios)
            print_info "Starting iOS build and run..."
            print_warning "Make sure you have:"
            print_warning "  • Xcode installed"
            print_warning "  • iOS simulator running (or device connected)"
            echo ""
            bash "$SCRIPT_DIR/scripts/run-mobile.sh" ios
            ;;
        android)
            print_info "Starting Android build and run..."
            print_warning "Make sure you have:"
            print_warning "  • Android SDK installed"
            print_warning "  • Android emulator running (or device connected)"
            echo ""
            bash "$SCRIPT_DIR/scripts/run-mobile.sh" android
            ;;
        web)
            print_info "Starting web browser..."
            bash "$SCRIPT_DIR/scripts/run-mobile.sh" web
            ;;
    esac
}

# Show final info
show_info() {
    print_step "EVERYTHING IS RUNNING"

    echo -e "${GREEN}[OK] API:${NC}              http://localhost:8080"
    echo -e "${GREEN}[OK] ML-SERVICE:${NC}       http://localhost:8000"
    echo -e "${GREEN}[OK] Mobile App:${NC}       Running on $PLATFORM"
    echo ""
    echo -e "${CYAN}Useful commands:${NC}"
    echo -e "  View API logs:     ${YELLOW}docker compose logs -f api${NC}"
    echo -e "  Stop everything:   ${YELLOW}docker compose down${NC}"
    echo -e "  API shell:         ${YELLOW}docker compose exec api bash${NC}"
    echo ""
}

# Cleanup on exit
cleanup() {
    print_warning "\nShutting down..."
    print_info "Stopping Docker containers..."
    docker compose down
    print_success "Done!"
}

trap cleanup EXIT

# Main execution
main() {
    # Check if platform argument was provided
    if [ -z "$1" ]; then
        print_error "Platform selection required!"
        echo ""
        echo -e "${CYAN}Usage: ./run.sh [platform]${NC}"
        echo ""
        echo -e "Available platforms:"
        echo -e "  ${YELLOW}ios${NC}     - Run on iOS simulator/device"
        echo -e "  ${YELLOW}android${NC} - Run on Android emulator/device"
        echo -e "  ${YELLOW}web${NC}    - Run on web browser"
        echo ""
        echo -e "Examples:"
        echo -e "  ${YELLOW}./run.sh ios${NC}"
        echo -e "  ${YELLOW}./run.sh android${NC}"
        echo -e "  ${YELLOW}./run.sh web${NC}"
        echo ""
        exit 1
    fi

    # Check prerequisites
    print_step "CHECKING PREREQUISITES"
    check_docker
    check_docker_compose
    print_success "All prerequisites OK"

    # Start API
    start_api

    # Setup mobile
    setup_mobile

    # Select platform
    select_platform "$1"

    # Start mobile
    start_mobile

    # Show info
    show_info
}

# Run
main "$@"
