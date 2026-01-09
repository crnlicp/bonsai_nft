import { useState } from 'react';
import toast from 'react-hot-toast';
import { useBonsai } from '../hooks/useBonsai';
import { useBalance } from '../hooks/useBalance';

interface ActionButtonsProps {
    tokenId: bigint;
    isOwner: boolean;
    onUpdate?: () => void;
    canGrow?: boolean;
    externalBalance?: bigint;
    onFetchBalance?: () => Promise<void>;
    onAutoGrow?: () => void;
    autoGrowing?: boolean;
}

// Confirm Modal Component
const ConfirmModal = ({
    isOpen,
    title,
    message,
    confirmText,
    onConfirm,
    onCancel,
    loading
}: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onCancel}
            />
            {/* Modal */}
            <div className="relative bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-gray-400 mb-6">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 bg-dark-bg hover:bg-dark-border text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ActionButtons = ({ tokenId, isOwner, onUpdate, canGrow = true, externalBalance, onFetchBalance, onAutoGrow, autoGrowing = false }: ActionButtonsProps) => {
    const { waterBonsai, burnBonsai, transferBonsai, loading } = useBonsai();
    const { balance: hookBalance, formatICP, fetchBalance: hookFetchBalance } = useBalance();
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showBurnModal, setShowBurnModal] = useState(false);
    const [recipient, setRecipient] = useState('');
    const [error, setError] = useState('');
    const [burning, setBurning] = useState(false);
    const [transferring, setTransferring] = useState(false);

    // Use external balance if provided, otherwise fall back to hook balance
    const balance = externalBalance !== undefined ? externalBalance : hookBalance;
    const fetchBalance = onFetchBalance || hookFetchBalance;

    const handleWater = async () => {
        try {
            setError('');
            await waterBonsai(tokenId);
            toast.success('Bonsai watered successfully! 🌱');
            // Refresh balance after watering
            await fetchBalance();
            // Reload to get updated canGrow status
            onUpdate?.();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleTransfer = async () => {
        if (!recipient) {
            setError('Please enter a recipient principal');
            return;
        }

        try {
            setError('');
            setTransferring(true);
            toast.loading('Transferring NFT...', { id: 'transfer' });
            await transferBonsai(tokenId, recipient);
            toast.success('Transfer successful! NFT sent to new owner.', { id: 'transfer' });
            setShowTransferModal(false);
            setTimeout(() => {
                window.location.href = '/my-bonsais';
            }, 1500);
        } catch (err: any) {
            toast.error('Transfer failed: ' + err.message, { id: 'transfer' });
            setError(err.message);
            setTransferring(false);
        }
    };

    const handleBurn = async () => {
        try {
            setError('');
            setBurning(true);
            toast.loading('Burning your Bonsai...', { id: 'burn' });
            await burnBonsai(tokenId);
            toast.success('🔥 Bonsai burned successfully! It has returned to the earth.', { id: 'burn' });
            setShowBurnModal(false);
            setTimeout(() => {
                window.location.href = '/my-bonsais';
            }, 1500);
        } catch (err: any) {
            toast.error('Failed to burn: ' + (err.message || 'Unknown error'), { id: 'burn' });
            setError(err.message);
            setBurning(false);
        }
    };

    // If not owner, only show share and view buttons
    if (!isOwner) {
        return (
            <div className="card space-y-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Actions</h3>
                </div>

                {/* Share Button */}
                <button
                    onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success('Link copied to clipboard!');
                    }}
                    className="border border-dark-border hover:border-primary text-white font-semibold py-2 px-6 rounded-lg w-full transition"
                >
                    🔗 Share
                </button>

                {/* View On-chain Button */}
                <button
                    onClick={() => {
                        const canisterId = import.meta.env.CANISTER_ID_BACKEND || "";
                        const isLocal = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1';
                        const svgUrl = isLocal
                            ? `http://${canisterId}.raw.localhost:4943/nft/${tokenId}.svg`
                            : `https://${canisterId}.raw.icp0.io/nft/${tokenId}.svg`;
                        window.open(svgUrl, '_blank');
                    }}
                    className="border border-dark-border hover:border-primary text-white font-semibold py-2 px-6 rounded-lg w-full transition"
                >
                    🌐 View Bonsai On-chain
                </button>
            </div>
        );
    }

    return (
        <div className="card space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Actions</h3>
                <div className="text-sm font-mono text-primary">
                    💰 {formatICP(balance)} ICP
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded">
                    {error}
                </div>
            )}

            {/* Water Button */}
            <div>
                <button
                    onClick={handleWater}
                    disabled={loading || !canGrow}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    💧 Water My Bonsai - 0.01111000 ICP
                </button>
                {!canGrow && (
                    <p className="text-xs text-amber-500 mt-2">
                        🌳 Tree has reached maximum height!
                    </p>
                )}
            </div>

            {/* Transfer Button */}
            <div>
                <button
                    onClick={() => setShowTransferModal(true)}
                    className="btn-secondary w-full"
                >
                    📤 Transfer
                </button>
            </div>

            {/* Auto-Grow Button */}
            <div>
                <button
                    onClick={onAutoGrow}
                    disabled={!autoGrowing && !canGrow}
                    className={`w-full font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${autoGrowing
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                >
                    {autoGrowing ? '⏸️ Stop Auto-Grow' : '🚀 Auto-Grow Tree'}
                </button>
            </div>

            {/* Burn Button */}
            <div>
                <button
                    onClick={() => setShowBurnModal(true)}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg w-full transition"
                >
                    🔥 Burn
                </button>
            </div>

            {/* Burn Confirmation Modal */}
            <ConfirmModal
                isOpen={showBurnModal}
                title="🔥 Burn Bonsai"
                message="Are you sure you want to burn this bonsai? This action is permanent and cannot be undone. Your bonsai will be destroyed forever."
                confirmText="Burn Forever"
                onConfirm={handleBurn}
                onCancel={() => setShowBurnModal(false)}
                loading={burning}
            />

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => {
                            setShowTransferModal(false);
                            setRecipient('');
                            setError('');
                        }}
                    />
                    {/* Modal */}
                    <div className="relative bg-dark-card border border-dark-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-3">📤 Transfer NFT</h3>
                        <p className="text-gray-400 mb-4">Enter the recipient's principal ID to transfer this bonsai.</p>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded mb-4 text-sm">
                                {error}
                            </div>
                        )}

                        <input
                            type="text"
                            placeholder="Recipient Principal ID"
                            value={recipient}
                            onChange={(e) => {
                                setRecipient(e.target.value);
                                setError('');
                            }}
                            className="input w-full mb-4"
                            disabled={transferring}
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowTransferModal(false);
                                    setRecipient('');
                                    setError('');
                                }}
                                disabled={transferring}
                                className="flex-1 bg-dark-bg hover:bg-dark-border text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleTransfer}
                                disabled={transferring || !recipient}
                                className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                            >
                                {transferring ? 'Transferring...' : 'Transfer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Button */}
            <button
                onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copied to clipboard!');
                }}
                className="border border-dark-border hover:border-primary text-white font-semibold py-2 px-6 rounded-lg w-full transition"
            >
                🔗 Share
            </button>

            {/* View On-chain Button */}
            <button
                onClick={() => {
                    const canisterId = import.meta.env.CANISTER_ID_BACKEND || "";
                    const isLocal = window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1';
                    const svgUrl = isLocal
                        ? `http://${canisterId}.raw.localhost:4943/nft/${tokenId}.svg`
                        : `https://${canisterId}.raw.icp0.io/nft/${tokenId}.svg`;
                    window.open(svgUrl, '_blank');
                }}
                className="border border-dark-border hover:border-primary text-white font-semibold py-2 px-6 rounded-lg w-full transition"
            >
                🌐 View Bonsai On-chain
            </button>
        </div>
    );
};

export default ActionButtons;
