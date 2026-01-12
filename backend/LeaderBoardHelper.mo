import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Types "Types";
import HashMap "mo:base/HashMap";
import StorageManager "StorageManager";
import NFTManager "NFTManager";
import LedgerHelper "LedgerHelper";
import Float "mo:base/Float";
import Blob "mo:base/Blob";

module {

    public class LeaderBoardHelper(storage : StorageManager.Storage, nftManager : NFTManager.NFTManager, ledgerHelper : LedgerHelper.LedgerHelper) {
        private var ROUND_DURATION : Int = 5 * 60 * 1_000_000_000; // 5 minutes for testing
        // For production, use: 24 * 60 * 60 * 1_000_000_000; // 1 day

        // Setter for ROUND_DURATION
        public func setRoundDuration(durationNanoseconds : Int) {
            ROUND_DURATION := durationNanoseconds;
        };

        // Getter for ROUND_DURATION
        public func getRoundDuration() : Int {
            ROUND_DURATION;
        };

        // Calculate user scores for bonsais minted within a round window.
        // A bonsai is considered part of the round if:
        //   previousRoundEndTime < mintedAt <= roundEndTime
        public func calculateUserScores(previousRoundEndTime : Int, roundEndTime : Int, roundActive : Bool) : [(Principal, Nat, Nat, [Nat])] {
            let allNFTs = storage.getAllNFTs();
            let userScoresMap = HashMap.HashMap<Principal, (Nat, Nat, [Nat])>(
                10,
                Principal.equal,
                Principal.hash,
            );

            if (not roundActive) {
                return [];
            };

            for (nft in allNFTs.vals()) {
                if (nft.mintedAt > previousRoundEndTime and nft.mintedAt <= roundEndTime) {
                    let score = nftManager.calculateScore(nft);
                    switch (userScoresMap.get(nft.owner)) {
                        case (null) {
                            userScoresMap.put(nft.owner, (1, score.total, [nft.tokenId]));
                        };
                        case (?entry) {
                            userScoresMap.put(nft.owner, (entry.0 + 1, entry.1 + score.total, Array.append(entry.2, [nft.tokenId])));
                        };
                    };
                };
            };

            let entries = Array.map<(Principal, (Nat, Nat, [Nat])), (Principal, Nat, Nat, [Nat])>(
                Iter.toArray(userScoresMap.entries()),
                func((principal, (count, score, bonsaiIds))) : (Principal, Nat, Nat, [Nat]) {
                    (principal, count, score, bonsaiIds);
                },
            );

            let newSortedEntries = Array.sort<(Principal, Nat, Nat, [Nat])>(
                entries,
                func(a, b) {
                    if (a.2 > b.2) { #less } else if (a.2 < b.2) { #greater } else {
                        #equal;
                    };
                },
            );
            newSortedEntries;
        };

        public func getCurrentLeaderboard(
            currentRoundId : Nat,
            currentRoundStart : Int,
            previousRoundEndTime : Int,
            roundActive : Bool,
            treasuryBalance : Nat64,
            treasuryReserved : Nat64,
        ) : Types.CurrentLeaderboard {
            if (not roundActive) {
                return {
                    roundId = currentRoundId;
                    startTime = 0;
                    endTime = 0;
                    topUsers = [];
                    treasuryAmount = treasuryBalance;
                    airdropAmount = Nat64.fromNat(0);
                };
            };

            let endTime = currentRoundStart + ROUND_DURATION;
            let userScores = calculateUserScores(previousRoundEndTime, endTime, roundActive);

            let top10 = if (userScores.size() > 10) {
                Array.tabulate<(Principal, Nat, Nat, [Nat])>(10, func(i) { userScores[i] });
            } else {
                userScores;
            };

            let topUsers = Array.mapEntries<(Principal, Nat, Nat, [Nat]), Types.LeaderboardEntry>(
                top10,
                func((principal, count, score, bonsaiIds), index) : Types.LeaderboardEntry {
                    {
                        principal = principal;
                        rank = Nat.add(index, 1);
                        bonsaiCount = count;
                        totalScore = score;
                        bonsais = bonsaiIds;
                    };
                },
            );

            let availableTreasury = if (treasuryBalance > treasuryReserved) {
                Nat64.sub(treasuryBalance, treasuryReserved);
            } else { Nat64.fromNat(0) };
            let airdropAmount = Nat64.div(Nat64.mul(availableTreasury, Nat64.fromNat(10)), Nat64.fromNat(100));

            {
                roundId = currentRoundId;
                startTime = currentRoundStart;
                endTime = endTime;
                topUsers = topUsers;
                treasuryAmount = treasuryBalance;
                airdropAmount = airdropAmount;
            };
        };

        public func getCompletedRounds(
            completedRounds : [Types.LeaderboardRound],
            page : Nat,
            pageSize : Nat,
        ) : {
            rounds : [Types.LeaderboardRound];
            totalRounds : Nat;
            totalPages : Nat;
        } {
            let totalRounds = completedRounds.size();
            let totalPages = if (pageSize == 0) { 0 } else {
                if (totalRounds == 0) { 0 } else {
                    Nat.add(Nat.div(Nat.sub(totalRounds, 1), pageSize), 1);
                };
            };

            let startIndex = Nat.mul(page, pageSize);
            if (startIndex >= totalRounds) {
                return {
                    rounds = [];
                    totalRounds = totalRounds;
                    totalPages = totalPages;
                };
            };

            let endIndex = Nat.min(Nat.add(startIndex, pageSize), totalRounds);
            let roundCount = if (endIndex >= startIndex) {
                Nat.sub(endIndex, startIndex);
            } else { 0 };
            // Return rounds in reverse order (newest first)
            let rounds = Array.tabulate<Types.LeaderboardRound>(
                roundCount,
                func(i) {
                    let offset = Nat.sub(Nat.sub(totalRounds, startIndex), Nat.add(i, 1));
                    completedRounds[offset];
                },
            );

            {
                rounds = rounds;
                totalRounds = totalRounds;
                totalPages = totalPages;
            };
        };

        public func processAirdropIfReady(
            currentRoundStart : Int,
            previousRoundEndTime : Int,
            treasuryBalance : Nat64,
            treasuryReserved : Nat64,
            completedRounds : [Types.LeaderboardRound],
            claimedDistributions : [(Nat, [Principal])],
            roundActive : Bool,
            currentRoundId : Nat,
        ) : (
            Types.Result<Text, Text>,
            Int,
            Nat64,
            Nat64,
            [Types.LeaderboardRound],
            [(Nat, [Principal])],
            Bool,
            Nat,
        ) {
            // Check if there's an active round first
            if (not roundActive) {
                return (
                    #Err("No active round to process"),
                    currentRoundStart,
                    treasuryBalance,
                    treasuryReserved,
                    completedRounds,
                    claimedDistributions,
                    roundActive,
                    currentRoundId,
                );
            };

            let now = Time.now();
            let endTime = currentRoundStart + ROUND_DURATION;

            if (now < endTime) {
                return (
                    #Err("Round has not ended yet"),
                    currentRoundStart,
                    treasuryBalance,
                    treasuryReserved,
                    completedRounds,
                    claimedDistributions,
                    roundActive,
                    currentRoundId,
                );
            };

            // Calculate final leaderboard
            let userScores = calculateUserScores(previousRoundEndTime, endTime, roundActive);

            if (userScores.size() == 0) {
                // No users: keep the round open, do not close or increment round number
                return (
                    #Ok("No users to distribute airdrop to. Round remains open."),
                    currentRoundStart,
                    treasuryBalance,
                    treasuryReserved,
                    completedRounds,
                    claimedDistributions,
                    roundActive,
                    currentRoundId,
                );
            };

            // Take top 10
            let top10 = if (userScores.size() > 10) {
                Array.tabulate<(Principal, Nat, Nat, [Nat])>(10, func(i) { userScores[i] });
            } else {
                userScores;
            };

            let topUsers = Array.mapEntries<(Principal, Nat, Nat, [Nat]), Types.LeaderboardEntry>(
                top10,
                func((principal, count, score, bonsaiIds), index) : Types.LeaderboardEntry {
                    {
                        principal = principal;
                        bonsaiCount = count;
                        totalScore = score;
                        rank = index + 1;
                        bonsais = bonsaiIds;
                    };
                },
            );

            let winners : Nat = top10.size();

            let availableTreasury = if (treasuryBalance > treasuryReserved) {
                Nat64.sub(treasuryBalance, treasuryReserved);
            } else { Nat64.fromNat(0) };

            // Reserve enough for claim fees so we don't end up owing transfers we can't execute.
            let totalFees : Nat64 = Nat64.mul(ledgerHelper.LEDGER_FEE, Nat64.fromNat(winners));
            if (availableTreasury <= totalFees) {
                return (
                    #Err("Treasury insufficient to cover claim fees"),
                    currentRoundStart,
                    treasuryBalance,
                    treasuryReserved,
                    completedRounds,
                    claimedDistributions,
                    roundActive,
                    currentRoundId,
                );
            };

            let availableAfterFees : Nat64 = Nat64.sub(availableTreasury, totalFees);

            // Calculate airdrop total (10% of available treasury), capped so (airdrop + fees) fits.
            var airdropTotal = Nat64.div(Nat64.mul(availableTreasury, Nat64.fromNat(10)), Nat64.fromNat(100));
            if (airdropTotal > availableAfterFees) {
                airdropTotal := availableAfterFees;
            };

            // Distribution percentages for top 10 (sum = 100%) expressed as integer percentages
            // 1st: 22%, 2nd: 18%, 3rd: 14%, 4th: 11%, 5th: 9%, 6th: 8%, 7th: 7%, 8th: 5%, 9th: 4%, 10th: 2%
            let percentagesInt : [Nat] = [22, 18, 14, 11, 9, 8, 7, 5, 4, 2];

            var distributions : [Types.AirdropDistribution] = [];
            var totalDistributed : Nat64 = 0;

            // Calculate total percentage for actual number of winners
            var totalPercentForWinners : Nat = 0;
            for (i in Iter.range(0, winners - 1)) {
                totalPercentForWinners := totalPercentForWinners + percentagesInt[i];
            };

            // Distribute weighted percentages based on rank
            for (i in Iter.range(0, winners - 1)) {
                // Use predefined percentages for each rank, scaled to total available
                let percentNat = if (i < percentagesInt.size()) {
                    percentagesInt[i];
                } else { 0 };

                // Calculate amount: (airdropTotal * percentForRank / totalPercentForWinners)
                let amount : Nat64 = Nat64.div(
                    Nat64.mul(airdropTotal, Nat64.fromNat(percentNat)),
                    Nat64.fromNat(totalPercentForWinners),
                );

                // Calculate actual percentage for this winner
                let pctFloat : Float.Float = Float.fromInt(percentNat) / Float.fromInt(totalPercentForWinners);

                distributions := Array.append<Types.AirdropDistribution>(
                    distributions,
                    [{
                        principal = top10[i].0;
                        amount = amount;
                        percentage = pctFloat;
                        rank = i + 1;
                    }],
                );

                totalDistributed := Nat64.add(totalDistributed, amount);
            };

            // Fix rounding: give any remaining e8s to the last winner
            if (totalDistributed < airdropTotal and distributions.size() > 0) {
                let remainder : Nat64 = Nat64.sub(airdropTotal, totalDistributed);
                // Rebuild distributions with last element having the remainder added
                let lastIdx = Nat.sub(distributions.size(), 1);
                let prefix = Array.tabulate<Types.AirdropDistribution>(lastIdx, func(j) { distributions[j] });
                let last = distributions[lastIdx];
                let updatedLast : Types.AirdropDistribution = {
                    principal = last.principal;
                    amount = Nat64.add(last.amount, remainder);
                    percentage = last.percentage;
                    rank = last.rank;
                };
                distributions := Array.append<Types.AirdropDistribution>(prefix, [updatedLast]);
                totalDistributed := Nat64.add(totalDistributed, remainder);
            };

            // Note: transfers are performed when winners claim their airdrop via `claimAirdrop`.

            // Note: actual transfers are performed when winners claim their airdrop.
            // We record distributions in the completed round and keep treasuryBalance unchanged until claims.

            // Store completed round
            let completedRound : Types.LeaderboardRound = {
                roundId = currentRoundId;
                startTime = currentRoundStart;
                endTime = endTime;
                topUsers = topUsers;
                distributions = distributions;
                totalDistributed = totalDistributed;
            };

            let newCompletedRounds = Array.append<Types.LeaderboardRound>(completedRounds, [completedRound]);

            // Close current round. New round will begin when a new bonsai is minted.
            let newRoundActive = false;
            let newCurrentRoundId = Nat.add(currentRoundId, 1);
            let newCurrentRoundStart : Int = 0;

            // Initialize claimed list for this round
            let newClaimedDistributions = Array.append<(Nat, [Principal])>(claimedDistributions, [(completedRound.roundId, [])]);

            // Reserve the owed payout + fees immediately.
            let reservedIncrement : Nat64 = Nat64.add(totalDistributed, totalFees);
            let newTreasuryReserved : Nat64 = Nat64.add(treasuryReserved, reservedIncrement);

            (
                #Ok("Airdrop processed successfully. Round " # Nat.toText(completedRound.roundId) # " completed. " # Nat64.toText(totalDistributed) # " e8s distributed."),
                newCurrentRoundStart,
                treasuryBalance,
                newTreasuryReserved,
                newCompletedRounds,
                newClaimedDistributions,
                newRoundActive,
                newCurrentRoundId,
            );

        };

        public func getTimeUntilNextAirdrop(
            currentRoundStart : Int,
            roundActive : Bool,
        ) : Int {
            if (not roundActive) { 0 } else {
                let now = Time.now();
                let endTime = currentRoundStart + ROUND_DURATION;
                if (now >= endTime) {
                    0;
                } else {
                    endTime - now;
                };
            };
        };

        public func claimAirdrop(
            roundId : Nat,
            completedRounds : [Types.LeaderboardRound],
            claimedDistributions : [(Nat, [Principal])],
            caller : Principal,
            accountId : Blob,
            treasuryBalance : Nat64,
        ) : async (
            Types.Result<Nat64, Text>,
            [(Nat, [Principal])],
            Nat64,
        ) {
            // Find completed round
            var roundOpt : ?Types.LeaderboardRound = null;
            for (r in completedRounds.vals()) {
                if (r.roundId == roundId) { roundOpt := ?r };
            };
            switch (roundOpt) {
                case (null) {
                    return (
                        #Err("Round not found"),
                        claimedDistributions,
                        treasuryBalance,
                    );
                };
                case (?round) {
                    // Find distribution for caller
                    var distOpt : ?Types.AirdropDistribution = null;
                    for (d in round.distributions.vals()) {
                        if (Principal.equal(d.principal, caller)) {
                            distOpt := ?d;
                        };
                    };
                    switch (distOpt) {
                        case (null) {
                            return (
                                #Err("No distribution for caller"),
                                claimedDistributions,
                                treasuryBalance,
                            );
                        };
                        case (?dist) {
                            // Check if already claimed
                            var already = false;
                            for (cd in claimedDistributions.vals()) {
                                if (cd.0 == roundId) {
                                    for (p in cd.1.vals()) {
                                        if (Principal.equal(p, caller)) {
                                            already := true;
                                        };
                                    };
                                };
                            };
                            if (already) {
                                return (
                                    #Err("Already claimed"),
                                    claimedDistributions,
                                    treasuryBalance,
                                );
                            };

                            // Transfer to provided account id (frontend should derive account id for caller)
                            // Use ICP Ledger actor for transfers
                            type ICPLedger = actor {
                                transfer : shared Types.TransferArgsLedger -> async Types.TransferResultLedger;
                            };
                            let icpLedger : ICPLedger = actor (Principal.toText(ledgerHelper.LEDGER_CANISTER));

                            let transferRes = await icpLedger.transfer({
                                memo = 0;
                                amount = { e8s = dist.amount };
                                fee = { e8s = ledgerHelper.LEDGER_FEE };
                                from_subaccount = null;
                                to = accountId;
                                created_at_time = null;
                            });
                            switch (transferRes) {
                                case (#Ok(_)) {
                                    // Mark claimed: append caller to claimedDistributions for round
                                    var found = false;
                                    var outArr : [(Nat, [Principal])] = [];
                                    for (cd in claimedDistributions.vals()) {
                                        if (cd.0 == roundId) {
                                            outArr := Array.append<(Nat, [Principal])>(outArr, [(cd.0, Array.append<Principal>(cd.1, [caller]))]);
                                            found := true;
                                        } else {
                                            outArr := Array.append<(Nat, [Principal])>(outArr, [cd]);
                                        };
                                    };
                                    if (not found) {
                                        outArr := Array.append<(Nat, [Principal])>(outArr, [(roundId, [caller])]);
                                    };
                                    let newClaimedDistributions = outArr;

                                    // Deduct treasury balance
                                    let newTreasuryBalance = Nat64.sub(treasuryBalance, dist.amount);
                                    return (
                                        #Ok(dist.amount),
                                        newClaimedDistributions,
                                        newTreasuryBalance,
                                    );
                                };
                                case (#Err(_)) {
                                    return (
                                        #Err("Ledger transfer failed"),
                                        claimedDistributions,
                                        treasuryBalance,
                                    );
                                };
                            };
                        };
                    };
                };
            };

        };

        public func getClaimedPrincipals(
            roundId : Nat,
            claimedDistributions : [(Nat, [Principal])],
        ) : [Principal] {
            for (cd in claimedDistributions.vals()) {
                if (cd.0 == roundId) { return cd.1 };
            };
            [];
        };
    };
};
