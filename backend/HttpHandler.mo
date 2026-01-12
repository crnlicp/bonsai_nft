import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Types "Types";
import NFTManager "NFTManager";
import HelperFunctions "HelperFunctions";
import BonsaiNames "BonsaiNames";

module {
    // ============================================
    // HTTP HANDLER
    // Handles HTTP requests for NFT SVG serving
    // ============================================

    public class HttpHandler(nftManager : NFTManager.NFTManager, helperFunctions : HelperFunctions.HelperFunctions) {
        // ============================================
        // HTTP REQUEST HANDLING
        // ============================================

        public func handleRequest(request : Types.HttpRequest) : Types.HttpResponse {
            let url = request.url;

            // Strip query string if present
            let urlIter = Text.split(url, #char '?');
            let path = switch (urlIter.next()) {
                case (?p) { p };
                case (null) { url };
            };

            switch (parseTokenIdFromNftPath(path)) {
                case (?tokenId) {
                    switch (nftManager.getBonsaiDetails(tokenId)) {
                        case (?nft) {
                            let fileName = BonsaiNames.svgFileName(nft.tokenId, nft.mintedAt);
                            return {
                                status_code = 200;
                                headers = [
                                    ("Content-Type", "image/svg+xml"),
                                    ("Cache-Control", "no-cache"),
                                    ("Content-Disposition", "inline; filename=\"" # fileName # "\""),
                                ];
                                body = Text.encodeUtf8(nft.cachedSVG);
                                streaming_strategy = null;
                            };
                        };
                        case (null) {};
                    };
                };
                case (null) {};
            };

            {
                status_code = 404;
                headers = [("Content-Type", "text/plain")];
                body = Text.encodeUtf8("Not found");
                streaming_strategy = null;
            };
        };

        // ============================================
        // URL PARSING
        // ============================================

        private func parseTokenIdFromNftPath(path : Text) : ?Nat {
            if (not Text.startsWith(path, #text "/nft/")) {
                return null;
            };

            let segments = Array.filter<Text>(
                Iter.toArray(Text.split(path, #char '/')),
                func(s : Text) : Bool { s != "" },
            );

            // Expected variants:
            // - /nft/<id>
            // - /nft/<id>.svg
            // - /nft/<id>/svg
            if (segments.size() < 2 or segments[0] != "nft") {
                return null;
            };

            let tokenSeg = segments[1];

            let tokenSegParts = Iter.toArray(Text.split(tokenSeg, #char '.'));
            let tokenIdText = if (tokenSegParts.size() >= 1) {
                tokenSegParts[0];
            } else {
                tokenSeg;
            };

            helperFunctions.textToNat(tokenIdText);
        };
    };
};
