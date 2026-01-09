import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Nat32 "mo:base/Nat32";
import Time "mo:base/Time";
import Int "mo:base/Int";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Types "Types";
import LedgerHelper "LedgerHelper";

module {
    // ============================================
    // PAYMENT MANAGER
    // Handles invoice creation, payment verification,
    // and block tracking for the Bonsai NFT canister.
    // ============================================

    public class PaymentManager(ledgerHelper : LedgerHelper.LedgerHelper) {
        // Invoice memo sequencing
        private var nextInvoiceMemo : Nat64 = 1;

        // Invoice map (in-memory HashMap keyed by memo)
        private var invoices = HashMap.HashMap<Nat64, Types.Invoice>(
            10,
            Nat64.equal,
            func(n : Nat64) : Nat32 {
                let two32 : Nat64 = 4_294_967_296;
                Nat32.fromNat(Nat64.toNat(n % two32));
            },
        );

        // Track used payment blocks to prevent double-spending
        private var usedBlocks : [Nat64] = [];

        // ============================================
        // INVOICE CREATION
        // ============================================

        public func createInvoice(caller : Principal, kind : Types.InvoiceKind, amount : Nat64) : Nat64 {
            let memo = nextInvoiceMemo;
            nextInvoiceMemo += 1;
            let inv : Types.Invoice = {
                caller = caller;
                kind = kind;
                amount = amount;
                createdAtNanos = Nat64.fromNat(Int.abs(Time.now()));
            };
            invoices.put(memo, inv);
            memo;
        };

        public func getInvoice(memo : Nat64) : ?Types.Invoice {
            invoices.get(memo);
        };

        public func removeInvoice(memo : Nat64) {
            ignore invoices.remove(memo);
        };

        // ============================================
        // PAYMENT VERIFICATION
        // ============================================

        public func isBlockUsed(blockIndex : Nat64) : Bool {
            ledgerHelper.isBlockUsed(blockIndex, usedBlocks);
        };

        public func markBlockUsed(blockIndex : Nat64) {
            usedBlocks := ledgerHelper.markBlockUsed(blockIndex, usedBlocks);
        };

        private func getBlockAt(blockIndex : Nat64) : async ?Types.Block {
            await ledgerHelper.getBlockAt(blockIndex);
        };

        public func verifyPayment(
            caller : Principal,
            kind : Types.InvoiceKind,
            memo : Nat64,
            blockIndex : Nat64,
            treasuryAccountId : ?Blob,
        ) : async Types.Result<Nat64, Text> {
            if (isBlockUsed(blockIndex)) {
                return #Err("Payment block already used");
            };

            let invoiceOpt = invoices.get(memo);
            switch (invoiceOpt) {
                case (null) { return #Err("No pending invoice for memo") };
                case (?invoice) {
                    if (invoice.caller != caller) {
                        return #Err("Invoice does not belong to caller");
                    };
                    if (invoice.kind != kind) {
                        return #Err("Invoice kind mismatch");
                    };

                    let treasury = switch (treasuryAccountId) {
                        case (?aid) { aid };
                        case (null) {
                            return #Err("Treasury account id not configured. Owner must call setTreasuryAccountId");
                        };
                    };

                    let blockOpt = await getBlockAt(blockIndex);
                    switch (blockOpt) {
                        case (null) {
                            return #Err("Unable to fetch ledger block");
                        };
                        case (?block) {
                            if (block.transaction.memo != memo) {
                                return #Err("Ledger memo mismatch");
                            };
                            switch (block.transaction.operation) {
                                case (null) {
                                    return #Err("Ledger block has no operation");
                                };
                                case (?#Transfer(t)) {
                                    if (t.to != treasury) {
                                        return #Err("Payment not sent to treasury account");
                                    };
                                    if (t.amount.e8s != invoice.amount) {
                                        return #Err("Payment amount mismatch");
                                    };
                                    // Fee is validated by the ledger, but we sanity check it.
                                    if (t.fee.e8s != ledgerHelper.LEDGER_FEE) {
                                        return #Err("Unexpected ledger fee");
                                    };
                                };
                                case (_) {
                                    return #Err("Ledger operation is not a transfer");
                                };
                            };
                        };
                    };

                    // Mark used + consume invoice
                    markBlockUsed(blockIndex);
                    removeInvoice(memo);

                    return #Ok(invoice.amount);
                };
            };
        };

        // ============================================
        // STABLE STORAGE
        // ============================================

        public func toStable() : (Nat64, [(Nat64, Types.Invoice)], [Nat64]) {
            (nextInvoiceMemo, Iter.toArray(invoices.entries()), usedBlocks);
        };

        public func fromStable(
            stableNextMemo : Nat64,
            stableInvoices : [(Nat64, Types.Invoice)],
            stableUsedBlocks : [Nat64],
        ) {
            nextInvoiceMemo := stableNextMemo;
            invoices := HashMap.HashMap<Nat64, Types.Invoice>(
                Nat.max(10, stableInvoices.size()),
                Nat64.equal,
                func(n : Nat64) : Nat32 {
                    let two32 : Nat64 = 4_294_967_296;
                    Nat32.fromNat(Nat64.toNat(n % two32));
                },
            );
            for ((memo, inv) in stableInvoices.vals()) {
                invoices.put(memo, inv);
            };
            usedBlocks := stableUsedBlocks;
        };

        // ============================================
        // GETTERS
        // ============================================

        public func getNextInvoiceMemo() : Nat64 {
            nextInvoiceMemo;
        };
    };
};
