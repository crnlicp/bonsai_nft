import { HttpAgent } from '@dfinity/agent';

const isLocal = import.meta.env.DFX_NETWORK !== 'ic';
const LOCAL_HOST = 'http://127.0.0.1:4943';

/**
 * Ensures root key is fetched for any agent in local development
 * This is critical for certificate verification to work locally
 */
export const ensureRootKeyFetched = async (agent: any): Promise<void> => {
    if (!isLocal) {
        // Never fetch root key in production
        return;
    }

    try {
        // The agent might be an IdentityKitAgent wrapper
        // Try multiple ways to access the underlying HttpAgent
        const httpAgent = agent.httpAgent || agent._httpAgent || agent;

        if (httpAgent && typeof httpAgent.fetchRootKey === 'function') {
            await httpAgent.fetchRootKey();
            console.log('✅ Root key fetched for local development');
        } else {
            console.warn('Could not find HttpAgent with fetchRootKey method');
        }
    } catch (err) {
        // Root key might already be fetched, which is fine
        // But log the actual error in case it's something else
        if (err instanceof Error && !err.message.includes('already')) {
            console.warn('Root key fetch warning:', err.message);
        } else {
            console.log('Root key fetch skipped (likely already fetched)');
        }
    }
};

/**
 * Creates a configured HttpAgent for the current environment
 */
export const createConfiguredAgent = async (identity?: any): Promise<HttpAgent> => {
    const host = isLocal ? LOCAL_HOST : 'https://icp-api.io';

    const agent = await HttpAgent.create({
        host,
        identity,
    });

    // Fetch root key for local development
    if (isLocal) {
        await agent.fetchRootKey().catch((err) => {
            console.warn('Unable to fetch root key:', err);
        });
    }

    return agent;
};

export { isLocal, LOCAL_HOST };
