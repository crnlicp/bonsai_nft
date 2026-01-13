import { Link } from 'react-router-dom';

const About = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-8">About ICP Bonsai NFT</h1>

            {/* What is Bonsai NFT */}
            <section className="card mb-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">🌳 What is ICP Bonsai NFT?</h2>
                <p className="text-gray-300 mb-4">
                    ICP Bonsai NFT is a fully on-chain, dynamic NFT platform built on the Internet Computer blockchain.
                    Each bonsai tree is a unique, living digital art piece that grows and evolves over time based on
                    your interactions and wallet balance.
                </p>
                <p className="text-gray-300">
                    Unlike traditional NFTs where the artwork is static, your Bonsai NFT is procedurally generated
                    and updated in real-time. The artwork, metadata, and growth algorithms are stored entirely on-chain,
                    making it truly decentralized and permanent.
                </p>
            </section>

            {/* How It Works */}
            <section className="card mb-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">⚙️ How It Works</h2>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-xl font-semibold mb-2 text-secondary">1. Minting Your Bonsai</h3>
                        <p className="text-gray-300 mb-2">
                            <strong>Cost:</strong> 1 ICP
                        </p>
                        <p className="text-gray-300">
                            When you mint a bonsai, the system captures your wallet balance decimals and uses them
                            as a seed for procedural generation. Every bonsai is unique based on your balance's 8 decimal
                            values, which determine the initial tree structure, trunk curvature, and growth characteristics.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-xl font-semibold mb-2 text-secondary">2. Watering & Growth</h3>
                        <p className="text-gray-300 mb-2">
                            <strong>Cost:</strong> 0.01111000 ICP per watering
                        </p>
                        <p className="text-gray-300 mb-3">
                            Each time you water your bonsai, it grows one step based on your current wallet balance decimals:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                            <li>Adds new branches, extends the trunk, or spawns foliage</li>
                            <li>Growth pattern is controlled by your balance's 8 decimal positions</li>
                            <li>Updates the on-chain SVG artwork and metadata automatically</li>
                            <li>Changes are visible immediately in your wallet and NFT viewers</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xl font-semibold mb-2 text-secondary">3. Auto-Growing Feature</h3>
                        <p className="text-gray-300">
                            For rapid growth, use the auto-grow feature to water your bonsai automatically every few seconds.
                            Auto-growing continues as long as you maintain sufficient ICP balance. Each auto-grow step costs
                            a randomized amount between 0.01000000 and 0.01999999 ICP to produce varied growth patterns.
                        </p>
                    </div>
                </div>
            </section>

            {/* Growing & Branching Algorithm */}
            <section className="card mb-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">🌿 Growing, Branching & Algorithm</h2>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-xl font-semibold mb-2 text-secondary">How Decimals Control Growth</h3>
                        <p className="text-gray-300 mb-3">
                            Your ICP balance has 8 decimal positions (0.12345678). Each position controls a specific aspect
                            of tree development:
                        </p>
                        <div className="bg-dark-bg p-4 rounded-lg space-y-2">
                            <div>
                                <p className="text-gray-200 font-semibold mb-1">Position 1 (0.X_______): Trunk Curvature</p>
                                <p className="text-gray-400 text-sm">
                                    Values 0-4 curve trunk left, 5-9 curve right.
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-200 font-semibold mb-1">Position 2 (0._X______): Curve Change Frequency</p>
                                <p className="text-gray-400 text-sm">
                                    Controls how often the trunk switches curve direction (every 3-10 steps).
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-200 font-semibold mb-1">Position 3 (0.__X_____): Branch Spawn Rate</p>
                                <p className="text-gray-400 text-sm">
                                    Determines branch spawning probability (50-125%). Higher values create more branches.
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-200 font-semibold mb-1">Position 4 (0.___X____): Branch Direction</p>
                                <p className="text-gray-400 text-sm">
                                    Values 0-4 make branches grow left, 5-9 make them grow right.
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-200 font-semibold mb-1">Position 5 (0.____X___): Branch Length</p>
                                <p className="text-gray-400 text-sm">
                                    Controls how long branches grow (10-23 units). Higher values create longer branches.
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-200 font-semibold mb-1">Position 6 (0._____X__): Leaf Density</p>
                                <p className="text-gray-400 text-sm">
                                    Affects foliage cloud size and leaf count (3-10 per cloud). Higher values = bushier canopy.
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-200 font-semibold mb-1">Position 7 (0.______X_): Trunk Thickness</p>
                                <p className="text-gray-400 text-sm">
                                    Controls thickening probability (15-45% based on height). Higher values create thicker trunks.
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-200 font-semibold mb-1">Position 8 (0._______X): Branch Angle</p>
                                <p className="text-gray-400 text-sm">
                                    Values 0-2 keep branches horizontal, 3-9 allow upward growth.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xl font-semibold mb-2 text-secondary">🌳 Growth Algorithm Process</h3>
                        <p className="text-gray-300 mb-3">
                            When you water your bonsai, the algorithm executes one growth step:
                        </p>
                        <ol className="list-decimal list-inside text-gray-300 space-y-2 ml-4">
                            <li><strong>Decimal Extraction:</strong> Your 8-digit decimal value is mapped to growth parameters</li>
                            <li><strong>Trunk Growth:</strong> Main trunk extends upward with curvature (positions 1-2), spawning side branches (position 3)</li>
                            <li><strong>Branch Direction:</strong> Each new branch's horizontal direction is determined by position 4</li>
                            <li><strong>Branch Development:</strong> Branch length (position 5) and angle (position 8) control extension</li>
                            <li><strong>Sub-branching:</strong> Existing branches probabilistically spawn secondary branches</li>
                            <li><strong>Foliage Generation:</strong> When branches complete, they spawn leaf clouds (density: position 6)</li>
                            <li><strong>Trunk Thickening:</strong> Every 3 steps, trunk thickens based on position 7 and height</li>
                        </ol>
                        <p className="text-gray-300 mt-3">
                            This deterministic process ensures the same decimal values always produce the same growth pattern,
                            allowing deliberate crafting of your tree's appearance through strategic balance adjustments.
                        </p>
                    </div>

                    <div className="bg-secondary/10 border border-secondary/30 p-3 rounded-lg">
                        <p className="text-gray-300 text-sm">
                            <strong className="text-secondary">Example:</strong> A balance of <strong>1.54327658 ICP</strong> creates:
                            trunk curving right (5), frequent curve changes (4), moderate branch spawning (3), leftward branches (2),
                            long branches (7), dense foliage (6), thick trunk (5), and upward-reaching branches (8).
                        </p>
                    </div>
                </div>
            </section>

            {/* Controlling Growth Direction */}
            <section className="card mb-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">🧭 Controlling Growth Direction</h2>
                <p className="text-gray-300 mb-4">
                    You can influence your bonsai's growth pattern by adjusting your wallet balance decimals!
                    Each of the 8 decimal positions controls different aspects of growth (see section above).
                </p>

                <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">💡 Balance Decimal Adjuster Tool</h3>
                    <p className="text-gray-300 mb-2">
                        Visit the <Link to="/wallet" className="text-primary hover:underline font-semibold">Wallet page</Link> to
                        use our Balance Decimal Adjuster tool:
                    </p>
                    <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4 mb-2">
                        <li>Enter your desired 8-digit decimal value (e.g., .54327658)</li>
                        <li>Automatically calculates and executes the precise transfer needed</li>
                        <li>Accounts for the 0.0001 ICP transaction fee</li>
                        <li>Achieve exact control over your next growth pattern</li>
                    </ul>
                    <p className="text-gray-300 text-sm mt-2">
                        <strong>Strategy tip:</strong> Want symmetrical growth? Use balanced values (around 5 for positions 1 and 4).
                        Want dramatic, spreading trees? Use high values for branch length (position 5) and leaf density (position 6).
                    </p>
                </div>
            </section>

            {/* Scoring System */}
            <section className="card mb-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">⭐ Scoring System</h2>
                <p className="text-gray-300 mb-3">
                    Your bonsai earns a score (0-100) based on three components, calculated automatically on-chain:
                </p>
                <div className="bg-dark-bg p-4 rounded-lg space-y-3">
                    <div>
                        <p className="text-gray-200 font-semibold mb-1">
                            <strong className="text-green-400">Age Score</strong> (max 30 points)
                        </p>
                        <p className="text-gray-400 text-sm">
                            Based on total growth pixels divided by 5. Maximum score when tree reaches 15% of the 32×32 grid.
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-200 font-semibold mb-1">
                            <strong className="text-green-400">Branch Score</strong> (max 35 points)
                        </p>
                        <p className="text-gray-400 text-sm">
                            Counts all branch pixels. Maximum score achieved at approximately 27 branches (85% of grid height).
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-200 font-semibold mb-1">
                            <strong className="text-green-400">Foliage Score</strong> (max 35 points)
                        </p>
                        <p className="text-gray-400 text-sm">
                            Counts all leaf pixels. Maximum score when foliage reaches 13% of the grid area.
                        </p>
                    </div>
                </div>
                <p className="text-gray-300 mt-3">
                    The score updates automatically with each watering and is displayed on your NFT's SVG artwork.
                    Higher scores indicate more mature, complex trees.
                </p>
            </section>

            {/* Fully On-Chain */}
            <section className="card mb-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">🔗 Fully On-Chain Architecture</h2>
                <p className="text-gray-300 mb-4">
                    Every aspect of your Bonsai NFT lives on the Internet Computer blockchain:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                    <li><strong>Artwork:</strong> SVG dynamically generated and stored on-chain</li>
                    <li><strong>Metadata:</strong> All properties, scores, and growth history in canister storage</li>
                    <li><strong>Logic:</strong> Growth algorithms execute in Motoko smart contracts</li>
                    <li><strong>Assets:</strong> No external storage, IPFS, or centralized services</li>
                </ul>
                <p className="text-gray-300 mt-4">
                    Your bonsai will exist as long as the Internet Computer exists, with zero external dependencies.
                    It's truly permanent, decentralized digital art.
                </p>
            </section>

            {/* Costs Summary */}
            <section className="card bg-gradient-to-r from-primary/5 to-secondary/5 border-2 border-primary/30">
                <h2 className="text-2xl font-bold mb-4 text-primary">💰 Cost Summary</h2>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-300 font-semibold">Minting a new Bonsai:</span>
                        <span className="text-green-400 font-mono text-lg">1.0 ICP</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-300 font-semibold">Watering (each time):</span>
                        <span className="text-green-400 font-mono text-lg">0.01111000 ICP</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-300 font-semibold">Auto-grow (randomized):</span>
                        <span className="text-gray-400 font-mono text-sm">0.01000000 - 0.01999999 ICP</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-300 font-semibold">Balance adjustment (varies):</span>
                        <span className="text-gray-400 font-mono text-sm">Minimal transaction fees</span>
                    </div>
                </div>
            </section>

            {/* Wallet Compatibility */}
            <section className="card mb-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">👛 Wallet Compatibility</h2>

                <div className="space-y-4">
                    <p className="text-gray-300">
                        ICP Bonsai NFT supports all major Internet Computer wallets including:
                    </p>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-dark-bg p-4 rounded-lg">
                            <h3 className="font-semibold text-green-400 mb-2">✅ Fully Supported</h3>
                            <ul className="text-gray-300 space-y-1">
                                <li>• NFID Wallet (Recommended)</li>
                                <li>• Internet Identity</li>
                                <li>• Plug Wallet</li>
                                <li>• Oisy Wallet (read-only works smoothly)</li>
                            </ul>
                        </div>

                        <div className="bg-dark-bg p-4 rounded-lg">
                            <h3 className="font-semibold text-yellow-400 mb-2">⚠️ Known Issues</h3>
                            <ul className="text-gray-300 space-y-1">
                                <li>• Oisy Wallet: will prompt approvals for write actions (mint, water, transfer, claim)</li>
                                <li>• Stoic Wallet: Requires cookies enabled</li>
                                <li>• Brave Browser: May block cookies</li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
                        <h4 className="font-semibold text-yellow-400 mb-2">💡 Troubleshooting Stoic Wallet</h4>
                        <p className="text-gray-300 text-sm mb-2">
                            If you encounter connection errors with Stoic Wallet:
                        </p>
                        <ol className="text-gray-300 text-sm space-y-1 ml-4 list-decimal">
                            <li>Ensure cookies are enabled in your browser settings</li>
                            <li>For Brave users: Go to Settings → Shields → Allow all cookies for this site</li>
                            <li>Try using Chrome or Firefox browsers</li>
                            <li>Clear your browser cache and try again</li>
                            <li>Consider using NFID or Internet Identity as alternatives</li>
                        </ol>
                    </div>
                </div>
            </section>
            {/* Get Started */}
            <div className="text-center mt-8">
                <Link to="/" className="btn-primary inline-block px-8 py-3 text-lg">
                    🌱 Get Started - Mint Your Bonsai
                </Link>
            </div>
        </div>
    );
};

export default About;
