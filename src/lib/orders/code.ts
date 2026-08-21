/**
 * Short human-readable order codes. A customer reads or shows this code (and its
 * QR) to a server, so the alphabet drops visually ambiguous characters
 * (0/O, 1/I/L) — no misreads across a dim table.
 *
 * `generateOrderCode` is pure and collision-oblivious; `createOrder` re-tries
 * against the unique index if two codes ever clash.
 */

/** Unambiguous uppercase alphabet + digits (no 0 O 1 I L). */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const DEFAULT_LENGTH = 6;

/**
 * A random order code, e.g. "B7K2Q9". Uses crypto for uniform, unguessable
 * picks (the code doubles as the capability token for the tracking page).
 */
export function generateOrderCode(length: number = DEFAULT_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
