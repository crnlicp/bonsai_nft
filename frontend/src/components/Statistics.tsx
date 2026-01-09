const Statistics = () => {
    return (
        <details className="card">
            <summary className="cursor-pointer mb-3 text-lg font-bold text-primary hover:text-primary/80 transition">
                📊 Tree Statistics & Pattern Details
            </summary>
            <div className="space-y-4">
                <div className="text-sm font-mono space-y-2">
                    <div className="text-gray-400">
                        This bonsai is a unique procedurally-generated tree.
                        Water it to help it grow!
                    </div>
                </div>

                {/* Pattern Explanation */}
                <div className="pt-3 border-t border-dark-border">
                    <div className="text-xs text-gray-400 space-y-3">
                        <p>
                            Each bonsai has a unique seed generated at mint time that controls its growth pattern and background color.
                            The 8 digits of this seed map to specific growth parameters:
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-dark-bg/50 p-2 rounded">
                                <span className="text-amber-400 font-mono">Digit 1:</span> Trunk Curve
                                <p className="text-gray-500">0-4: Left, 5: Straight, 6-9: Right</p>
                            </div>
                            <div className="bg-dark-bg/50 p-2 rounded">
                                <span className="text-amber-400 font-mono">Digit 2:</span> Curve Change
                                <p className="text-gray-500">How often trunk direction changes</p>
                            </div>
                            <div className="bg-dark-bg/50 p-2 rounded">
                                <span className="text-amber-400 font-mono">Digit 3:</span> Branch Spawn
                                <p className="text-gray-500">Chance of spawning branches</p>
                            </div>
                            <div className="bg-dark-bg/50 p-2 rounded">
                                <span className="text-amber-400 font-mono">Digit 4:</span> Branch Direction
                                <p className="text-gray-500">Left vs right branch preference</p>
                            </div>
                            <div className="bg-dark-bg/50 p-2 rounded">
                                <span className="text-amber-400 font-mono">Digit 5:</span> Branch Length
                                <p className="text-gray-500">Max lifetime of branches</p>
                            </div>
                            <div className="bg-dark-bg/50 p-2 rounded">
                                <span className="text-amber-400 font-mono">Digit 6:</span> Leaf Density
                                <p className="text-gray-500">How many leaves spawn</p>
                            </div>
                            <div className="bg-dark-bg/50 p-2 rounded">
                                <span className="text-amber-400 font-mono">Digit 7:</span> Thickening
                                <p className="text-gray-500">Trunk/branch thickness chance</p>
                            </div>
                            <div className="bg-dark-bg/50 p-2 rounded">
                                <span className="text-amber-400 font-mono">Digit 8:</span> Branch Angle
                                <p className="text-gray-500">Steepness of branch growth</p>
                            </div>
                        </div>
                        <p className="text-gray-500 italic">
                            Each bonsai's unique seed creates a one-of-a-kind growth pattern and background color.
                        </p>
                    </div>
                </div>
            </div>
        </details>
    )
}

export default Statistics
