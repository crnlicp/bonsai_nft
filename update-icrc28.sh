#!/bin/bash

# Helper script to update ICRC-28 trusted origins for production
# Run this after deploying to IC mainnet

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}ICRC-28 Trusted Origins Update Tool${NC}"
echo -e "${BLUE}=====================================${NC}\n"

# Get frontend canister ID
FRONTEND_CANISTER=$(dfx canister --network ic id frontend 2>/dev/null || echo "")

if [ -z "$FRONTEND_CANISTER" ]; then
    echo -e "${RED}Error: Frontend canister not found. Deploy to IC first.${NC}"
    exit 1
fi

echo -e "${GREEN}Frontend Canister ID: $FRONTEND_CANISTER${NC}\n"

echo -e "${YELLOW}Your frontend URLs are:${NC}"
echo -e "  • https://$FRONTEND_CANISTER.icp0.io"
echo -e "  • https://$FRONTEND_CANISTER.ic0.app"
echo ""

echo -e "${YELLOW}Current ICRC-28 configuration in backend/main.mo:${NC}"
grep -A 10 "icrc28_trusted_origins" backend/main.mo | head -15
echo ""

echo -e "${RED}⚠️  Manual Update Required:${NC}"
echo -e "1. Edit ${BLUE}backend/main.mo${NC}"
echo -e "2. Find the ${BLUE}icrc28_trusted_origins()${NC} function"
echo -e "3. Replace the trusted_origins array with:\n"

echo -e "${GREEN}    trusted_origins = [${NC}"
echo -e "${GREEN}        \"https://$FRONTEND_CANISTER.icp0.io\",${NC}"
echo -e "${GREEN}        \"https://$FRONTEND_CANISTER.ic0.app\",${NC}"
echo -e "${GREEN}        // Add your custom domain here if applicable${NC}"
echo -e "${GREEN}    ];${NC}\n"

echo -e "4. Save the file"
echo -e "5. Run the following commands:\n"

echo -e "${BLUE}   dfx build --network ic backend${NC}"
echo -e "${BLUE}   dfx canister --network ic install backend --mode upgrade${NC}\n"

echo -e "${YELLOW}Would you like to open the file in your editor? (y/n)${NC}"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    # Try common editors
    if command -v code &> /dev/null; then
        code backend/main.mo
    elif command -v nano &> /dev/null; then
        nano backend/main.mo
    elif command -v vim &> /dev/null; then
        vim backend/main.mo
    else
        echo -e "${YELLOW}Please open backend/main.mo manually${NC}"
    fi
fi

echo -e "\n${GREEN}After updating the file, run:${NC}"
echo -e "${BLUE}dfx build --network ic backend && dfx canister --network ic install backend --mode upgrade${NC}\n"
