import { BonsaiNFT } from '../hooks/useBonsai';

interface BonsaiViewerProps {
    bonsai: BonsaiNFT;
}

const Metadata = (({ bonsai }: BonsaiViewerProps) => {

    const formatDate = (timestamp: bigint) => {
        return new Date(Number(timestamp) / 1000000).toLocaleString();
    };

    return (
        <div className="card">
            <h2 className="text-2xl font-bold mb-4">Bonsai #{Number(bonsai.tokenId)}</h2>

            <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-400">Owner:</span>
                    <span className="text-primary truncate ml-4">{bonsai.owner.toString().slice(0, 12)}...</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-400">Growth Steps:</span>
                    <span className="text-secondary">{Number(bonsai.growthSteps)}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-400">Minted:</span>
                    <span className="text-xs">{formatDate(bonsai.mintedAt)}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-400">Last Watered:</span>
                    <span className="text-xs">{formatDate(bonsai.lastWatered)}</span>
                </div>
            </div>
        </div>
    )
});

export default Metadata
