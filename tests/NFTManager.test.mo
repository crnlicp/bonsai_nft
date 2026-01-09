import NFTManager "../backend/NFTManager";
import StorageManager "../backend/StorageManager";
import Principal "mo:base/Principal";
// import Types "../backend/Types";
// import Debug "mo:base/Debug";

persistent actor NFTManagerTest {
    public func testMintWaterBurn() : async () {
        let storage = StorageManager.Storage();
        let owner = Principal.fromText("aaaaa-aa");
        let nftManager = NFTManager.NFTManager(storage, "testcanisterid", false);
        let mintResult = await nftManager.mintBonsaiFree(owner);
        assert (switch mintResult { case (#Ok(id)) id == 0; case _ false });
        let tokenId = switch mintResult { case (#Ok(id)) id; case _ 0 };
        let waterResult = await nftManager.waterBonsaiFree(owner, tokenId, 1.23);
        assert (waterResult == #Ok(()));
        let burnResult = nftManager.burnBonsai(owner, tokenId);
        assert (burnResult == #Ok(()));
        assert (nftManager.getBonsaiDetails(tokenId) == null);
    };
};
