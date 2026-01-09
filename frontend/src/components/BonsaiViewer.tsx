import { BonsaiNFT } from '../hooks/useBonsai';

interface BonsaiViewerProps {
    bonsai: BonsaiNFT;
}

const BonsaiViewer = ({ bonsai }: BonsaiViewerProps) => {
    return (
        <div className="card">
            <div
                className="aspect-square bg-dark-bg rounded-lg overflow-hidden"
                dangerouslySetInnerHTML={{ __html: bonsai.cachedSVG }}
            />
        </div>
    );
};

export default BonsaiViewer;
