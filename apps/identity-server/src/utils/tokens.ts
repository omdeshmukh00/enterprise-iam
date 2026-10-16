import crypto from 'crypto';

/**
 * Generate a cryptographically secure random opaque token.
 * 32 bytes = 256 bits of entropy.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a SHA-256 hash of a raw token.
 * Used to store only hashed versions of tokens in the database.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Timing-safe string comparison to protect against timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
