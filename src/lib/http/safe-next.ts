/**
 * Sanitise a post-login `?next=` redirect target so it can only ever point back
 * into this site. Guards against open-redirect tricks — absolute URLs,
 * protocol-relative `//host`, and backslash variants like `/\host` that some
 * browsers normalise to `//host`. Returns a safe same-origin path, or the
 * fallback when anything looks off.
 */
export function safeNext(raw: string | null | undefined, fallback = "/staff"): string {
  if (!raw) return fallback;
  // Must be a single-slash absolute path: `/x...`, never `//`, `/\`, or a scheme.
  if (!/^\/[^/\\]/.test(raw)) return fallback;
  try {
    // Resolve against a throwaway origin; if it escapes that origin, reject.
    const u = new URL(raw, "http://localhost");
    if (u.origin !== "http://localhost") return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
