import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useIdentityKitAuth } from '../hooks/useIdentityKitAuth';
import { useBonsai } from '../hooks/useBonsai';
import { useBalance } from '../hooks/useBalance';
import WalletConnect from '../components/WalletConnect';

const Home = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useIdentityKitAuth();
    const { mintBonsai, loading } = useBonsai();
    const { balance, formatICP } = useBalance();
    const [error, setError] = useState('');

    const handleMint = async () => {
        if (!isAuthenticated) {
            toast.error('Please connect your wallet first');
            return;
        }

        try {
            setError('');
            const tokenId = await mintBonsai();
            // Redirect to My Bonsais page instead of directly to bonsai detail
            // This avoids race condition where ownership hasn't been indexed yet
            toast.success('🌱 Bonsai minted successfully! View it in My Bonsais.');
            navigate('/my-bonsais');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <>
            {/* Hero Section */}
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <h2 className="text-5xl font-bold mb-6">
                    Grow Your Digital Bonsai
                </h2>
                <p className="text-xl text-gray-400 mb-8">
                    Mint a unique, procedurally-generated bonsai tree NFT on the Internet Computer.
                    Water it to watch it grow!
                </p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-6">
                        {error}
                    </div>
                )}

                {isAuthenticated ? (
                    <div className="space-y-4">
                        <div className="text-gray-400">
                            Your Balance: <span className="text-primary font-mono">{formatICP(balance)} ICP</span>
                        </div>
                        <button
                            onClick={handleMint}
                            disabled={loading}
                            className="btn-primary text-xl py-4 px-12"
                        >
                            {loading ? 'Minting...' : '🌱 Mint Me a Bonsai - 1 ICP'}
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center space-y-6">
                        <p className="text-gray-400">Connect your wallet to get started</p>
                        <div className="transform scale-125">
                            <WalletConnect />
                        </div>
                    </div>
                )}
            </div>

            {/* Features Section */}
            <div className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="card text-center">
                    <div className="text-4xl mb-4">🎨</div>
                    <h3 className="text-xl font-bold mb-2">Unique Generation</h3>
                    <p className="text-gray-400">
                        Each bonsai is procedurally generated based on your wallet balance at mint time
                    </p>
                </div>

                <div className="card text-center">
                    <div className="text-4xl mb-4">💧</div>
                    <h3 className="text-xl font-bold mb-2">Watch It Grow</h3>
                    <p className="text-gray-400">
                        Water your bonsai to add new branches and foliage
                    </p>
                </div>

                <div className="card text-center">
                    <div className="text-4xl mb-4">🔗</div>
                    <h3 className="text-xl font-bold mb-2">Fully On-Chain</h3>
                    <p className="text-gray-400">
                        All artwork and metadata stored directly on the Internet Computer
                    </p>
                </div>

                <div className="card text-center">
                    <div className="text-4xl mb-4">👛</div>
                    <h3 className="text-xl font-bold mb-2">Live in Your Wallet</h3>
                    <p className="text-gray-400">
                        Dynamic NFT artwork that updates automatically as your bonsai grows
                    </p>
                </div>
            </div>
        </>
    );
};

export default Home;
