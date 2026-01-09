import { ConnectWallet } from '@nfid/identitykit/react';

/**
 * Wrapper component for NFID IdentityKit's ConnectWallet
 * This provides wallet connection with support for:
 * - NFID
 * - Internet Identity
 * - Plug
 * - Stoic
 * - And other ICP wallets
 */
const WalletConnect = () => {
    return <ConnectWallet />;
};

export default WalletConnect;
