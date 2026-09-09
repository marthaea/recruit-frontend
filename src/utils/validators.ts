/** Standard email shape check — not exhaustive RFC 5322, just catches obvious typos. */
export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

/**
 * Accepts local Ugandan formats (0771234567) and international ones with a
 * country code (+256771234567, 256771234567, +1 555 123 4567, etc.) — digits
 * only after stripping spaces/dashes/parens, with a sensible length range.
 */
export function isValidPhone(s: string): boolean {
  const stripped = s.trim().replace(/[\s\-()]/g, "");
  return /^\+?\d{7,15}$/.test(stripped);
}

/** Requires at least two words — catches a single name typed into a "full name" field. */
export function isFullName(s: string): boolean {
  return s.trim().split(/\s+/).filter(Boolean).length >= 2;
}
