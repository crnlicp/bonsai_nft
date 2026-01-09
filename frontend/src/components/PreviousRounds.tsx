import React, { useState, useEffect } from 'react';
import { LeaderboardRound, useLeaderboard } from '../hooks/useLeaderboard';
import { useIdentityKitAuth } from '../hooks/useIdentityKitAuth';
import { principalToAccountIdentifier } from '../utils/ledger';
import toast from 'react-hot-toast';

const PreviousRounds: React.FC = () => {
    const { fetchCompletedRounds, claimAirdrop, fetchClaimedPrincipals, claimLoading } = useLeaderboard();
    const { principal } = useIdentityKitAuth();
    const [rounds, setRounds] = useState<LeaderboardRound[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalRounds, setTotalRounds] = useState(0);
    const [loading, setLoading] = useState(false);
    const pageSize = 5;

    const loadRounds = async (page: number) => {
        setLoading(true);
        try {
            const response = await fetchCompletedRounds(page, pageSize);
            if (response) {
                setRounds(response.rounds);
                setTotalPages(Number(response.totalPages));
                setTotalRounds(Number(response.totalRounds));

                // Fetch claimed principals for visible rounds concurrently
                const map: Record<string, boolean> = {};
                const promises = response.rounds.map(async (r) => {
                    try {
                        // roundId is small, safe to coerce to Number then BigInt
                        const rid = BigInt(Number(r.roundId as unknown as number));
                        const claimed = await fetchClaimedPrincipals(rid);
                        if (claimed) {
                            for (const p of claimed) {
                                // Use roundId_principal as key to avoid conflicts between rounds
                                map[`${rid}_${p}`] = true;
                            }
                        }
                    } catch (e) {
                        console.error('Failed to fetch claimed principals for round', r.roundId, e);
                    }
                });

                await Promise.all(promises);
                setClaimedMap(map);
            }
        } catch (err) {
            console.error('Error loading rounds:', err);
        } finally {
            setLoading(false);
        }
    };

    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [claimedMap, setClaimedMap] = useState<Record<string, boolean>>({});

    const toggleExpanded = (id: number) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleClaim = async (roundId: bigint) => {
        if (!principal) {
            toast.error('Please connect your wallet to claim.');
            return;
        }

        try {
            toast.loading('Claiming airdrop...', { id: 'claim' });
            const principalObj = (window as any).Principal ? (window as any).Principal.fromText(principal.toString()) : null;
            // principal from useIdentityKitAuth may already be a Principal or string
            const principalToUse = principalObj || principal;
            const accountId = principalToAccountIdentifier(principalToUse as any);
            const res = await claimAirdrop(roundId, accountId);
            if (res.success) {
                toast.success('🎉 Airdrop claimed successfully!', { id: 'claim' });
                loadRounds(currentPage);
            } else {
                toast.error('Claim failed: ' + res.message, { id: 'claim' });
            }
        } catch (err) {
            console.error('Error claiming airdrop', err);
            toast.error('Claim failed: ' + (err instanceof Error ? err.message : String(err)), { id: 'claim' });
        }
    };

    const ClaimButton: React.FC<{ onClaim: () => void }> = ({ onClaim }) => {
        return (
            <button
                onClick={(e) => { e.stopPropagation(); onClaim(); }}
                disabled={claimLoading}
                className={`px-3 py-1 rounded-md text-sm ${claimLoading ? 'bg-gray-600 text-gray-200 cursor-not-allowed' : 'bg-primary text-white'}`}
            > Claim Reward&nbsp;
                {claimLoading && (
                    <svg className="animate-spin h-4 w-4 mx-auto inline-block" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                )}
            </button>
        );
    };

    useEffect(() => {
        loadRounds(currentPage);
    }, [currentPage]);

    useEffect(() => {
        const handler = () => {
            loadRounds(currentPage);
        };

        window.addEventListener('bonsai:completedRoundsUpdated', handler);
        return () => window.removeEventListener('bonsai:completedRoundsUpdated', handler);
    }, [currentPage]);

    const shortenPrincipal = (principal: string): string => {
        if (principal.length <= 15) return principal;
        return `${principal.slice(0, 8)}...${principal.slice(-5)}`;
    };

    const formatICP = (e8s: bigint): string => {
        return (Number(e8s) / 100_000_000).toFixed(4);
    };

    const formatDate = (timestamp: bigint): string => {
        const date = new Date(Number(timestamp / 1_000_000n));
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (totalRounds === 0) {
        return (
            <div className="card text-center">
                <p className="text-gray-400">No completed rounds yet. The first airdrop will occur after the current round ends.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-primary">Previous Rounds</h2>

            {loading ? (
                <div className="card text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-300">Loading rounds...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {rounds.map((round) => (
                        <div key={Number(round.roundId)} className="card overflow-hidden">
                            <div
                                role="button"
                                onClick={() => toggleExpanded(Number(round.roundId))}
                                className="bg-dark-bg border-b border-dark-border p-4 cursor-pointer"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-semibold text-primary">Round #{Number(round.roundId)}</h3>
                                        <p className="text-sm text-gray-400">{formatDate(round.endTime)}</p>
                                    </div>
                                    <div className="text-sm text-gray-400">Winners: {round.topUsers.length}</div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm text-secondary">Total Distributed</p>
                                            <p className="text-xl font-bold text-primary">{formatICP(round.totalDistributed)} ICP</p>
                                        </div>
                                        <svg className={`w-5 h-5 transition-transform ${expanded[Number(round.roundId)] ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {expanded[Number(round.roundId)] && (
                                <div className="p-4">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-dark-bg">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-secondary uppercase">Rank</th>
                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-secondary uppercase">Principal</th>
                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-secondary uppercase">Bonsais</th>
                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-secondary uppercase">Score</th>
                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-secondary uppercase">Share</th>
                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-secondary uppercase">Reward</th>
                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-secondary uppercase">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-dark-border">
                                                {round.topUsers.map((user) => {
                                                    const distribution = round.distributions.find(d => d.principal.toString() === user.principal.toString());
                                                    const isWinner = principal && principal.toString() === user.principal.toString();
                                                    const alreadyClaimed = claimedMap[`${round.roundId}_${user.principal.toString()}`] === true;
                                                    return (
                                                        <tr key={user.principal.toString()} className="hover:bg-dark-bg">
                                                            <td className="px-4 py-3 text-sm font-medium text-gray-200">#{Number(user.rank)}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-300 font-mono">{shortenPrincipal(user.principal.toString())}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-300 text-right">{Number(user.bonsaiCount)}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-300 text-right">{Number(user.totalScore).toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-300 text-right">{distribution ? `${(distribution.percentage * 100).toFixed(0)}%` : '-'}</td>
                                                            <td className="px-4 py-3 text-sm font-semibold text-primary text-right">{distribution ? `${formatICP(distribution.amount)} ICP` : '-'}</td>
                                                            <td className="px-4 py-3 text-sm text-right">
                                                                {distribution ? (
                                                                    alreadyClaimed ? (
                                                                        <span className="text-green-400">Claimed</span>
                                                                    ) : isWinner ? (
                                                                        <ClaimButton onClaim={() => handleClaim(round.roundId)} />
                                                                    ) : (
                                                                        <span className="text-gray-400">Unclaimed</span>
                                                                    )
                                                                ) : '-'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                    <button
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className="px-4 py-2 card border border-dark-border rounded-lg text-sm font-medium text-gray-300 hover:bg-dark-bg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>

                    <div className="flex gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i;
                            } else if (currentPage < 3) {
                                pageNum = i;
                            } else if (currentPage >= totalPages - 3) {
                                pageNum = totalPages - 5 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium ${currentPage === pageNum
                                        ? 'bg-primary text-white'
                                        : 'card border border-dark-border text-gray-300 hover:bg-dark-bg'
                                        }`}
                                >
                                    {pageNum + 1}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage >= totalPages - 1}
                        className="px-4 py-2 card border border-dark-border rounded-lg text-sm font-medium text-gray-300 hover:bg-dark-bg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default PreviousRounds;
