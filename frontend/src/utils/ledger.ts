import { Principal } from '@dfinity/principal';
import { sha224 } from '@dfinity/principal/lib/cjs/utils/sha224';

// ICP Ledger Canister ID
export const ICP_LEDGER_CANISTER_ID = import.meta.env.CANISTER_ID_ICP_LEDGER_CANISTER;

// Standard ICP transfer fee
export const ICP_FEE = 10_000n; // 0.0001 ICP in e8s

/**
 * Convert Principal to Account Identifier (for ICP Ledger)
 * Based on the ICRC-1 standard account identifier generation
 */
export function principalToAccountIdentifier(principal: Principal, subaccount?: Uint8Array): Uint8Array {
    const principalBytes = principal.toUint8Array();

    // Default subaccount (32 bytes of zeros)
    const sub = subaccount || new Uint8Array(32);

    // Create the account identifier: hash("\x0Aaccount-id" + principal + subaccount)
    const domainSeparator = new TextEncoder().encode('\x0Aaccount-id');
    const combined = new Uint8Array(domainSeparator.length + principalBytes.length + sub.length);
    combined.set(domainSeparator);
    combined.set(principalBytes, domainSeparator.length);
    combined.set(sub, domainSeparator.length + principalBytes.length);

    const hashResult = sha224(combined.buffer);
    const hash = hashResult instanceof Uint8Array ? hashResult : new Uint8Array(hashResult);

    // Add CRC32 checksum
    const crc = crc32(hash);
    const accountId = new Uint8Array(32);
    accountId.set(crc);
    accountId.set(hash, 4);

    return accountId;
}

/**
 * Calculate CRC32 checksum
 */
function crc32(bytes: Uint8Array): Uint8Array {
    const table = makeCrc32Table();
    let crc = 0xFFFFFFFF;

    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xFF];
    }

    crc = crc ^ 0xFFFFFFFF;

    // Return as 4-byte big-endian
    return new Uint8Array([
        (crc >> 24) & 0xFF,
        (crc >> 16) & 0xFF,
        (crc >> 8) & 0xFF,
        crc & 0xFF
    ]);
}

/**
 * Generate CRC32 lookup table
 */
function makeCrc32Table(): Uint32Array {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }
    return table;
}

/**
 * Convert hex string to Uint8Array
 */
export function toHexString(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
