# Deployment Guide

## Initial Setup

After deploying the backend canister for the first time, you need to configure the owner and treasury account.

### Step 1: Deploy the canister

```bash
dfx deploy backend
```

### Step 2: Set the owner

The first person to call `setOwner` will claim ownership:

```bash
dfx canister call backend setOwner '(principal "YOUR_PRINCIPAL_ID")'
```

To get your principal ID:
```bash
dfx identity get-principal
```

### Step 3: Set the treasury account

The treasury account is where ICP payments for minting will be sent. You need to provide a 64-character hex string representing the 32-byte account identifier.

```bash
dfx canister call backend setTreasuryAccountIdHex '("YOUR_TREASURY_ACCOUNT_HEX")'
```

#### How to get your treasury account ID:

For local development, you can use your dfx identity's account ID:

```bash
# Get your account ID in hex format
dfx ledger account-id
```

For mainnet deployment, you should use a dedicated treasury account. You can generate one using:

```bash
# Use your principal to derive an account ID
dfx ledger account-id --of-principal YOUR_PRINCIPAL_ID
```

### Step 4: Configure for local development

For local development with the dfx replica, you need to set the local ledger canister ID:

```bash
# Get your local ledger canister ID
dfx canister id icp_ledger_canister

# Set it in the backend
dfx canister call backend setLedgerCanisterId '(principal "LOCAL_LEDGER_CANISTER_ID")'
```

### Step 5: Verify configuration

```bash
# Check owner
dfx canister call backend getOwner

# Check treasury account
dfx canister call backend getTreasuryAccountId

# Check ledger canister
dfx canister call backend getLedgerCanisterId
```

## Configuration for Production (IC Mainnet)

When deploying to mainnet:

1. **Owner**: Use your controller principal or a dedicated admin principal
2. **Treasury**: Use a dedicated account for collecting payments
3. **Ledger**: The default ledger canister ID (`ryjl3-tyaaa-aaaaa-aaaba-cai`) is already set, no need to change

### Deploy to mainnet:

Recommended: use the provided deployment script, which sets owner/treasury and updates ICRC-28/ICRC-37 trusted origins automatically:

```bash
./deploy.sh --ic
```

If you use a custom domain, add it as an extra trusted origin during deploy:

```bash
./deploy.sh --ic --origin https://your-custom-domain.com
```

```bash
dfx deploy --network ic backend

# Set owner (first call claims ownership)
dfx canister --network ic call backend setOwner '(principal "YOUR_MAINNET_PRINCIPAL")'

# Set treasury
dfx canister --network ic call backend setTreasuryAccountIdHex '("YOUR_TREASURY_HEX")'
```

## Security Notes

1. **Owner**: Only the owner can:
   - Change the ledger canister ID
   - Set the treasury account
   - Withdraw funds from the treasury
   - Transfer ownership to another principal
   - Toggle localhost image URLs

2. **First-Come Ownership**: The first person to call `setOwner` will become the owner. Make sure to call this immediately after deployment.

3. **Treasury Account**: Once set, the treasury account can only be changed by the owner. All minting payments will go to this account.

## Testing Locally

For local testing, you can use free watering (owner-only):

```bash
# Free water (owner only, no payment required)
dfx canister call backend waterBonsai '(0)'
```

Regular users must use `waterBonsaiWithPayment` which requires ICP payment verification.
