import HttpHandler "../backend/HttpHandler";
import NFTManager "../backend/NFTManager";
import StorageManager "../backend/StorageManager";
import HelperFunctions "../backend/HelperFunctions";
import Types "../backend/Types";

persistent actor HttpHandlerTest {
    public func testHandleRequest404() : async () {
        let storage = StorageManager.Storage();
        let nftManager = NFTManager.NFTManager(storage, "canid", false);
        let helperFunctions = HelperFunctions.HelperFunctions();
        let handler = HttpHandler.HttpHandler(nftManager, helperFunctions);
        let req : Types.HttpRequest = {
            method = "GET";
            url = "/invalidpath";
            headers = [];
            body = "";
        };
        let resp = handler.handleRequest(req);
        assert (resp.status_code == 404);
    };
};
