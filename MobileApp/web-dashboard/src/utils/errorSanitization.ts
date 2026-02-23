/**
 * Sanitize server error messages before displaying to users.
 *
 * Uses a combination of exact-match allowlist and strict structural patterns
 * so that only known-safe messages are shown. Everything else falls through
 * to the caller-provided i18n fallback string.
 */

const KNOWN_SAFE_MESSAGES = new Set([
  'order not found',
  'customer not found',
  'not found',
  'permission denied',
  'insufficient permissions',
  'unauthorized',
  'forbidden',
  'session expired',
  'token expired',
  'already exists',
  'order already exists',
  'status is required',
  'customer_id is required',
  'invalid status value',
  'invalid priority value',
  'cannot delete completed order',
  'cannot update completed order',
  'invalid status transition',
]);

/**
 * Strict structural patterns — the entire string must match.
 * Only allows simple "noun phrase + verb phrase" messages
 * composed of word characters and spaces.
 */
const SAFE_STRUCTURAL_PATTERNS = [
  /^[\w\s]{1,60} not found$/i,
  /^[\w\s]{1,60} is required$/i,
  /^[\w\s]{1,60} already exists$/i,
  /^cannot [\w\s]{1,80}$/i,
];

export function sanitizeServerError(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (trimmed.length > 120) return fallback;
  if (KNOWN_SAFE_MESSAGES.has(trimmed.toLowerCase())) return trimmed;
  if (SAFE_STRUCTURAL_PATTERNS.some((p) => p.test(trimmed))) return trimmed;
  return fallback;
}
