import { useEffect, useState } from 'react';
import { useAuth, useAgent, useIdentity, useSigner, useAccounts } from '@nfid/identitykit/react';
import { Actor } from '@dfinity/agent';
import { idlFactory as backendIdl } from 'declarations/backend/backend.did.js';
import { ensureRootKeyFetched, isLocal, createConfiguredAgent } from '../utils/rootKey';

const BACKEND_CANISTER_ID = import.meta.env.CANISTER_ID_BACKEND || '';

/**
 * Custom hook that wraps NFID IdentityKit hooks and provides
 * a compatible interface with the existing codebase.
 * 
 * Uses separate hooks instead of the deprecated useIdentityKit hook:
 * - useAuth: For connection state and user data
 * - useAgent: For the authenticated agent
 * - useIdentity: For the identity object
 * - useSigner: For the signer information
 * - useAccounts: For account information (when using ACCOUNTS auth type)
 */
export const useIdentityKitAuth = () => {
    // Use the new separate hooks
    const { user, isConnecting } = useAuth();

    // For local development, pass host and ensure fetchRootKey
    const identityKitAgent = useAgent(isLocal ? {
        host: 'http://127.0.0.1:4943',
    } : undefined);

    const identity = useIdentity();
    const signer = useSigner();
    const accounts = useAccounts();

    // Determine authentication state
    const isAuthenticated = !!user;
    const principal = user?.principal || null;

    // Create actor using the IdentityKit agent
    // For local development, we need to ensure root key is fetched
    const [actor, setActor] = useState<any>(null);
    const [actorLoading, setActorLoading] = useState(true);
    const [isActorAuthenticated, setIsActorAuthenticated] = useState(false);
    const [rootKeyFetched, setRootKeyFetched] = useState(!isLocal);

    // Fetch root key once for local development
    useEffect(() => {
        if (!isLocal || rootKeyFetched || !identityKitAgent) return;

        const fetchRootKey = async () => {
            await ensureRootKeyFetched(identityKitAgent);
            setRootKeyFetched(true);
        };

        fetchRootKey();
    }, [identityKitAgent, rootKeyFetched]);

    // Create actor when agent is ready and root key is fetched (in local mode)
    // Create authenticated actor when available, otherwise anonymous for read-only operations
    useEffect(() => {
        if (!BACKEND_CANISTER_ID) {
            setActor(null);
            setActorLoading(false);
            return;
        }

        const createActor = async () => {
            setActorLoading(true);

            let agentToUse: any = identityKitAgent;
            let isAuthenticatedActor = false;

            // If no authenticated agent, create an anonymous one for read-only operations
            if (!identityKitAgent) {
                try {
                    agentToUse = await createConfiguredAgent();
                    isAuthenticatedActor = false;
                } catch (error) {
                    console.error('Failed to create anonymous agent:', error);
                    setActorLoading(false);
                    return;
                }
            } else {
                isAuthenticatedActor = true;
            }

            // For local with authenticated agent, wait until root key is fetched
            if (isLocal && identityKitAgent && !rootKeyFetched) {
                return; // Keep loading until root key is ready
            }

            const newActor = Actor.createActor(backendIdl, {
                agent: agentToUse,
                canisterId: BACKEND_CANISTER_ID,
            });

            setActor(newActor);
            setIsActorAuthenticated(isAuthenticatedActor);
            setActorLoading(false);
        };

        createActor();
    }, [identityKitAgent, rootKeyFetched]);

    return {
        // Authentication state
        isAuthenticated,
        principal,
        user,

        // Actor for backend calls
        actor,
        actorLoading,
        isActorAuthenticated, // Flag to check if actor is using authenticated identity

        // Underlying agent (useful for ensuring root key / direct agent usage)
        identityKitAgent,

        // Additional data
        identity,
        signer,
        accounts,

        // Loading state
        loading: isConnecting,
        isConnecting,
    };
};
