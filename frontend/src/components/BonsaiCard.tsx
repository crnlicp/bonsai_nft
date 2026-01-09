import { Link } from 'react-router-dom';
import { TokenMetadata } from '../hooks/useBonsai';

interface BonsaiCardProps {
    metadata: TokenMetadata;
}

const BonsaiCard = ({ metadata }: BonsaiCardProps) => {
    // Check if image is SVG content or URL
    const isSvgContent = metadata.image.trim().startsWith('<svg') || metadata.image.trim().startsWith('<?xml');

    return (
        <Link to={`/bonsai/${metadata.tokenId}`}>
            <div className="card hover:border-primary transition-all duration-300 cursor-pointer">
                <div className="aspect-square bg-dark-bg rounded-lg mb-4 overflow-hidden flex items-center justify-center">
                    {isSvgContent ? (
                        <div
                            className="w-full h-full"
                            dangerouslySetInnerHTML={{ __html: metadata.image }}
                        />
                    ) : (
                        <img
                            src={metadata.image}
                            alt={metadata.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                // Fallback: try to load as embedded SVG from backend
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                            }}
                        />
                    )}
                </div>

                <h3 className="text-xl font-bold mb-2">{metadata.name}</h3>

                <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                    <div>
                        <span className="text-gray-400">Score:</span>
                        <span className="ml-2 text-primary">{Number(metadata.properties.score)}/100</span>
                    </div>
                    <div>
                        <span className="text-gray-400">Age:</span>
                        <span className="ml-2">{Number(metadata.properties.age)}</span>
                    </div>
                    <div>
                        <span className="text-gray-400">Branches:</span>
                        <span className="ml-2">{Number(metadata.properties.branches)}</span>
                    </div>
                    <div>
                        <span className="text-gray-400">Foliage:</span>
                        <span className="ml-2 text-green-400">{Number(metadata.properties.foliage)}</span>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-dark-border text-xs text-gray-500 font-mono">
                    Steps: {Number(metadata.properties.growthSteps)}
                </div>
            </div>
        </Link>
    );
};

export default BonsaiCard;
