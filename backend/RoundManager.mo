import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Types "Types";

module {
    // ============================================
    // ROUND MANAGER
    // Manages leaderboard round state and lifecycle
    // ============================================

    public class RoundManager() {
        private var currentRoundId : Nat = 1;
        private var currentRoundStart : Int = 0; // 0 indicates no active round
        private var roundActive : Bool = false;

        // Minimum number of unique owners required to start a round
        private let MIN_UNIQUE_OWNERS_FOR_ROUND : Nat = 3;

        // ============================================
        // ROUND STATE MANAGEMENT
        // ============================================

        public func getRoundState() : (Nat, Int, Bool) {
            (currentRoundId, currentRoundStart, roundActive);
        };

        public func setRoundState(roundId : Nat, startTime : Int, active : Bool) {
            currentRoundId := roundId;
            currentRoundStart := startTime;
            roundActive := active;
        };

        // ============================================
        // ROUND ACTIVATION
        // ============================================

        // Only start a round if there are at least MIN_UNIQUE_OWNERS_FOR_ROUND
        // unique owners who minted after the end of the previous round.
        public func shouldStartRound(allNFTs : [Types.BonsaiNFT], previousRoundEndTime : Int) : Bool {
            if (roundActive) {
                return false;
            };

            // Count unique owners among NFTs minted after previousRoundEndTime
            var ownersMap = HashMap.HashMap<Principal, Bool>(
                10,
                Principal.equal,
                Principal.hash,
            );
            for (nft in allNFTs.vals()) {
                if (nft.mintedAt > previousRoundEndTime) {
                    ownersMap.put(nft.owner, true);
                };
            };

            ownersMap.size() >= MIN_UNIQUE_OWNERS_FOR_ROUND;
        };

        public func startRound(allNFTs : [Types.BonsaiNFT]) : (Int, Nat) {
            // Use current time as the round start for the duration window.
            // Bonsai inclusion for scoring is handled separately via the previous-round end timestamp.
            let _ = allNFTs.size();
            let startTime = Time.now();
            currentRoundStart := startTime;
            roundActive := true;

            (startTime, currentRoundId);
        };

        public func closeRound() : (Nat, Int, Bool) {
            let newRoundId = Nat.add(currentRoundId, 1);
            currentRoundId := newRoundId;
            currentRoundStart := 0;
            roundActive := false;

            (newRoundId, 0, false);
        };

        // ============================================
        // STABLE STORAGE
        // ============================================

        public func toStable() : (Nat, Int, Bool) {
            (currentRoundId, currentRoundStart, roundActive);
        };

        public func fromStable(roundId : Nat, startTime : Int, active : Bool) {
            currentRoundId := roundId;
            currentRoundStart := startTime;
            roundActive := active;
        };
    };
};
