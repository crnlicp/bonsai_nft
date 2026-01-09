import { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useIdentityKitAuth } from '../hooks/useIdentityKitAuth';
import { useBalance } from '../hooks/useBalance';
import WalletConnect from '../components/WalletConnect';
import { principalToAccountIdentifier, toHexString } from '../utils/ledger';
import toast from 'react-hot-toast';

const Wallet = () => {
    const { isAuthenticated, principal } = useIdentityKitAuth();
    const { balance, formatICP, loading, fetchBalance, transferToBackend } = useBalance();
    const [targetDecimals, setTargetDecimals] = useState('');
    const [adjusting, setAdjusting] = useState(false);

    // Calculate user's account identifier for receiving ICP
    const userAccountId = useMemo(() => {
        if (!principal) return null;
        try {
            const accountId = principalToAccountIdentifier(principal);
            return toHexString(accountId);
        } catch (err) {
            console.error('Failed to generate user account ID:', err);
            return null;
        }
    }, [principal]);

    // Poll balance every 10 seconds while this page is mounted and user is authenticated
    useEffect(() => {
        if (!isAuthenticated || !principal) return;

        // Trigger an immediate fetch and then poll
        fetchBalance();
        const id = setInterval(() => {
            fetchBalance();
        }, 10000);

        return () => clearInterval(id);
    }, [isAuthenticated, principal, fetchBalance]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
    };

    // Calculate the current decimal portion of balance
    const currentDecimals = useMemo(() => {
        const formatted = formatICP(balance);
        const parts = formatted.split('.');
        return parts.length > 1 ? parts[1] : '00000000';
    }, [balance, formatICP]);

    const handleDecimalAdjustment = async () => {
        if (!targetDecimals) {
            toast.error('Please enter target decimals');
            return;
        }

        if (targetDecimals.length > 8) {
            toast.error('Decimals must be 8 digits or less');
            return;
        }

        setAdjusting(true);
        try {
            const paddedTarget = targetDecimals.padEnd(8, '0');
            const currentE8s = balance;
            const currentWholePart = currentE8s / BigInt(100_000_000);
            const targetDecimalPart = BigInt(paddedTarget);
            const transferFee = BigInt(10_000); // 0.0001 ICP fee

            // Calculate the exact balance we want to achieve AFTER the transfer and fee
            const targetBalance = currentWholePart * BigInt(100_000_000) + targetDecimalPart;

            // We need to transfer enough so that after both transfer + fee are deducted, we have targetBalance
            // finalBalance = currentBalance - transferAmount - fee
            // targetBalance = currentBalance - transferAmount - fee
            // transferAmount = currentBalance - targetBalance - fee
            const transferAmount = currentE8s - targetBalance - transferFee;

            if (transferAmount <= 0) {
                toast.error('Cannot adjust upwards. Please add ICP to your wallet first.');
                setAdjusting(false);
                return;
            }

            // Minimum transfer is 0.0001 ICP (same as fee)
            const minTransfer = BigInt(10_000);
            if (transferAmount < minTransfer) {
                toast.error('Adjustment amount too small. Need at least 0.0002 ICP difference (0.0001 transfer + 0.0001 fee).');
                setAdjusting(false);
                return;
            }

            toast.loading('Adjusting balance decimals...');

            // Transfer to backend (which will adjust our balance)
            // Note: The fee will be deducted automatically, so final balance = current - transferAmount - fee
            await transferToBackend(transferAmount, BigInt(999)); // memo 999 for decimal adjustment

            toast.dismiss();
            toast.success('Balance decimals adjusted successfully!');
            setTargetDecimals('');
            await fetchBalance();
        } catch (error: any) {
            toast.dismiss();
            toast.error(error.message || 'Failed to adjust decimals');
        } finally {
            setAdjusting(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <>
                <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                    <p className="text-gray-400 mb-4">Please connect your wallet to view your balance</p>
                    <div className='inline-block'>
                        <WalletConnect />
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold mb-8">Wallet</h1>

                {/* ICP Balance */}
                <div className="card mb-8">
                    <h2 className="text-2xl font-bold mb-4">💰 ICP Balance</h2>
                    <div className="text-5xl font-mono text-green-400 mb-2">
                        {loading ? '...' : formatICP(balance)}
                    </div>
                    <div className="text-gray-400">ICP</div>
                </div>

                {/* Principal */}
                <div className="card mb-8">
                    <h3 className="text-lg font-bold mb-2">Your Principal</h3>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 font-mono text-sm bg-dark-bg px-4 py-2 rounded break-all">
                            {principal?.toString()}
                        </div>
                        <button
                            type="button"
                            onClick={() => copyToClipboard(principal?.toString() || '')}
                            className="btn-secondary px-3 py-2 text-sm whitespace-nowrap"
                        >
                            📋 Copy
                        </button>
                    </div>
                </div>

                {/* Account ID for receiving ICP */}
                <div className="card mb-8">
                    <h3 className="text-lg font-bold mb-2">Your Account ID</h3>
                    <p className="text-sm text-gray-400 mb-2">
                        Use this address to receive ICP from exchanges or other wallets
                    </p>
                    {userAccountId && (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 font-mono text-xs bg-dark-bg px-3 py-2 rounded break-all">
                                {userAccountId}
                            </div>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(userAccountId)}
                                className="btn-secondary px-3 py-2 text-sm whitespace-nowrap"
                            >
                                📋 Copy
                            </button>
                        </div>
                    )}
                </div>

                {/* Balance Decimal Adjuster */}
                <div className="card bg-gradient-to-r from-secondary/10 to-primary/10 border-2 border-secondary/30 mb-8">
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                        <span>🎯</span>
                        <span>Balance Decimal Adjuster</span>
                    </h3>
                    <p className="text-gray-300 text-sm mb-4">
                        Control your bonsai's growth direction by setting specific decimal values in your balance.
                        The decimals influence branch angles, direction, and growth patterns!
                    </p>

                    <div className="bg-dark-bg p-4 rounded-lg mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-gray-400 text-sm">Current Decimals:</span>
                            <span className="font-mono text-primary text-lg">.{currentDecimals}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            Your current balance: {formatICP(balance)} ICP
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-300">
                                Target Decimal Value (up to 8 digits)
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1 flex items-center bg-dark-bg rounded-lg px-4 py-2 border border-dark-border focus-within:border-primary">
                                    <span className="text-gray-400 mr-1">.</span>
                                    <input
                                        type="text"
                                        value={targetDecimals}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            if (val.length <= 8) {
                                                setTargetDecimals(val);
                                            }
                                        }}
                                        placeholder="12345678"
                                        className="flex-1 bg-transparent outline-none font-mono"
                                        maxLength={8}
                                    />
                                </div>
                                <button
                                    onClick={handleDecimalAdjustment}
                                    disabled={adjusting || !targetDecimals || loading}
                                    className="btn-primary px-6 whitespace-nowrap disabled:opacity-50"
                                >
                                    {adjusting ? 'Adjusting...' : 'Adjust'}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Example: Enter "50000000" to set decimals to .50000000
                            </p>
                        </div>

                        <div className="bg-primary/10 border border-primary/30 p-3 rounded-lg">
                            <p className="text-sm text-gray-300">
                                <strong className="text-primary">💡 How it works:</strong> This tool calculates
                                the exact transfer needed to achieve your desired decimal value, automatically
                                accounting for the 0.0001 ICP transaction fee. The transfer is made to the backend
                                treasury, and your balance will precisely match your target decimals after the transaction!
                            </p>
                        </div>

                        <div className="text-center">
                            <Link to="/about" className="text-sm text-secondary hover:underline">
                                Learn more about how decimals affect growth →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
                    <div className="flex gap-4">
                        <Link to="/my-bonsais" className="btn-primary flex-1 text-center">
                            🌳 My Bonsais
                        </Link>
                        <Link to="/gallery" className="btn-secondary flex-1 text-center">
                            🖼️ Gallery
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Wallet;
