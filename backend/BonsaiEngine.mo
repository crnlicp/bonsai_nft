import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import HashMap "mo:base/HashMap";
import Types "Types";

module {
    // ============================================
    // CONSTANTS
    // ============================================

    let GRID_W : Nat = 32;
    let GRID_H : Nat = 32;
    let GRID_W_I : Int = 32;
    let GRID_H_I : Int = 32;
    let MAX_TRUNK_HEIGHT : Nat = 28; // GRID_H - 4

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    func isValid(x : Int, y : Int) : Bool {
        x >= 0 and x < GRID_W_I and y >= 0 and y < GRID_H_I
    };

    func getPixelKey(x : Nat, y : Nat) : Text {
        Nat.toText(x) # "," # Nat.toText(y);
    };

    func natFromInt(x : Int) : ?Nat {
        if (x < 0) { null } else { ?Int.abs(x) };
    };

    func extractDecimalDigits(value : Float) : [Nat] {
        let intPart = Float.toInt(Float.abs(value));
        let decimalPart = Float.abs(value) - Float.fromInt(intPart);
        // Match JS: (walletValue % 1).toFixed(8)
        // => round to 8 decimal places, not truncate.
        let scaled = decimalPart * 100000000.0; // 10^8
        // Round half up; if it rounds to 100000000, we treat it as 00000000 (carry is ignored by substring(2)).
        let rounded = Int.abs(Float.toInt(scaled + 0.5)) % 100000000;
        let decimalInt = rounded;

        var digits : [var Nat] = Array.init<Nat>(8, 0);
        var num = decimalInt;
        var i : Nat = 7;

        label l loop {
            digits[i] := num % 10;
            num := num / 10;
            if (i == 0) { break l };
            i -= 1;
        };

        Array.freeze(digits);
    };

    // ============================================
    // PUBLIC FUNCTIONS
    // ============================================

    public type GrowthStepResult = {
        pixels : [Types.Pixel];
        tips : [Types.GrowthTip];
        stepCount : Nat;
    };

    // Initialize the same trunk "leader" tip as the React simulator.
    // Note: growthPixels in React starts empty; the base pixels come from initializeTree() during SVG build.
    public func initializeGrowthTips(digits : Types.GrowthDigits) : [Types.GrowthTip] {
        let startX : Int = GRID_W / 2;
        let startY : Int = GRID_H - 1;
        [
            {
                x = startX;
                y = startY - 2;
                dirX = 0;
                dirY = -1;
                tipType = #trunk;
                life = MAX_TRUNK_HEIGHT;
                curve = if (digits.trunkCurve >= 5) { 1 } else { -1 };
            },
        ];
    };

    // Advance the simulation by exactly one step, preserving existing pixels.
    // This fixes the "whole tree shifts" behavior caused by regenerating N steps from scratch with new digits.
    public func growTreeStep(
        digits : Types.GrowthDigits,
        prevPixels : [Types.Pixel],
        prevTips : [Types.GrowthTip],
        prevStepCount : Nat,
    ) : GrowthStepResult {
        if (prevTips.size() == 0) {
            return {
                pixels = prevPixels;
                tips = prevTips;
                stepCount = prevStepCount;
            };
        };

        let pixels = Buffer.Buffer<Types.Pixel>(prevPixels.size() + 32);
        var pixelTypeByKey = HashMap.HashMap<Text, Types.PixelType>(prevPixels.size() + 32, Text.equal, Text.hash);
        var pixelIndexByKey = HashMap.HashMap<Text, Nat>(prevPixels.size() + 32, Text.equal, Text.hash);

        // Rebuild occupancy/index maps from stored pixels.
        var idx : Nat = 0;
        for (p in prevPixels.vals()) {
            pixels.add(p);
            let key = getPixelKey(p.x, p.y);
            pixelTypeByKey.put(key, p.pixelType);
            pixelIndexByKey.put(key, idx);
            idx += 1;
        };

        let stepCount : Nat = prevStepCount;
        let stepCountI : Int = stepCount;

        let currentTips = prevTips;
        let nextTips = Buffer.Buffer<Types.GrowthTip>(currentTips.size() + 8);

        for (tip in currentTips.vals()) {
            if (tip.life <= 0) {
                // Tip died - check if it spawns foliage (same gating as React)
                let trunkCenterX : Int = GRID_W / 2;
                let distanceFromTrunk = Int.abs(tip.x - trunkCenterX);
                let isHighEnough = tip.y < (GRID_H * 60 / 100);
                switch (tip.tipType) {
                    case (#branch) {
                        if (distanceFromTrunk >= 3 or isHighEnough) {
                            let foliageLife = 6 + digits.leafDensity / 2;
                            nextTips.add({
                                x = tip.x;
                                y = tip.y;
                                dirX = tip.dirX;
                                dirY = tip.dirY;
                                tipType = #foliage_spawner;
                                life = foliageLife;
                                curve = tip.curve;
                            });
                        };
                    };
                    case (_) {};
                };
            } else {
                let newLife : Nat = if (tip.life > 0) { tip.life - 1 } else {
                    0;
                };
                var dx = tip.dirX;
                var dy = tip.dirY;
                var newCurve = tip.curve;

                switch (tip.tipType) {
                    case (#trunk) {
                        let changeFreq = 3 + (digits.curveChange * 8) / 10;
                        if (tip.life % changeFreq == 0) {
                            newCurve := -newCurve;
                        };

                        let shouldCurve = (stepCount % 8) < digits.trunkCurve;
                        dx := if (shouldCurve) { newCurve } else { 0 };
                        dy := -1;

                        let baseSpawnChanceFloat = 50 + (digits.branchSpawn * 100 / 12);
                        let spawnChance = if (baseSpawnChanceFloat > 100) {
                            100;
                        } else { baseSpawnChanceFloat };
                        let randomSeed = Int.abs(((stepCountI * 31 + tip.x * 17 + tip.y * 13 + (tip.life : Int) * 7) * 97) % 100);
                        let shouldSpawn = (tip.life + 2 < MAX_TRUNK_HEIGHT) and randomSeed < spawnChance;

                        if (shouldSpawn) {
                            let branchDirX = if (digits.branchDir >= 5) { 1 } else {
                                -1;
                            };
                            let heightBonus : Nat = if (tip.y > 10) {
                                Int.abs((tip.y - 10) / 3);
                            } else { 0 };
                            let gridScale : Nat = GRID_H / 32;
                            let branchLife : Nat = ((10 + (digits.branchLength * 15) / 10) * gridScale) + heightBonus;
                            nextTips.add({
                                x = tip.x;
                                y = tip.y;
                                dirX = branchDirX;
                                dirY = 0;
                                tipType = #branch;
                                life = branchLife;
                                curve = branchDirX;
                            });
                        };
                    };
                    case (#branch) {
                        let shouldGoUp = (digits.branchAngle >= 3) and (stepCount % 2 == 0);
                        dy := if (shouldGoUp) { -1 } else { 0 };
                        dx := if (stepCount % 5 == 0) { 0 } else { tip.curve };

                        let heightFactor = Int.abs(tip.y) * 100 / GRID_H;
                        let gridScale : Nat = GRID_H / 32;
                        let secondaryChance = (20 + heightFactor * 30 / 100) * gridScale;
                        let randomSeed = Int.abs(((stepCountI * 23 + tip.x * 11 + tip.y * 7 + (tip.life : Int) * 3) * 89) % 100);

                        if (tip.life > 5 and tip.life % 6 == 0 and randomSeed < secondaryChance) {
                            let subBranchLife = ((6 + (digits.branchLength * 8) / 10) * gridScale);
                            nextTips.add({
                                x = tip.x;
                                y = tip.y;
                                dirX = -tip.curve;
                                dirY = -1;
                                tipType = #branch;
                                life = subBranchLife;
                                curve = -tip.curve;
                            });
                        };
                    };
                    case (#foliage_spawner) {
                        let cloudRadius = 2 + digits.leafDensity / 5;
                        let leafCount = 3 + (digits.leafDensity * 8) / 10;
                        let trunkCenterX : Int = GRID_W / 2;

                        var i : Int = 0;
                        while (i < leafCount) {
                            let seed = stepCountI * 11 + i * 17 + tip.x * 7 + tip.y * 13;
                            let ox = ((seed * 19) % (cloudRadius * 2 + 1)) - cloudRadius;
                            let oy = ((seed * 23) % (cloudRadius * 2 + 1)) - cloudRadius;
                            let dist : Float = Float.sqrt(Float.fromInt(ox * ox) + (Float.fromInt(oy * oy) * 0.7));

                            if (dist <= Float.fromInt(cloudRadius)) {
                                let lx = tip.x + ox;
                                let ly = tip.y + oy;
                                let distanceFromTrunkLeaf = Int.abs(lx - trunkCenterX);
                                if (distanceFromTrunkLeaf >= 2 and isValid(lx, ly)) {
                                    switch (natFromInt(lx), natFromInt(ly)) {
                                        case (?nx, ?ny) {
                                            let key = getPixelKey(nx, ny);
                                            if (pixelTypeByKey.get(key) == null) {
                                                let newIdx = pixels.size();
                                                pixels.add({
                                                    x = nx;
                                                    y = ny;
                                                    pixelType = #leaf;
                                                    age = 0;
                                                });
                                                pixelTypeByKey.put(key, #leaf);
                                                pixelIndexByKey.put(key, newIdx);
                                            };
                                        };
                                        case (_) {};
                                    };
                                };
                            };
                            i += 1;
                        };

                        // React decrements spawner life twice each step:
                        // newLife = tip.life - 1, then newLife-- inside spawner.
                        let spawnerLife : Nat = if (newLife > 0) { newLife - 1 } else {
                            0;
                        };
                        if (spawnerLife > 0) {
                            nextTips.add({
                                x = tip.x;
                                y = tip.y;
                                dirX = tip.dirX;
                                dirY = tip.dirY;
                                tipType = #foliage_spawner;
                                life = spawnerLife;
                                curve = tip.curve;
                            });
                        };
                    };
                };

                // Execute move (not for spawners)
                switch (tip.tipType) {
                    case (#foliage_spawner) {};
                    case (_) {
                        let nx = tip.x + dx;
                        let ny = tip.y + dy;

                        if (isValid(nx, ny)) {
                            switch (natFromInt(nx), natFromInt(ny)) {
                                case (?nNx, ?nNy) {
                                    let key = getPixelKey(nNx, nNy);
                                    let newPixelType : Types.PixelType = switch (tip.tipType) {
                                        case (#trunk) { #trunk };
                                        case (#branch) { #branch };
                                        case (#foliage_spawner) { #leaf };
                                    };

                                    switch (pixelTypeByKey.get(key)) {
                                        case (null) {
                                            let newIdx = pixels.size();
                                            pixels.add({
                                                x = nNx;
                                                y = nNy;
                                                pixelType = newPixelType;
                                                age = 0;
                                            });
                                            pixelTypeByKey.put(key, newPixelType);
                                            pixelIndexByKey.put(key, newIdx);

                                            nextTips.add({
                                                x = nx;
                                                y = ny;
                                                dirX = dx;
                                                dirY = dy;
                                                tipType = tip.tipType;
                                                life = newLife;
                                                curve = newCurve;
                                            });
                                        };
                                        case (?#leaf) {
                                            // Wood may overwrite leaves (React behavior)
                                            switch (pixelIndexByKey.get(key)) {
                                                case (?leafIdx) {
                                                    pixels.put(leafIdx, { x = nNx; y = nNy; pixelType = newPixelType; age = 0 });
                                                    pixelTypeByKey.put(key, newPixelType);
                                                    nextTips.add({
                                                        x = nx;
                                                        y = ny;
                                                        dirX = dx;
                                                        dirY = dy;
                                                        tipType = tip.tipType;
                                                        life = newLife;
                                                        curve = newCurve;
                                                    });
                                                };
                                                case (_) {};
                                            };
                                        };
                                        case (_) {
                                            // Blocked by wood - spawn foliage if branch
                                            let trunkCenterX : Int = GRID_W / 2;
                                            let distanceFromTrunk = Int.abs(tip.x - trunkCenterX);
                                            let isHighEnough = tip.y < (GRID_H * 60 / 100);
                                            switch (tip.tipType) {
                                                case (#branch) {
                                                    if (distanceFromTrunk >= 3 or isHighEnough) {
                                                        let foliageLife = 6 + digits.leafDensity / 2;
                                                        nextTips.add({
                                                            x = tip.x;
                                                            y = tip.y;
                                                            dirX = tip.dirX;
                                                            dirY = tip.dirY;
                                                            tipType = #foliage_spawner;
                                                            life = foliageLife;
                                                            curve = tip.curve;
                                                        });
                                                    };
                                                };
                                                case (_) {};
                                            };
                                        };
                                    };
                                };
                                case (_) {};
                            };
                        };
                    };
                };
            };
        };

        // React increments the step counter before thickening.
        let newStepCount = stepCount + 1;

        if (newStepCount % 3 == 0) {
            let pixelsArray = Buffer.toArray(pixels);
            for (p in pixelsArray.vals()) {
                if (p.pixelType == #trunk) {
                    let heightFactor : Nat = if (p.y > 10) {
                        ((p.y - 10) * 100) / 30;
                    } else { 0 };
                    let baseThickenChance : Nat = ((digits.thickening * 100 + 450) * heightFactor) / 3000;

                    let xI : Int = p.x;
                    let yI : Int = p.y;
                    let leftX : Int = xI - 1;
                    let rightX : Int = xI + 1;

                    let randomLeft = (((newStepCount * 37 + p.x * 19 + p.y * 23) * 73) % 100);
                    if (randomLeft < baseThickenChance and isValid(leftX, yI)) {
                        switch (natFromInt(leftX)) {
                            case (?leftNat) {
                                let leftKey = getPixelKey(leftNat, p.y);
                                if (pixelTypeByKey.get(leftKey) == null) {
                                    let newIdx = pixels.size();
                                    pixels.add({
                                        x = leftNat;
                                        y = p.y;
                                        pixelType = #trunk_thick;
                                        age = 0;
                                    });
                                    pixelTypeByKey.put(leftKey, #trunk_thick);
                                    pixelIndexByKey.put(leftKey, newIdx);
                                };
                            };
                            case (_) {};
                        };
                    };

                    let randomRight = (((newStepCount * 41 + p.x * 29 + p.y * 31) * 79) % 100);
                    if (randomRight < baseThickenChance and isValid(rightX, yI)) {
                        switch (natFromInt(rightX)) {
                            case (?rightNat) {
                                let rightKey = getPixelKey(rightNat, p.y);
                                if (pixelTypeByKey.get(rightKey) == null) {
                                    let newIdx = pixels.size();
                                    pixels.add({
                                        x = rightNat;
                                        y = p.y;
                                        pixelType = #trunk_thick;
                                        age = 0;
                                    });
                                    pixelTypeByKey.put(rightKey, #trunk_thick);
                                    pixelIndexByKey.put(rightKey, newIdx);
                                };
                            };
                            case (_) {};
                        };
                    };
                };
            };
        };

        {
            pixels = Buffer.toArray(pixels);
            tips = Buffer.toArray(nextTips);
            stepCount = newStepCount;
        };
    };

    public func getGrowthDigits(walletBalance : Float) : Types.GrowthDigits {
        let digits = extractDecimalDigits(walletBalance);
        {
            trunkCurve = digits[0];
            curveChange = digits[1];
            branchSpawn = digits[2];
            branchDir = digits[3];
            branchLength = digits[4];
            leafDensity = digits[5];
            thickening = digits[6];
            branchAngle = digits[7];
        };
    };

    public func getBackgroundColor(digits : Types.GrowthDigits) : Text {
        // Use the same digits that control tree growth for background color
        // This matches the frontend BonsaiTreeSimulation.tsx behavior
        let hue = (digits.trunkCurve * 100 + digits.curveChange * 10 + digits.branchSpawn) % 360;
        let saturation = 15 + (digits.branchDir * 3 + digits.branchLength);
        let lightness = 12 + (digits.leafDensity + digits.thickening) / 2;

        "hsl(" # Nat.toText(hue) # "," # Nat.toText(saturation) # "%," # Nat.toText(lightness) # "%)";
    };

    public func calculateTreeScore(pixels : [Types.Pixel]) : Types.TreeScore {
        // Match React:
        // age = Math.round(growthPixels / 5)
        // scores computed with floats and Math.round at the end
        let growthPixels : Nat = pixels.size();
        let growthPixelsF : Float = Float.fromInt(growthPixels);
        let age : Nat = Int.abs(Float.toInt(growthPixelsF / 5.0 + 0.5));

        var branches : Nat = 0;
        var foliage : Nat = 0;

        for (pixel in pixels.vals()) {
            switch (pixel.pixelType) {
                case (#branch) { branches += 1 };
                case (#leaf) { foliage += 1 };
                case (_) {};
            };
        };

        let gridArea : Nat = GRID_W * GRID_H;
        let gridAreaF : Float = Float.fromInt(gridArea);

        let maxAgePixelsF : Float = gridAreaF * 0.15;
        let maxAgeF : Float = maxAgePixelsF / 5.0;
        let maxBranchesF : Float = Float.fromInt(GRID_H) * 0.85;
        let maxFoliageF : Float = gridAreaF * 0.13;

        let ageScoreF : Float = Float.min((Float.fromInt(age) / maxAgeF) * 30.0, 30.0);
        let branchScoreF : Float = Float.min((Float.fromInt(branches) / maxBranchesF) * 35.0, 35.0);
        let foliageScoreF : Float = Float.min((Float.fromInt(foliage) / maxFoliageF) * 35.0, 35.0);

        let totalF : Float = ageScoreF + branchScoreF + foliageScoreF;
        let total : Nat = Int.abs(Float.toInt(totalF + 0.5));

        {
            total = total;
            maxScore = 100;
            age = age;
            branches = branches;
            foliage = foliage;
        };
    };

    public func initializeTree() : [Types.Pixel] {
        // Use Int math to avoid Nat underflow warnings, then convert.
        let startX : Nat = GRID_W / 2;
        let startY : Nat = GRID_H - 1;
        let buffer = Buffer.Buffer<Types.Pixel>(20);

        // Create Nebari (root base)
        let startXI : Int = startX;
        let startYI : Int = startY;
        var xI : Int = startXI - 3;
        while (xI <= startXI + 3) {
            if (isValid(xI, startYI)) {
                switch (natFromInt(xI), natFromInt(startYI)) {
                    case (?nx, ?ny) {
                        buffer.add({
                            x = nx;
                            y = ny;
                            pixelType = #root;
                            age = 100;
                        });
                    };
                    case (_) {};
                };
            };
            xI += 1;
        };

        // Base trunk structure
        buffer.add({ x = startX; y = startY - 1; pixelType = #trunk; age = 0 });
        buffer.add({
            x = startX - 1;
            y = startY - 1;
            pixelType = #trunk_thick;
            age = 0;
        });
        buffer.add({
            x = startX + 1;
            y = startY - 1;
            pixelType = #trunk_thick;
            age = 0;
        });
        buffer.add({ x = startX; y = startY - 2; pixelType = #trunk; age = 0 });
        buffer.add({
            x = startX - 1;
            y = startY - 2;
            pixelType = #trunk_thick;
            age = 0;
        });
        buffer.add({
            x = startX + 1;
            y = startY - 2;
            pixelType = #trunk_thick;
            age = 0;
        });

        Buffer.toArray(buffer);
    };

    public func growTree(digits : Types.GrowthDigits, steps : Nat) : [Types.Pixel] {
        let startX : Int = GRID_W / 2;
        let startY : Int = GRID_H - 1;

        var pixels = Buffer.Buffer<Types.Pixel>(100);
        // Track occupancy by type so we can match React behavior:
        // - Leaves occupy cells
        // - Wood growth may overwrite leaves
        var pixelTypeByKey = HashMap.HashMap<Text, Types.PixelType>(100, Text.equal, Text.hash);
        var pixelIndexByKey = HashMap.HashMap<Text, Nat>(100, Text.equal, Text.hash);
        var tips = Buffer.Buffer<Types.GrowthTip>(10);

        // Initialize main trunk tip
        tips.add({
            x = startX;
            y = startY - 2;
            dirX = 0;
            dirY = -1;
            tipType = #trunk;
            life = MAX_TRUNK_HEIGHT;
            curve = if (digits.trunkCurve >= 5) { 1 } else { -1 };
        });

        var stepCount : Nat = 0;

        while (stepCount < steps and tips.size() > 0) {
            let currentTips = Buffer.toArray(tips);
            tips := Buffer.Buffer<Types.GrowthTip>(10);

            let stepCountI : Int = stepCount;

            for (tip in currentTips.vals()) {
                if (tip.life <= 0) {
                    let trunkCenterX : Int = GRID_W / 2;
                    let distanceFromTrunk = Int.abs(tip.x - trunkCenterX);
                    let isHighEnough = tip.y < (GRID_H * 60 / 100);

                    switch (tip.tipType) {
                        case (#branch) {
                            if (distanceFromTrunk >= 3 or isHighEnough) {
                                let foliageLife = 6 + digits.leafDensity / 2;
                                tips.add({
                                    x = tip.x;
                                    y = tip.y;
                                    dirX = tip.dirX;
                                    dirY = tip.dirY;
                                    tipType = #foliage_spawner;
                                    life = foliageLife;
                                    curve = tip.curve;
                                });
                            };
                        };
                        case (_) {};
                    };
                } else {
                    // Match React: let newLife = tip.life - 1 (done at start for all tips)
                    // Safe for Nat since we know tip.life > 0 from the if condition above
                    let newLife : Nat = if (tip.life > 0) { tip.life - 1 } else {
                        0;
                    };
                    var dx = tip.dirX;
                    var dy = tip.dirY;
                    var newCurve = tip.curve;

                    switch (tip.tipType) {
                        case (#trunk) {
                            // React: 3 + Math.floor(digits.curveChange * 0.8) gives 3-10
                            let changeFreq = 3 + (digits.curveChange * 8) / 10;
                            if (tip.life % changeFreq == 0) {
                                newCurve := -newCurve;
                            };

                            let shouldCurve = (stepCount % 8) < digits.trunkCurve;
                            dx := if (shouldCurve) { newCurve } else { 0 };
                            dy := -1;

                            // Branch spawning probability (0.5 to 1.25 = 50% to 125%)
                            let baseSpawnChanceFloat = 50 + (digits.branchSpawn * 100 / 12);
                            let spawnChance = if (baseSpawnChanceFloat > 100) {
                                100;
                            } else {
                                baseSpawnChanceFloat;
                            };

                            // Pseudo-random based only on step count and position
                            // Digits control spawn CHANCE but not the randomness itself
                            // This ensures stable tree structure when balance changes
                            let randomSeed = Int.abs(((stepCountI * 31 + tip.x * 17 + tip.y * 13 + (tip.life : Int) * 7) * 97) % 100);
                            let shouldSpawn = (tip.life + 2 < MAX_TRUNK_HEIGHT) and randomSeed < spawnChance;

                            if (shouldSpawn) {
                                let branchDirX = if (digits.branchDir >= 5) {
                                    1;
                                } else { -1 };
                                let heightBonus : Nat = if (tip.y > 10) {
                                    Int.abs((tip.y - 10) / 3);
                                } else { 0 };
                                // React: (10 + digits.branchLength * 1.5) * gridScale + heightBonus
                                // gridScale = GRID_H / 32 = 1 for 32x32 grid
                                let gridScale : Nat = GRID_H / 32;
                                let branchLife : Nat = ((10 + (digits.branchLength * 15) / 10) * gridScale) + heightBonus;

                                tips.add({
                                    x = tip.x;
                                    y = tip.y;
                                    dirX = branchDirX;
                                    dirY = 0;
                                    tipType = #branch;
                                    life = branchLife;
                                    curve = branchDirX;
                                });
                            };
                        };
                        case (#branch) {
                            let shouldGoUp = (digits.branchAngle >= 3) and (stepCount % 2 == 0);
                            dy := if (shouldGoUp) { -1 } else { 0 };
                            dx := if (stepCount % 5 == 0) { 0 } else {
                                tip.curve;
                            };

                            // Secondary branching with improved randomness
                            // React: heightFactor = tip.y / GRID_H (0 at top, 1 at bottom)
                            // React: secondaryChance = (0.2 + heightFactor * 0.3) * sqrt(gridScale)
                            let heightFactor = Int.abs(tip.y) * 100 / GRID_H;
                            let gridScale : Nat = GRID_H / 32;
                            // For 32x32: (20 + heightFactor * 30 / 100) * 1 = 20-50%
                            let secondaryChance = (20 + heightFactor * 30 / 100) * gridScale;
                            // Pseudo-random based only on step and position, not wallet digits
                            let randomSeed = Int.abs(((stepCountI * 23 + tip.x * 11 + tip.y * 7 + (tip.life : Int) * 3) * 89) % 100);

                            if (tip.life > 5 and tip.life % 6 == 0 and randomSeed < secondaryChance) {
                                // React: (6 + digits.branchLength * 0.8) * gridScale
                                let subBranchLife = ((6 + (digits.branchLength * 8) / 10) * gridScale);
                                tips.add({
                                    x = tip.x;
                                    y = tip.y;
                                    dirX = -tip.curve;
                                    dirY = -1;
                                    tipType = #branch;
                                    life = subBranchLife;
                                    curve = -tip.curve;
                                });
                            };
                        };
                        case (#foliage_spawner) {
                            // Create leaf clouds
                            let cloudRadius = 2 + digits.leafDensity / 5;
                            // React: 3 + Math.floor(digits.leafDensity * 0.8) gives 3-10
                            let leafCount = 3 + (digits.leafDensity * 8) / 10;
                            let trunkCenterX : Int = GRID_W / 2;

                            // Then add cloud pattern leaves
                            var i = 0;
                            while (i < leafCount) {
                                let seed = stepCountI * 11 + i * 17 + tip.x * 7 + tip.y * 13;
                                let ox = ((seed * 19) % (cloudRadius * 2 + 1)) - cloudRadius;
                                let oy = ((seed * 23) % (cloudRadius * 2 + 1)) - cloudRadius;

                                // Distance check for rounded shape (match React: sqrt(ox^2 + oy^2 * 0.7))
                                let dist : Float = Float.sqrt(
                                    Float.fromInt(ox * ox) + (Float.fromInt(oy * oy) * 0.7)
                                );

                                if (dist <= Float.fromInt(cloudRadius)) {
                                    let lx = tip.x + ox;
                                    let ly = tip.y + oy;

                                    // Don't place leaves too close to trunk center
                                    let distanceFromTrunkLeaf = Int.abs(lx - trunkCenterX);

                                    if (distanceFromTrunkLeaf >= 2 and isValid(lx, ly)) {
                                        switch (natFromInt(lx), natFromInt(ly)) {
                                            case (?nx, ?ny) {
                                                let key = getPixelKey(nx, ny);
                                                if (pixelTypeByKey.get(key) == null) {
                                                    let idx = pixels.size();
                                                    pixels.add({
                                                        x = nx;
                                                        y = ny;
                                                        pixelType = #leaf;
                                                        age = 0;
                                                    });
                                                    pixelTypeByKey.put(key, #leaf);
                                                    pixelIndexByKey.put(key, idx);
                                                };
                                            };
                                            case (_) {};
                                        };
                                    };
                                };
                                i += 1;
                            };

                            // Match React spawner decay: life is decremented twice per step.
                            let spawnerLife : Nat = if (newLife > 0) {
                                newLife - 1;
                            } else { 0 };
                            if (spawnerLife > 0) {
                                tips.add({
                                    x = tip.x;
                                    y = tip.y;
                                    dirX = tip.dirX;
                                    dirY = tip.dirY;
                                    tipType = #foliage_spawner;
                                    life = spawnerLife;
                                    curve = tip.curve;
                                });
                            };
                        };
                    };

                    // Execute move (not for spawners)
                    switch (tip.tipType) {
                        case (#foliage_spawner) {
                            // Already handled above
                        };
                        case (_) {
                            let nx = tip.x + dx;
                            let ny = tip.y + dy;

                            if (isValid(nx, ny)) {
                                switch (natFromInt(nx), natFromInt(ny)) {
                                    case (?nNx, ?nNy) {
                                        let key = getPixelKey(nNx, nNy);

                                        // Add new wood pixel (React: newType equals tip type)
                                        let newPixelType : Types.PixelType = switch (tip.tipType) {
                                            case (#trunk) { #trunk };
                                            case (#branch) { #branch };
                                            case (#foliage_spawner) { #leaf };
                                        };

                                        switch (pixelTypeByKey.get(key)) {
                                            case (null) {
                                                let idx = pixels.size();
                                                pixels.add({
                                                    x = nNx;
                                                    y = nNy;
                                                    pixelType = newPixelType;
                                                    age = 0;
                                                });
                                                pixelTypeByKey.put(key, newPixelType);
                                                pixelIndexByKey.put(key, idx);

                                                tips.add({
                                                    x = nx;
                                                    y = ny;
                                                    dirX = dx;
                                                    dirY = dy;
                                                    tipType = tip.tipType;
                                                    life = newLife;
                                                    curve = newCurve;
                                                });
                                            };
                                            case (?#leaf) {
                                                // React allows wood to overwrite leaves.
                                                switch (pixelIndexByKey.get(key)) {
                                                    case (?idx) {
                                                        pixels.put(idx, { x = nNx; y = nNy; pixelType = newPixelType; age = 0 });
                                                        pixelTypeByKey.put(key, newPixelType);

                                                        tips.add({
                                                            x = nx;
                                                            y = ny;
                                                            dirX = dx;
                                                            dirY = dy;
                                                            tipType = tip.tipType;
                                                            life = newLife;
                                                            curve = newCurve;
                                                        });
                                                    };
                                                    case (_) {};
                                                };
                                            };
                                            case (_) {
                                                // Blocked by wood - spawn foliage if branch
                                                let trunkCenterX : Int = GRID_W / 2;
                                                let distanceFromTrunk = Int.abs(tip.x - trunkCenterX);
                                                let isHighEnough = tip.y < (GRID_H * 60 / 100);

                                                switch (tip.tipType) {
                                                    case (#branch) {
                                                        if (distanceFromTrunk >= 3 or isHighEnough) {
                                                            let foliageLife = 6 + digits.leafDensity / 2;
                                                            tips.add({
                                                                x = tip.x;
                                                                y = tip.y;
                                                                dirX = tip.dirX;
                                                                dirY = tip.dirY;
                                                                tipType = #foliage_spawner;
                                                                life = foliageLife;
                                                                curve = tip.curve;
                                                            });
                                                        };
                                                    };
                                                    case (_) {};
                                                };
                                            };
                                        };
                                    };
                                    case (_) {};
                                };
                            };
                        };
                    };
                };
            };

            // React increments the step counter before thickening.
            stepCount += 1;

            // Thickening (Pipe Model) - every 3 steps
            if (stepCount % 3 == 0) {
                let pixelsArray = Buffer.toArray(pixels);
                for (p in pixelsArray.vals()) {
                    if (p.pixelType == #trunk) {
                        // React: heightFactor = Math.max(0, (p.y - 10) / 30) gives 0 at top, ~0.7 at base
                        // React: baseThickenChance = (digits.thickening / 30 + 0.15) * heightFactor gives 0.15-0.45 * heightFactor
                        // Convert to percentage (0-100 scale for integer comparison)
                        let heightFactor : Nat = if (p.y > 10) {
                            ((p.y - 10) * 100) / 30;
                        } else { 0 };
                        // (thickening/30 + 0.15) = (thickening + 4.5) / 30 ≈ (thickening * 100 + 450) / 3000
                        // Then multiply by heightFactor/100 and scale to 0-100
                        let baseThickenChance : Nat = ((digits.thickening * 100 + 450) * heightFactor) / 3000;

                        // Match React's intent but keep pixels in-bounds (Motoko uses Nat).
                        let xI : Int = p.x;
                        let yI : Int = p.y;
                        let leftX : Int = xI - 1;
                        let rightX : Int = xI + 1;

                        // Pseudo-random for left side based only on step and position
                        let randomLeft = (((stepCount * 37 + p.x * 19 + p.y * 23) * 73) % 100);
                        if (randomLeft < baseThickenChance and isValid(leftX, yI)) {
                            switch (natFromInt(leftX)) {
                                case (?leftNat) {
                                    let leftKey = getPixelKey(leftNat, p.y);
                                    if (pixelTypeByKey.get(leftKey) == null) {
                                        let idx = pixels.size();
                                        pixels.add({
                                            x = leftNat;
                                            y = p.y;
                                            pixelType = #trunk_thick;
                                            age = 0;
                                        });
                                        pixelTypeByKey.put(leftKey, #trunk_thick);
                                        pixelIndexByKey.put(leftKey, idx);
                                    };
                                };
                                case (_) {};
                            };
                        };

                        // Pseudo-random for right side based only on step and position
                        let randomRight = (((stepCount * 41 + p.x * 29 + p.y * 31) * 79) % 100);
                        if (randomRight < baseThickenChance and isValid(rightX, yI)) {
                            switch (natFromInt(rightX)) {
                                case (?rightNat) {
                                    let rightKey = getPixelKey(rightNat, p.y);
                                    if (pixelTypeByKey.get(rightKey) == null) {
                                        let idx = pixels.size();
                                        pixels.add({
                                            x = rightNat;
                                            y = p.y;
                                            pixelType = #trunk_thick;
                                            age = 0;
                                        });
                                        pixelTypeByKey.put(rightKey, #trunk_thick);
                                        pixelIndexByKey.put(rightKey, idx);
                                    };
                                };
                                case (_) {};
                            };
                        };
                    };
                };
            };
        };

        Buffer.toArray(pixels);
    };

    public func canTreeGrow(digits : Types.GrowthDigits, currentSteps : Nat) : Bool {
        // Simulate actual growth to check if any tips remain active
        let startX : Int = GRID_W / 2;
        let startY : Int = GRID_H - 1;

        var pixelMap = HashMap.HashMap<Text, Bool>(100, Text.equal, Text.hash);
        var tips = Buffer.Buffer<Types.GrowthTip>(10);

        // Initialize main trunk tip
        tips.add({
            x = startX;
            y = startY - 2;
            dirX = 0;
            dirY = -1;
            tipType = #trunk;
            life = MAX_TRUNK_HEIGHT;
            curve = if (digits.trunkCurve >= 5) { 1 } else { -1 };
        });

        var stepCount : Nat = 0;

        // Simulate actual growth up to currentSteps
        while (stepCount < currentSteps and tips.size() > 0) {
            let currentTips = Buffer.toArray(tips);
            tips := Buffer.Buffer<Types.GrowthTip>(10);

            let stepCountI : Int = stepCount;

            for (tip in currentTips.vals()) {
                if (tip.life <= 0) {
                    // Tip died - check if it spawns foliage
                    let trunkCenterX : Int = GRID_W / 2;
                    let distanceFromTrunk = Int.abs(tip.x - trunkCenterX);
                    let isHighEnough = tip.y < (GRID_H * 60 / 100);

                    if (tip.tipType == #branch and (distanceFromTrunk >= 3 or isHighEnough)) {
                        let foliageLife = 6 + digits.leafDensity / 2;
                        tips.add({
                            x = tip.x;
                            y = tip.y;
                            dirX = tip.dirX;
                            dirY = tip.dirY;
                            tipType = #foliage_spawner;
                            life = foliageLife;
                            curve = tip.curve;
                        });
                    };
                } else {
                    // Match React: let newLife = tip.life - 1 (done at start for all tips)
                    // Safe for Nat since we know tip.life > 0 from the if condition above
                    let newLife : Nat = if (tip.life > 0) { tip.life - 1 } else {
                        0;
                    };
                    var dx = tip.dirX;
                    var dy = tip.dirY;
                    var newCurve = tip.curve;

                    // Simulate tip behavior based on type
                    switch (tip.tipType) {
                        case (#trunk) {
                            // React: 3 + Math.floor(digits.curveChange * 0.8) gives 3-10
                            let changeFreq = 3 + (digits.curveChange * 8) / 10;
                            if (tip.life % changeFreq == 0) {
                                newCurve := -newCurve;
                            };
                            let shouldCurve = (stepCount % 8) < digits.trunkCurve;
                            dx := if (shouldCurve) { newCurve } else { 0 };
                            dy := -1;

                            // Check for branch spawning - random seed based only on step/position
                            let randomSeed = Int.abs(((stepCountI * 31 + tip.x * 17 + tip.y * 13 + (tip.life : Int) * 7) * 97) % 100);
                            let baseSpawnChance = 50 + (digits.branchSpawn * 100 / 12);
                            let spawnChance = if (baseSpawnChance > 100) { 100 } else {
                                baseSpawnChance;
                            };

                            if ((tip.life + 2 < MAX_TRUNK_HEIGHT) and randomSeed < spawnChance) {
                                let branchDirX = if (digits.branchDir >= 5) {
                                    1;
                                } else { -1 };
                                let heightBonus : Nat = if (tip.y > 10) {
                                    Int.abs((tip.y - 10) / 3);
                                } else { 0 };
                                // React: (10 + digits.branchLength * 1.5) * gridScale + heightBonus
                                let gridScale : Nat = GRID_H / 32;
                                let branchLife : Nat = ((10 + (digits.branchLength * 15) / 10) * gridScale) + heightBonus;
                                tips.add({
                                    x = tip.x;
                                    y = tip.y;
                                    dirX = branchDirX;
                                    dirY = 0;
                                    tipType = #branch;
                                    life = branchLife;
                                    curve = branchDirX;
                                });
                            };
                        };
                        case (#branch) {
                            let shouldGoUp = (digits.branchAngle >= 3) and (stepCount % 2 == 0);
                            dy := if (shouldGoUp) { -1 } else { 0 };
                            dx := if (stepCount % 5 == 0) { 0 } else {
                                tip.curve;
                            };
                        };
                        case (#foliage_spawner) {
                            // Spawner continues for its life
                            // React decrements spawner life twice per step.
                            let spawnerLife : Nat = if (newLife > 0) {
                                newLife - 1;
                            } else { 0 };
                            if (spawnerLife > 0) {
                                tips.add({
                                    x = tip.x;
                                    y = tip.y;
                                    dirX = tip.dirX;
                                    dirY = tip.dirY;
                                    tipType = #foliage_spawner;
                                    life = spawnerLife;
                                    curve = tip.curve;
                                });
                            };
                        };
                    };

                    // Execute move (not for spawners)
                    if (tip.tipType != #foliage_spawner) {
                        let nx = tip.x + dx;
                        let ny = tip.y + dy;

                        if (isValid(nx, ny)) {
                            let key = getPixelKey(Int.abs(nx), Int.abs(ny));
                            if (pixelMap.get(key) == null) {
                                pixelMap.put(key, true);
                                tips.add({
                                    x = nx;
                                    y = ny;
                                    dirX = dx;
                                    dirY = dy;
                                    tipType = tip.tipType;
                                    life = newLife;
                                    curve = newCurve;
                                });
                            } else {
                                // Blocked - spawn foliage if branch
                                let trunkCenterX : Int = GRID_W / 2;
                                let distanceFromTrunk = Int.abs(tip.x - trunkCenterX);
                                let isHighEnough = tip.y < (GRID_H * 60 / 100);

                                if (tip.tipType == #branch and (distanceFromTrunk >= 3 or isHighEnough)) {
                                    let foliageLife = 6 + digits.leafDensity / 2;
                                    tips.add({
                                        x = tip.x;
                                        y = tip.y;
                                        dirX = tip.dirX;
                                        dirY = tip.dirY;
                                        tipType = #foliage_spawner;
                                        life = foliageLife;
                                        curve = tip.curve;
                                    });
                                };
                            };
                        };
                    };
                };
            };
            stepCount += 1;
        };

        // If we have active tips after simulating current steps, tree can still grow
        tips.size() > 0;
    };

    func getPixelColor(pixel : Types.Pixel, digits : Types.GrowthDigits) : Text {
        switch (pixel.pixelType) {
            case (#root) { "#5D4037" };
            case (#trunk) { "#795548" };
            case (#trunk_thick) { "#795548" };
            case (#branch) { "#8D6E63" };
            case (#leaf) {
                let colorSeed = (pixel.x * 7 + pixel.y * 13) % 10;
                if (colorSeed < digits.leafDensity) { "#66BB6A" } else {
                    "#2E7D32";
                };
            };
        };
    };

    public func buildOptimizedSVG(walletBalance : Float, growthPixels : [Types.Pixel], title : Text) : Text {
        // Extract digits once and use for both tree growth pattern and background color
        let digits = getGrowthDigits(walletBalance);
        let bgColor = getBackgroundColor(digits);
        let initialPixels = initializeTree();

        // Match React: merge initial pixels with growth pixels (avoid duplicates), preserving insertion order.
        let allPixelsBuf = Buffer.Buffer<Types.Pixel>(initialPixels.size() + growthPixels.size());
        let seen = HashMap.HashMap<Text, Bool>(initialPixels.size() + growthPixels.size(), Text.equal, Text.hash);
        for (p in initialPixels.vals()) {
            let k = getPixelKey(p.x, p.y);
            if (seen.get(k) == null) {
                seen.put(k, true);
                allPixelsBuf.add(p);
            };
        };
        for (p in growthPixels.vals()) {
            let k = getPixelKey(p.x, p.y);
            if (seen.get(k) == null) {
                seen.put(k, true);
                allPixelsBuf.add(p);
            };
        };
        let allPixels = Buffer.toArray(allPixelsBuf);

        let score = calculateTreeScore(growthPixels);

        var svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 " #
        Nat.toText(GRID_W) # " " # Nat.toText(GRID_H) #
        "\" preserveAspectRatio=\"xMidYMid meet\">";

        // A11y / nicer filenames when saved from browsers
        svg #= "<title>" # title # "</title>";

        svg #= "<rect width=\"" # Nat.toText(GRID_W) # "\" height=\"" # Nat.toText(GRID_H) #
        "\" fill=\"" # bgColor # "\" stroke=\"#3b3d5c\" stroke-width=\"0.5\"/>";

        for (pixel in allPixels.vals()) {
            let color = getPixelColor(pixel, digits);
            if (pixel.pixelType == #leaf) {
                svg #= "<circle cx=\"" # Nat.toText(pixel.x) # ".5\" cy=\"" #
                Nat.toText(pixel.y) # ".5\" r=\"0.45\" fill=\"" # color # "\"/>";
            } else {
                svg #= "<rect x=\"" # Nat.toText(pixel.x) # "\" y=\"" #
                Nat.toText(pixel.y) # "\" width=\"1\" height=\"1\" fill=\"" # color # "\"/>";
            };
        };

        let scoreColor = if (score.total >= 75) {
            "#66BB6A";
        } else if (score.total >= 50) { "#FFA726" } else if (score.total >= 25) {
            "#76c7c0";
        } else { "#888" };

        // Helper function to pad numbers
        func padStart(n : Nat, width : Nat) : Text {
            let str = Nat.toText(n);
            let len = str.size();
            if (len >= width) { return str };

            var padding = "";
            let widthI : Int = width;
            let lenI : Int = len;
            let paddingCount : Int = widthI - lenI;
            var i : Int = 0;
            while (i < paddingCount) {
                padding #= " ";
                i += 1;
            };
            padding # str;
        };

        svg #= "<text x=\"1\" y=\"" # Nat.toText(GRID_H - 7) #
        "\" font-family=\"monospace\" font-size=\"1.2\" font-weight=\"bold\" fill=\"" # scoreColor #
        "\">⌛" # padStart(score.age, 5) # "</text>";

        svg #= "<text x=\"1\" y=\"" # Nat.toText(GRID_H - 5) #
        "\" font-family=\"monospace\" font-size=\"1.2\" font-weight=\"bold\" fill=\"" # scoreColor #
        "\">🌱" # padStart(score.branches, 5) # "</text>";

        svg #= "<text x=\"1\" y=\"" # Nat.toText(GRID_H - 3) #
        "\" font-family=\"monospace\" font-size=\"1.2\" font-weight=\"bold\" fill=\"#66BB6A\">🍀" #
        padStart(score.foliage, 5) # "</text>";

        svg #= "<text x=\"1\" y=\"" # Nat.toText(GRID_H - 1) #
        "\" font-family=\"monospace\" font-size=\"1.2\" font-weight=\"bold\" fill=\"" # scoreColor #
        "\">⭐" # padStart(score.total, 5) # "/100</text>";

        svg #= "</svg>";
        svg;
    };
};
