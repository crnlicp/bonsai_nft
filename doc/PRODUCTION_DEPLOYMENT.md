# Production Deployment Guide - CRITICAL FIXES APPLIED

## ✅ Critical Issues Fixed

This document outlines the critical fixes that have been applied and provides production deployment instructions.

### Fixed Issues:

1. **✅ withdrawTreasury() Function** - Now uses correct ICP Ledger format
2. **✅ Ledger Type Definition** - Fixed to use ICP Ledger types instead of ICRC-7
3. **✅ ICRC-28 Support** - Added trusted origins for wallet integration
4. **⚠️ Owner Frontrunning** - Mitigated (see security note below)

---

## 🚨 CRITICAL: Initial Deployment Security

**IMPORTANT:** The `setOwner()` function allows **anyone** to claim ownership if it's not set. You **MUST** call `setOwner()` immediately after deployment to prevent frontrunning.

### Recommended Deployment Sequence:

```bash
# 1. Deploy to IC mainnet
dfx deploy --network ic backend

# 2. IMMEDIATELY set owner (within seconds of deployment)
dfx canister --network ic call backend setOwner "(principal \"$(dfx identity get-principal)\")"

# 3. Verify owner is set correctly
dfx canister --network ic call backend getOwner
```

**Alternative:** Use `dfx canister install --mode reinstall` with immediate owner setup in your deployment script.

---

## 📋 Production Deployment Checklist

### 1. Pre-Deployment Configuration

```bash
# Ensure you're using the correct identity
dfx identity whoami
dfx identity get-principal

# Verify network configuration
dfx canister --network ic id backend  # Should fail before first deploy
```

### 2. Deploy to IC Mainnet

```bash
# Build and deploy
dfx deploy --network ic backend

# CRITICAL: Set owner immediately (copy-paste this block and run instantly)
OWNER_PRINCIPAL=$(dfx identity get-principal)
dfx canister --network ic call backend setOwner "(principal \"$OWNER_PRINCIPAL\")"
```

### 3. Configure Treasury and Ledger

```bash
# Get backend canister ID
BACKEND_CANISTER=$(dfx canister --network ic id backend)
echo "Backend Canister: $BACKEND_CANISTER"

# Get treasury account ID (this is where users send ICP)
TREASURY_ACCOUNT=$(dfx ledger account-id --of-principal "$BACKEND_CANISTER")
echo "Treasury Account: $TREASURY_ACCOUNT"

# Set treasury account in backend
dfx canister --network ic call backend setTreasuryAccountIdHex "(\"$TREASURY_ACCOUNT\")"

# Verify ledger canister (should be mainnet ICP ledger by default)
dfx canister --network ic call backend getLedgerCanisterId
# Expected: (principal "ryjl3-tyaaa-aaaaa-aaaba-cai")
```

### 4. Configure ICRC-28/ICRC-37 Trusted Origins

Trusted origins are required for Plug, OISY, and other wallet flows.

This project now updates trusted origins as part of the IC deployment script:

```bash
./deploy.sh --ic
```

To add a custom domain, pass it during deploy (repeatable):

```bash
./deploy.sh --ic --origin https://your-custom-domain.com
```

### 5. Verify Configuration

```bash
# Check owner
dfx canister --network ic call backend getOwner

# Check treasury account
dfx canister --network ic call backend getTreasuryAccountId

# Check ledger canister
dfx canister --network ic call backend getLedgerCanisterId

# Check localhost image URL (should be false for production)
dfx canister --network ic call backend getUseLocalhostImageUrl
# Expected: (false)

# Check treasury balance
dfx canister --network ic call backend getTreasuryBalance
# Expected: (0 : nat64) initially
```

---

## 💰 Treasury Withdrawal (Owner Only)

The `withdrawTreasury` function now works correctly and requires proper parameters:

```bash
# Get withdrawal destination (your personal account ID)
DESTINATION=$(dfx ledger account-id)
echo "Withdrawal Destination: $DESTINATION"

# Withdraw amount in e8s (100_000_000 e8s = 1 ICP)
AMOUNT=100000000  # 1 ICP

# Execute withdrawal
dfx canister --network ic call backend withdrawTreasury "(blob \"$DESTINATION\", $AMOUNT : nat64)"
```

### Important Notes:

- Amount is in e8s (1 ICP = 100,000,000 e8s)
- Destination must be a 32-byte account identifier
- Automatically deducts 10,000 e8s transfer fee
- Updates treasury balance after successful withdrawal

---

## 🔒 Security Best Practices

### Owner Management

1. **Use a hardware wallet or secure identity** for the owner principal
2. **Consider multi-sig** for production deployments
3. **Document owner transfer** procedures
4. **Backup your identity** files securely

### Treasury Management

1. **Regular audits** - Compare `getTreasuryBalance()` with actual ledger balance
2. **Monitor withdrawals** - Log all withdrawal transactions
3. **Test on testnet first** - Always test withdrawal flow before mainnet

### Access Control

Only the owner can:
- Change ledger canister ID
- Set treasury account
- Withdraw funds
- Transfer ownership
- Toggle localhost image URLs

---

## 🧪 Testing Before Production

### Test on Local Replica

```bash
# Start local replica
dfx start --clean

# Deploy locally
./deploy.sh

# Test withdrawal flow
dfx canister call backend withdrawTreasury "(blob \"YOUR_ACCOUNT_ID\", 10000000 : nat64)"
```

### Test on IC Testnet (if available)

Follow the same deployment steps but use testnet network configuration.

---

## 📊 Monitoring and Maintenance

### Regular Health Checks

```bash
# Check treasury balance
dfx canister --network ic call backend getTreasuryBalance

# Check if owner is still set
dfx canister --network ic call backend getOwner

# Check current leaderboard
dfx canister --network ic call backend getCurrentLeaderboard
```

### Upgrade Procedure

```bash
# Build new version
dfx build --network ic backend

# Upgrade (preserves state)
dfx canister --network ic install backend --mode upgrade

# Verify state is intact
dfx canister --network ic call backend getTreasuryBalance
dfx canister --network ic call backend getOwner
```

---

## 🆘 Troubleshooting

### "Owner not set" Error

If you forgot to set owner immediately after deployment:

1. Check if anyone has claimed ownership: `dfx canister --network ic call backend getOwner`
2. If `(null)`, you can still claim it: `dfx canister --network ic call backend setOwner ...`
3. If someone else claimed it, you'll need to reinstall the canister (loses all data)

### Withdrawal Fails

Common issues:
- **Insufficient balance**: Check `getTreasuryBalance()`
- **Wrong destination format**: Must be 32-byte Blob
- **Ledger fee**: Ensure you account for 10,000 e8s fee
- **Not owner**: Only owner can withdraw

### Wallet Integration Issues

If Plug or OISY don't work:
1. Verify ICRC-28 trusted origins are set correctly
2. Check that frontend URL matches trusted origins exactly
3. Ensure delegation targets include both backend and ledger canisters

---

## 📞 Support

For issues with:
- **ICP Ledger**: https://forum.dfinity.org
- **IdentityKit/NFID**: https://github.com/internet-identity-labs/nfid-wallet-client
- **Plug Wallet**: https://docs.plugwallet.ooo/

---

## ✨ Summary

You're now ready for production deployment! Remember:

1. ⚠️ Set owner **immediately** after deployment
2. 🔐 Configure treasury account before accepting payments
3. 🌐 Update ICRC-28 trusted origins with your frontend URLs
4. 🧪 Test withdrawal flow on testnet first
5. 📊 Monitor treasury balance regularly

Good luck with your launch! 🚀
