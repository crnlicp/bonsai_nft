import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Types "Types";
import StorageManager "StorageManager";
import NFTManager "NFTManager";
import HelperFunctions "HelperFunctions";
import LedgerHelper "LedgerHelper";
import LeaderBoardHelper "LeaderBoardHelper";
import PaymentManager "PaymentManager";
import RoundManager "RoundManager";
import HttpHandler "HttpHandler";

persistent actor BonsaiNFT {
    // ========================================================================
    // PERSISTENT STATE
    // Variables marked with 'var' are automatically persisted by Motoko
    // ========================================================================

    // --- Owner & Admin Configuration ----------------------------------------
    var owner : ?Principal = null;
    var treasuryAccountId : ?Blob = null;
    var treasuryBalance : Nat64 = 0;
    var useLocalhostImageUrl : Bool = false;

    // --- Leaderboard State --------------------------------------------------
    var completedRounds : [Types.LeaderboardRound] = [];
    var claimedDistributions : [(Nat, [Principal])] = [];

    // ========================================================================
    // TRANSIENT STABLE STORAGE
    // Used during upgrades to convert module state (HashMaps, etc.) to/from
    // stable formats. These are NOT persisted - they're only used during
    // preupgrade/postupgrade hooks.
    // ========================================================================

    transient var stableStorage : {
        nfts : [(Nat, Types.BonsaiNFT)];
        ownerTokens : [(Principal, [Nat])];
        nextTokenId : Nat;
        approvals : [(Nat, Principal)];
    } = {
        nfts = [];
        ownerTokens = [];
        nextTokenId = 0;
        approvals = [];
    };

    transient var stablePaymentData : (Nat64, [(Nat64, Types.Invoice)], [Nat64]) = (1, [], []);
    transient var stableRoundData : (Nat, Int, Bool) = (1, 0, false);

    // ========================================================================
    // TRANSIENT INSTANCES
    // Manager and helper class instances (recreated after upgrades)
    // ========================================================================

    transient var storage = StorageManager.Storage();
    transient var canisterId = Principal.toText(Principal.fromActor(BonsaiNFT));
    transient var helperFunctions = HelperFunctions.HelperFunctions();
    transient var ledgerHelper = LedgerHelper.LedgerHelper();
    transient var paymentManager = PaymentManager.PaymentManager(ledgerHelper);
    transient var roundManager = RoundManager.RoundManager();
    transient var nftManager = NFTManager.NFTManager(storage, canisterId, useLocalhostImageUrl);
    transient var leaderBoardHelper = LeaderBoardHelper.LeaderBoardHelper(storage, nftManager, ledgerHelper);
    transient var httpHandler = HttpHandler.HttpHandler(nftManager, helperFunctions);

    // ========================================================================
    // UPGRADE HANDLERS
    // Convert module state to/from stable formats during canister upgrades
    // ========================================================================

    system func preupgrade() {
        // Convert all module state to stable formats
        stableStorage := storage.toStable();
        stablePaymentData := paymentManager.toStable();
        stableRoundData := roundManager.toStable();
        // Note: Persistent variables (owner, treasuryBalance, completedRounds, etc.)
        // are automatically persisted by Motoko and don't need explicit handling
    };

    system func postupgrade() {
        // Restore StorageManager state
        storage.fromStable(stableStorage);

        // Restore PaymentManager state (invoices, used blocks, next memo)
        let (nextMemo, invoices, usedBlocks) = stablePaymentData;
        paymentManager.fromStable(nextMemo, invoices, usedBlocks);

        // Restore RoundManager state (round ID, start time, active status)
        let (roundId, startTime, active) = stableRoundData;
        roundManager.fromStable(roundId, startTime, active);

        // Reinitialize NFT manager with current settings
        nftManager := NFTManager.NFTManager(storage, canisterId, useLocalhostImageUrl);
    };

    // ========================================================================
    // PRIVATE HELPER FUNCTIONS
    // ========================================================================

    private func getPreviousRoundEndTime() : Int {
        let n = completedRounds.size();
        if (n == 0) { 0 } else { completedRounds[Nat.sub(n, 1)].endTime };
    };

    private func requireOwner(caller : Principal) : Types.Result<(), Text> {
        switch (owner) {
            case (null) { #Err("Owner not set. Call setOwner first.") };
            case (?o) {
                if (Principal.equal(caller, o)) {
                    #Ok(());
                } else {
                    #Err("Unauthorized. Only owner can perform this action.");
                };
            };
        };
    };

    private func hexToBlob32(hex : Text) : { #Ok : Blob; #Err : Text } {
        helperFunctions.hexToBlob32(hex);
    };

    private func ledger() : Types.Ledger {
        ledgerHelper.ledger();
    };

    // ========================================================================
    // NFT OPERATIONS
    // Invoice creation, minting, watering, and burning
    // ========================================================================
    // Create a mint invoice memo. Caller must use this memo in the Ledger `transfer`.
    public shared (msg) func createMintInvoice() : async Types.Result<Nat64, Text> {
        // Reject anonymous principal
        if (Principal.isAnonymous(msg.caller)) {
            return #Err("Anonymous users cannot create mint invoices. Please authenticate first.");
        };

        let memo = paymentManager.createInvoice(msg.caller, #Mint, ledgerHelper.MINT_COST);
        #Ok(memo);
    };

    // Create a watering invoice memo.
    public shared (msg) func createWaterInvoice(tokenId : Nat, cost : Nat64) : async Types.Result<Nat64, Text> {
        // Reject anonymous principal
        if (Principal.isAnonymous(msg.caller)) {
            return #Err("Anonymous users cannot create water invoices. Please authenticate first.");
        };

        if (cost == 0) {
            return #Err("Cost must be > 0");
        };
        let memo = paymentManager.createInvoice(msg.caller, #Water({ tokenId = tokenId; cost = cost }), cost);
        #Ok(memo);
    };

    // Mint with verified ledger payment.
    public shared (msg) func mintBonsaiWithPayment(blockIndex : Nat64, memo : Nat64) : async Types.Result<Nat, Text> {
        // Reject anonymous principal
        if (Principal.isAnonymous(msg.caller)) {
            return #Err("Anonymous users cannot mint bonsais. Please authenticate first.");
        };

        let v = await paymentManager.verifyPayment(msg.caller, #Mint, memo, blockIndex, treasuryAccountId);
        switch (v) {
            case (#Err(e)) { return #Err(e) };
            case (#Ok(amount)) {
                treasuryBalance += amount;
                let res = await nftManager.mintBonsaiFree(msg.caller);
                switch (res) {
                    case (#Ok(tokenId)) {
                        // STEP 1: Check if current round has ended and process airdrop
                        let (roundId, startTime, active) = roundManager.getRoundState();
                        if (active) {
                            // Check if round has ended and needs processing
                            let previousRoundEndTime = getPreviousRoundEndTime();
                            let (result, newStartTime, newTreasuryBalance, newCompletedRounds, newClaimedDistributions, newRoundActive, newRoundId) = leaderBoardHelper.processAirdropIfReady(
                                startTime,
                                previousRoundEndTime,
                                treasuryBalance,
                                completedRounds,
                                claimedDistributions,
                                active,
                                roundId,
                            );
                            // Update state if airdrop was processed
                            switch (result) {
                                case (#Ok(_)) {
                                    roundManager.setRoundState(newRoundId, newStartTime, newRoundActive);
                                    treasuryBalance := newTreasuryBalance;
                                    completedRounds := newCompletedRounds;
                                    claimedDistributions := newClaimedDistributions;
                                };
                                case (#Err(_)) {
                                    // Round hasn't ended yet or some other error, continue
                                };
                            };
                        };

                        // STEP 2: Check if we should start a new round after minting
                        let (_, _, currentlyActive) = roundManager.getRoundState();
                        if (not currentlyActive) {
                            let all = storage.getAllNFTs();
                            // Determine end time of previous round and only consider
                            // NFTs minted after that time when deciding to start.
                            let previousRoundEndTime = getPreviousRoundEndTime();
                            // Check if we have enough unique owners to start a round
                            if (roundManager.shouldStartRound(all, previousRoundEndTime)) {
                                let (_startTime, _roundId) = roundManager.startRound(all);
                                // Round started! The round is now active
                            };
                        };
                        #Ok(tokenId);
                    };
                    case (#Err(e)) { #Err(e) };
                };
            };
        };
    };

    public shared (msg) func waterBonsai(tokenId : Nat) : async Types.Result<(), Text> {
        // Only owner can do free watering (for testing/debug)
        switch (requireOwner(msg.caller)) {
            case (#Err(_)) {
                return #Err("Payment required: use waterBonsaiWithPayment");
            };
            case (#Ok(_)) {};
        };
        await nftManager.waterBonsaiFree(msg.caller, tokenId, 0.0);
    };

    // Water bonsai with current balance for dynamic background color
    // Water with verified ledger payment + (optional) balance for visuals.
    public shared (msg) func waterBonsaiWithPayment(tokenId : Nat, currentBalanceE8s : Nat64, cost : Nat64, blockIndex : Nat64, memo : Nat64) : async Types.Result<(), Text> {
        // Reject anonymous principal
        if (Principal.isAnonymous(msg.caller)) {
            return #Err("Anonymous users cannot water bonsais. Please authenticate first.");
        };

        let v = await paymentManager.verifyPayment(msg.caller, #Water({ tokenId = tokenId; cost = cost }), memo, blockIndex, treasuryAccountId);
        switch (v) {
            case (#Err(e)) { return #Err(e) };
            case (#Ok(amount)) {
                treasuryBalance += amount;
                let currentBalanceICP = Float.fromInt(Nat64.toNat(currentBalanceE8s)) / 100_000_000.0;
                await nftManager.waterBonsaiFree(msg.caller, tokenId, currentBalanceICP);
            };
        };
    };

    public shared (msg) func burnBonsai(tokenId : Nat) : async Types.Result<(), Text> {
        nftManager.burnBonsai(msg.caller, tokenId);
    };

    // ========================================================================
    // ADMIN & CONFIGURATION APIs
    // Owner management, treasury configuration, and development settings
    // ========================================================================
    // Get treasury balance (ICP collected from minting fees)
    public query func getTreasuryBalance() : async Nat64 {
        treasuryBalance;
    };

    // Get owner principal
    public query func getOwner() : async ?Principal {
        owner;
    };

    // Ledger canister accessors
    public query func getLedgerCanisterId() : async Principal {
        ledgerHelper.LEDGER_CANISTER;
    };

    public shared (msg) func setLedgerCanisterId(newLedger : Principal) : async Types.Result<(), Text> {
        switch (requireOwner(msg.caller)) {
            case (#Err(err)) return #Err(err);
            case (#Ok(())) {
                ledgerHelper.setLedgerCanister(newLedger);
                return #Ok(());
            };
        };
    };

    // Treasury account id accessors
    public query func getTreasuryAccountId() : async ?Blob {
        treasuryAccountId;
    };

    public shared (msg) func setTreasuryAccountId(accountId : Blob) : async Types.Result<(), Text> {
        switch (requireOwner(msg.caller)) {
            case (#Err(e)) { return #Err(e) };
            case (#Ok(_)) {};
        };
        if (accountId.size() != 32) {
            return #Err("Treasury account id must be 32 bytes");
        };
        treasuryAccountId := ?accountId;
        #Ok();
    };

    // Convenience for setting account id from hex string (64 hex chars).
    public shared (msg) func setTreasuryAccountIdHex(hex : Text) : async Types.Result<(), Text> {
        switch (requireOwner(msg.caller)) {
            case (#Err(e)) { return #Err(e) };
            case (#Ok(_)) {};
        };
        switch (hexToBlob32(hex)) {
            case (#Ok(b)) {
                treasuryAccountId := ?b;
                #Ok();
            };
            case (#Err(e)) { #Err(e) };
        };
    };

    // Withdraw ICP from the canister's ledger account to a destination account identifier.
    // Destination must be a 32-byte account identifier (use principalToAccountIdentifier or ledger account-id)
    public shared (msg) func withdrawTreasury(destination : Blob, amount : Nat64) : async Types.Result<Nat64, Text> {
        switch (requireOwner(msg.caller)) {
            case (#Err(e)) { return #Err(e) };
            case (#Ok(_)) {};
        };

        // Validate destination is proper account identifier format
        if (destination.size() != 32) {
            return #Err("Destination must be a 32-byte account identifier");
        };

        // Ensure sufficient balance
        if (amount > treasuryBalance) {
            return #Err("Insufficient treasury balance");
        };

        // Use ICP Ledger transfer format (not ICRC-7)
        let transferArgs : Types.TransferArgsLedger = {
            memo = 0;
            amount = { e8s = amount };
            fee = { e8s = ledgerHelper.LEDGER_FEE };
            from_subaccount = null;
            to = destination;
            created_at_time = null;
        };

        let result = await ledger().transfer(transferArgs);
        switch (result) {
            case (#Ok(blockIndex)) {
                // Update treasury balance after successful withdrawal
                treasuryBalance -= amount;
                #Ok(blockIndex);
            };
            case (#Err(_e)) {
                #Err("Ledger transfer failed");
            };
        };
    };

    // Toggle whether metadata image URLs point to localhost (dev) or icp0 (prod).
    public shared (msg) func setUseLocalhostImageUrl(enabled : Bool) : async Types.Result<(), Text> {
        switch (requireOwner(msg.caller)) {
            case (#Err(e)) { return #Err(e) };
            case (#Ok(_)) {};
        };
        useLocalhostImageUrl := enabled;
        nftManager := NFTManager.NFTManager(storage, canisterId, useLocalhostImageUrl);
        #Ok();
    };

    public query func getUseLocalhostImageUrl() : async Bool {
        useLocalhostImageUrl;
    };

    // Change owner (only current owner can call, or anyone if owner is not set yet)
    // SECURITY: For production deployment, call this IMMEDIATELY after deploying
    // to prevent frontrunning. Consider adding controller-only access for initial setup.
    public shared (msg) func setOwner(newOwner : Principal) : async Types.Result<(), Text> {
        // Allow setting owner if not yet set, otherwise require current owner
        switch (owner) {
            case (null) {
                // First time setup - anyone can claim ownership
                // IMPORTANT: Call this immediately after deployment!
                owner := ?newOwner;
                #Ok();
            };
            case (?currentOwner) {
                // Owner already set - only current owner can change
                if (Principal.equal(msg.caller, currentOwner)) {
                    owner := ?newOwner;
                    #Ok();
                } else {
                    #Err("Only current owner can change ownership");
                };
            };
        };
    };

    // Set round duration (in nanoseconds). Admin only.
    public shared (msg) func setRoundDuration(durationNanoseconds : Int) : async Types.Result<(), Text> {
        switch (requireOwner(msg.caller)) {
            case (#Err(err)) return #Err(err);
            case (#Ok(())) {
                leaderBoardHelper.setRoundDuration(durationNanoseconds);
                return #Ok(());
            };
        };
    };

    // Get current round duration (in nanoseconds)
    public query func getRoundDuration() : async Int {
        leaderBoardHelper.getRoundDuration();
    };

    // ========================================================================
    // QUERY APIs
    // Cost accessors, NFT queries, and gallery
    // ========================================================================
    // Get mint cost
    public query func getMintCost() : async Nat64 {
        ledgerHelper.MINT_COST;
    };

    // Get water cost
    public query func getWaterCost() : async Nat64 {
        ledgerHelper.WATER_COST;
    };

    // Queries
    public query func getBonsaiDetails(tokenId : Nat) : async ?Types.BonsaiNFT {
        nftManager.getBonsaiDetails(tokenId);
    };
    public query func getMyBonsais(owner : Principal) : async [Types.TokenMetadata] {
        nftManager.getMyBonsais(owner);
    };
    public query func getGallery(offset : Nat, limit : Nat) : async [Types.TokenMetadata] {
        nftManager.getGallery(offset, limit);
    };

    // ========================================================================
    // ICRC STANDARD APIs
    // ICRC-7 (NFT standard) and ICRC-37 (approval standard) compatibility
    // ========================================================================
    // ICRC-7 Standard
    public query func icrc7_name() : async Text { nftManager.icrc7_name() };
    public query func icrc7_symbol() : async Text { nftManager.icrc7_symbol() };
    public query func icrc7_total_supply() : async Nat {
        nftManager.icrc7_total_supply();
    };
    public query func icrc7_owner_of(tokenId : Nat) : async ?Principal {
        nftManager.icrc7_owner_of(tokenId);
    };
    public query func icrc7_balance_of(account : Types.Account) : async Nat {
        nftManager.icrc7_balance_of(account);
    };
    public query func icrc7_tokens_of(account : Types.Account) : async [Nat] {
        nftManager.icrc7_tokens_of(account);
    };
    public query func icrc7_metadata(tokenId : Nat) : async [(Text, Types.Value)] {
        nftManager.icrc7_metadata(tokenId);
    };

    // ICRC-37 Standard
    public shared (msg) func icrc37_transfer(args : Types.TransferArgs) : async Types.TransferResult {
        nftManager.icrc37_transfer(msg.caller, args);
    };
    public shared (msg) func icrc37_approve(args : Types.ApprovalArgs) : async Types.ApprovalResult {
        nftManager.icrc37_approve(msg.caller, args);
    };

    // ========================================================================
    // LEADERBOARD APIs
    // Score calculation, leaderboard queries, airdrop processing and claims
    // ========================================================================

    // Get current leaderboard (top 10)
    public query func getCurrentLeaderboard() : async Types.CurrentLeaderboard {
        let (roundId, startTime, active) = roundManager.getRoundState();
        let previousRoundEndTime = getPreviousRoundEndTime();
        leaderBoardHelper.getCurrentLeaderboard(roundId, startTime, previousRoundEndTime, active, treasuryBalance);
    };

    // Get completed rounds with pagination
    public query func getCompletedRounds(page : Nat, pageSize : Nat) : async {
        rounds : [Types.LeaderboardRound];
        totalRounds : Nat;
        totalPages : Nat;
    } {
        leaderBoardHelper.getCompletedRounds(completedRounds, page, pageSize);
    };

    // Check and process airdrop if round has ended
    public shared (_msg) func processAirdropIfReady() : async Types.Result<Text, Text> {
        let (roundId, startTime, active) = roundManager.getRoundState();
        let previousRoundEndTime = getPreviousRoundEndTime();
        let (result, newStartTime, newTreasuryBalance, newCompletedRounds, newClaimedDistributions, newRoundActive, newRoundId) = leaderBoardHelper.processAirdropIfReady(
            startTime,
            previousRoundEndTime,
            treasuryBalance,
            completedRounds,
            claimedDistributions,
            active,
            roundId,
        );
        // Only update state if the result is successful (airdrop was processed or no users case)
        switch (result) {
            case (#Ok(_)) {
                roundManager.setRoundState(newRoundId, newStartTime, newRoundActive);
                treasuryBalance := newTreasuryBalance;
                completedRounds := newCompletedRounds;
                claimedDistributions := newClaimedDistributions;
            };
            case (#Err(_)) {
                // Don't update state on errors (round not ended, no active round, etc.)
            };
        };
        result;
    };

    public query func getTimeUntilNextAirdrop() : async Int {
        let (_, startTime, active) = roundManager.getRoundState();
        leaderBoardHelper.getTimeUntilNextAirdrop(startTime, active);
    };

    public shared (msg) func claimAirdrop(roundId : Nat, accountId : Blob) : async Types.Result<Nat64, Text> {
        let (result, newClaimedDistributions, newTreasuryBalance) = await leaderBoardHelper.claimAirdrop(
            roundId,
            completedRounds,
            claimedDistributions,
            msg.caller,
            accountId,
            treasuryBalance,
        );
        claimedDistributions := newClaimedDistributions;
        treasuryBalance := newTreasuryBalance;
        result;
    };

    public query func getClaimedPrincipals(roundId : Nat) : async [Principal] {
        leaderBoardHelper.getClaimedPrincipals(roundId, claimedDistributions);
    };

    // ========================================================================
    // ICRC-28 TRUSTED ORIGINS
    // For wallet integration (Plug, OISY, etc.)
    // ========================================================================
    public query func icrc28_trusted_origins() : async Types.Icrc28TrustedOriginsResponse {
        {
            // Add your production frontend URLs here
            trusted_origins = [
                // Local development
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:4943",
                "http://127.0.0.1:4943",
                // Production - update with your actual domain
                // "https://your-frontend.icp0.io",
                // "https://your-custom-domain.com"
            ];
        };
    };

    // ========================================================================
    // HTTP API
    // Serves cached SVGs for NFTs via /nft/<id> paths
    // ========================================================================
    public query func http_request(request : Types.HttpRequest) : async Types.HttpResponse {
        httpHandler.handleRequest(request);
    };

};
