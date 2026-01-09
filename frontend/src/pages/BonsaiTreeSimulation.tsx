import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

type PixelType = 'trunk' | 'trunk_thick' | 'branch' | 'leaf' | 'root';
type TipType = 'trunk' | 'branch' | 'foliage_spawner';

type Direction = {
    x: number;
    y: number;
};

type Pixel = {
    x: number;
    y: number;
    type: PixelType;
    age?: number;
};

type Tip = {
    x: number;
    y: number;
    dir: Direction;
    type: TipType;
    life: number;
    curve: number;
};

type GrowthDigits = {
    trunkCurve: number;
    curveChange: number;
    branchSpawn: number;
    branchDir: number;
    branchLength: number;
    leafDensity: number;
    thickening: number;
    branchAngle: number;
};

type TreeScore = {
    total: number;
    maxScore: 100;
    breakdown: {
        age: number;
        branches: number;
        foliage: number;
    };
};

// --- CONFIGURATION ---
const GRID_W = 32;
const GRID_H = 32;
const MAX_Trunk_HEIGHT = GRID_H - 4; // Leave 1 pixel space at top (starts at y=GRID_H-3, reaches y=1)

// Helper to check bounds
const isValid = (x: number, y: number): boolean => x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
const getKey = (x: number, y: number): string => `${x},${y}`;

// Deterministic pseudo-random in [0, 99] from an integer seed.
// This is used so the frontend can match the backend's deterministic growth.
const randPct = (seed: number): number => {
    const v = ((seed % 100) + 100) % 100;
    return v;
};

// Extract 8 digits from wallet value's decimal part for growth decisions
const getGrowthDigits = (walletValue: number): GrowthDigits => {
    // Get decimal part and extract 8 digits (e.g., 2.25632547 -> "25632547")
    const decimalPart = (walletValue % 1).toFixed(8).substring(2); // Remove "0."
    const str = decimalPart.padEnd(8, '0');
    return {
        trunkCurve: parseInt(str[0]),      // 0-9: trunk curve bias
        curveChange: parseInt(str[1]),     // 0-9: curve change frequency
        branchSpawn: parseInt(str[2]),     // 0-9: branch spawn probability
        branchDir: parseInt(str[3]),       // 0-9: branch direction
        branchLength: parseInt(str[4]),    // 0-9: branch length
        leafDensity: parseInt(str[5]),     // 0-9: leaf cloud density
        thickening: parseInt(str[6]),      // 0-9: trunk thickening
        branchAngle: parseInt(str[7])      // 0-9: branch upward angle
    };
};

// Generate background color from wallet digits
const getBackgroundColor = (walletValue: number): string => {
    const decimalPart = (walletValue % 1).toFixed(8).substring(2);
    const digits = decimalPart.split('').map((d) => parseInt(d));

    // Use digits to create HSL color
    // Hue: 0-360 (use first 3 digits)
    const hue = (digits[0] * 100 + digits[1] * 10 + digits[2]) % 360;

    // Saturation: 15-45% (subtle, not too vibrant to maintain readability)
    const saturation = 15 + (digits[3] * 3 + digits[4]);

    // Lightness: 12-20% (dark background for tree visibility)
    const lightness = 12 + (digits[5] + digits[6]) / 2;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Calculate bonsai tree score (max 100 points) - dynamically scales with grid size
const calculateTreeScore = (pixels: Pixel[]): TreeScore => {
    // pixels state starts empty (initial foundation pixels only in SVG)
    const growthPixels = Math.max(0, pixels.length);
    const age = Math.round(growthPixels / 5);
    const branches = pixels.filter(p => p.type === 'branch').length;
    const foliage = pixels.filter(p => p.type === 'leaf').length;

    // Dynamic thresholds based on grid dimensions
    const gridArea = GRID_W * GRID_H;

    // Age: Max at ~15% of grid filled (balanced for both 32x32 and 64x64)
    const maxAgePixels = gridArea * 0.15;
    const maxAge = maxAgePixels / 5;

    // Branches: Max at ~0.85 branches per row height (challenging but achievable)
    const maxBranches = GRID_H * 0.85;

    // Foliage: Max at ~13% of grid (balanced foliage coverage)
    const maxFoliage = gridArea * 0.13;

    // Scoring weights (max scores):
    // Age: 30 points, Branches: 35 points, Foliage: 35 points
    const ageScore = Math.min((age / maxAge) * 30, 30);
    const branchScore = Math.min((branches / maxBranches) * 35, 35);
    const foliageScore = Math.min((foliage / maxFoliage) * 35, 35);

    const totalScore = Math.round(ageScore + branchScore + foliageScore);

    return {
        total: totalScore,
        maxScore: 100,
        breakdown: {
            age: Math.round(ageScore),
            branches: Math.round(branchScore),
            foliage: Math.round(foliageScore)
        }
    };
};

export default function BonsaiGen4() {
    // --- STATE ---
    // Pixels: { x, y, type: 'trunk'|'branch'|'leaf'|'root', id, age }
    const [pixels, setPixels] = useState<Pixel[]>([]);
    const [, setHistory] = useState<string[]>([]);
    const [isAuto, setIsAuto] = useState(false);
    const [walletValue, setWalletValue] = useState(2.12345678); // Seed for tree generation (8 decimals)
    const [displayWalletValue, setDisplayWalletValue] = useState(2.12345678); // UI display value

    // Refs for simulation state that doesn't need immediate re-renders during calculation
    const tipsRef = useRef<Tip[]>([]); // Active growing points
    const stepCountRef = useRef(0);

    // Generate SVG string from wallet value (accesses pixels from component state via closure)
    const generateSVGString = useCallback((walletValue: number): string => {
        const cellSize = 1; // Each cell is 1 unit in SVG
        const digits = getGrowthDigits(walletValue);
        const backgroundColor = getBackgroundColor(walletValue);

        // Always include initial foundation pixels (Nebari base + trunk)
        const startX = Math.floor(GRID_W / 2);
        const startY = GRID_H - 1;
        const initialPixels: Pixel[] = [];

        // Create Nebari (root base)
        for (let x = startX - 3; x <= startX + 3; x++) {
            if (isValid(x, startY)) {
                initialPixels.push({ x, y: startY, type: 'root', age: 100 });
            }
        }
        // Base trunk structure
        initialPixels.push({ x: startX, y: startY - 1, type: 'trunk', age: 0 });
        initialPixels.push({ x: startX - 1, y: startY - 1, type: 'trunk_thick', age: 0 });
        initialPixels.push({ x: startX + 1, y: startY - 1, type: 'trunk_thick', age: 0 });
        initialPixels.push({ x: startX, y: startY - 2, type: 'trunk', age: 0 });
        initialPixels.push({ x: startX - 1, y: startY - 2, type: 'trunk_thick', age: 0 });
        initialPixels.push({ x: startX + 1, y: startY - 2, type: 'trunk_thick', age: 0 });

        // Merge initial pixels with growth pixels (avoid duplicates)
        const pixelMap = new Map<string, Pixel>();
        [...initialPixels, ...pixels].forEach((p) => {
            const key = getKey(p.x, p.y);
            if (!pixelMap.has(key)) {
                pixelMap.set(key, p);
            }
        });
        const allPixels: Pixel[] = Array.from(pixelMap.values());

        const getPixelColor = (p: Pixel): string => {
            if (p.type === 'root') return '#5D4037';
            if (p.type === 'trunk' || p.type === 'trunk_thick') return '#795548';
            if (p.type === 'branch') return '#8D6E63';
            if (p.type === 'leaf') {
                const colorSeed = (p.x * 7 + p.y * 13) % 10;
                return colorSeed < digits.leafDensity ? '#66BB6A' : '#2E7D32';
            }
            return 'transparent';
        };

        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID_W} ${GRID_H}" preserveAspectRatio="xMidYMid meet">`;
        svgContent += `<rect width="${GRID_W}" height="${GRID_H}" fill="${backgroundColor}" stroke="#3b3d5c" stroke-width="0.5"/>`;

        // Render all pixels (initial + growth)
        allPixels.forEach((p) => {
            const color = getPixelColor(p);
            if (color !== 'transparent') {
                if (p.type === 'leaf') {
                    // Render leaves as circles
                    svgContent += `<circle cx="${p.x + 0.5}" cy="${p.y + 0.5}" r="0.45" fill="${color}"/>`;
                } else {
                    // Render wood as rectangles
                    svgContent += `<rect x="${p.x}" y="${p.y}" width="${cellSize}" height="${cellSize}" fill="${color}"/>`;
                }
            }
        });

        // Calculate and render score in bottom left corner
        const score = calculateTreeScore(pixels);
        const scoreColor = score.total >= 75 ? '#66BB6A' : score.total >= 50 ? '#FFA726' : score.total >= 25 ? '#76c7c0' : '#888';

        // Get counts for display (consistent with page stats - exclude initial 13 foundation pixels)
        const growthPixels = Math.max(0, pixels.length);
        const age = Math.round(growthPixels / 5);
        const branches = pixels.filter(p => p.type === 'branch').length;
        const foliage = pixels.filter(p => p.type === 'leaf').length;

        // Add score text to SVG (each stat in separate row, aligned)
        svgContent += `<text x="1" y="${GRID_H - 7}" font-family="monospace" font-size="1.2" font-weight="bold" fill="${scoreColor}">⌛${String(age).padStart(5, ' ')}</text>`;
        svgContent += `<text x="1" y="${GRID_H - 5}" font-family="monospace" font-size="1.2" font-weight="bold" fill="${scoreColor}">🌱${String(branches).padStart(5, ' ')}</text>`;
        svgContent += `<text x="1" y="${GRID_H - 3}" font-family="monospace" font-size="1.2" font-weight="bold" fill="#66BB6A">🍀${String(foliage).padStart(5, ' ')}</text>`;
        svgContent += `<text x="1" y="${GRID_H - 1}" font-family="monospace" font-size="1.2" font-weight="bold" fill="${scoreColor}">⭐${String(score.total).padStart(5, ' ')}/100</text>`;

        svgContent += '</svg>';
        return svgContent;
    }, [pixels]);

    // --- INITIALIZATION ---
    const initializeTree = useCallback(() => {
        const digits = getGrowthDigits(walletValue);

        const startX = Math.floor(GRID_W / 2);
        const startY = GRID_H - 1;

        const initialTips: Tip[] = [];

        // The main "Leader" tip
        initialTips.push({
            x: startX,
            y: startY - 2, // Start above the thick base
            dir: { x: 0, y: -1 }, // Growing Up
            type: 'trunk',
            life: MAX_Trunk_HEIGHT,
            curve: (digits.trunkCurve >= 5 ? 1 : -1) // Digit 0: Initial curve direction
        });

        setPixels([]); // Empty - initial pixels are added in SVG generation
        tipsRef.current = initialTips;
        stepCountRef.current = 0;
        setHistory(["Seeded new tree."]);
    }, [walletValue]);

    // --- GROWTH LOGIC ---
    const growStep = useCallback(() => {
        if (tipsRef.current.length === 0) {
            // No more growth possible, stop auto mode
            setIsAuto(false);
            return;
        }

        // Update growth digits from current display wallet value
        const digits = getGrowthDigits(displayWalletValue);

        setPixels(prevPixels => {
            const nextPixels = [...prevPixels];
            const pixelMap = new Set(nextPixels.map(p => getKey(p.x, p.y)));
            const newTips: Tip[] = [];

            // Process current active tips
            tipsRef.current.forEach(tip => {
                if (tip.life <= 0) {
                    // Tip died, spawn foliage only for branches (not main trunk)
                    // And only if branch is far enough from trunk center OR high enough vertically
                    const trunkCenterX = Math.floor(GRID_W / 2);
                    const distanceFromTrunk = Math.abs(tip.x - trunkCenterX);
                    const isHighEnough = tip.y < (GRID_H * 0.6); // Top 40% of canvas

                    if (tip.type === 'branch' && (distanceFromTrunk >= 3 || isHighEnough)) {
                        // Create a "Pad" (Cloud) generator tip
                        // More life for denser foliage based on density digit
                        const foliageLife = 6 + Math.floor(digits.leafDensity / 2); // 6-10 steps
                        newTips.push({ ...tip, type: 'foliage_spawner', life: foliageLife });
                    }
                    return;
                }

                // 1. CALCULATE MOVEMENT
                let dx = tip.dir.x;
                let dy = tip.dir.y;
                let newType = tip.type;
                let newLife = tip.life - 1;
                let newCurve = tip.curve;

                // --- TRUNK LOGIC ---
                if (tip.type === 'trunk') {
                    // Sinuous Movement (Moyogi Style)
                    // Change curve direction based on digit 1 (curveChange)
                    const changeFrequency = 3 + Math.floor(digits.curveChange * 0.8); // 3-10 steps (more frequent)
                    if (tip.life % changeFrequency === 0) {
                        newCurve = -newCurve;
                    }

                    // Apply curve bias based on digit 0 (trunkCurve)
                    // Higher digit = more likely to curve (enhanced for visibility)
                    const shouldCurve = (stepCountRef.current % 8) < digits.trunkCurve; // Changed from 10 to 8
                    dx = shouldCurve ? newCurve : 0;
                    dy = -1; // Always up

                    // Deterministic branch spawning (matches backend): digits control chance, not randomness.
                    const spawnChancePct = Math.min(50 + Math.floor(digits.branchSpawn * 100 / 12), 100); // 50-100
                    const seed = (stepCountRef.current * 31 + tip.x * 17 + tip.y * 13 + tip.life * 7) * 97;
                    const r = randPct(seed);
                    const shouldSpawn = tip.life < MAX_Trunk_HEIGHT - 2 && (r < spawnChancePct);

                    if (shouldSpawn) {
                        // Branch direction based on digit 3 (branchDir)
                        const branchDirX = digits.branchDir >= 5 ? 1 : -1;
                        // Branch length based on digit 4 (branchLength)
                        // Scale with grid size and give lower branches more length
                        const gridScale = GRID_H / 32; // Scaling factor (1.0 for 32x32, 2.0 for 64x64)
                        const heightBonus = Math.floor((tip.y - 10) / 3); // Lower branches get +bonus
                        const branchLife = Math.floor((10 + digits.branchLength * 1.5) * gridScale) + Math.max(0, heightBonus); // Scales with grid size

                        newTips.push({
                            x: tip.x,
                            y: tip.y,
                            dir: { x: branchDirX, y: 0 },
                            type: 'branch',
                            life: branchLife,
                            curve: branchDirX
                        });
                    }
                }

                // --- BRANCH LOGIC ---
                if (tip.type === 'branch') {
                    // Branches tend to grow OUT and slightly UP
                    // Based on digit 7 (branchAngle) - higher = more upward
                    const shouldGoUp = (digits.branchAngle >= 3) && (stepCountRef.current % 2 === 0);
                    dy = shouldGoUp ? -1 : 0;

                    // Wiggle x occasionally
                    const shouldWiggle = stepCountRef.current % 5 === 0;
                    dx = shouldWiggle ? 0 : tip.curve;

                    const gridScale = GRID_H / 32;

                    // Secondary branching (matches backend): percent chance with deterministic seed.
                    const heightFactorPct = Math.floor(Math.abs(tip.y) * 100 / GRID_H); // 0-100
                    const secondaryChancePct = (20 + Math.floor(heightFactorPct * 30 / 100)); // 20-50
                    const seed = (stepCountRef.current * 23 + tip.x * 11 + tip.y * 7 + tip.life * 3) * 89;
                    const r = randPct(seed);
                    if (tip.life > 5 && tip.life % 6 === 0 && r < secondaryChancePct) {
                        const subBranchLife = Math.floor((6 + digits.branchLength * 0.8) * gridScale);
                        newTips.push({
                            x: tip.x,
                            y: tip.y,
                            dir: { x: -tip.curve, y: -1 },
                            type: 'branch',
                            life: subBranchLife,
                            curve: -tip.curve
                        });
                    }
                }

                // --- FOLIAGE SPAWNER LOGIC ---
                if (tip.type === 'foliage_spawner') {
                    // Create leaf clouds around branch endings
                    const cloudRadius = 2 + Math.floor(digits.leafDensity / 5); // 2-3 radius
                    // Leaf density directly controls leaf count
                    const leafCount = 3 + Math.floor(digits.leafDensity * 0.8); // 3-10 leaves per step
                    const trunkCenterX = Math.floor(GRID_W / 2);

                    for (let i = 0; i < leafCount; i++) {
                        // Use step counter and tip position for pseudo-random but consistent placement
                        const seed = stepCountRef.current * 11 + i * 17 + tip.x * 7 + tip.y * 13;
                        const ox = ((seed * 19) % (cloudRadius * 2 + 1)) - cloudRadius;
                        const oy = ((seed * 23) % (cloudRadius * 2 + 1)) - cloudRadius;

                        // Create rounded/elliptical clouds
                        // Distance check for rounded shape
                        const dist = Math.sqrt(ox * ox + oy * oy * 0.7); // Flatten vertically
                        if (dist > cloudRadius) continue;

                        const lx = tip.x + ox;
                        const ly = tip.y + oy;

                        // Don't place leaves too close to trunk center (minimum distance of 2 pixels)
                        const distanceFromTrunk = Math.abs(lx - trunkCenterX);
                        if (distanceFromTrunk < 2) continue;

                        if (isValid(lx, ly) && !pixelMap.has(getKey(lx, ly))) {
                            nextPixels.push({ x: lx, y: ly, type: 'leaf', age: 0 });
                            pixelMap.add(getKey(lx, ly));
                        }
                    }
                    newLife--; // Decay spawner
                    dx = 0; dy = 0; // Don't move the spawner itself
                }

                // 2. EXECUTE MOVE (If not spawner)
                if (tip.type !== 'foliage_spawner') {
                    const nx = tip.x + dx;
                    const ny = tip.y + dy;

                    if (isValid(nx, ny)) {
                        // Don't overwrite existing wood, but ok to overwrite leaves
                        const existing = nextPixels.find(p => p.x === nx && p.y === ny);

                        if (!existing || existing.type === 'leaf') {
                            // Add new wood
                            if (existing) {
                                // Remove the leaf we are growing over
                                const idx = nextPixels.indexOf(existing);
                                nextPixels.splice(idx, 1);
                            }

                            const woodType = newType as Exclude<TipType, 'foliage_spawner'>;
                            nextPixels.push({ x: nx, y: ny, type: woodType, age: 0 });
                            pixelMap.add(getKey(nx, ny));

                            // Update Tip
                            newTips.push({
                                x: nx, y: ny,
                                dir: { x: dx, y: dy },
                                type: newType,
                                life: newLife,
                                curve: newCurve
                            });
                        } else {
                            // Blocked by wood? Spawn foliage only for branches far from trunk OR high up
                            const trunkCenterX = Math.floor(GRID_W / 2);
                            const distanceFromTrunk = Math.abs(tip.x - trunkCenterX);
                            const isHighEnough = tip.y < (GRID_H * 0.6); // Top 40% of canvas

                            if (tip.type === 'branch' && (distanceFromTrunk >= 3 || isHighEnough)) {
                                const foliageLife = 6 + Math.floor(digits.leafDensity / 2);
                                newTips.push({
                                    x: tip.x,
                                    y: tip.y,
                                    dir: tip.dir,
                                    type: 'foliage_spawner',
                                    life: foliageLife,
                                    curve: tip.curve
                                });
                            }
                        }
                    }
                } else if (newLife > 0) {
                    newTips.push({ ...tip, life: newLife });
                }
            });

            tipsRef.current = newTips;
            stepCountRef.current += 1;

            // --- THICKENING (The "Pipe Model") ---
            // Periodically scan trunk and thicken base
            if (stepCountRef.current % 3 === 0) {
                const trunkPixels = nextPixels.filter(p => p.type === 'trunk' || p.type === 'branch');
                trunkPixels.forEach(p => {
                    // Thicken trunk based on height - lower = thicker (higher y values)
                    if (p.type === 'trunk') {
                        const leftKey = getKey(p.x - 1, p.y);
                        const rightKey = getKey(p.x + 1, p.y);

                        // Thickening (matches backend): integer percent + deterministic seed.
                        const heightFactorPct = p.y > 10 ? Math.floor(((p.y - 10) * 100) / 30) : 0;
                        const baseThickenChancePct = Math.floor(((digits.thickening * 100 + 450) * heightFactorPct) / 3000);

                        const stepNow = stepCountRef.current; // already incremented
                        const leftSeed = ((stepNow * 37 + p.x * 19 + p.y * 23) * 73);
                        const rightSeed = ((stepNow * 41 + p.x * 29 + p.y * 31) * 79);

                        if (!pixelMap.has(leftKey) && randPct(leftSeed) < baseThickenChancePct) {
                            nextPixels.push({ x: p.x - 1, y: p.y, type: 'trunk_thick' });
                            pixelMap.add(leftKey);
                        }
                        if (!pixelMap.has(rightKey) && randPct(rightSeed) < baseThickenChancePct) {
                            nextPixels.push({ x: p.x + 1, y: p.y, type: 'trunk_thick' });
                            pixelMap.add(rightKey);
                        }
                    }
                });
            }

            return nextPixels;
        });
    }, [displayWalletValue]);

    // Generate SVG string in real-time
    const svgString = useMemo(() => generateSVGString(displayWalletValue), [displayWalletValue, generateSVGString]);

    // --- LOOP ---
    // Growth is now tied to wallet value changes
    useEffect(() => {
        if (isAuto) {
            growStep();
        }
    }, [displayWalletValue, isAuto, growStep]);

    // Initial Setup
    useEffect(() => {
        initializeTree();
    }, [initializeTree]);

    // Randomize display wallet value every 500ms when auto mode is on
    useEffect(() => {
        if (!isAuto) return;

        const interval = setInterval(() => {
            // Generate random decimal with 8 decimal places (e.g., 2.25632547)
            const randomDecimal = Math.floor(Math.random() * 10) + parseFloat(Math.random().toFixed(8));
            setDisplayWalletValue(randomDecimal);
        }, 19);
        return () => clearInterval(interval);
    }, [isAuto]);

    return (
        <div className="min-h-screen bg-[#1a1c2c] text-[#f4f4f4] font-mono flex flex-col items-center p-4">
            <style>{`
                .svg-container {
                    width: 30%;
                    max-width: 600px;
                    aspect-ratio: 1/1;
                    background: #292b3d;
                    padding: 1rem;
                    border-radius: 8px;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .svg-container svg {
                    width: 100%;
                    height: 100%;
                    image-rendering: pixelated;
                    image-rendering: -moz-crisp-edges;
                    image-rendering: crisp-edges;
                }
                .scanline {
                    background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2));
                    background-size: 100% 4px;
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    opacity: 0.3;
                }
            `}</style>

            {/* HEADER */}
            <div className="mb-6 text-center space-y-2">

                <h1 className="text-[#5d6fa2] uppercase tracking-widest">Procedural Bonsai Simulator v4.0</h1>

                {/* WALLET VALUE DISPLAY */}
                <div className="mt-4 inline-flex flex-col items-center bg-[#292b3d] px-4 py-2 rounded border border-[#3b3d5c]">
                    <span className="text-[10px] text-[#5d6fa2] uppercase tracking-wider mb-1">Wallet Value</span>
                    <span className="text-xl font-mono text-[#76c7c0] transition-all duration-300">
                        {displayWalletValue.toFixed(8)}
                    </span>
                </div>
            </div>

            {/* MAIN DISPLAY - Grid and Info Box Side by Side */}
            <div className="flex gap-6 w-full max-w-5xl">
                {/* SVG DISPLAY */}
                <div className="svg-container border-4 border-[#3b3d5c]">
                    <div className="scanline z-20"></div>
                    {/* Render SVG */}
                    <div dangerouslySetInnerHTML={{ __html: svgString }} className="border-[#3b3d5c]" />
                </div>

                {/* GROWTH DETAILS INFO BOX - SIDEBAR */}
                <div className="flex-shrink-0 bg-[#292b3d] border border-[#3b3d5c] rounded-lg p-4 flex flex-col">
                    <h3 className="text-sm font-bold text-[#76c7c0] mb-3 uppercase tracking-wider">Growth Calculation</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        {(() => {
                            const digits = getGrowthDigits(displayWalletValue);
                            const decimalStr = (displayWalletValue % 1).toFixed(8).substring(2);

                            return (
                                <>
                                    <div className="bg-[#1a1c2c] p-2 rounded">
                                        <div className="text-[#5d6fa2] text-[10px] uppercase mb-1">Digit 1: {decimalStr[0]}</div>
                                        <div className="text-white text-[11px]">Trunk Curve: {digits.trunkCurve}/10</div>
                                        <div className="text-[#888] text-[9px] mt-1">
                                            {digits.trunkCurve < 3 ? 'Straight' : digits.trunkCurve < 7 ? 'Moderate' : 'High curve'}
                                        </div>
                                    </div>

                                    <div className="bg-[#1a1c2c] p-2 rounded">
                                        <div className="text-[#5d6fa2] text-[10px] uppercase mb-1">Digit 2: {decimalStr[1]}</div>
                                        <div className="text-white text-[11px]">Change: {4 + digits.curveChange} steps</div>
                                        <div className="text-[#888] text-[9px] mt-1">Direction switch</div>
                                    </div>

                                    <div className="bg-[#1a1c2c] p-2 rounded">
                                        <div className="text-[#5d6fa2] text-[10px] uppercase mb-1">Digit 3: {decimalStr[2]}</div>
                                        <div className="text-white text-[11px]">Branch: {((0.4 + digits.branchSpawn / 15) * 100).toFixed(0)}%</div>
                                        <div className="text-[#888] text-[9px] mt-1">
                                            {digits.branchSpawn < 3 ? 'Sparse' : digits.branchSpawn < 7 ? 'Moderate' : 'Dense'}
                                        </div>
                                    </div>

                                    <div className="bg-[#1a1c2c] p-2 rounded">
                                        <div className="text-[#5d6fa2] text-[10px] uppercase mb-1">Digit 4: {decimalStr[3]}</div>
                                        <div className="text-white text-[11px]">{digits.branchDir >= 5 ? 'Right →' : 'Left ←'}</div>
                                        <div className="text-[#888] text-[9px] mt-1">Branch direction</div>
                                    </div>

                                    <div className="bg-[#1a1c2c] p-2 rounded">
                                        <div className="text-[#5d6fa2] text-[10px] uppercase mb-1">Digit 5: {decimalStr[4]}</div>
                                        <div className="text-white text-[11px]">Length: {8 + Math.floor(digits.branchLength * 1.2)} px</div>
                                        <div className="text-[#888] text-[9px] mt-1">
                                            {digits.branchLength < 3 ? 'Short' : digits.branchLength < 7 ? 'Medium' : 'Long'}
                                        </div>
                                    </div>

                                    <div className="bg-[#1a1c2c] p-2 rounded">
                                        <div className="text-[#5d6fa2] text-[10px] uppercase mb-1">Digit 6: {decimalStr[5]}</div>
                                        <div className="text-white text-[11px]">Leaves: {3 + Math.floor(digits.leafDensity * 0.8)}/step</div>
                                        <div className="text-[#888] text-[9px] mt-1">
                                            {digits.leafDensity < 3 ? 'Sparse' : digits.leafDensity < 7 ? 'Medium' : 'Lush'}
                                        </div>
                                    </div>

                                    <div className="bg-[#1a1c2c] p-2 rounded">
                                        <div className="text-[#5d6fa2] text-[10px] uppercase mb-1">Digit 7: {decimalStr[6]}</div>
                                        <div className="text-white text-[11px]">Thick: {digits.thickening}/10</div>
                                        <div className="text-[#888] text-[9px] mt-1">
                                            {digits.thickening < 3 ? 'Thin' : digits.thickening < 7 ? 'Medium' : 'Thick'}
                                        </div>
                                    </div>

                                    <div className="bg-[#1a1c2c] p-2 rounded">
                                        <div className="text-[#5d6fa2] text-[10px] uppercase mb-1">Digit 8: {decimalStr[7]}</div>
                                        <div className="text-white text-[11px]">{digits.branchAngle >= 3 ? 'Upward ↗' : 'Horizontal →'}</div>
                                        <div className="text-[#888] text-[9px] mt-1">Branch angle</div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                    <div className="mt-2 text-[10px] text-[#5d6fa2] text-center">
                        Wallet: {displayWalletValue.toFixed(8)} → Decimals: {(displayWalletValue % 1).toFixed(8).substring(2)}
                    </div>
                </div>
                {/* SVG CODE OUTPUT */}
                <div className="h-full">
                    <div className="bg-[#292b3d] border border-[#3b3d5c] rounded-lg p-4">
                        <h3 className="text-sm font-bold text-[#76c7c0] mb-3 uppercase tracking-wider">SVG Code</h3>
                        <textarea
                            readOnly
                            value={svgString}
                            className="w-full h-64 bg-[#1a1c2c] text-[#5d6fa2] font-mono text-xs p-3 rounded border border-[#3b3d5c] resize-none focus:outline-none focus:border-[#76c7c0]"
                            onClick={(e) => e.currentTarget.select()}
                        />
                        <div className="mt-2 text-[10px] text-[#5d6fa2] text-center">
                            Click to select all • Copy and use in your projects
                        </div>
                    </div>
                    {/* SVG INFO */}
                    <div className="mt-2 bg-[#292b3d] border border-[#3b3d5c] rounded-lg px-4 py-2 max-w-md">
                        {(() => {
                            const svgSize = new Blob([svgString]).size;
                            const sizeInKB = (svgSize / 1024).toFixed(2);
                            return (
                                <div className="flex justify-between items-center text-[10px]">
                                    <div className="text-[#5d6fa2]">
                                        <span className="text-[#888]">Dimensions:</span> {GRID_W}x{GRID_H}
                                    </div>
                                    <div className="text-[#5d6fa2]">
                                        <span className="text-[#888]">Size:</span> {svgSize < 1024 ? `${svgSize} bytes` : `${sizeInKB} KB`}
                                    </div>
                                    <div className="text-[#5d6fa2]">
                                        <span className="text-[#888]">Elements:</span> {pixels.length}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>
            {/* CONTROLS */}
            <div className="mt-8 flex gap-4">
                <button
                    onClick={() => setIsAuto(!isAuto)}
                    className={`px-6 py-2 rounded font-bold border-b-4 active:border-b-0 active:translate-y-1 transition-all ${isAuto
                        ? 'bg-[#e53935] border-[#b71c1c] text-white'
                        : 'bg-[#43A047] border-[#2E7D32] text-white'
                        }`}
                >
                    {isAuto ? 'STOP' : 'GROW'}
                </button>
                <button
                    onClick={() => {
                        // Generate random decimal with 8 decimal places
                        const newValue = Math.floor(Math.random() * 10) + parseFloat(Math.random().toFixed(8));
                        setWalletValue(newValue);
                        setDisplayWalletValue(newValue);
                        setIsAuto(false);
                    }}
                    className="px-6 py-2 bg-[#5c6bc0] border-b-4 border-[#3949ab] text-white rounded font-bold active:border-b-0 active:translate-y-1 transition-all"
                >
                    SHUFFLE VALUE
                </button>
                <button
                    onClick={() => {
                        // Randomize wallet value and grow one step
                        const newValue = Math.floor(Math.random() * 10) + parseFloat(Math.random().toFixed(8));
                        setDisplayWalletValue(newValue);
                        setIsAuto(false);
                        growStep();
                    }}
                    className="px-6 py-2 bg-[#FFA726] border-b-4 border-[#F57C00] text-white rounded font-bold active:border-b-0 active:translate-y-1 transition-all"
                >
                    STEP
                </button>
                <button
                    onClick={() => {
                        setIsAuto(false);
                        initializeTree(); // Manual reset
                    }}
                    className="px-6 py-2 bg-[#78909c] border-b-4 border-[#546e7a] text-white rounded font-bold active:border-b-0 active:translate-y-1 transition-all"
                >
                    RESET
                </button>
            </div>
            {/* STATS */}
            <div className="mt-6 grid grid-cols-4 gap-8 text-xs text-[#5d6fa2] font-bold uppercase tracking-wider">
                <div className="text-center">
                    <span className="block text-xl text-white">{pixels.filter(p => p.type === 'leaf').length}</span>
                    Foliage
                </div>
                <div className="text-center">
                    <span className="block text-xl text-white">{pixels.filter(p => p.type === 'branch').length}</span>
                    Branches
                </div>
                <div className="text-center">
                    <span className="block text-xl text-white">{Math.round(pixels.length / 5)}</span>
                    Age
                </div>
                <div className="text-center">
                    {(() => {
                        const score = calculateTreeScore(pixels);
                        return (
                            <>
                                <span className="block text-xl text-[#76c7c0]">{score.total}/{score.maxScore}</span>
                                <div className="text-[10px] text-[#5d6fa2] mt-1">
                                    Score
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>
            <div className="mt-4 text-[10px] text-[#3b3d5c]">
                Tip: Each wallet hash's 8 decimal digits directly control tree growth. Watch it evolve with each change!
            </div>
        </div>
    );
}