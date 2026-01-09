# NFID IdentityKit Integration Guide

This document describes the complete NFID IdentityKit integration in this project, following all best practices from the official documentation.

## 🎯 Overview

The project uses **@nfid/identitykit v1.0.16+** for wallet authentication and connection. The integration supports:

- ✅ **Multiple Wallets**: NFID, Plug, Internet Identity, Stoic, OISY
- ✅ **Auto-discovery**: Automatically detects browser extension wallets (ICRC-94)
- ✅ **Local & IC Networks**: Works seamlessly on both localhost and IC mainnet
- ✅ **Delegation-based Auth**: Seamless UX without approval pop-ups for target canisters
- ✅ **ICRC Standards**: Implements ICRC-10 and ICRC-28 for on-chain wallet support

## 📦 Installation

Dependencies are already installed in `package.json`:

```json
{
  "@nfid/identitykit": "^1.0.16",
  "@dfinity/agent": "2.4.1",
  "@dfinity/auth-client": "2.4.1",
  "@dfinity/candid": "2.4.1",
  "@dfinity/identity": "2.4.1",
  "@dfinity/principal": "2.4.1",
  "@dfinity/utils": "^4.1.0"
}
```

## 🏗️ Architecture

### Provider Setup (`App.tsx`)

The `IdentityKitProvider` wraps the entire application:

```typescript
<IdentityKitProvider
  signers={[NFIDW, Plug, InternetIdentity, Stoic, OISY]}
  authType={IdentityKitAuthType.DELEGATION}
  discoverExtensionSigners={true}
  theme="system"
  signerClientOptions={{
    targets: [BACKEND_CANISTER_ID, LEDGER_CANISTER_ID],
    maxTimeToLive: BigInt(30 * 60 * 1_000_000_000), // 30 minutes
    idleOptions: {
      idleTimeout: 1800000, // 30 minutes
      disableIdle: false,
    },
    keyType: "Ed25519",
  }}
/>
```

**Key Features:**
- **Delegation Auth**: No approval pop-ups for target canisters
- **Auto-discovery**: Detects Plug and other extension wallets
- **Idle Management**: Auto-logout after 30 minutes of inactivity
- **Local/IC Support**: Works on both networks automatically

### Hooks Usage

The integration uses **separate hooks** instead of the deprecated `useIdentityKit`:

#### Primary Hooks

1. **`useAuth`** - Connection state and user data
```typescript
import { useAuth } from '@nfid/identitykit/react';

const { user, connect, disconnect, isConnecting } = useAuth();
// user: { principal: Principal, subaccount?: SubAccount }
```

2. **`useAgent`** - Authenticated agent for canister calls
```typescript
import { useAgent } from '@nfid/identitykit/react';

const authenticatedAgent = useAgent();
// Returns IdentityKitAgent that manages approval pop-ups
```

3. **`useIdentity`** - DFINITY identity object
```typescript
import { useIdentity } from '@nfid/identitykit/react';

const identity = useIdentity();
// Returns Identity for DELEGATION authType
```

4. **`useSigner`** - Current signer information
```typescript
import { useSigner } from '@nfid/identitykit/react';

const signer = useSigner();
// Returns current wallet/signer details
```

5. **`useAccounts`** - Account information (for ACCOUNTS authType)
```typescript
import { useAccounts } from '@nfid/identitykit/react';

const accounts = useAccounts();
// Returns accounts array when using ACCOUNTS authType
```

### Custom Hook (`useIdentityKitAuth`)

A compatibility wrapper that provides a unified interface:

```typescript
const {
  isAuthenticated,  // boolean
  principal,        // Principal | null
  user,            // { principal, subaccount? }
  actor,           // Backend actor
  identity,        // Identity object
  signer,          // Signer info
  accounts,        // Accounts (if using ACCOUNTS authType)
  loading,         // Connection state
  isConnecting,    // Connection in progress
} = useIdentityKitAuth();
```

## 🌐 Network Configuration

### Environment Detection

The app automatically detects the environment:

```typescript
const isLocal = import.meta.env.DFX_NETWORK !== 'ic';
```

### Agent Configuration

- **Local**: `http://127.0.0.1:4943` (dfx replica)
- **IC**: `https://icp-api.io` (boundary node)

Agents automatically fetch root key on local network only:

```typescript
if (isLocal) {
  await agent.fetchRootKey();
}
```

## 🔐 Backend Integration (ICRC-10 & ICRC-28)

The backend implements required standards for on-chain wallet support:

### ICRC-10: Supported Standards

```motoko
public query func icrc10_supported_standards() : async [SupportedStandard] {
  [
    { name = "ICRC-7"; url = "..." },
    { name = "ICRC-10"; url = "..." },
    { name = "ICRC-28"; url = "..." },
    { name = "ICRC-37"; url = "..." },
  ]
}
```

### ICRC-28: Trusted Origins

```motoko
public query func icrc28_trusted_origins() : async Icrc28TrustedOriginsResponse {
  {
    trusted_origins = [
      "http://localhost:5173",  // Local dev
      "https://<canister-id>.icp0.io",  // IC production
      // ... more origins
    ]
  }
}
```

**Important**: Update trusted origins when deploying to production!

## 🎨 Components

### ConnectWallet Button

```typescript
import { ConnectWallet } from '@nfid/identitykit/react';

<ConnectWallet />
```

This component provides:
- Wallet selection modal
- Connection management
- Automatic wallet switching
- Responsive design matching your theme

### UserMenu

Shows connected user info and actions:
- Principal ID (truncated)
- ICP balance
- Copy principal
- Disconnect button

Uses `useAuth` and `useSigner` hooks directly.

## 🚀 Local Development

### Running Locally

1. Start dfx:
```bash
dfx start --clean --background
```

2. Deploy canisters:
```bash
dfx deploy
```

3. Start frontend dev server:
```bash
cd frontend && npm run dev
```

4. Access app:
```
http://localhost:5173
```

### Local Network Setup

- **DFX Replica Port**: `4943` (default)
- **Local Ledger**: Deployed automatically by dfx
- **Root Key**: Fetched automatically in local mode

### Wallet Testing

- **Plug**: Works locally ✅ (extension-based)
- **NFID**: Requires IC network (browser-based)
- **Internet Identity**: Can run locally if deployed
- **Stoic**: Requires IC network
- **OISY**: Requires IC network

## 📋 Wallet Support Matrix

| Wallet | DELEGATION | ACCOUNTS | Local | IC |
|--------|-----------|----------|-------|-----|
| NFID | ✅ | ❌ | ❌ | ✅ |
| Plug | ✅ | ✅ | ✅ | ✅ |
| Internet Identity | ✅ | ❌ | ✅* | ✅ |
| Stoic | ✅ | ❌ | ❌ | ✅ |
| OISY | ❌ | ✅ | ❌ | ✅ |

*Internet Identity works locally if the canister is deployed

## 🎯 Best Practices

### 1. Use Separate Hooks
✅ **Do**: Use `useAuth`, `useAgent`, `useIdentity`, etc.
❌ **Don't**: Use deprecated `useIdentityKit`

### 2. Agent Usage
✅ **Do**: Use `useAgent()` for authenticated calls
❌ **Don't**: Create custom agents for authenticated calls

### 3. Actor Creation

**For Authenticated Calls**:
```typescript
const authenticatedAgent = useAgent();
const actor = useMemo(() => {
  if (!authenticatedAgent) return null;
  return Actor.createActor(idlFactory, {
    agent: authenticatedAgent,
    canisterId: CANISTER_ID,
  });
}, [authenticatedAgent]);
```

**For Anonymous Calls**:
```typescript
const agent = await createAnonymousAgent();
const actor = Actor.createActor(idlFactory, {
  agent,
  canisterId: CANISTER_ID,
});
```

### 4. Environment Configuration

Always check environment before fetching root key:
```typescript
if (import.meta.env.DFX_NETWORK !== 'ic') {
  await agent.fetchRootKey();
}
```

### 5. Target Canisters

Only add **your backend canisters** to targets:
```typescript
targets: [BACKEND_CANISTER_ID]  // ✅ Your canister
targets: [ICP_LEDGER_ID]        // ❌ Don't add ledger
```

Ledger calls will show approval pop-ups (expected behavior).

## 🔧 Configuration Options

### IdentityKitProvider Props

```typescript
interface IdentityKitProviderProps {
  // Wallet list
  signers?: Signer[];
  
  // Auto-discover extension wallets
  discoverExtensionSigners?: boolean;
  
  // Exclude specific signers
  excludeExtensionSignersBy?: Array<{uuid?: string, name?: string}>;
  
  // Auth type
  authType?: IdentityKitAuthType | Record<string, IdentityKitAuthType>;
  
  // Featured signer (shown prominently)
  featuredSigner?: Signer;
  
  // Theme
  theme?: "light" | "dark" | "system";
  
  // Signer options
  signerClientOptions?: {
    targets?: string[];
    maxTimeToLive?: bigint;
    idleOptions?: IdleOptions;
    keyType?: "ECDSA" | "Ed25519";
    identity?: SignIdentity;
    storage?: AuthClientStorage;
  };
  
  // Event handlers
  onConnectSuccess?: () => void;
  onConnectFailure?: (error: Error) => void;
  onDisconnect?: () => void;
  
  // Advanced options
  crypto?: Pick<Crypto, "getRandomValues" | "randomUUID">;
  window?: Window;
  windowOpenerFeatures?: string;
  allowInternetIdentityPinAuthentication?: boolean;
}
```

## 📚 Resources

- [NFID IdentityKit Docs](https://qzjsg-qiaaa-aaaam-acupa-cai.icp0.io/docs)
- [GitHub Repository](https://github.com/internet-identity-labs/identitykit)
- [NPM Package](https://www.npmjs.com/package/@nfid/identitykit)

## 🐛 Troubleshooting

### Issue: 404 errors to ledger canister locally
**Solution**: This is normal. The agent retries to fetch root key from multiple endpoints.

### Issue: Wallet not appearing
**Solution**: Check if `discoverExtensionSigners` is enabled and extension is installed.

### Issue: "Treasury account not configured"
**Solution**: Owner must call `setTreasuryAccountId` with a valid account ID.

### Issue: Root key fetch fails
**Solution**: Make sure dfx is running: `dfx start --background`

### Issue: Connection fails
**Solution**: Check that ICRC-28 trusted origins include your frontend URL.

## ✅ Integration Checklist

- [x] IdentityKit provider configured
- [x] All major wallets included (NFID, Plug, II, Stoic, OISY)
- [x] Local development support
- [x] IC network support
- [x] Separate hooks usage (not deprecated useIdentityKit)
- [x] ICRC-10 backend support
- [x] ICRC-28 trusted origins
- [x] Environment-based agent configuration
- [x] Delegation-based authentication
- [x] Idle timeout configuration
- [x] Theme support
- [x] Auto-discovery enabled

## 🎉 Summary

Your IdentityKit integration is now complete with:
- ✅ All supported wallets
- ✅ Best practices implementation
- ✅ Local and IC network support
- ✅ Modern hooks usage
- ✅ ICRC standards compliance
- ✅ Production-ready configuration

Happy building! 🚀
