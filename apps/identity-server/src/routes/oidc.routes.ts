import { Router, Request, Response } from 'express';
import { getJwks } from '../crypto/keys.js';
import { verifyJwt } from '../crypto/jwt.js';
import { prisma } from '../config/database.js';

const router: Router = Router();

const ISSUER = process.env.OIDC_ISSUER || 'http://localhost:5000';

/**
 * OpenID Connect Discovery Metadata Endpoint
 * RFC 8414 / OpenID Connect Discovery 1.0
 */
router.get(['/.well-known/openid-configuration', '/oidc/.well-known/openid-configuration'], (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/oauth/authorize`,
    token_endpoint: `${ISSUER}/oauth/token`,
    userinfo_endpoint: `${ISSUER}/oidc/userinfo`,
    jwks_uri: `${ISSUER}/.well-known/jwks.json`,
    revocation_endpoint: `${ISSUER}/oauth/revoke`,
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'profile', 'email', 'admin'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
    claims_supported: [
      'sub',
      'iss',
      'aud',
      'exp',
      'iat',
      'email',
      'email_verified',
      'name',
      'given_name',
      'family_name',
      'role',
    ],
    code_challenge_methods_supported: ['S256'],
    grant_types_supported: ['authorization_code'],
  });
});

/**
 * JSON Web Key Set (JWKS) Endpoint
 * RFC 7517
 */
router.get(['/.well-known/jwks.json', '/oidc/.well-known/jwks.json'], (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(getJwks());
});

/**
 * OpenID Connect UserInfo Endpoint
 * OpenID Connect Core 1.0 section 5.3
 */
router.get('/oidc/userinfo', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'invalid_token', error_description: 'Bearer token required' });
    }

    const token = authHeader.substring(7).trim();
    const payload = verifyJwt(token, {
      issuer: ISSUER,
      audience: 'identityhub-api',
    });

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status === 'SUSPENDED') {
      return res.status(401).json({ error: 'invalid_token', error_description: 'User not found or suspended' });
    }

    return res.json({
      sub: user.id,
      email: user.email,
      email_verified: user.emailVerified,
      name: `${user.firstName} ${user.lastName}`.trim(),
      given_name: user.firstName,
      family_name: user.lastName,
      role: user.role,
    });
  } catch (err: any) {
    return res.status(401).json({ error: 'invalid_token', error_description: err.message || 'Invalid access token' });
  }
});

export default router;
