import Principal "mo:base/Principal";
import Nat64 "mo:base/Nat64";
import Types "Types";
import Array "mo:base/Array";

module {
    public class LedgerHelper() {

        // ============================================
        // MINTING COSTS
        // ============================================
        public var MINT_COST : Nat64 = 100_000_000; // 1 ICP
        public var WATER_COST : Nat64 = 1_111_000; // 0.01111000 ICP
        public var LEDGER_FEE : Nat64 = 10_000;

        // ICP Ledger canister (mainnet default). For local dev, set via `setLedgerCanisterId`.
        public var LEDGER_CANISTER : Principal = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

        public func setLedgerCanister(newLedger : Principal) {
            LEDGER_CANISTER := newLedger;
        };

        public func ledger() : Types.Ledger {
            actor (Principal.toText(LEDGER_CANISTER));
        };

        public func isBlockUsed(blockIndex : Nat64, usedBlocks : [Nat64]) : Bool {
            Array.find<Nat64>(usedBlocks, func(b : Nat64) : Bool { b == blockIndex }) != null;
        };

        public func markBlockUsed(blockIndex : Nat64, usedBlocks : [Nat64]) : [Nat64] {
            Array.append<Nat64>(usedBlocks, [blockIndex]);
        };

        public func getBlockAt(blockIndex : Nat64) : async ?Types.Block {
            let res = await ledger().query_blocks({
                start = blockIndex;
                length = 1;
            });
            if (res.blocks.size() > 0 and res.first_block_index == blockIndex) {
                return ?res.blocks[0];
            };

            for (r in res.archived_blocks.vals()) {
                if (blockIndex >= r.start and blockIndex < r.start + r.length) {
                    let archiveRes = await r.callback({
                        start = blockIndex;
                        length = 1;
                    });
                    switch (archiveRes) {
                        case (#Ok(range)) {
                            if (range.blocks.size() > 0) {
                                return ?range.blocks[0];
                            };
                        };
                        case (#Err(_)) {};
                    };
                };
            };

            null;
        };

        public func verifyLedgerFee(fee : Nat64) : Bool {
            fee == LEDGER_FEE;
        };
    };
};
