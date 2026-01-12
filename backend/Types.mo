import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Float "mo:base/Float";

module {
    // =====================================================
    // SECTION: ICRC-21 (Consent Messages)
    // =====================================================
    public type Icrc21ConsentMessageRequest = {
        method : Text;
        arg : Blob;
        user_preferences : Icrc21ConsentMessageSpec;
    };

    public type Icrc21ConsentMessageSpec = {
        metadata : Icrc21ConsentMessageMetadata;
        device_spec : ?Icrc21DeviceSpec;
    };

    public type Icrc21ConsentMessageMetadata = {
        language : Text;
        utc_offset_minutes : ?Int16;
    };

    public type Icrc21DeviceSpec = {
        #GenericDisplay;
        #FieldsDisplay;
    };

    public type TextValue = {
        content : Text;
    };

    public type TokenAmount = {
        decimals : Nat8;
        amount : Nat64;
        symbol : Text;
    };

    public type TimestampSeconds = {
        amount : Nat64;
    };

    public type DurationSeconds = {
        amount : Nat64;
    };

    public type Icrc21Value = {
        #TokenAmount : TokenAmount;
        #TimestampSeconds : TimestampSeconds;
        #DurationSeconds : DurationSeconds;
        #Text : TextValue;
    };

    public type Icrc21ConsentMessage = {
        #GenericDisplayMessage : Text;
        #FieldsDisplayMessage : {
            intent : Text;
            fields : [(Text, Icrc21Value)];
        };
    };

    public type Icrc21ConsentInfo = {
        consent_message : Icrc21ConsentMessage;
        metadata : Icrc21ConsentMessageMetadata;
    };

    public type Icrc21ErrorInfo = {
        description : Text;
    };

    public type Icrc21Error = {
        #UnsupportedCanisterCall : Icrc21ErrorInfo;
        #ConsentMessageUnavailable : Icrc21ErrorInfo;
        #InsufficientPayment : Icrc21ErrorInfo;
        #GenericError : {
            error_code : Nat;
            description : Text;
        };
    };

    public type Icrc21ConsentMessageResponse = {
        #Ok : Icrc21ConsentInfo;
        #Err : Icrc21Error;
    };

    // =====================================================
    // SECTION: ICRC-28 (Trusted Origins)
    // =====================================================
    public type Icrc28TrustedOriginsResponse = {
        trusted_origins : [Text];
    };

    // =====================================================
    // SECTION: PIXEL AND GROWTH TYPES
    // =====================================================
    public type PixelType = {
        #root;
        #trunk;
        #trunk_thick;
        #branch;
        #leaf;
    };

    public type TipType = {
        #trunk;
        #branch;
        #foliage_spawner;
    };

    public type Pixel = {
        x : Nat;
        y : Nat;
        pixelType : PixelType;
        age : Nat;
    };

    public type GrowthTip = {
        x : Int;
        y : Int;
        dirX : Int;
        dirY : Int;
        tipType : TipType;
        life : Nat;
        curve : Int;
    };

    public type GrowthDigits = {
        trunkCurve : Nat;
        curveChange : Nat;
        branchSpawn : Nat;
        branchDir : Nat;
        branchLength : Nat;
        leafDensity : Nat;
        thickening : Nat;
        branchAngle : Nat;
    };

    public type TreeScore = {
        total : Nat;
        maxScore : Nat;
        age : Nat;
        branches : Nat;
        foliage : Nat;
    };

    // =====================================================
    // SECTION: NFT AND METADATA TYPES
    // =====================================================
    public type BonsaiNFT = {
        tokenId : Nat;
        owner : Principal;
        name : Text;
        growthSteps : Nat;
        mintedAt : Int;
        lastWatered : Int;
        cachedSVG : Text;
        growthPixels : [Pixel];
        growthTips : [GrowthTip];
    };

    public type TokenMetadata = {
        tokenId : Nat;
        name : Text;
        description : Text;
        image : Text;
        properties : {
            score : Nat;
            age : Nat;
            branches : Nat;
            foliage : Nat;
            growthSteps : Nat;
            canGrow : Bool;
        };
    };

    // =====================================================
    // SECTION: LEADERBOARD TYPES
    // =====================================================
    public type LeaderboardEntry = {
        principal : Principal;
        bonsaiCount : Nat;
        totalScore : Nat;
        rank : Nat;
        bonsais : [Nat]; // Token IDs of bonsais included in this round
    };

    public type AirdropDistribution = {
        principal : Principal;
        amount : Nat64;
        percentage : Float.Float;
        rank : Nat;
    };

    public type LeaderboardRound = {
        roundId : Nat;
        startTime : Int;
        endTime : Int;
        topUsers : [LeaderboardEntry];
        distributions : [AirdropDistribution];
        totalDistributed : Nat64;
    };

    public type CurrentLeaderboard = {
        roundId : Nat;
        startTime : Int;
        endTime : Int;
        topUsers : [LeaderboardEntry];
        treasuryAmount : Nat64;
        airdropAmount : Nat64;
    };

    // =====================================================
    // SECTION: INVOICE TYPES (for payments)
    // =====================================================
    public type InvoiceKind = {
        #Mint;
        #Water : { tokenId : Nat; cost : Nat64 };
    };

    public type Invoice = {
        caller : Principal;
        kind : InvoiceKind;
        amount : Nat64;
        createdAtNanos : Nat64;
    };

    // =====================================================
    // SECTION: GENERIC RESULT TYPE
    // =====================================================
    public type Result<T, E> = {
        #Ok : T;
        #Err : E;
    };

    // =====================================================
    // SECTION: ICRC-7 NFT STANDARD TYPES
    // =====================================================
    public type Account = {
        owner : Principal;
        subaccount : ?Blob;
    };

    public type Value = {
        #Nat : Nat;
        #Int : Int;
        #Text : Text;
        #Blob : Blob;
    };

    public type TransferArgs = {
        from_subaccount : ?Blob;
        to : Account;
        token_id : Nat;
        memo : ?Blob;
        created_at_time : ?Nat64;
    };

    public type TransferResult = {
        #Ok : Nat;
        #Err : TransferError;
    };

    public type TransferError = {
        #Unauthorized;
        #NonExistingTokenId;
        #InvalidRecipient;
        #CreatedInFuture : { ledger_time : Nat64 };
        #GenericError : { error_code : Nat; message : Text };
    };

    // =====================================================
    // SECTION: ICRC-37 NFT APPROVAL TYPES
    // =====================================================
    public type ApprovalArgs = {
        from_subaccount : ?Blob;
        spender : Account;
        token_id : Nat;
        expires_at : ?Nat64;
        memo : ?Blob;
        created_at_time : ?Nat64;
    };

    public type ApprovalResult = {
        #Ok : Nat;
        #Err : ApprovalError;
    };

    public type ApprovalError = {
        #Unauthorized;
        #NonExistingTokenId;
        #GenericError : { error_code : Nat; message : Text };
    };

    // =====================================================
    // SECTION: HTTP INTERFACE TYPES
    // =====================================================
    public type HttpRequest = {
        method : Text;
        url : Text;
        headers : [(Text, Text)];
        body : Blob;
    };

    public type HttpResponse = {
        status_code : Nat16;
        headers : [(Text, Text)];
        body : Blob;
        streaming_strategy : ?StreamingStrategy;
    };

    public type StreamingStrategy = {
        #Callback : {
            callback : shared () -> async StreamingCallbackHttpResponse;
            token : StreamingCallbackToken;
        };
    };

    public type StreamingCallbackToken = {
        key : Text;
        content_encoding : Text;
        index : Nat;
    };

    public type StreamingCallbackHttpResponse = {
        body : Blob;
        token : ?StreamingCallbackToken;
    };

    // =====================================================
    // SECTION: LEDGER TYPES (NFT, ICRC-7, ICRC-37)
    // =====================================================
    public type TimeStamp = { timestamp_nanos : Nat64 };

    public type Block = {
        parent_hash : ?Blob;
        transaction : Transaction;
        timestamp : TimeStamp;
    };

    public type GetBlocksArgs = { start : Nat64; length : Nat64 };
    public type BlockRange = { blocks : [Block] };
    public type QueryArchiveError = {
        #BadFirstBlockIndex : {
            requested_index : Nat64;
            first_valid_index : Nat64;
        };
        #Other : { error_code : Nat64; error_message : Text };
    };

    public type QueryArchiveResult = {
        #Ok : BlockRange;
        #Err : QueryArchiveError;
    };
    public type QueryArchiveFn = shared query GetBlocksArgs -> async QueryArchiveResult;
    public type ArchivedBlocksRange = {
        start : Nat64;
        length : Nat64;
        callback : QueryArchiveFn;
    };

    public type QueryBlocksResponse = {
        chain_length : Nat64;
        certificate : ?Blob;
        blocks : [Block];
        first_block_index : Nat64;
        archived_blocks : [ArchivedBlocksRange];
    };

    public type AccountBalanceArgs = {
        account : Blob;
    };

    public type Ledger = actor {
        query_blocks : shared query GetBlocksArgs -> async QueryBlocksResponse;
        transfer : shared TransferArgsLedger -> async TransferResultLedger;
        account_balance : shared query AccountBalanceArgs -> async Tokens;
    };

    // =====================================================
    // SECTION: ICP LEDGER TYPES (ICRC-1)
    // =====================================================
    public type Tokens = { e8s : Nat64 };
    public type Operation = {
        #Transfer : { from : Blob; to : Blob; amount : Tokens; fee : Tokens };
        #Mint : { to : Blob; amount : Tokens };
        #Burn : { from : Blob; spender : ?Blob; amount : Tokens };
        #Approve : {
            from : Blob;
            spender : Blob;
            allowance_e8s : Int;
            allowance : Tokens;
            fee : Tokens;
            expires_at : ?TimeStamp;
        };
        #TransferFrom : {
            from : Blob;
            to : Blob;
            spender : Blob;
            amount : Tokens;
            fee : Tokens;
        };
    };

    public type Transaction = {
        memo : Nat64;
        icrc1_memo : ?Blob;
        operation : ?Operation;
        created_at_time : TimeStamp;
    };

    public type TransferArgsLedger = {
        memo : Nat64;
        amount : Tokens;
        fee : Tokens;
        from_subaccount : ?Blob;
        to : Blob;
        created_at_time : ?TimeStamp;
    };

    public type TransferErrorLedger = {
        #BadFee : { expected_fee : Tokens };
        #InsufficientFunds : { balance : Tokens };
        #TxTooOld : { allowed_window_nanos : Nat64 };
        #TxCreatedInFuture : Null;
        #TxDuplicate : { duplicate_of : Nat64 };
    };

    public type TransferResultLedger = {
        #Ok : Nat64;
        #Err : TransferErrorLedger;
    };
};
