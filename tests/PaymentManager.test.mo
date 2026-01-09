import PaymentManager "../backend/PaymentManager";
import LedgerHelper "../backend/LedgerHelper";
import Principal "mo:base/Principal";
// import Types "../backend/Types";

persistent actor PaymentManagerTest {
    public func testInvoiceCreateRemove() : async () {
        let ledgerHelper = LedgerHelper.LedgerHelper();
        let manager = PaymentManager.PaymentManager(ledgerHelper);
        let principal = Principal.fromText("aaaaa-aa");
        let memo = manager.createInvoice(principal, #Mint, 10);
        assert (manager.getInvoice(memo) != null);
        manager.removeInvoice(memo);
        assert (manager.getInvoice(memo) == null);
    };
    public func testIsBlockUsedMarkBlockUsed() : async () {
        let ledgerHelper = LedgerHelper.LedgerHelper();
        let manager = PaymentManager.PaymentManager(ledgerHelper);
        assert (manager.isBlockUsed(1) == false);
        manager.markBlockUsed(1);
        assert (manager.isBlockUsed(1));
    };
};
