import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useIdentityKitAuth } from '../hooks/useIdentityKitAuth';
import { useBonsai, TokenMetadata } from '../hooks/useBonsai';
import BonsaiCard from '../components/BonsaiCard';
import WalletConnect from '../components/WalletConnect';

const MyBonsais = () => {
    const { isAuthenticated, principal, loading: authLoading, actor, actorLoading } = useIdentityKitAuth();
    const { getMyBonsais } = useBonsai();
    const [bonsais, setBonsais] = useState<TokenMetadata[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Wait for auth and actor to finish loading
        if (authLoading || actorLoading) {
            setLoading(true);
            return;
        }

        // If not authenticated, stop loading
        if (!isAuthenticated || !principal || !actor) {
            setLoading(false);
            return;
        }

        const loadMyBonsais = async () => {
            setLoading(true);
            try {
                const result = await getMyBonsais();
                setBonsais(result);
            } catch (error) {
                console.error('Failed to load my bonsais:', error);
            }
            setLoading(false);
        };

        loadMyBonsais();
        // Only depend on auth state and actor - getMyBonsais is stable through actor
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, principal, authLoading, actorLoading, actor]);

    if (!isAuthenticated) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <p className="text-gray-400 mb-4">Please connect your wallet to view your bonsais</p>
                <div className='inline-block'>
                    <WalletConnect />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold mb-8">My Bonsais</h1>

                {loading ? (
                    <div className="text-center py-20 text-gray-400">Loading your bonsais...</div>
                ) : bonsais.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-400 mb-4">You don't have any bonsais yet!</p>
                        <Link to="/" className="btn-primary">
                            Mint Your First Bonsai
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {bonsais.map((bonsai) => (
                            <BonsaiCard key={Number(bonsai.tokenId)} metadata={bonsai} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyBonsais;
