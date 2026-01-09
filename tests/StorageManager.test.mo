import StorageManager "../backend/StorageManager";
import Types "../backend/Types";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
// import Nat "mo:base/Nat";

persistent actor StorageManagerTest {
    public func testAddGetDeleteNFT() : async () {
        let storage = StorageManager.Storage();
        let owner = Principal.fromText("aaaaa-aa");
        let nft : Types.BonsaiNFT = {
            tokenId = 1;
            owner = owner;
            growthSteps = 0;
            mintedAt = 0;
            lastWatered = 0;
            cachedSVG = "<svg></svg>";
            growthPixels = [];
            growthTips = [];
        };
        storage.addNFT(nft);
        assert (storage.getNFT(1) != null);
        storage.deleteNFT(1);
        assert (storage.getNFT(1) == null);
    };
    public func testTransferNFT() : async () {
        let storage = StorageManager.Storage();
        let owner = Principal.fromText("aaaaa-aa");
        let to = Principal.fromText("bbbbb-aa");
        let nft : Types.BonsaiNFT = {
            tokenId = 2;
            owner = owner;
            growthSteps = 0;
            mintedAt = 0;
            lastWatered = 0;
            cachedSVG = "foo";
            growthPixels = [];
            growthTips = [];
        };
        storage.addNFT(nft);
        let res = storage.transferNFT(2, to);
        assert (res == #Ok(()));
        let nOpt = storage.getNFT(2);
        assert (nOpt != null);
        let n = switch nOpt { case (?nft) nft; case null Debug.trap("No NFT") };
        assert (n.owner == to);
    };
};
