import { useState, useEffect, useCallback, useRef } from 'react';
import { useIdentityKitAuth } from './useIdentityKitAuth';
import { useAgent } from '@nfid/identitykit/react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { ICP_LEDGER_CANISTER_ID, ICP_FEE, principalToAccountIdentifier } from '../utils/ledger';
import { ensureRootKeyFetched } from '../utils/rootKey';
import { idlFactory as backendIdl } from 'declarations/backend/backend.did.js';

const host = import.meta.env.DFX_NETWORK === 'ic' ? 'https://icp-api.io' : 'http://127.0.0.1:4943';

// ICP Ledger IDL Factory
const ledgerIdlFactory = ({ IDL }: any) => {
    const Tokens = IDL.Record({ e8s: IDL.Nat64 });
    const TimeStamp = IDL.Record({ timestamp_nanos: IDL.Nat64 });
    const AccountIdentifier = IDL.Vec(IDL.Nat8);
    const SubAccount = IDL.Vec(IDL.Nat8);

    const TransferArgs = IDL.Record({
        to: AccountIdentifier,
        fee: Tokens,
        memo: IDL.Nat64,
        from_subaccount: IDL.Opt(SubAccount),
        created_at_time: IDL.Opt(TimeStamp),
        amount: Tokens,
    });

    const TransferError = IDL.Variant({
        TxTooOld: IDL.Record({ allowed_window_nanos: IDL.Nat64 }),
        BadFee: IDL.Record({ expected_fee: Tokens }),
        TxDuplicate: IDL.Record({ duplicate_of: IDL.Nat64 }),
        TxCreatedInFuture: IDL.Null,
        InsufficientFunds: IDL.Record({ balance: Tokens }),
    });

    const AccountBalanceArgs = IDL.Record({
        account: AccountIdentifier,
    });

    return IDL.Service({
        transfer: IDL.Func([TransferArgs], [IDL.Variant({ Ok: IDL.Nat64, Err: TransferError })], []),
        account_balance: IDL.Func([AccountBalanceArgs], [Tokens], ['query']),
    });
};

// Create ledger actor with given agent
const createLedgerActor = (agent: any) => {
    return Actor.createActor(ledgerIdlFactory, {
        agent,
        canisterId: ICP_LEDGER_CANISTER_ID!,
    });
};

export const useBalance = () => {
    const { principal, isAuthenticated } = useIdentityKitAuth();
    const identityKitAgent = useAgent();
    const [balance, setBalance] = useState<bigint>(BigInt(0));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const anonymousAgentRef = useRef<HttpAgent | null>(null);

    // Create anonymous agent for query calls (balance checks)
    useEffect(() => {
        const createAnonymousAgent = async () => {
            const agent = await HttpAgent.create({ host });
            if (import.meta.env.DFX_NETWORK !== 'ic') {
                await agent.fetchRootKey();
            }
            anonymousAgentRef.current = agent;
        };
        createAnonymousAgent();
    }, []);

    const fetchBalance = useCallback(async () => {
        if (!principal) return;

        if (!ICP_LEDGER_CANISTER_ID) {
            console.error('Missing CANISTER_ID_ICP_LEDGER_CANISTER; cannot query ICP ledger balance');
            setError('Ledger canister id is not configured');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Use anonymous agent for balance query (doesn't need auth)
            const agent = anonymousAgentRef.current;
            if (!agent) return;

            const ledgerActor: any = createLedgerActor(agent);
            const accountId = principalToAccountIdentifier(principal);
            const result = await ledgerActor.account_balance({ account: Array.from(accountId) });
            setBalance(BigInt(result.e8s));
        } catch (err) {
            console.error('Failed to fetch ledger balance:', err);
            setError('Failed to fetch ledger balance');
        } finally {
            setLoading(false);
        }
    }, [principal]);

    useEffect(() => {
        if (isAuthenticated && principal && anonymousAgentRef.current) {
            fetchBalance();
        }
    }, [isAuthenticated, principal, fetchBalance]);

    // Also fetch balance when anonymous agent becomes available
    useEffect(() => {
        const interval = setInterval(() => {
            if (isAuthenticated && principal && anonymousAgentRef.current) {
                fetchBalance();
                clearInterval(interval);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [isAuthenticated, principal, fetchBalance]);

    // Transfer ICP to the backend canister (requires authenticated agent)
    const transferToBackend = async (amount: bigint, memo: bigint): Promise<bigint> => {
        if (!identityKitAgent || !isAuthenticated || !principal) {
            throw new Error('Please connect your wallet first');
        }

        setLoading(true);
        setError(null);

        try {
            // Ensure root key is fetched for local development
            await ensureRootKeyFetched(identityKitAgent);

            const backendCanisterId = import.meta.env.CANISTER_ID_BACKEND;
            if (!backendCanisterId) {
                throw new Error('Backend canister ID not found');
            }

            // Get treasury account from backend
            const backendActor: any = Actor.createActor(backendIdl, {
                agent: identityKitAgent,
                canisterId: backendCanisterId,
            });

            const treasuryResult: any = await backendActor.getTreasuryAccountId();

            if (!treasuryResult || treasuryResult.length === 0) {
                throw new Error('Treasury account not configured on backend. Please contact admin.');
            }

            const treasuryAccountId = new Uint8Array(treasuryResult[0]);

            const ledgerActor: any = createLedgerActor(identityKitAgent);

            const transferResult = await ledgerActor.transfer({
                to: Array.from(treasuryAccountId),
                fee: { e8s: ICP_FEE },
                memo,
                from_subaccount: [],
                created_at_time: [],
                amount: { e8s: amount },
            });

            if ('Err' in transferResult) {
                // Handle ledger errors which may contain BigInt values
                const err = transferResult.Err;

                // Check for InsufficientFunds error
                if (err.InsufficientFunds) {
                    const balance = err.InsufficientFunds.balance?.e8s || BigInt(0);
                    const balanceICP = Number(balance) / 100_000_000;
                    throw new Error(`Insufficient balance. You have ${balanceICP.toFixed(8)} ICP`);
                }

                // Handle other error types
                if (err.BadFee) {
                    throw new Error('Transaction fee mismatch. Please try again.');
                }
                if (err.TxTooOld) {
                    throw new Error('Transaction expired. Please try again.');
                }
                if (err.TxCreatedInFuture) {
                    throw new Error('Transaction timestamp error. Please try again.');
                }
                if (err.TxDuplicate) {
                    throw new Error('Duplicate transaction detected. Please try again.');
                }

                // Generic error fallback - convert BigInt to string manually
                const errorStr = Object.keys(err).map(key => {
                    const value = err[key];
                    if (typeof value === 'bigint') {
                        return `${key}: ${value.toString()}`;
                    }
                    return `${key}: ${value}`;
                }).join(', ');

                throw new Error('Transfer failed: ' + errorStr);
            }

            await fetchBalance();
            return transferResult.Ok;
        } catch (err: any) {
            console.error('Transfer error:', err);
            setError(err.message || 'Failed to transfer ICP');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const formatICP = (e8s: bigint): string => {
        const icp = Number(e8s) / 100_000_000;
        return icp.toFixed(8);
    };

    const parseICP = (icp: string): bigint => {
        const amount = parseFloat(icp) * 100_000_000;
        return BigInt(Math.floor(amount));
    };

    return {
        balance,
        formatICP,
        parseICP,
        transferToBackend,
        fetchBalance,
        loading,
        error,
    };
};
