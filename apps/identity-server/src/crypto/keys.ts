import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

let privateKeyCached: string | null = null;
let publicKeyCached: string | null = null;

const KEY_ID = process.env.JWT_KEY_ID || 'identityhub-key-01';

/**
 * Resolves the RSA private key for signing JWTs.
 */
export function getPrivateKey(): string {
  if (privateKeyCached) return privateKeyCached;

  // Try file path from env or local directory
  const keyPaths = [
    process.env.JWT_PRIVATE_KEY_PATH,
    path.resolve(process.cwd(), 'jwt-private.pem'),
    path.resolve(process.cwd(), 'apps/identity-server/jwt-private.pem'),
  ].filter(Boolean) as string[];

  for (const p of keyPaths) {
    try {
      if (fs.existsSync(p)) {
        privateKeyCached = fs.readFileSync(p, 'utf-8').trim();
        return privateKeyCached;
      }
    } catch {
      // try next
    }
  }

  // Fallback to base64 env
  if (process.env.JWT_PRIVATE_KEY_B64) {
    try {
      privateKeyCached = Buffer.from(process.env.JWT_PRIVATE_KEY_B64, 'base64').toString('utf-8').trim();
      return privateKeyCached;
    } catch {
      // ignore
    }
  }

  throw new Error('JWT private key could not be loaded from configured paths or environment.');
}

/**
 * Resolves the RSA public key for verifying JWTs and JWKS export.
 */
export function getPublicKey(): string {
  if (publicKeyCached) return publicKeyCached;

  const keyPaths = [
    process.env.JWT_PUBLIC_KEY_PATH,
    path.resolve(process.cwd(), 'jwt-public.pem'),
    path.resolve(process.cwd(), 'apps/identity-server/jwt-public.pem'),
  ].filter(Boolean) as string[];

  for (const p of keyPaths) {
    try {
      if (fs.existsSync(p)) {
        publicKeyCached = fs.readFileSync(p, 'utf-8').trim();
        return publicKeyCached;
      }
    } catch {
      // try next
    }
  }

  if (process.env.JWT_PUBLIC_KEY_B64) {
    try {
      publicKeyCached = Buffer.from(process.env.JWT_PUBLIC_KEY_B64, 'base64').toString('utf-8').trim();
      return publicKeyCached;
    } catch {
      // ignore
    }
  }

  throw new Error('JWT public key could not be loaded from configured paths or environment.');
}

export function getKeyId(): string {
  return KEY_ID;
}

/**
 * Exports JWKS representation of the public signing key.
 */
export function getJwks() {
  const pubPem = getPublicKey();
  const keyObj = crypto.createPublicKey(pubPem);
  const jwk = keyObj.export({ format: 'jwk' });

  return {
    keys: [
      {
        kty: jwk.kty || 'RSA',
        use: 'sig',
        alg: 'RS256',
        kid: KEY_ID,
        n: jwk.n,
        e: jwk.e,
      },
    ],
  };
}
