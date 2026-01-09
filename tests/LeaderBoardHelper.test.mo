import LeaderBoardHelper "../backend/LeaderBoardHelper";
import StorageManager "../backend/StorageManager";
import NFTManager "../backend/NFTManager";
import LedgerHelper "../backend/LedgerHelper";
import Types "../backend/Types";
import Principal "mo:base/Principal";
import Nat8 "mo:base/Nat8";
import Blob "mo:base/Blob";
import Array "mo:base/Array";

persistent actor LeaderBoardHelperTest {
    private func principalFromSeed(seed : Nat) : Principal {
        Principal.fromBlob(Blob.fromArray([Nat8.fromNat(seed)]));
    };

    private func pixels(count : Nat, pixelType : Types.PixelType) : [Types.Pixel] {
        Array.tabulate<Types.Pixel>(
            count,
            func(i) {
                {
                    x = i % 32;
                    y = (i / 32) % 32;
                    pixelType = pixelType;
                    age = 0;
                };
            },
        );
    };

    public func testCalculateUserScoresEmpty() : async () {
        let storage = StorageManager.Storage();
        let nftManager = NFTManager.NFTManager(storage, "cid", false);
        let ledgerHelper = LedgerHelper.LedgerHelper();
        let helper = LeaderBoardHelper.LeaderBoardHelper(storage, nftManager, ledgerHelper);
        let scores = helper.calculateUserScores(0, 0, false);
        assert (scores.size() == 0);
    };

    public func testGetCurrentLeaderboardFiltersByPreviousRoundEnd() : async () {
        let storage = StorageManager.Storage();
        let nftManager = NFTManager.NFTManager(storage, "cid", false);
        let ledgerHelper = LedgerHelper.LedgerHelper();
        let helper = LeaderBoardHelper.LeaderBoardHelper(storage, nftManager, ledgerHelper);

        // Define a small round window: start=100, duration=100 => end=200
        helper.setRoundDuration(100);
        let currentRoundStart : Int = 100;
        let previousRoundEndTime : Int = 50;

        let p1 = principalFromSeed(1);
        let p2 = principalFromSeed(2);
        let p3 = principalFromSeed(3);

        // Included for current round: mintedAt in (50, 200]
        let nft1 : Types.BonsaiNFT = {
            tokenId = 1;
            owner = p1;
            growthSteps = 0;
            mintedAt = 60;
            lastWatered = 60;
            cachedSVG = "";
            growthPixels = pixels(10, #leaf);
            growthTips = [];
        };
        let nft2 : Types.BonsaiNFT = {
            tokenId = 2;
            owner = p1;
            growthSteps = 0;
            mintedAt = 150;
            lastWatered = 150;
            cachedSVG = "";
            growthPixels = pixels(60, #leaf);
            growthTips = [];
        };
        let nft3 : Types.BonsaiNFT = {
            tokenId = 3;
            owner = p2;
            growthSteps = 0;
            mintedAt = 120;
            lastWatered = 120;
            cachedSVG = "";
            growthPixels = pixels(6, #branch);
            growthTips = [];
        };

        // Excluded: minted before previous round end
        let nftOld : Types.BonsaiNFT = {
            tokenId = 4;
            owner = p3;
            growthSteps = 0;
            mintedAt = 40;
            lastWatered = 40;
            cachedSVG = "";
            growthPixels = pixels(100, #leaf);
            growthTips = [];
        };

        // Excluded: minted after current round end
        let nftFuture : Types.BonsaiNFT = {
            tokenId = 5;
            owner = p2;
            growthSteps = 0;
            mintedAt = 250;
            lastWatered = 250;
            cachedSVG = "";
            growthPixels = pixels(200, #leaf);
            growthTips = [];
        };

        storage.addNFT(nft1);
        storage.addNFT(nft2);
        storage.addNFT(nft3);
        storage.addNFT(nftOld);
        storage.addNFT(nftFuture);

        let lb = helper.getCurrentLeaderboard(1, currentRoundStart, previousRoundEndTime, true, 0);

        // Only p1 and p2 have included bonsais.
        assert (lb.topUsers.size() == 2);

        // Find entries by principal.
        var e1 : ?Types.LeaderboardEntry = null;
        var e2 : ?Types.LeaderboardEntry = null;
        for (e in lb.topUsers.vals()) {
            if (Principal.equal(e.principal, p1)) { e1 := ?e };
            if (Principal.equal(e.principal, p2)) { e2 := ?e };
        };
        assert (e1 != null);
        assert (e2 != null);

        let entry1 = switch (e1) {
            case (?x) { x };
            case (null) { assert false; loop {} };
        };
        let entry2 = switch (e2) {
            case (?x) { x };
            case (null) { assert false; loop {} };
        };

        // Counts reflect only included bonsais.
        assert (entry1.bonsaiCount == 2);
        assert (entry2.bonsaiCount == 1);

        // Bonsai lists reflect only included token IDs (order-independent).
        let sortNat = func(a : Nat, b : Nat) : { #less; #equal; #greater } {
            if (a < b) { #less } else if (a > b) { #greater } else { #equal };
        };
        let b1 = Array.sort<Nat>(entry1.bonsais, sortNat);
        let b2 = Array.sort<Nat>(entry2.bonsais, sortNat);
        assert (b1.size() == 2 and b1[0] == 1 and b1[1] == 2);
        assert (b2.size() == 1 and b2[0] == 3);

        // Total scores are the sum of included bonsai scores.
        let s1 = nftManager.calculateScore(nft1).total + nftManager.calculateScore(nft2).total;
        let s2 = nftManager.calculateScore(nft3).total;
        assert (entry1.totalScore == s1);
        assert (entry2.totalScore == s2);
    };
};
