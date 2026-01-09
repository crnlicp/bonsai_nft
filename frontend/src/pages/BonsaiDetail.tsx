import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useIdentityKitAuth } from '../hooks/useIdentityKitAuth';
import { useBonsai, BonsaiNFT, TokenMetadata } from '../hooks/useBonsai';
import { useBalance } from '../hooks/useBalance';
import BonsaiViewer from '../components/BonsaiViewer';
import ActionButtons from '../components/ActionButtons';
import Metadata from '@/components/Metadata';
import Statistics from '@/components/Statistics';

const BonsaiDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { principal, actor, actorLoading } = useIdentityKitAuth();
    const { getBonsaiDetails, waterBonsai } = useBonsai();
    const { balance, fetchBalance } = useBalance();
    const [bonsai, setBonsai] = useState<BonsaiNFT | null>(null);
    const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [initialLoad, setInitialLoad] = useState(true);
    const [autoGrowing, setAutoGrowing] = useState(false);
    const autoGrowIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shouldStopRef = useRef(false);

    useEffect(() => {
        // Wait for actor to be ready
        if (actorLoading || !actor) {
            setLoading(true);
            return;
        }

        loadBonsai();
        return () => {
            // Cleanup auto-grow on unmount
            shouldStopRef.current = true;
            if (autoGrowIntervalRef.current) {
                clearTimeout(autoGrowIntervalRef.current);
            }
        };
    }, [id, actor, actorLoading]);

    const loadBonsai = async () => {
        if (!id || !actor) return;

        // Only show full loading screen on initial load
        if (initialLoad) {
            setLoading(true);
        }
        const result = await getBonsaiDetails(BigInt(id));
        setBonsai(result);

        // Load metadata with canGrow field
        try {
            const myBonsais = await actor.getMyBonsais(principal!);
            const thisBonsai = myBonsais.find((b: any) => Number(b.tokenId) === Number(id));
            if (thisBonsai) {
                setMetadata({
                    tokenId: thisBonsai.tokenId,
                    name: thisBonsai.name,
                    description: thisBonsai.description,
                    image: thisBonsai.image,
                    properties: thisBonsai.properties
                });
            }
        } catch (e) {
            console.error('Failed to load metadata:', e);
        }

        // Refresh balance to ensure it's current
        await fetchBalance();

        setLoading(false);
        setInitialLoad(false);
    };

    const isOwner = principal && bonsai && principal.toString() === bonsai.owner.toString();

    const handleAutoGrow = async () => {
        if (!id || !actor || !principal) return;

        if (autoGrowing) {
            // Stop auto-grow
            shouldStopRef.current = true;
            setAutoGrowing(false);
            if (autoGrowIntervalRef.current) {
                clearTimeout(autoGrowIntervalRef.current);
                autoGrowIntervalRef.current = null;
            }
            toast.success('Auto-grow stopped');
            return;
        }

        // Start auto-grow
        shouldStopRef.current = false;
        setAutoGrowing(true);
        toast.success('Auto-grow started! Watering with random costs until maximum height...');

        const runAutoGrowCycle = async (): Promise<void> => {
            // Check if we should stop before each cycle
            if (shouldStopRef.current) {
                setAutoGrowing(false);
                return;
            }

            try {
                // Generate random cost between 0.01000000 and 0.01999999 ICP (1,000,000 to 1,999,999 e8s)
                const minCost = 1_000_000;
                const maxCost = 1_999_999;
                const randomCost = BigInt(Math.floor(Math.random() * (maxCost - minCost + 1)) + minCost);

                // Water the tree with random cost
                await waterBonsai(BigInt(id), randomCost);

                // Refresh balance after watering
                await fetchBalance();

                // Reload to show changes and get updated metadata
                await loadBonsai();

                // Check if we should stop again after async operations
                if (shouldStopRef.current) {
                    setAutoGrowing(false);
                    return;
                }

                // Check if tree can still grow (AFTER watering)
                const currentMeta = await actor.getMyBonsais(principal);
                const thisBonsai = currentMeta.find((b: any) => Number(b.tokenId) === Number(id));

                if (!thisBonsai?.properties?.canGrow) {
                    // Tree reached maximum height after this water
                    shouldStopRef.current = true;
                    setAutoGrowing(false);
                    toast.success('🌳 Tree has reached maximum height!');
                    return;
                }

                // Wait 300ms before next cycle
                await new Promise(resolve => setTimeout(resolve, 300));

                // Check again before scheduling next cycle
                if (shouldStopRef.current) {
                    setAutoGrowing(false);
                    return;
                }

                // Schedule next cycle
                autoGrowIntervalRef.current = setTimeout(runAutoGrowCycle, 0) as any;
            } catch (error: any) {
                console.error('Auto-grow error:', error);
                shouldStopRef.current = true;
                setAutoGrowing(false);
                if (autoGrowIntervalRef.current) {
                    clearTimeout(autoGrowIntervalRef.current);
                    autoGrowIntervalRef.current = null;
                }
                toast.error('Auto-grow failed: ' + error.message);
            }
        };

        // Start first cycle
        runAutoGrowCycle();
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {loading ? (
                <div className="text-center py-20 text-gray-400">Loading bonsai...</div>
            ) : !bonsai ? (
                <div className="text-center py-20">
                    <p className="text-gray-400 mb-4">Bonsai not found</p>
                    <Link to="/gallery" className="btn-primary">
                        Back to Gallery
                    </Link>
                </div>
            ) : (
                <>
                    <div className="grid md:grid-cols-3 gap-8 items-start">
                        <div className="md:col-span-2">
                            <BonsaiViewer bonsai={bonsai} />
                        </div>
                        <div className='md:col-span-1 space-y-6'>
                            <ActionButtons
                                tokenId={bonsai.tokenId}
                                isOwner={!!isOwner}
                                onUpdate={loadBonsai}
                                canGrow={metadata?.properties?.canGrow ?? true}
                                externalBalance={balance}
                                onFetchBalance={fetchBalance}
                                onAutoGrow={handleAutoGrow}
                                autoGrowing={autoGrowing}
                            />

                            {/* Auto-Grow Info */}
                            {isOwner && autoGrowing && (
                                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                    <p className="text-xs text-amber-400 text-center">
                                        🚀 Auto-growing: Each watering costs a random amount between 0.01000000 and 0.01999999 ICP
                                    </p>
                                </div>
                            )}
                            {isOwner && !autoGrowing && (metadata?.properties?.canGrow ?? true) && (
                                <div className="mt-4 p-3 bg-dark-card border border-dark-border rounded-lg">
                                    <p className="text-xs text-gray-400 text-center">
                                        💡 Auto-grow will water your tree repeatedly until it reaches maximum height. Each watering costs a random amount between 0.01000000 and 0.01999999 ICP.
                                    </p>
                                </div>
                            )}
                            <Metadata bonsai={bonsai} />
                            <Statistics />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default BonsaiDetail;
