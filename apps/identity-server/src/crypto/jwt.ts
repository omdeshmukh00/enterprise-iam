import crypto from 'crypto';
import { getPrivateKey, getPublicKey, getKeyId } from './keys.js';

export interface JwtPayload {
  iss?: string;
  sub: string;
  aud?: string | string[];
  exp: number; // Unix timestamp in seconds
  nbf?: number;
  iat?: number;
  jti?: string;
  nonce?: string;
  [key: string]: any;
}

export interface SignJwtOptions {
  issuer?: string;
  audience?: string | string[];
  expiresInSeconds: number;
  nonce?: string;
}

export interface VerifyJwtOptions {
  issuer?: string;
  audience?: string;
  clockToleranceSeconds?: number;
}

function base64UrlEncode(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
  return buf.toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

/**
 * Signs a JWT using RS256 and the persistent RSA private key.
 */
export function signJwt(payload: Record<string, any>, options: SignJwtOptions): string {
  const privateKey = getPrivateKey();
  const kid = getKeyId();
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid,
  };

  const fullPayload: JwtPayload = {
    ...payload,
    sub: payload.sub,
    iss: options.issuer || process.env.JWT_ISSUER || 'http://localhost:5000',
    aud: options.audience || process.env.JWT_AUDIENCE || 'identityhub-api',
    iat: payload.iat || now,
    exp: payload.exp || now + options.expiresInSeconds,
    jti: payload.jti || crypto.randomUUID(),
  };

  if (options.nonce) {
    fullPayload.nonce = options.nonce;
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(privateKey, 'base64url');

  return `${signingInput}.${signature}`;
}

/**
 * Verifies a JWT's RS256 signature, expiry, and optional claims.
 */
export function verifyJwt<T extends JwtPayload = JwtPayload>(
  token: string,
  options: VerifyJwtOptions = {}
): T {
  if (!token || typeof token !== 'string') {
    throw new Error('JWT token must be a non-empty string');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT: must consist of 3 parts separated by dots');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Verify signature with RSA public key
  const publicKey = getPublicKey();
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(signingInput);
  const isValid = verifier.verify(publicKey, signature, 'base64url');

  if (!isValid) {
    throw new Error('Invalid JWT cryptographic signature');
  }

  // Parse payload
  let payload: T;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new Error('Failed to parse JWT payload JSON');
  }

  const now = Math.floor(Date.now() / 1000);
  const tolerance = options.clockToleranceSeconds || 30;

  // Check expiration
  if (payload.exp && payload.exp + tolerance < now) {
    throw new Error(`JWT has expired (exp: ${payload.exp}, current: ${now})`);
  }

  // Check not before
  if (payload.nbf && payload.nbf - tolerance > now) {
    throw new Error(`JWT not active yet (nbf: ${payload.nbf}, current: ${now})`);
  }

  // Check issuer
  if (options.issuer && payload.iss !== options.issuer) {
    throw new Error(`JWT issuer mismatch (expected: ${options.issuer}, got: ${payload.iss})`);
  }

  // Check audience
  if (options.audience) {
    const audArray = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audArray.includes(options.audience)) {
      throw new Error(`JWT audience mismatch (expected: ${options.audience})`);
    }
  }

  return payload;
}
