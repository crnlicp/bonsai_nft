// Stub for @icp-sdk/canisters/ledger/icp and @dfinity/ledger-icp
// This is a workaround for @dfinity/ledger-icp's missing peer dependency
// We don't use this package directly - it's only imported by @nfid/identitykit

// Export minimal stubs that IdentityKit expects
export class SubAccount {
    constructor(_bytes?: Uint8Array) {
        void _bytes;
    }
    toUint8Array(): Uint8Array {
        return new Uint8Array(32);
    }
    static fromPrincipal(_principal: unknown): SubAccount {
        void _principal;
        return new SubAccount();
    }
    static fromBytes(bytes: Uint8Array): SubAccount {
        void bytes;
        return new SubAccount(bytes);
    }
}

export class AccountIdentifier {
    constructor() { }
    static fromPrincipal(_opts: { principal: unknown; subAccount?: unknown }): AccountIdentifier {
        void _opts;
        return new AccountIdentifier();
    }
    static fromHex(_hex: string): AccountIdentifier {
        void _hex;
        return new AccountIdentifier();
    }
    toUint8Array(): Uint8Array {
        return new Uint8Array(32);
    }
    toHex(): string {
        return '0'.repeat(64);
    }
    toNumbers(): number[] {
        return Array(32).fill(0);
    }
}

export class LedgerCanister {
    static create(_opts: unknown): unknown {
        void _opts;
        return {
            transfer: async () => ({ Ok: 0n }),
            accountBalance: async () => 0n,
            metadata: async () => ({
                symbol: 'ICP',
                name: 'Internet Computer',
                decimals: 8,
                fee: 10_000n
            })
        };
    }
}

export class IndexCanister {
    static create(_opts: unknown): unknown {
        void _opts;
        return {
            getTransactions: async () => ({ transactions: [], oldest_tx_id: [] })
        };
    }
}

// ICP SDK stubs
export const IcpLedgerCanister = LedgerCanister;
export const IcpIndexCanister = IndexCanister;

// Default exports for compatibility
export default {
    SubAccount,
    AccountIdentifier,
    LedgerCanister,
    IndexCanister,
    IcpLedgerCanister,
    IcpIndexCanister
};
