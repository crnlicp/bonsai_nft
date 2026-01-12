import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useIdentityKitAuth } from '../hooks/useIdentityKitAuth';
import { useBonsai, TokenMetadata } from '../hooks/useBonsai';
import BonsaiCard from '../components/BonsaiCard';

const Gallery = () => {
    const { getGallery } = useBonsai();
    const { queryActor } = useIdentityKitAuth();
    const [bonsais, setBonsais] = useState<TokenMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const pageSize = 20;

    useEffect(() => {
        // Wait for the anonymous query actor (read-only calls shouldn't depend on wallet init)
        if (!queryActor) {
            setLoading(true);
            return;
        }

        const loadGallery = async () => {
            setLoading(true);
            try {
                const result = await getGallery(BigInt(page * pageSize), BigInt(pageSize));
                setBonsais(result);
            } catch (error) {
                console.error('Failed to load gallery:', error);
            }
            setLoading(false);
        };

        loadGallery();
        // Only depend on page and queryActor - getGallery is stable through hook
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, queryActor]);

    return (
        <>
            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold mb-8">Gallery</h1>

                {loading ? (
                    <div className="text-center py-20 text-gray-400">Loading bonsais...</div>
                ) : bonsais.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-400 mb-4">No bonsais minted yet!</p>
                        <Link to="/" className="btn-primary">
                            Mint the First One
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {bonsais.map((bonsai) => (
                                <BonsaiCard key={Number(bonsai.tokenId)} metadata={bonsai} />
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="flex justify-center gap-4 mt-8">
                            <button
                                onClick={() => setPage(Math.max(0, page - 1))}
                                disabled={page === 0}
                                className="btn-secondary disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="py-2 px-4 text-gray-400">Page {page + 1}</span>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={bonsais.length < pageSize}
                                className="btn-secondary disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default Gallery;
