#!/bin/bash

# Deployment script for Bonsai NFT project
# Usage: ./deploy.sh [--ic]
#   ./deploy.sh        - Deploy to local replica
#   ./deploy.sh --ic   - Deploy to IC mainnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
NETWORK="local"
NETWORK_FLAG=""

if [ "$1" == "--ic" ]; then
    NETWORK="ic"
    NETWORK_FLAG="--network ic"
    echo -e "${BLUE}Deploying to IC mainnet...${NC}"
    
    # Pre-deployment security check for IC
    echo -e "\n${RED}⚠️  CRITICAL SECURITY CHECK${NC}"
    echo -e "${YELLOW}Before deploying to IC mainnet, ensure you:${NC}"
    echo -e "  1. Have updated ICRC-28 trusted origins in backend/main.mo"
    echo -e "  2. Are ready to set owner IMMEDIATELY after deployment"
    echo -e "  3. Have your dfx identity backed up securely"
    echo -e "  4. Have sufficient cycles (check: dfx cycles balance --network ic)"
    echo -e "\n${RED}Press CTRL+C to cancel, or any key to continue...${NC}"
    read -n 1 -s
    echo ""
else
    echo -e "${BLUE}Deploying to local replica...${NC}"
fi

# Step 1: Deploy canisters
echo -e "\n${YELLOW}Step 1: Deploying canisters...${NC}"

if [ "$NETWORK" == "ic" ]; then
    # Deploy backend and frontend with cycles
    # Remote canisters (ledger, II) are already deployed on IC
    echo -e "${BLUE}Deploying backend canister with 5T cycles...${NC}"
    dfx deploy backend --network ic --with-cycles 1000000000000
    
    echo -e "${BLUE}Deploying frontend canister with 3T cycles...${NC}"
    dfx deploy frontend --network ic --with-cycles 1000000000000
    
    # Internet Identity and Ledger are remote - no deployment needed
    echo -e "${GREEN}✓ Using remote Internet Identity and ICP Ledger canisters${NC}"
else
    # Local deployment - deploy all canisters
    dfx canister create --specified-id ryjl3-tyaaa-aaaaa-aaaba-cai icp_ledger_canister
    dfx deploy $NETWORK_FLAG
fi

# Step 2: Get deployer's principal
echo -e "\n${YELLOW}Step 2: Getting deployer identity...${NC}"
PRINCIPAL=$(dfx identity get-principal)
echo -e "${GREEN}Deployer Principal: $PRINCIPAL${NC}"

# Step 3: Set owner IMMEDIATELY (critical for mainnet security)
echo -e "\n${YELLOW}Step 3: Setting owner (CRITICAL - prevents frontrunning)...${NC}"
if [ "$NETWORK" == "ic" ]; then
    echo -e "${RED}⚠️  Setting owner NOW to prevent frontrunning!${NC}"
fi
dfx canister $NETWORK_FLAG call backend setOwner "(principal \"$PRINCIPAL\")"
echo -e "${GREEN}✓ Owner set successfully${NC}"

# Step 4: Get backend canister's account ID for treasury
echo -e "\n${YELLOW}Step 4: Setting up treasury account...${NC}"
BACKEND_CANISTER=$(dfx canister $NETWORK_FLAG id backend)
echo -e "${GREEN}Backend Canister: $BACKEND_CANISTER${NC}"

# Treasury = backend canister's account (where users send ICP for minting)
TREASURY_ACCOUNT_ID=$(dfx ledger account-id --of-principal "$BACKEND_CANISTER")
echo -e "${GREEN}Treasury Account ID: $TREASURY_ACCOUNT_ID${NC}"
echo -e "${BLUE}Note: Users will send ICP to the backend canister. Owner can withdraw later.${NC}"

# Step 5: Set treasury account
echo -e "\n${YELLOW}Step 5: Setting treasury account...${NC}"
dfx canister $NETWORK_FLAG call backend setTreasuryAccountIdHex "(\"$TREASURY_ACCOUNT_ID\")"
echo -e "${GREEN}✓ Treasury account set successfully${NC}"

# Step 6: Network-specific configuration
if [ "$NETWORK" == "local" ]; then
    echo -e "\n${YELLOW}Step 6: Configuring for local development...${NC}"
    
    # Get local ledger canister ID
    LEDGER_CANISTER=$(dfx canister id icp_ledger_canister 2>/dev/null || echo "")
    
    if [ -z "$LEDGER_CANISTER" ]; then
        echo -e "${YELLOW}Warning: Local ledger canister not found. Skipping ledger configuration.${NC}"
        echo -e "${YELLOW}If you need payment functionality, deploy the ledger canister first.${NC}"
    else
        echo -e "${GREEN}Local Ledger Canister: $LEDGER_CANISTER${NC}"
        dfx canister call backend setLedgerCanisterId "(principal \"$LEDGER_CANISTER\")"
        echo -e "${GREEN}✓ Ledger canister ID set${NC}"
    fi
    
    # Enable localhost image URLs
    dfx canister call backend setUseLocalhostImageUrl "(true)"
    echo -e "${GREEN}✓ Localhost image URLs enabled${NC}"
    
    # Set round duration for local testing (5 minutes)
    echo -e "${BLUE}Setting round duration to 5 minutes for testing...${NC}"
    DURATION_5_MIN=300000000000  # 5 minutes in nanoseconds
    dfx canister call backend setRoundDuration "($DURATION_5_MIN : int)"
    echo -e "${GREEN}✓ Round duration set to 5 minutes${NC}"
else
    echo -e "\n${YELLOW}Step 6: Mainnet configuration...${NC}"
    echo -e "${GREEN}Using default mainnet ledger canister${NC}"
    
    # Set round duration for production (7 days)
    echo -e "${BLUE}Setting round duration to 7 days...${NC}"
    DURATION_7_DAYS=604800000000000  # 7 days in nanoseconds (7 * 24 * 60 * 60 * 1_000_000_000)
    dfx canister --network ic call backend setRoundDuration "($DURATION_7_DAYS : int)"
    echo -e "${GREEN}✓ Round duration set to 7 days${NC}"
    
    echo -e "${GREEN}✓ Configuration complete${NC}"
fi

# Step 7: Verify configuration
echo -e "\n${YELLOW}Step 7: Verifying configuration...${NC}"
echo -e "${BLUE}Owner:${NC}"
dfx canister $NETWORK_FLAG call backend getOwner

echo -e "${BLUE}Treasury Account:${NC}"
dfx canister $NETWORK_FLAG call backend getTreasuryAccountId

echo -e "${BLUE}Ledger Canister:${NC}"
dfx canister $NETWORK_FLAG call backend getLedgerCanisterId

if [ "$NETWORK" == "local" ]; then
    echo -e "${BLUE}Localhost URLs:${NC}"
    dfx canister call backend getUseLocalhostImageUrl
fi

# Step 8: IC Mainnet Post-Deployment Configuration
if [ "$NETWORK" == "ic" ]; then
    # Display cycles status
    echo -e "\n${BLUE}Checking canister cycles...${NC}"
    BACKEND_CYCLES=$(dfx canister --network ic status backend 2>/dev/null | grep -oP 'Balance: \K[\d_]+' || echo "unknown")
    FRONTEND_CYCLES=$(dfx canister --network ic status frontend 2>/dev/null | grep -oP 'Balance: \K[\d_]+' || echo "unknown")
    echo -e "${GREEN}Backend cycles: $BACKEND_CYCLES${NC}"
    echo -e "${GREEN}Frontend cycles: $FRONTEND_CYCLES${NC}"
    echo -e "${YELLOW}Note: Upgrades consume from canister balance, not your identity${NC}"
    
    echo -e "\n${RED}========================================${NC}"
    echo -e "${RED}IC MAINNET POST-DEPLOYMENT REQUIRED${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "\n${YELLOW}⚠️  IMPORTANT: Update ICRC-28 Trusted Origins${NC}"
    echo -e "${BLUE}1. Edit backend/main.mo - function icrc28_trusted_origins()${NC}"
    echo -e "${BLUE}2. Replace localhost URLs with:${NC}"
    echo -e "   - https://$FRONTEND_CANISTER.icp0.io"
    echo -e "   - https://$FRONTEND_CANISTER.ic0.app"
    echo -e "   - (add your custom domain if applicable)"
    echo -e "\n${BLUE}3. Rebuild and upgrade:${NC}"
    echo -e "   dfx build --network ic backend"
    echo -e "   dfx canister --network ic install backend --mode upgrade"
    echo -e "\n${YELLOW}This is required for Plug, OISY, and other wallets to work!${NC}"
fi

# Step 9: Display canister URLs
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment successful!${NC}"
echo -e "${GREEN}========================================${NC}"

FRONTEND_CANISTER=$(dfx canister $NETWORK_FLAG id frontend)

echo -e "\n${BLUE}Backend Canister ID:${NC} $BACKEND_CANISTER"
echo -e "${BLUE}Frontend Canister ID:${NC} $FRONTEND_CANISTER"

if [ "$NETWORK" == "local" ]; then
    echo -e "\n${BLUE}Frontend URL:${NC} http://localhost:4943/?canisterId=$FRONTEND_CANISTER"
    echo -e "${BLUE}Backend Candid UI:${NC} http://localhost:4943/?canisterId=$(dfx canister id __Candid_UI)&id=$BACKEND_CANISTER"
else
    echo -e "\n${BLUE}Frontend URL:${NC} https://$FRONTEND_CANISTER.icp0.io"
    echo -e "${BLUE}Backend Candid UI:${NC} https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=$BACKEND_CANISTER"
fi

echo -e "\n${YELLOW}Configuration Summary:${NC}"
echo -e "  Owner: $PRINCIPAL"
echo -e "  Treasury (Backend Canister Account): $TREASURY_ACCOUNT_ID"
if [ "$NETWORK" == "local" ]; then
    echo -e "  Ledger: $LEDGER_CANISTER"
    echo -e "  Localhost URLs: Enabled"
fi

echo -e "\n${GREEN}Next Steps:${NC}"
if [ "$NETWORK" == "local" ]; then
    echo -e "  1. Start the frontend dev server: ${BLUE}cd frontend && npm run dev${NC}"
    echo -e "  2. Open http://localhost:5173 in your browser"
    echo -e "  3. Test minting and watering your bonsai NFTs!"
    echo -e "  4. Withdraw ICP using: ${BLUE}dfx canister call backend withdrawTreasury '(blob \"DEST_ACCOUNT_ID\", AMOUNT : nat64)'${NC}"
else
    echo -e "  ${RED}1. UPDATE ICRC-28 TRUSTED ORIGINS (see above) - REQUIRED!${NC}"
    echo -e "  2. Visit the frontend URL above"
    echo -e "  3. Connect your wallet and start minting!"
    echo -e "  4. Monitor cycles regularly:"
    echo -e "     ${BLUE}dfx canister --network ic status backend${NC}"
    echo -e "     ${YELLOW}Top up if needed: dfx canister --network ic deposit-cycles backend 5000000000000${NC}"
    echo -e "  5. Withdraw ICP example:"
    echo -e "     ${BLUE}DEST=\$(dfx ledger account-id)${NC}"
    echo -e "     ${BLUE}dfx canister --network ic call backend withdrawTreasury \"(blob \\\"\$DEST\\\", 100000000 : nat64)\"${NC}"
    echo -e "     ${YELLOW}(100000000 e8s = 1 ICP)${NC}"
fi

echo ""
