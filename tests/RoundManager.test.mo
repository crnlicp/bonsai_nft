import RoundManager "../backend/RoundManager";
// import Types "../backend/Types";
// import Principal "mo:base/Principal";

persistent actor RoundManagerTest {
    public func testRoundState() : async () {
        let manager = RoundManager.RoundManager();
        let (rid, start, active) = manager.getRoundState();
        assert (rid == 1 and start == 0 and active == false);
        manager.setRoundState(2, 999, true);
        let (rid2, start2, active2) = manager.getRoundState();
        assert (rid2 == 2 and start2 == 999 and active2 == true);
    };
};
