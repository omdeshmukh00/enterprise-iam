import crypto from 'crypto';

/**
 * PKCE (RFC 7636) Utility for Authorization Code with PKCE.
 * Enforces S256 code challenge method.
 */

export function generateCodeVerifier(length = 64): string {
  return crypto.randomBytes(length).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier, 'utf8').digest('base64url');
}

export function verifyCodeChallenge(
  verifier: string,
  challenge: string,
  method = 'S256'
): boolean {
  if (method !== 'S256') {
    return false;
  }

  if (!verifier || !challenge) {
    return false;
  }

  const computed = generateCodeChallenge(verifier);

  try {
    const computedBuf = Buffer.from(computed);
    const challengeBuf = Buffer.from(challenge);

    if (computedBuf.length !== challengeBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuf, challengeBuf);
  } catch {
    return false;
  }
}
