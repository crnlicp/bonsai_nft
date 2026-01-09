import Char "mo:base/Char";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Blob "mo:base/Blob";

module {
    public class HelperFunctions() {
        public func hexCharToNat8(c : Char) : { #Ok : Nat8; #Err : Text } {
            let n = Char.toNat32(c);
            if (n >= 48 and n <= 57) {
                // 0-9
                return #Ok(Nat8.fromNat(Nat32.toNat(n - 48)));
            };
            if (n >= 65 and n <= 70) {
                // A-F
                return #Ok(Nat8.fromNat(Nat32.toNat(n - 55)));
            };
            if (n >= 97 and n <= 102) {
                // a-f
                return #Ok(Nat8.fromNat(Nat32.toNat(n - 87)));
            };
            #Err("Invalid hex character");
        };

        public func hexToBlob32(hex : Text) : { #Ok : Blob; #Err : Text } {
            if (Text.size(hex) != 64) {
                return #Err("Expected 64 hex characters (32 bytes)");
            };
            let chars = Iter.toArray(hex.chars());
            if (chars.size() != 64) {
                return #Err("Invalid hex text");
            };

            var out : [var Nat8] = Array.init<Nat8>(32, 0);
            var i : Nat = 0;
            while (i < 32) {
                let hi = chars[i * 2];
                let lo = chars[i * 2 + 1];
                let nhi = switch (hexCharToNat8(hi)) {
                    case (#Ok(v)) { v };
                    case (#Err(e)) { return #Err(e) };
                };
                let nlo = switch (hexCharToNat8(lo)) {
                    case (#Ok(v)) { v };
                    case (#Err(e)) { return #Err(e) };
                };
                out[i] := (nhi << 4) + nlo;
                i += 1;
            };
            #Ok(Blob.fromArray(Array.freeze(out)));
        };

        public func textToNat(text : Text) : ?Nat {
            var num : Nat = 0;
            for (char in text.chars()) {
                let charNat32 = Char.toNat32(char);
                if (charNat32 < 48 or charNat32 > 57) { return null };
                // Use Nat32 subtraction which is safe, then convert to Nat
                let digit = Nat32.toNat(charNat32 - 48);
                num := num * 10 + digit;
            };
            ?num;
        };
    };
};
