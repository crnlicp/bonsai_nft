import React from 'react';
import { useLeaderboard } from '../hooks/useLeaderboard';
import CountdownTimer from '../components/CountdownTimer';
import PreviousRounds from '../components/PreviousRounds';

const Leaderboard: React.FC = () => {
    const { currentLeaderboard, timeRemaining, loading, error } = useLeaderboard();

    const shortenPrincipal = (principal: string): string => {
        if (principal.length <= 15) return principal;
        return `${principal.slice(0, 8)}...${principal.slice(-5)}`;
    };

    const formatICP = (e8s: bigint): string => {
        return (Number(e8s) / 100_000_000).toFixed(4);
    };

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return (
                    <div className="flex items-center gap-2">
                        <span className="text-4xl">🏆</span>
                        <div className="flex flex-col">
                            <span className="text-xs text-yellow-200 font-semibold">CHAMPION</span>
                            <span className="text-xl font-bold text-yellow-100">1st</span>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="flex items-center gap-2">
                        <span className="text-3xl">🥈</span>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-200 font-semibold">RUNNER-UP</span>
                            <span className="text-lg font-bold text-gray-100">2nd</span>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="flex items-center gap-2">
                        <span className="text-3xl">🥉</span>
                        <div className="flex flex-col">
                            <span className="text-xs text-amber-200 font-semibold">THIRD</span>
                            <span className="text-lg font-bold text-amber-100">3rd</span>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-700">#{rank}</span>
                    </div>
                );
        }
    };

    const getRankCardStyle = (rank: number): string => {
        switch (rank) {
            case 1:
                return 'bg-gradient-to-br from-yellow-700 via-yellow-600 to-yellow-100 border-2 border-yellow-400 shadow-2xl transform text-white';
            case 2:
                return 'bg-gradient-to-br from-gray-700 via-gray-400 to-gray-200 border-2 border-gray-300 shadow-xl text-white';
            case 3:
                return 'bg-gradient-to-br from-amber-700 via-amber-500 to-amber-200 border-2 border-amber-400 shadow-xl text-white';
            default:
                return 'bg-white border border-gray-200 shadow hover:shadow-md transition-shadow';
        }
    };

    const getAirdropPercentage = (rank: number, totalWinners: number): string => {
        // Predefined percentages for each rank
        const percentages = [22, 18, 14, 11, 9, 8, 7, 5, 4, 2];

        if (rank > percentages.length || rank < 1) {
            return '0%';
        }

        // Calculate total percentage for actual number of winners
        let totalPercent = 0;
        for (let i = 0; i < totalWinners && i < percentages.length; i++) {
            totalPercent += percentages[i];
        }

        // Calculate scaled percentage for this rank
        const rankPercent = percentages[rank - 1];
        const scaledPercent = (rankPercent / totalPercent) * 100;

        return `${scaledPercent.toFixed(1)}%`;
    };

    if (loading && !currentLeaderboard) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="card text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-300">Loading leaderboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="card border-red-500/50">
                    <p className="text-red-400">Error loading leaderboard: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-2">🏅 Leaderboard</h1>
                <p className="text-gray-300">
                    Compete for the top spot and earn ICP rewards every round!
                </p>
            </div>

            {/* Countdown Timer */}
            <div className="mb-8">
                <CountdownTimer
                    timeRemaining={timeRemaining}
                    hasActiveRound={currentLeaderboard ? (currentLeaderboard.topUsers.length > 0 && currentLeaderboard.startTime > 0n && timeRemaining === 0n) : false}
                />
            </div>

            {/* Airdrop Info */}
            {currentLeaderboard && (
                <div className="card mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <p className="text-sm text-secondary uppercase tracking-wide">Current Round</p>
                            <p className="text-3xl font-bold text-primary">#{Number(currentLeaderboard.roundId)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-secondary uppercase tracking-wide">Treasury Balance</p>
                            <p className="text-3xl font-bold text-primary">{formatICP(currentLeaderboard.treasuryAmount)} ICP</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-secondary uppercase tracking-wide">Next Airdrop Pool</p>
                            <p className="text-3xl font-bold text-primary">
                                {formatICP(
                                    currentLeaderboard.airdropAmount > 0n
                                        ? currentLeaderboard.airdropAmount
                                        : (currentLeaderboard.treasuryAmount * 10n) / 100n
                                )} ICP
                            </p>
                            <p className="text-xs text-gray-400 mt-1">10% of treasury</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Top 10 Leaderboard */}
            <div className="mb-12">
                <h2 className="text-2xl font-bold text-primary mb-6">Current Rankings</h2>

                {currentLeaderboard && currentLeaderboard.topUsers.length > 0 ? (
                    <div className="space-y-4">
                        {/* Top 3 - Special Display */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            {currentLeaderboard.topUsers.slice(0, 3).map((user) => {
                                const rank = Number(user.rank);
                                return (
                                    <div
                                        key={user.principal.toString()}
                                        className={`${getRankCardStyle(rank)} rounded-lg p-6 relative overflow-hidden min-h-[320px] flex flex-col justify-between`}
                                    >
                                        <div className="relative z-10">
                                            <div className="mb-4">
                                                {getRankIcon(rank)}
                                            </div>
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide opacity-70 font-semibold">
                                                        Principal
                                                    </p>
                                                    <p className="font-mono text-sm font-medium break-all">
                                                        {shortenPrincipal(user.principal.toString())}
                                                    </p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-wide opacity-70 font-semibold">
                                                            Bonsais
                                                        </p>
                                                        <p className="text-2xl font-bold">{Number(user.bonsaiCount)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs uppercase tracking-wide opacity-70 font-semibold">
                                                            Score
                                                        </p>
                                                        <p className="text-2xl font-bold">
                                                            {Number(user.totalScore).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t border-black/10">
                                                    <p className="text-xs uppercase tracking-wide opacity-70 font-semibold">
                                                        Airdrop Share
                                                    </p>
                                                    <p className="text-xl font-bold">{getAirdropPercentage(rank, currentLeaderboard.topUsers.length)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Ranks 4-10 - Table Display */}
                        {currentLeaderboard.topUsers.length > 3 && (
                            <div className="card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="border-b border-dark-border">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                                                    Rank
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                                                    Principal
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider">
                                                    Bonsais
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider">
                                                    Total Score
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider">
                                                    Airdrop Share
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-dark-border">
                                            {currentLeaderboard.topUsers.slice(3).map((user) => {
                                                const rank = Number(user.rank);
                                                return (
                                                    <tr
                                                        key={user.principal.toString()}
                                                        className="hover:bg-dark-bg transition-colors"
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="text-lg font-bold text-gray-200">
                                                                #{rank}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="font-mono text-sm text-gray-300">
                                                                {shortenPrincipal(user.principal.toString())}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                            <span className="text-sm font-medium text-gray-300">
                                                                {Number(user.bonsaiCount)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                            <span className="text-sm font-semibold text-primary">
                                                                {Number(user.totalScore).toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-primary/20 text-primary">
                                                                {getAirdropPercentage(rank, currentLeaderboard.topUsers.length)}
                                                            </span>
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
                ) : (
                    <div className="card text-center">
                        <p className="text-gray-400">No participants yet. Be the first to mint a Bonsai NFT and claim your spot!</p>
                    </div>
                )}
            </div>

            {/* How Airdrops Work */}
            <div className="card mb-12">
                <h3 className="text-xl font-bold mb-4 text-primary">💡 How Airdrops Work</h3>
                <ul className="space-y-3 text-gray-300">
                    <li className="flex items-start">
                        <span className="text-secondary mr-3">•</span>
                        <span>At the end of each round, 10% of the treasury is distributed to the top 10 users</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-secondary mr-3">•</span>
                        <span>Rankings are based on total score from Bonsai NFTs created after the round started</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-secondary mr-3">•</span>
                        <span>Only bonsais minted during the current round are eligible for that round's airdrop</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-secondary mr-3">•</span>
                        <span>With 10 winners: higher ranks receive larger shares (1st: 22%, 2nd: 18%, 3rd: 14%, etc.)</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-secondary mr-3">•</span>
                        <span>With fewer than 10 winners: the airdrop is split equally among all winners</span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-secondary mr-3">•</span>
                        <span>Grow your bonsais to increase their score and climb the leaderboard!</span>
                    </li>
                </ul>
            </div>

            {/* Previous Rounds */}
            <PreviousRounds />
        </div>
    );
};

export default Leaderboard;
