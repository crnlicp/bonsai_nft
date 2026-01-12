import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Char "mo:base/Char";
import Buffer "mo:base/Buffer";

module {
    // Deterministic, human-friendly naming for bonsais.
    // Goal: same (tokenId, mintedAt) => same name + slug forever.

    // Keep these lists ASCII-only to avoid XML escaping hassles in SVG.
    let ADJECTIVES : [Text] = [
        "Misty",
        "Quiet",
        "Amber",
        "Verdant",
        "Ivory",
        "Saffron",
        "Silver",
        "Golden",
        "Cobalt",
        "Crimson",
        "Jade",
        "Indigo",
        "Rustic",
        "Gentle",
        "Noble",
        "Wandering",
        "Blooming",
        "Ancient",
        "Radiant",
        "Hidden",
        "Luminous",
        "Brisk",
        "Velvet",
        "Hearth",
        "Dewy",
        "Breezy",
        "Stone",
        "Cloud",
        "River",
        "Forest",
        "Starlit",
        "Moonlit",
    ];

    let STYLES : [Text] = [
        "Upright",
        "Cascade",
        "Windswept",
        "Slanting",
        "Twin Trunk",
        "Literati",
        "Broom",
        "Raft",
        "Cliff",
        "Harmony",
        "Whisper",
        "Zen",
        "Drift",
        "Echo",
        "Solstice",
        "Dawn",
    ];

    let SPECIES : [Text] = [
        "Juniper",
        "Maple",
        "Pine",
        "Elm",
        "Ficus",
        "Azalea",
        "Cedar",
        "Olive",
        "Spruce",
        "Willow",
        "Cherry",
        "Birch",
    ];

    // Hash (tokenId, mintedAt) into a 32-bit seed.
    private func seed32(tokenId : Nat, mintedAt : Int) : Nat32 {
        // mintedAt can be negative in theory; normalize.
        let t = Int.toText(Int.abs(mintedAt));
        let s = Nat.toText(tokenId) # ":" # t;
        Text.hash(s);
    };

    // Simple xorshift32 PRNG step (deterministic).
    private func next(x : Nat32) : Nat32 {
        var y = x;
        y := y ^ (y << 13);
        y := y ^ (y >> 17);
        y := y ^ (y << 5);
        y;
    };

    private func pick(list : [Text], x : Nat32) : Text {
        if (list.size() == 0) { return "Bonsai" };
        let idx = Nat32.toNat(x) % list.size();
        list[idx];
    };

    private func digit36(n : Nat) : Char {
        if (n < 10) {
            Char.fromNat32(Nat32.fromNat(n + 48)); // '0'
        } else {
            Char.fromNat32(Nat32.fromNat((n - 10) + 65)); // 'A'
        };
    };

    private func base36Fixed(n0 : Nat32, width : Nat) : Text {
        // Produces exactly width chars, left-padded with '0'.
        if (width == 0) { return "" };

        var n = Nat32.toNat(n0);
        let buf = Buffer.Buffer<Char>(width);
        for (_ in Iter.range(0, width - 1)) {
            buf.add('0');
        };

        var pos : Nat = width;
        while (pos > 0) {
            pos -= 1;
            let d = n % 36;
            buf.put(pos, digit36(d));
            n := n / 36;
        };

        Text.fromIter(Iter.fromArray(Buffer.toArray(buf)));
    };

    public func displayName(tokenId : Nat, mintedAt : Int) : Text {
        let s0 = seed32(tokenId, mintedAt);
        let s1 = next(s0);
        let s2 = next(s1);

        let adjective = pick(ADJECTIVES, s0);
        let style = pick(STYLES, s1);
        let species = pick(SPECIES, s2);
        let tag = base36Fixed(s2, 4);

        adjective # " " # style # " " # species # " " # tag;
    };

    public func slug(tokenId : Nat, mintedAt : Int) : Text {
        // slug derived from the same deterministic parts
        let name = displayName(tokenId, mintedAt);
        // Since the generated name is ASCII letters/spaces + '·', a simple slug transform works.
        // Replace spaces with '-', drop the '·', and lowercase.
        // Lowercasing: only affects A-Z.
        var out = "";
        for (c in name.chars()) {
            if (c == ' ') {
                out #= "-";
            } else if (c == '·') {
                // drop
            } else {
                let n = Char.toNat32(c);
                if (n >= 65 and n <= 90) {
                    // ASCII to lower
                    let lower = Char.fromNat32(n + 32);
                    out #= Text.fromChar(lower);
                } else {
                    out #= Text.fromChar(c);
                };
            };
        };
        out;
    };

    public func svgFileName(tokenId : Nat, mintedAt : Int) : Text {
        slug(tokenId, mintedAt) # ".svg";
    };
};
