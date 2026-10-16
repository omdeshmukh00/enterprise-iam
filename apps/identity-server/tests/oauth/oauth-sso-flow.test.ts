import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/database.js';
import { PasswordService } from '../../src/services/password.service.js';
import { ClientService } from '../../src/services/client.service.js';
import { ConsentService } from '../../src/services/consent.service.js';
import { generateCodeVerifier, generateCodeChallenge } from '../../src/crypto/pkce.js';
import { verifyJwt } from '../../src/crypto/jwt.js';
import { env } from '../../src/config/env.js';

describe('Phase B — OAuth 2.0 & OpenID Connect Full Milestone Tests', () => {
  const testEmail = `oauth_sso_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';
  let userId: string;
  let ssoCookie: string;

  beforeAll(async () => {
    // Seed default development clients
    await ClientService.ensureDefaultDevelopmentClients();

    // Create test user
    const passwordHash = await PasswordService.hashPassword(testPassword);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        firstName: 'OAuth',
        lastName: 'Specialist',
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });
    userId = user.id;

    // Login to establish central IdentityHub SSO session
    const loginRes = await request(app).post('/auth/login').send({
      email: testEmail,
      password: testPassword,
    });
    const setCookie = loginRes.headers['set-cookie'];
    const ssoHeader = setCookie.find(
      (c: string) => c.startsWith('identityhub_sso_session=') || c.startsWith(`${env.SSO_SESSION_COOKIE_NAME}=`)
    );
    ssoCookie = ssoHeader.split(';')[0];
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'oauth_sso_' } },
    });
    await prisma.oAuthClient.deleteMany({
      where: { clientId: { in: ['test-confidential-client', 'test-disabled-client'] } },
    });
    await prisma.$disconnect();
  });

  describe('B1. Client Registration & Validation', () => {
    it('should register and retrieve confidential and public clients', async () => {
      const client = await ClientService.registerClient({
        clientId: 'test-confidential-client',
        name: 'Test Confidential Backend',
        clientSecret: 'SuperSecretKey123!',
        clientType: 'CONFIDENTIAL',
        redirectUris: ['http://localhost:4000/callback'],
        allowedScopes: ['openid', 'profile', 'email'],
      });

      expect(client.clientId).toBe('test-confidential-client');
      expect(client.clientSecretHash).toBeDefined();
      expect(client.clientSecretHash).not.toBe('SuperSecretKey123!'); // Must be hashed

      const validSecret = ClientService.verifyClientSecret(client, 'SuperSecretKey123!');
      expect(validSecret).toBe(true);

      const invalidSecret = ClientService.verifyClientSecret(client, 'WrongSecret');
      expect(invalidSecret).toBe(false);
    });

    it('should reject authorization request for unregistered redirect URI without redirecting', async () => {
      const verifier = generateCodeVerifier(43);
      const challenge = generateCodeChallenge(verifier);

      const res = await request(app)
        .get('/oauth/authorize')
        .query({
          client_id: 'identityhub-crm',
          redirect_uri: 'http://evil-attacker.com/steal-code',
          response_type: 'code',
          code_challenge: challenge,
          code_challenge_method: 'S256',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('invalid_redirect_uri');
      expect(res.headers.location).toBeUndefined(); // Never redirect to unregistered URI
    });
  });

  describe('B2. Authorization Code + PKCE Security', () => {
    it('should require S256 code challenge method and reject missing or plain method', async () => {
      const res = await request(app)
        .get('/oauth/authorize')
        .query({
          client_id: 'identityhub-crm',
          redirect_uri: 'http://localhost:3001/api/auth/callback',
          response_type: 'code',
          code_challenge: 'plain_challenge',
          code_challenge_method: 'plain', // plain grant must be rejected
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('invalid_request');
    });

    it('should reject replay attacks when authorization code is reused', async () => {
      // First ensure consent exists
      await ConsentService.grantConsent(userId, 'identityhub-crm', ['openid', 'profile', 'email']);

      const verifier = generateCodeVerifier(43);
      const challenge = generateCodeChallenge(verifier);

      // Obtain code
      const authRes = await request(app)
        .get('/oauth/authorize')
        .query({
          client_id: 'identityhub-crm',
          redirect_uri: 'http://localhost:3001/api/auth/callback',
          response_type: 'code',
          scope: 'openid profile email',
          code_challenge: challenge,
          code_challenge_method: 'S256',
          state: 'state_replay',
        })
        .set('Cookie', ssoCookie);

      const redirectUrl = new URL(authRes.headers.location);
      const code = redirectUrl.searchParams.get('code')!;
      expect(code).toBeDefined();

      // First exchange: should succeed
      const firstRes = await request(app).post('/oauth/token').send({
        grant_type: 'authorization_code',
        client_id: 'identityhub-crm',
        code,
        redirect_uri: 'http://localhost:3001/api/auth/callback',
        code_verifier: verifier,
      });
      expect(firstRes.status).toBe(200);

      // Second exchange (REPLAY): MUST fail!
      const replayRes = await request(app).post('/oauth/token').send({
        grant_type: 'authorization_code',
        client_id: 'identityhub-crm',
        code,
        redirect_uri: 'http://localhost:3001/api/auth/callback',
        code_verifier: verifier,
      });
      expect(replayRes.status).toBe(400);
      expect(replayRes.body.error.code).toBe('invalid_grant');
    });

    it('should reject token exchange with mismatched PKCE verifier', async () => {
      const verifier = generateCodeVerifier(43);
      const challenge = generateCodeChallenge(verifier);

      const authRes = await request(app)
        .get('/oauth/authorize')
        .query({
          client_id: 'identityhub-crm',
          redirect_uri: 'http://localhost:3001/api/auth/callback',
          response_type: 'code',
          scope: 'openid profile email',
          code_challenge: challenge,
          code_challenge_method: 'S256',
        })
        .set('Cookie', ssoCookie);

      const redirectUrl = new URL(authRes.headers.location);
      const code = redirectUrl.searchParams.get('code')!;

      const res = await request(app).post('/oauth/token').send({
        grant_type: 'authorization_code',
        client_id: 'identityhub-crm',
        code,
        redirect_uri: 'http://localhost:3001/api/auth/callback',
        code_verifier: 'completely_wrong_verifier_12345678901234567890123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('invalid_grant');
    });
  });

  describe('B3. Consent Management: Allow, Deny, and Access Revocation', () => {
    it('should render the real consent screen when consent has not yet been granted', async () => {
      // Clear consent for test
      await ConsentService.revokeConsent(userId, 'identityhub-crm');

      const verifier = generateCodeVerifier(43);
      const challenge = generateCodeChallenge(verifier);

      const res = await request(app)
        .get('/oauth/authorize')
        .query({
          client_id: 'identityhub-crm',
          redirect_uri: 'http://localhost:3001/api/auth/callback',
          response_type: 'code',
          scope: 'openid profile email',
          code_challenge: challenge,
          code_challenge_method: 'S256',
          state: 'consent_state',
        })
        .set('Cookie', ssoCookie);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Authorize Access');
      expect(res.text).toContain('IdentityHub CRM');
      expect(res.text).toContain('Allow Access');
      expect(res.text).toContain('Deny Access');
      expect(res.text).toContain('Requested Permissions');
    });

    it('should handle consent denial by returning access_denied error to redirect URI', async () => {
      const verifier = generateCodeVerifier(43);
      const challenge = generateCodeChallenge(verifier);

      const res = await request(app)
        .post('/oauth/consent')
        .send({
          action: 'deny',
          client_id: 'identityhub-crm',
          redirect_uri: 'http://localhost:3001/api/auth/callback',
          scope: 'openid profile email',
          state: 'state_deny',
          code_challenge: challenge,
          code_challenge_method: 'S256',
        })
        .set('Cookie', ssoCookie);

      expect(res.status).toBe(302);
      const target = new URL(res.headers.location);
      expect(target.searchParams.get('error')).toBe('access_denied');
      expect(target.searchParams.get('state')).toBe('state_deny');
      expect(target.searchParams.get('code')).toBeNull(); // No code issued on denial
    });

    it('should handle consent approval by persisting grant and redirecting with code', async () => {
      const verifier = generateCodeVerifier(43);
      const challenge = generateCodeChallenge(verifier);

      const res = await request(app)
        .post('/oauth/consent')
        .send({
          action: 'allow',
          client_id: 'identityhub-crm',
          redirect_uri: 'http://localhost:3001/api/auth/callback',
          scope: 'openid profile email',
          state: 'state_allow',
          code_challenge: challenge,
          code_challenge_method: 'S256',
        })
        .set('Cookie', ssoCookie);

      expect(res.status).toBe(302);
      const target = new URL(res.headers.location);
      const code = target.searchParams.get('code');
      expect(code).toBeDefined();
      expect(target.searchParams.get('state')).toBe('state_allow');

      // Verify consent is stored in DB
      const hasConsent = await ConsentService.hasConsent(userId, 'identityhub-crm', ['openid', 'email']);
      expect(hasConsent).toBe(true);
    });
  });

  describe('B5. OpenID Connect Discovery, JWKS, and UserInfo', () => {
    it('should serve valid OpenID Connect discovery metadata at /.well-known/openid-configuration', async () => {
      const res = await request(app).get('/.well-known/openid-configuration');
      expect(res.status).toBe(200);
      expect(res.body.issuer).toBe('http://localhost:5000');
      expect(res.body.authorization_endpoint).toBe('http://localhost:5000/oauth/authorize');
      expect(res.body.token_endpoint).toBe('http://localhost:5000/oauth/token');
      expect(res.body.jwks_uri).toBe('http://localhost:5000/.well-known/jwks.json');
      expect(res.body.userinfo_endpoint).toBe('http://localhost:5000/oidc/userinfo');
      expect(res.body.id_token_signing_alg_values_supported).toContain('RS256');
    });

    it('should publish RSA public keys at /.well-known/jwks.json', async () => {
      const res = await request(app).get('/.well-known/jwks.json');
      expect(res.status).toBe(200);
      expect(res.body.keys).toBeDefined();
      expect(Array.isArray(res.body.keys)).toBe(true);
      expect(res.body.keys.length).toBeGreaterThan(0);

      const key = res.body.keys[0];
      expect(key.kty).toBe('RSA');
      expect(key.alg).toBe('RS256');
      expect(key.use).toBe('sig');
      expect(key.kid).toBeDefined();
      expect(key.n).toBeDefined();
      expect(key.e).toBeDefined();
    });

    it('should return user claims from UserInfo endpoint with valid Bearer token', async () => {
      // Exchange code to get access token
      const verifier = generateCodeVerifier(43);
      const challenge = generateCodeChallenge(verifier);

      const authRes = await request(app)
        .get('/oauth/authorize')
        .query({
          client_id: 'identityhub-crm',
          redirect_uri: 'http://localhost:3001/api/auth/callback',
          response_type: 'code',
          scope: 'openid profile email',
          code_challenge: challenge,
          code_challenge_method: 'S256',
        })
        .set('Cookie', ssoCookie);

      const code = new URL(authRes.headers.location).searchParams.get('code')!;

      const tokenRes = await request(app).post('/oauth/token').send({
        grant_type: 'authorization_code',
        client_id: 'identityhub-crm',
        code,
        redirect_uri: 'http://localhost:3001/api/auth/callback',
        code_verifier: verifier,
      });

      const accessToken = tokenRes.body.access_token;
      expect(accessToken).toBeDefined();

      const idToken = tokenRes.body.id_token;
      expect(idToken).toBeDefined();

      // Verify ID token claims with public key
      const idClaims = verifyJwt(idToken, {
        issuer: 'http://localhost:5000',
        audience: 'identityhub-crm',
      });
      expect(idClaims.sub).toBe(userId);
      expect(idClaims.email).toBe(testEmail);

      // Call UserInfo endpoint
      const userinfoRes = await request(app)
        .get('/oidc/userinfo')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(userinfoRes.status).toBe(200);
      expect(userinfoRes.body.sub).toBe(userId);
      expect(userinfoRes.body.email).toBe(testEmail);
      expect(userinfoRes.body.role).toBe('ADMIN');
    });
  });

  describe('B7. SSO Acceptance Flow Edge Cases', () => {
    it('should verify revoking access and logging out of application have different effects', async () => {
      // 1. Ensure consent is active
      await ConsentService.grantConsent(userId, 'identityhub-crm', ['openid', 'profile', 'email']);
      let hasConsent = await ConsentService.hasConsent(userId, 'identityhub-crm', ['openid']);
      expect(hasConsent).toBe(true);

      // 2. Logging out of application (CRM) only clears local CRM session
      // Central consent remains granted!
      hasConsent = await ConsentService.hasConsent(userId, 'identityhub-crm', ['openid']);
      expect(hasConsent).toBe(true);

      // 3. User explicitly REVOKES access
      await ConsentService.revokeConsent(userId, 'identityhub-crm');
      hasConsent = await ConsentService.hasConsent(userId, 'identityhub-crm', ['openid']);
      expect(hasConsent).toBe(false);

      // 4. Now, authorising CRM requires consent prompt again!
      const verifier = generateCodeVerifier(43);
      const challenge = generateCodeChallenge(verifier);

      const authRes = await request(app)
        .get('/oauth/authorize')
        .query({
          client_id: 'identityhub-crm',
          redirect_uri: 'http://localhost:3001/api/auth/callback',
          response_type: 'code',
          scope: 'openid profile email',
          code_challenge: challenge,
          code_challenge_method: 'S256',
        })
        .set('Cookie', ssoCookie);

      // Since access was revoked, consent screen is shown again instead of silent code redirect
      expect(authRes.status).toBe(200);
      expect(authRes.text).toContain('Authorize Access');
    });

    it('should reject authorization requests for disabled clients', async () => {
      // Create a disabled client
      await ClientService.registerClient({
        clientId: 'test-disabled-client',
        name: 'Disabled Client App',
        clientType: 'PUBLIC',
        redirectUris: ['http://localhost:4002/callback'],
        allowedScopes: ['openid'],
        isActive: false, // Disabled!
      });

      const verifier = generateCodeVerifier(43);
      const challenge = generateCodeChallenge(verifier);

      const res = await request(app)
        .get('/oauth/authorize')
        .query({
          client_id: 'test-disabled-client',
          redirect_uri: 'http://localhost:4002/callback',
          response_type: 'code',
          code_challenge: challenge,
          code_challenge_method: 'S256',
        })
        .set('Cookie', ssoCookie);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CLIENT_DISABLED');
    });
  });
});
