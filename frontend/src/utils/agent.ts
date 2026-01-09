import { HttpAgent, Actor } from '@dfinity/agent';
import { idlFactory as backendIdl } from 'declarations/backend/backend.did.js';

// Detect environment
const isLocal = import.meta.env.DFX_NETWORK !== 'ic';

// Configure host based on environment
// For local: use localhost with dfx replica port (default 4943)
// For IC: use ICP API boundary node
const getHost = () => {
    if (isLocal) {
        return `http://127.0.0.1:4943`; // Default dfx local replica
    }
    return 'https://icp-api.io'; // IC production network
};

const canisterId = import.meta.env.CANISTER_ID_BACKEND ?? '';
const host = getHost();

export interface CreateActorOptions {
    agentOptions?: {
        identity?: any;
        host?: string;
    };
}

/**
 * Creates an actor for the backend canister.
 * This is mainly for unauthenticated/anonymous calls.
 * 
 * For authenticated calls, prefer using the useAgent hook from IdentityKit
 * which returns an IdentityKitAgent that manages approval pop-ups automatically.
 */
export const createActor = async (options?: CreateActorOptions) => {
    if (!canisterId) {
        throw new Error('Missing CANISTER_ID_BACKEND in import.meta.env');
    }

    const agent = await HttpAgent.create({
        host: options?.agentOptions?.host || host,
        identity: options?.agentOptions?.identity,
    });

    // Fetch root key for local development
    // IMPORTANT: Never fetch root key in production (IC network)
    if (isLocal) {
        await agent.fetchRootKey().catch((err) => {
            console.warn('Unable to fetch root key. Check that dfx is running:', err);
        });
    }

    return Actor.createActor(backendIdl, {
        agent,
        canisterId,
    });
};

/**
 * Creates an unauthenticated (anonymous) agent.
 * Useful for query calls that don't require authentication.
 */
export const createAnonymousAgent = async () => {
    const agent = await HttpAgent.create({ host });

    if (isLocal) {
        await agent.fetchRootKey().catch((err) => {
            console.warn('Unable to fetch root key. Check that dfx is running:', err);
        });
    }

    return agent;
};

export { host, isLocal };
