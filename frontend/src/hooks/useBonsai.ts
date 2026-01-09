import { useState } from 'react';
import { Principal } from '@dfinity/principal';
import { useIdentityKitAuth } from './useIdentityKitAuth';
import { useBalance } from './useBalance';
import toast from 'react-hot-toast';

// Minting costs in e8s
const MINT_COST = BigInt(100_000_000); // 1 ICP
const WATER_COST = BigInt(1_111_000); // 0.01111000 ICP (fixed cost for regular watering)

export interface BonsaiNFT {
    tokenId: bigint;
    owner: string;
    growthSteps: bigint;
    mintedAt: bigint;
    lastWatered: bigint;
    cachedSVG: string;
}

export interface TokenMetadata {
    tokenId: bigint;
    name: string;
    description: string;
    image: string;
    properties: {
        score: bigint;
        age: bigint;
        branches: bigint;
        foliage: bigint;
        growthSteps: bigint;
        canGrow: boolean;
    };
}

export const useBonsai = () => {
    const { actor, principal, isAuthenticated, isActorAuthenticated } = useIdentityKitAuth();
    const { transferToBackend, balance, fetchBalance } = useBalance();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Mint with direct ICP payment
    const mintBonsai = async () => {
        if (!actor || !isAuthenticated || !isActorAuthenticated) {
            throw new Error('Please connect your wallet first');
        }

        // Extra safety: Check that we're not using the anonymous principal
        const ANONYMOUS_PRINCIPAL = '2vxsx-fae';
        if (principal?.toText() === ANONYMOUS_PRINCIPAL) {
            throw new Error('Cannot mint with anonymous identity. Please connect your wallet.');
        }

        // Check if user has enough balance
        if (balance < MINT_COST + BigInt(10_000)) { // Include fee
            throw new Error('Insufficient ICP balance. You need at least 1.0001 ICP to mint.');
        }

        setLoading(true);
        setError(null);

        try {
            // Step 0: Create invoice memo (used as Ledger transfer memo)
            const memoResult = await actor.createMintInvoice();
            if (!('Ok' in memoResult)) {
                throw new Error(memoResult.Err);
            }
            const memo = memoResult.Ok;

            // Step 1: Transfer ICP to backend treasury account
            toast.loading('Transferring 1 ICP...', { id: 'mint' });
            const blockIndex = await transferToBackend(MINT_COST, memo);

            // Step 2: Confirm payment on-canister + mint
            toast.loading('Minting your Bonsai...', { id: 'mint' });
            const result = await actor.mintBonsaiWithPayment(blockIndex, memo);

            if ('Ok' in result) {
                toast.success('Bonsai minted successfully!', { id: 'mint' });
                await fetchBalance();
                return result.Ok;
            } else {
                throw new Error(result.Err);
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to mint bonsai', { id: 'mint' });
            setError(err.message || 'Failed to mint bonsai');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Water with direct ICP payment
    // customCost is used for auto-grow with random amounts
    const waterBonsai = async (tokenId: bigint, customCost?: bigint) => {
        if (!actor || !isAuthenticated || !isActorAuthenticated) {
            throw new Error('Please connect your wallet first');
        }

        // Extra safety: Check that we're not using the anonymous principal
        const ANONYMOUS_PRINCIPAL = '2vxsx-fae';
        if (principal?.toText() === ANONYMOUS_PRINCIPAL) {
            throw new Error('Cannot water with anonymous identity. Please connect your wallet.');
        }

        // Use custom cost for auto-grow, or fixed cost for regular watering
        const costToUse = customCost || WATER_COST;
        const waterCostICP = Number(costToUse) / 100_000_000;

        // Check if user has enough balance
        if (balance < costToUse + BigInt(10_000)) { // Include fee
            throw new Error(`Insufficient ICP balance. You need at least ${waterCostICP.toFixed(8)} ICP to water.`);
        }

        setLoading(true);
        setError(null);

        try {
            // Step 0: Create invoice memo
            const invoiceResult = await actor.createWaterInvoice(tokenId, costToUse);
            if (!('Ok' in invoiceResult)) {
                throw new Error(invoiceResult.Err);
            }
            const memo = invoiceResult.Ok;

            // Step 1: Transfer ICP to backend treasury account
            toast.loading(`Transferring ${waterCostICP.toFixed(8)} ICP...`, { id: 'water' });
            const blockIndex = await transferToBackend(costToUse, memo);

            // Get the current balance AFTER transfer for dynamic background color
            // This will be used to calculate the new background color in the SVG
            const currentBalanceE8s = balance - costToUse - BigInt(10_000); // Approximate balance after transfer

            // Step 2: Confirm payment on-canister + water (balance is for visuals)
            toast.loading('Watering your Bonsai...', { id: 'water' });
            const result = await actor.waterBonsaiWithPayment(tokenId, currentBalanceE8s, costToUse, blockIndex, memo);

            if ('Ok' in result) {
                toast.success('Bonsai watered! It grew a little 🌱', { id: 'water' });
                await fetchBalance();
                return true;
            } else {
                throw new Error(result.Err);
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to water bonsai', { id: 'water' });
            setError(err.message || 'Failed to water bonsai');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const burnBonsai = async (tokenId: bigint) => {
        if (!actor || !isAuthenticated) {
            throw new Error('Please connect your wallet first');
        }

        setLoading(true);
        setError(null);

        try {
            const result = await actor.burnBonsai(tokenId);
            if ('Ok' in result) {
                return true;
            } else {
                throw new Error(result.Err);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to burn bonsai');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const getBonsaiDetails = async (tokenId: bigint): Promise<BonsaiNFT | null> => {
        if (!actor) return null;

        try {
            const result = await actor.getBonsaiDetails(tokenId);
            return result.length > 0 ? result[0] : null;
        } catch (err) {
            console.error('Failed to get bonsai details:', err);
            return null;
        }
    };

    const getMyBonsais = async (): Promise<TokenMetadata[]> => {
        if (!actor || !principal) return [];

        try {
            return await actor.getMyBonsais(principal);
        } catch (err) {
            console.error('Failed to get my bonsais:', err);
            return [];
        }
    };

    const getGallery = async (offset: bigint, limit: bigint): Promise<TokenMetadata[]> => {
        if (!actor) return [];

        try {
            return await actor.getGallery(offset, limit);
        } catch (err) {
            console.error('Failed to get gallery:', err);
            return [];
        }
    };

    const transferBonsai = async (tokenId: bigint, to: string) => {
        if (!actor || !isAuthenticated) {
            throw new Error('Please connect your wallet first');
        }

        setLoading(true);
        setError(null);

        try {
            // Convert string to Principal
            const toPrincipal = Principal.fromText(to);

            const result = await actor.icrc37_transfer({
                from_subaccount: [],
                to: { owner: toPrincipal, subaccount: [] },
                token_id: tokenId,
                memo: [],
                created_at_time: [],
            });

            if ('Ok' in result) {
                return true;
            } else {
                throw new Error('Transfer failed');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to transfer bonsai');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        mintBonsai,
        waterBonsai,
        burnBonsai,
        getBonsaiDetails,
        getMyBonsais,
        getGallery,
        transferBonsai,
        loading,
        error,
    };
};
