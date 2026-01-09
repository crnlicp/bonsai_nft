import { useState, useEffect, useRef } from 'react';
import { HttpAgent, Actor } from '@dfinity/agent';
import { idlFactory } from '../../../src/declarations/backend/backend.did.js';
import type {
    LeaderboardEntry,
    AirdropDistribution,
    LeaderboardRound,
    CurrentLeaderboard
} from '../../../src/declarations/backend/backend.did';
import { isLocal, ensureRootKeyFetched } from '../utils/rootKey';
import { useIdentityKitAuth } from './useIdentityKitAuth';

export type {
    LeaderboardEntry,
    AirdropDistribution,
    LeaderboardRound,
    CurrentLeaderboard
};

export interface CompletedRoundsResponse {
    rounds: LeaderboardRound[];
    totalRounds: bigint;
    totalPages: bigint;
}

// Create anonymous agent for query calls (doesn't require authentication)
const createAnonymousActor = async () => {
    const host = isLocal ? 'http://127.0.0.1:4943' : 'https://icp-api.io';
    const agent = await HttpAgent.create({ host });

    // Fetch root key for local development
    if (isLocal) {
        await agent.fetchRootKey();
    }

    return Actor.createActor(idlFactory, {
        agent,
        canisterId: import.meta.env.CANISTER_ID_BACKEND || "",
    });
};

// Minimum participants required to process airdrop (matches backend MIN_UNIQUE_OWNERS_FOR_ROUND)
const MIN_PARTICIPANTS_FOR_AIRDROP = 1;

export const useLeaderboard = () => {
    const [currentLeaderboard, setCurrentLeaderboard] = useState<CurrentLeaderboard | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<bigint>(0n);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { actor: authActor } = useIdentityKitAuth();
    const { identityKitAgent } = useIdentityKitAuth();
    const [claimLoading, setClaimLoading] = useState(false);

    // Track if we're currently processing an airdrop to prevent duplicate calls
    const isProcessingAirdropRef = useRef(false);
    // Track the last processed round to avoid reprocessing
    const lastProcessedRoundRef = useRef<bigint | null>(null);

    const fetchCurrentLeaderboard = async (): Promise<CurrentLeaderboard | null> => {
        try {
            setLoading(true);
            setError(null);
            const actor = await createAnonymousActor() as any;
            const leaderboard = await actor.getCurrentLeaderboard() as CurrentLeaderboard;
            setCurrentLeaderboard(leaderboard);
            return leaderboard;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
            console.error('Error fetching leaderboard:', err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const fetchTimeRemaining = async (): Promise<bigint> => {
        try {
            const actor = await createAnonymousActor() as any;
            const time = await actor.getTimeUntilNextAirdrop() as bigint;
            setTimeRemaining(time);
            return time;
        } catch (err) {
            console.error('Error fetching time remaining:', err);
            return 0n;
        }
    };

    const fetchCompletedRounds = async (page: number = 0, pageSize: number = 10): Promise<CompletedRoundsResponse | null> => {
        try {
            setLoading(true);
            setError(null);
            const actor = await createAnonymousActor() as any;
            const response = await actor.getCompletedRounds(BigInt(page), BigInt(pageSize)) as CompletedRoundsResponse;
            return response;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch completed rounds');
            console.error('Error fetching completed rounds:', err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const claimAirdrop = async (roundId: bigint, accountId: Uint8Array): Promise<{ success: boolean; message: string }> => {
        try {
            setClaimLoading(true);
            setError(null);

            // If we have an authenticated actor, ensure root key (local) and use it
            let actorToUse: any = null;
            if (authActor) {
                // CRITICAL: Ensure root key is fetched for local dev BEFORE performing update call
                // This prevents "Invalid certificate: Signature verification failed" errors
                if (identityKitAgent && isLocal) {
                    try {
                        await ensureRootKeyFetched(identityKitAgent);
                        // Try to access the underlying HttpAgent in multiple ways
                        const httpAgent = (identityKitAgent as any).httpAgent ||
                            (identityKitAgent as any)._httpAgent ||
                            identityKitAgent;

                        if (httpAgent && typeof httpAgent.fetchRootKey === 'function') {
                            await httpAgent.fetchRootKey();
                            console.log('✅ Root key fetched successfully for claim');
                        }
                    } catch (rootKeyErr) {
                        console.log('Root key fetch skipped (may already be fetched):', rootKeyErr);
                    }
                }
                actorToUse = authActor;
            } else {
                actorToUse = await createAnonymousActor();
            }

            const result = await (actorToUse as any).claimAirdrop(roundId, Array.from(accountId)) as { Ok?: string; Err?: string };

            if ('Ok' in result && result.Ok) {
                return { success: true, message: result.Ok };
            } else if ('Err' in result && result.Err) {
                return { success: false, message: result.Err };
            } else {
                return { success: false, message: 'Unknown error' };
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to claim airdrop';
            setError(message);
            console.error('Claim error details:', err);
            fetchClaimedPrincipals(roundId);
            return { success: false, message };
        } finally {
            setClaimLoading(false);
        }
    };

    const fetchClaimedPrincipals = async (roundId: bigint): Promise<string[] | null> => {
        try {
            const actor = await createAnonymousActor() as any;
            const res = await actor.getClaimedPrincipals(BigInt(roundId)) as string[];
            return res;
        } catch (err) {
            console.error('Error fetching claimed principals:', err);
            return null;
        }
    };

    const processAirdrop = async (): Promise<{ success: boolean; message: string }> => {
        try {
            setLoading(true);
            setError(null);
            const actor = await createAnonymousActor() as any;
            const result = await actor.processAirdropIfReady() as { Ok?: string; Err?: string };

            if ('Ok' in result && result.Ok) {
                return { success: true, message: result.Ok };
            } else if ('Err' in result && result.Err) {
                return { success: false, message: result.Err };
            } else {
                return { success: false, message: 'Unknown error' };
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to process airdrop';
            setError(message);
            return { success: false, message };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const pollLeaderboard = async () => {
            if (cancelled) return;

            try {
                // Fetch current leaderboard and time remaining
                const [leaderboard, time] = await Promise.all([
                    fetchCurrentLeaderboard(),
                    fetchTimeRemaining(),
                ]);

                if (cancelled) return;

                // Determine if we should process airdrop:
                // 1. Round has ended (timeRemaining === 0)
                // 2. Has enough participants (>= MIN_PARTICIPANTS_FOR_AIRDROP)
                // 3. Not already processing
                // 4. Haven't already processed this round
                const participantCount = leaderboard?.topUsers?.length ?? 0;
                const roundId = leaderboard?.roundId;
                const hasEnoughParticipants = participantCount >= MIN_PARTICIPANTS_FOR_AIRDROP;
                const roundEnded = time === 0n;
                const alreadyProcessedThisRound = roundId !== undefined && lastProcessedRoundRef.current === roundId;

                console.log({leaderboard, time})
                if (
                    hasEnoughParticipants &&
                    roundEnded &&
                    !isProcessingAirdropRef.current &&
                    !alreadyProcessedThisRound
                ) {
                    isProcessingAirdropRef.current = true;

                    try {
                        const res = await processAirdrop();

                        if (res.success && roundId !== undefined) {
                            // Mark this round as processed to prevent reprocessing
                            lastProcessedRoundRef.current = roundId;

                            // Fetch completed rounds and notify listeners
                            await fetchCompletedRounds();

                            if (typeof window !== 'undefined') {
                                window.dispatchEvent(new Event('bonsai:completedRoundsUpdated'));
                            }
                        }
                    } finally {
                        isProcessingAirdropRef.current = false;
                    }
                }
            } catch (err) {
                console.error('Leaderboard poll failed:', err);
            }
        };

        // Initial fetch
        void pollLeaderboard();

        // Poll every 5 seconds
        const interval = setInterval(() => {
            void pollLeaderboard();
        }, 5000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    return {
        currentLeaderboard,
        timeRemaining,
        loading,
        claimLoading,
        error,
        fetchClaimedPrincipals,
        fetchCurrentLeaderboard,
        fetchTimeRemaining,
        fetchCompletedRounds,
        processAirdrop,
        claimAirdrop,
    };
};
