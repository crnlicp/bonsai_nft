import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Types "Types";
import Text "mo:base/Text";

module {
    // ============================================
    // STORAGE STATE
    // ============================================

    // Custom hash function for Nat (replacement for deprecated Hash.hash)
    private func natHash(n : Nat) : Hash.Hash {
        Text.hash(Nat.toText(n));
    };

    public class Storage() {
        // NFT Storage
        private var nfts = HashMap.HashMap<Nat, Types.BonsaiNFT>(10, Nat.equal, natHash);
        private var ownerTokens = HashMap.HashMap<Principal, [Nat]>(10, Principal.equal, Principal.hash);
        private var nextTokenId : Nat = 0;

        // Approval Storage (for ICRC-37)
        private var approvals = HashMap.HashMap<Nat, Principal>(10, Nat.equal, natHash);

        // ============================================
        // NFT OPERATIONS
        // ============================================

        public func addNFT(nft : Types.BonsaiNFT) : () {
            nfts.put(nft.tokenId, nft);

            // Update owner's token list
            let currentTokens = switch (ownerTokens.get(nft.owner)) {
                case (null) { [] };
                case (?tokens) { tokens };
            };
            ownerTokens.put(nft.owner, Array.append(currentTokens, [nft.tokenId]));
        };

        public func getNFT(tokenId : Nat) : ?Types.BonsaiNFT {
            nfts.get(tokenId);
        };

        public func updateNFT(nft : Types.BonsaiNFT) : () {
            nfts.put(nft.tokenId, nft);
        };

        public func deleteNFT(tokenId : Nat) : () {
            switch (nfts.get(tokenId)) {
                case (?nft) {
                    nfts.delete(tokenId);

                    // Remove from owner's token list
                    switch (ownerTokens.get(nft.owner)) {
                        case (?tokens) {
                            let newTokens = Array.filter<Nat>(tokens, func(id) { id != tokenId });
                            ownerTokens.put(nft.owner, newTokens);
                        };
                        case (null) {};
                    };
                };
                case (null) {};
            };
        };

        public func transferNFT(tokenId : Nat, to : Principal) : Types.Result<(), Text> {
            switch (nfts.get(tokenId)) {
                case (?nft) {
                    let from = nft.owner;

                    // Remove from old owner
                    switch (ownerTokens.get(from)) {
                        case (?tokens) {
                            let newTokens = Array.filter<Nat>(tokens, func(id) { id != tokenId });
                            ownerTokens.put(from, newTokens);
                        };
                        case (null) {};
                    };

                    // Add to new owner
                    let currentTokens = switch (ownerTokens.get(to)) {
                        case (null) { [] };
                        case (?tokens) { tokens };
                    };
                    ownerTokens.put(to, Array.append(currentTokens, [tokenId]));

                    // Update NFT owner
                    let updatedNFT = {
                        tokenId = nft.tokenId;
                        owner = to;
                        growthSteps = nft.growthSteps;
                        mintedAt = nft.mintedAt;
                        lastWatered = nft.lastWatered;
                        cachedSVG = nft.cachedSVG;
                        growthPixels = nft.growthPixels;
                        growthTips = nft.growthTips;
                    };
                    nfts.put(tokenId, updatedNFT);

                    // Clear approval
                    approvals.delete(tokenId);

                    #Ok(());
                };
                case (null) {
                    #Err("NFT not found");
                };
            };
        };

        public func getOwnerTokens(owner : Principal) : [Nat] {
            switch (ownerTokens.get(owner)) {
                case (null) { [] };
                case (?tokens) { tokens };
            };
        };

        public func getAllNFTs() : [Types.BonsaiNFT] {
            Iter.toArray(nfts.vals());
        };

        public func getTotalSupply() : Nat {
            nfts.size();
        };

        public func getNextTokenId() : Nat {
            let id = nextTokenId;
            nextTokenId += 1;
            id;
        };

        // ============================================
        // APPROVAL OPERATIONS (ICRC-37)
        // ============================================

        public func approve(tokenId : Nat, spender : Principal) : () {
            approvals.put(tokenId, spender);
        };

        public func getApproval(tokenId : Nat) : ?Principal {
            approvals.get(tokenId);
        };

        public func clearApproval(tokenId : Nat) : () {
            approvals.delete(tokenId);
        };

        // ============================================
        // STABLE STORAGE CONVERSION
        // ============================================

        public func toStable() : {
            nfts : [(Nat, Types.BonsaiNFT)];
            ownerTokens : [(Principal, [Nat])];
            nextTokenId : Nat;
            approvals : [(Nat, Principal)];
        } {
            {
                nfts = Iter.toArray(nfts.entries());
                ownerTokens = Iter.toArray(ownerTokens.entries());
                nextTokenId = nextTokenId;
                approvals = Iter.toArray(approvals.entries());
            };
        };

        public func fromStable(
            stableData : {
                nfts : [(Nat, Types.BonsaiNFT)];
                ownerTokens : [(Principal, [Nat])];
                nextTokenId : Nat;
                approvals : [(Nat, Principal)];
            }
        ) : () {
            nfts := HashMap.fromIter<Nat, Types.BonsaiNFT>(stableData.nfts.vals(), 10, Nat.equal, natHash);
            ownerTokens := HashMap.fromIter<Principal, [Nat]>(stableData.ownerTokens.vals(), 10, Principal.equal, Principal.hash);
            nextTokenId := stableData.nextTokenId;
            approvals := HashMap.fromIter<Nat, Principal>(stableData.approvals.vals(), 10, Nat.equal, natHash);
        };
    };
};
