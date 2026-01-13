import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Types "Types";
import StorageManager "StorageManager";
import BonsaiEngine "BonsaiEngine";
import BonsaiNames "BonsaiNames";

module {
    public class NFTManager(
        storage : StorageManager.Storage,
        _canisterId : Text,
        _useLocalhostImageUrl : Bool,
    ) {

        // ============================================
        // MINTING
        // ============================================

        // Generate a pseudo-random balance based on time and token ID for initial tree
        private func generateInitialBalance(tokenId : Nat, timestamp : Int) : Float {
            // Use timestamp and tokenId to create 8 pseudo-random decimal digits
            let timeNanos = Int.abs(timestamp);
            let combined = timeNanos + tokenId * 12345678;
            // Extract 8 digits for the "decimal" portion (0.XXXXXXXX format)
            let digits = combined % 100000000;
            Float.fromInt(digits) / 100000000.0;
        };

        // Mint without payment check (payment handled in main.mo)
        public func mintBonsaiFree(caller : Principal) : async Types.Result<Nat, Text> {
            // Generate token ID
            let tokenId = storage.getNextTokenId();
            let timestamp = Time.now();

            // Generate initial balance for this NFT's first tree
            let initialBalance = generateInitialBalance(tokenId, timestamp);

            let digits = BonsaiEngine.getGrowthDigits(initialBalance);
            let growthTips = BonsaiEngine.initializeGrowthTips(digits);
            let growthPixels : [Types.Pixel] = [];

            let displayName = BonsaiNames.displayName(tokenId, timestamp);

            // React behavior: growth pixels start empty; base pixels are added during SVG generation.
            let svg = BonsaiEngine.buildOptimizedSVG(initialBalance, growthPixels, displayName);

            // Create NFT
            let nft : Types.BonsaiNFT = {
                tokenId = tokenId;
                owner = caller;
                name = displayName;
                growthSteps = 0;
                mintedAt = timestamp;
                lastWatered = timestamp;
                cachedSVG = svg;
                growthPixels = growthPixels;
                growthTips = growthTips;
            };

            storage.addNFT(nft);

            #Ok(tokenId);
        };

        // ============================================
        // WATERING
        // ============================================

        // Water without payment check (payment handled in main.mo)
        // currentBalanceICP: The user's current ICP balance (e.g., 2.25632547) for dynamic background color
        public func waterBonsaiFree(caller : Principal, tokenId : Nat, currentBalanceICP : Float) : async Types.Result<(), Text> {
            // Verify ownership
            switch (storage.getNFT(tokenId)) {
                case (null) { return #Err("NFT not found") };
                case (?nft) {
                    if (nft.owner != caller) {
                        return #Err("You don't own this bonsai");
                    };

                    if (nft.growthTips.size() == 0) {
                        return #Err("This bonsai can no longer grow");
                    };

                    let digits = BonsaiEngine.getGrowthDigits(currentBalanceICP);
                    let stepResult = BonsaiEngine.growTreeStep(digits, nft.growthPixels, nft.growthTips, nft.growthSteps);
                    let svg = BonsaiEngine.buildOptimizedSVG(currentBalanceICP, stepResult.pixels, nft.name);

                    let updatedNFT = {
                        tokenId = nft.tokenId;
                        owner = nft.owner;
                        name = nft.name;
                        growthSteps = stepResult.stepCount;
                        mintedAt = nft.mintedAt;
                        lastWatered = Time.now();
                        cachedSVG = svg;
                        growthPixels = stepResult.pixels;
                        growthTips = stepResult.tips;
                    };

                    storage.updateNFT(updatedNFT);

                    #Ok(());
                };
            };
        };

        // ============================================
        // BURNING
        // ============================================

        public func burnBonsai(caller : Principal, tokenId : Nat) : Types.Result<(), Text> {
            switch (storage.getNFT(tokenId)) {
                case (null) { #Err("NFT not found") };
                case (?nft) {
                    if (nft.owner != caller) {
                        return #Err("You don't own this bonsai");
                    };

                    // Delete NFT
                    storage.deleteNFT(tokenId);

                    #Ok(());
                };
            };
        };

        // ============================================
        // QUERIES
        // ============================================

        public func getBonsaiDetails(tokenId : Nat) : ?Types.BonsaiNFT {
            storage.getNFT(tokenId);
        };

        public func getMyBonsais(owner : Principal) : [Types.TokenMetadata] {
            let tokenIds = storage.getOwnerTokens(owner);
            let metadataArray = Array.mapFilter<Nat, Types.TokenMetadata>(
                tokenIds,
                func(tokenId) {
                    switch (storage.getNFT(tokenId)) {
                        case (?nft) { ?buildMetadata(nft) };
                        case (null) { null };
                    };
                },
            );
            metadataArray;
        };

        public func getGallery(offset : Nat, limit : Nat) : [Types.TokenMetadata] {
            let allNFTs = storage.getAllNFTs();
            let total = allNFTs.size();

            if (offset >= total) {
                return [];
            };

            let endIndex = Nat.min(offset + limit, total);
            let slice = Array.subArray<Types.BonsaiNFT>(allNFTs, offset, endIndex - offset);

            Array.map<Types.BonsaiNFT, Types.TokenMetadata>(slice, buildMetadata);
        };

        private func buildMetadata(nft : Types.BonsaiNFT) : Types.TokenMetadata {
            let score = BonsaiEngine.calculateTreeScore(nft.growthPixels);
            let canGrow = nft.growthTips.size() > 0;

            let imageUrl = if (_useLocalhostImageUrl) {
                // Local replica: use the raw domain to bypass response verification.
                // (The non-raw gateway requires certified responses, which this simple http_request does not provide.)
                "http://" # _canisterId # ".raw.localhost:4943/nft/" # Nat.toText(nft.tokenId) # ".svg";
            } else {
                "https://" # _canisterId # ".raw.icp0.io/nft/" # Nat.toText(nft.tokenId) # ".svg";
            };

            {
                tokenId = nft.tokenId;
                name = nft.name;
                description = "A unique procedurally-generated bonsai tree NFT. Water it to watch it grow!";
                image = imageUrl;
                properties = {
                    score = score.total;
                    age = score.age;
                    branches = score.branches;
                    foliage = score.foliage;
                    growthSteps = nft.growthSteps;
                    canGrow = canGrow;
                };
            };
        };

        // ============================================
        // ICRC-7 STANDARD METHODS
        // ============================================

        public func icrc7_name() : Text {
            "ICP Bonsai NFT";
        };

        public func icrc7_symbol() : Text {
            "BONSAI";
        };

        public func icrc7_total_supply() : Nat {
            storage.getTotalSupply();
        };

        public func icrc7_owner_of(tokenId : Nat) : ?Principal {
            switch (storage.getNFT(tokenId)) {
                case (?nft) { ?nft.owner };
                case (null) { null };
            };
        };

        public func icrc7_balance_of(account : Types.Account) : Nat {
            storage.getOwnerTokens(account.owner).size();
        };

        public func icrc7_tokens_of(account : Types.Account) : [Nat] {
            storage.getOwnerTokens(account.owner);
        };

        public func icrc7_metadata(tokenId : Nat) : [(Text, Types.Value)] {
            switch (storage.getNFT(tokenId)) {
                case (null) { [] };
                case (?nft) {
                    let metadata = buildMetadata(nft);
                    [
                        ("icrc7:name", #Text(metadata.name)),
                        ("icrc7:description", #Text(metadata.description)),
                        ("icrc7:image", #Text(metadata.image)),
                        ("score", #Nat(metadata.properties.score)),
                        ("age", #Nat(metadata.properties.age)),
                        ("branches", #Nat(metadata.properties.branches)),
                        ("foliage", #Nat(metadata.properties.foliage)),
                        ("growth_steps", #Nat(metadata.properties.growthSteps)),
                        ("minted_at", #Int(nft.mintedAt)),
                        ("last_watered", #Int(nft.lastWatered)),
                    ];
                };
            };
        };

        // ============================================
        // ICRC-37 STANDARD METHODS
        // ============================================

        public func icrc37_transfer(caller : Principal, args : Types.TransferArgs) : Types.TransferResult {
            // Verify ownership or approval
            switch (storage.getNFT(args.token_id)) {
                case (null) {
                    return #Err(#NonExistingTokenId);
                };
                case (?nft) {
                    let isOwner = nft.owner == caller;
                    let isApproved = switch (storage.getApproval(args.token_id)) {
                        case (?approved) { approved == caller };
                        case (null) { false };
                    };

                    if (not isOwner and not isApproved) {
                        return #Err(#Unauthorized);
                    };

                    // Transfer
                    switch (storage.transferNFT(args.token_id, args.to.owner)) {
                        case (#Ok()) { #Ok(args.token_id) };
                        case (#Err(msg)) {
                            #Err(#GenericError({ error_code = 500; message = msg }));
                        };
                    };
                };
            };
        };

        public func icrc37_approve(caller : Principal, args : Types.ApprovalArgs) : Types.ApprovalResult {
            switch (storage.getNFT(args.token_id)) {
                case (null) {
                    #Err(#NonExistingTokenId);
                };
                case (?nft) {
                    if (nft.owner != caller) {
                        return #Err(#Unauthorized);
                    };

                    storage.approve(args.token_id, args.spender.owner);
                    #Ok(args.token_id);
                };
            };
        };

        // ============================================
        // LEADERBOARD HELPER
        // ============================================

        public func calculateScore(nft : Types.BonsaiNFT) : Types.TreeScore {
            BonsaiEngine.calculateTreeScore(nft.growthPixels);
        };
    };
};
