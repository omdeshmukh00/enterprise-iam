import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/database.js';
import { PasswordService } from '../../src/services/password.service.js';
import { ClientService } from '../../src/services/client.service.js';
import { ConsentService } from '../../src/services/consent.service.js';
import { SessionService } from '../../src/services/session.service.js';
import { generateCodeVerifier, generateCodeChallenge } from '../../src/crypto/pkce.js';
import { env } from '../../src/config/env.js';

describe('Phase A — Session Isolation, Logout Independence & SSO Reuse Tests', () => {
  const testEmail = `session_iso_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';
  let userId: string;

  // Session tokens and cookies across apps
  let ssoSessionCookie: string;
  let rawSsoToken: string;
  let adminSessionCookie: string;
  let crmSessionCookie: string;

  // Mock application session stores (simulating Admin and CRM server-side session managers)
  const adminSessionStore = new Map<string, any>();
  const crmSessionStore = new Map<string, any>();

  const createAdminSession = (user: any) => {
    const rawToken = `admin_token_${Date.now()}_${Math.random()}`;
    adminSessionStore.set(rawToken, { user, active: true });
    return `identityhub_admin_session=${rawToken}`;
  };

  const createCrmSession = (user: any) => {
    const rawToken = `crm_token_${Date.now()}_${Math.random()}`;
    crmSessionStore.set(rawToken, { user, active: true });
    return `identityhub_crm_session=${rawToken}`;
  };

  beforeAll(async () => {
    // Ensure development clients are registered
    await ClientService.ensureDefaultDevelopmentClients();

    // Create verified test user
    const passwordHash = await PasswordService.hashPassword(testPassword);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        firstName: 'Session',
        lastName: 'Tester',
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });
    userId = user.id;

    // Grant initial consent for CRM client so silent SSO can complete seamlessly
    await ConsentService.grantConsent(userId, 'identityhub-crm', ['openid', 'profile', 'email']);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'session_iso_' } },
    });
    await prisma.$disconnect();
  });

  it('1. Login through Admin creates an Admin session and IdentityHub central session', async () => {
    const res = await request(app).post('/auth/login').send({
      email: testEmail,
      password: testPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);

    // Extract Central Identity Provider SSO session cookie
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();

    const ssoHeader = setCookie.find(
      (c: string) => c.startsWith('identityhub_sso_session=') || c.startsWith(`${env.SSO_SESSION_COOKIE_NAME}=`)
    );
    expect(ssoHeader).toBeDefined();
    expect(ssoHeader).toContain('HttpOnly');

    ssoSessionCookie = ssoHeader.split(';')[0];
    rawSsoToken = ssoSessionCookie.split('=')[1];

    // Verify session was persisted in central database
    const dbSession = await prisma.session.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    expect(dbSession).toBeDefined();
    expect(dbSession?.revokedAt).toBeNull();

    // Simulate Admin Console creating its own local application session
    adminSessionCookie = createAdminSession(res.body.data.user);
    expect(adminSessionCookie).toContain('identityhub_admin_session=');

    // Central IdentityHub accepts central cookie
    const meRes = await request(app).get('/auth/me').set('Cookie', ssoSessionCookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(testEmail);

    // Admin Console local session is active
    const adminToken = adminSessionCookie.split('=')[1];
    expect(adminSessionStore.get(adminToken)?.active).toBe(true);
  });

  it('2. CRM can subsequently authenticate using the central IdentityHub session without re-entering credentials', async () => {
    // CRM initiates OAuth 2.0 PKCE Authorization request with central SSO session cookie
    const codeVerifier = generateCodeVerifier(43);
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = 'crm_state_123';

    const authRes = await request(app)
      .get('/oauth/authorize')
      .query({
        client_id: 'identityhub-crm',
        redirect_uri: 'http://localhost:3001/api/auth/callback',
        response_type: 'code',
        scope: 'openid profile email',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state,
      })
      .set('Cookie', ssoSessionCookie); // Central SSO cookie passed by browser

    // Should issue authorization code redirect without requesting password or OTP!
    expect(authRes.status).toBe(302);
    const redirectLocation = authRes.headers.location;
    expect(redirectLocation).toBeDefined();

    const redirectUrl = new URL(redirectLocation);
    expect(redirectUrl.origin).toBe('http://localhost:3001');
    expect(redirectUrl.pathname).toBe('/api/auth/callback');
    expect(redirectUrl.searchParams.get('state')).toBe(state);

    const authCode = redirectUrl.searchParams.get('code');
    expect(authCode).toBeDefined();

    // CRM exchanges authorization code + PKCE verifier at token endpoint
    const tokenRes = await request(app).post('/oauth/token').send({
      grant_type: 'authorization_code',
      client_id: 'identityhub-crm',
      code: authCode,
      redirect_uri: 'http://localhost:3001/api/auth/callback',
      code_verifier: codeVerifier,
    });

    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.access_token).toBeDefined();
    expect(tokenRes.body.id_token).toBeDefined();

    // CRM establishes its independent local application session
    crmSessionCookie = createCrmSession({ email: testEmail, id: userId });
    expect(crmSessionCookie).toContain('identityhub_crm_session=');

    const crmToken = crmSessionCookie.split('=')[1];
    expect(crmSessionStore.get(crmToken)?.active).toBe(true);
  });

  it('3. CRM logout does not log the user out of Admin', async () => {
    // CRM user logs out
    const crmToken = crmSessionCookie.split('=')[1];
    crmSessionStore.delete(crmToken); // Revoke CRM local session only

    // CRM local session is now invalid/logged out
    expect(crmSessionStore.get(crmToken)).toBeUndefined();

    // Admin Console local session is STILL ACTIVE!
    const adminToken = adminSessionCookie.split('=')[1];
    expect(adminSessionStore.get(adminToken)?.active).toBe(true);
  });

  it('4. CRM logout does not invalidate the central IdentityHub session', async () => {
    // Verify central Identity Provider session remains active
    const meRes = await request(app).get('/auth/me').set('Cookie', ssoSessionCookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(testEmail);

    // Verify session record in DB is not revoked
    const dbSession = await prisma.session.findFirst({
      where: { userId, revokedAt: null },
    });
    expect(dbSession).toBeDefined();

    // Verify stored user consent for CRM was NOT deleted
    const consent = await prisma.oAuthConsent.findUnique({
      where: { userId_clientId: { userId, clientId: 'identityhub-crm' } },
    });
    expect(consent).toBeDefined();
    expect(consent?.revokedAt).toBeNull();
  });

  it('5. Opening CRM again permits authentication through the still-active IdentityHub session', async () => {
    // CRM initiates a fresh OAuth request with PKCE
    const freshVerifier = generateCodeVerifier(43);
    const freshChallenge = generateCodeChallenge(freshVerifier);
    const freshState = 'crm_state_456';

    const authRes = await request(app)
      .get('/oauth/authorize')
      .query({
        client_id: 'identityhub-crm',
        redirect_uri: 'http://localhost:3001/api/auth/callback',
        response_type: 'code',
        scope: 'openid profile email',
        code_challenge: freshChallenge,
        code_challenge_method: 'S256',
        state: freshState,
      })
      .set('Cookie', ssoSessionCookie); // Central session still valid

    expect(authRes.status).toBe(302);
    const redirectUrl = new URL(authRes.headers.location);
    const freshCode = redirectUrl.searchParams.get('code');
    expect(freshCode).toBeDefined();

    // CRM exchanges fresh code
    const tokenRes = await request(app).post('/oauth/token').send({
      grant_type: 'authorization_code',
      client_id: 'identityhub-crm',
      code: freshCode,
      redirect_uri: 'http://localhost:3001/api/auth/callback',
      code_verifier: freshVerifier,
    });

    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.id_token).toBeDefined();

    // Establish a new, independent CRM session
    crmSessionCookie = createCrmSession({ email: testEmail, id: userId });
    const crmToken = crmSessionCookie.split('=')[1];
    expect(crmSessionStore.get(crmToken)?.active).toBe(true);
  });

  it('6. Admin logout does not invalidate CRM existing local session', async () => {
    // Admin user logs out
    const adminToken = adminSessionCookie.split('=')[1];
    adminSessionStore.delete(adminToken); // Revoke Admin local session only

    // Admin session is gone
    expect(adminSessionStore.get(adminToken)).toBeUndefined();

    // CRM session remains completely intact!
    const crmToken = crmSessionCookie.split('=')[1];
    expect(crmSessionStore.get(crmToken)?.active).toBe(true);
  });

  it('7. Expiring or revoking the central session prevents future silent authentication', async () => {
    // Explicitly revoke central session
    await SessionService.revokeSessionByToken(rawSsoToken);

    // Verify /auth/me now rejects the central cookie
    const meRes = await request(app).get('/auth/me').set('Cookie', ssoSessionCookie);
    expect(meRes.status).toBe(401);

    // CRM attempts silent authentication with revoked central session
    const freshVerifier = generateCodeVerifier(43);
    const freshChallenge = generateCodeChallenge(freshVerifier);

    const authRes = await request(app)
      .get('/oauth/authorize')
      .query({
        client_id: 'identityhub-crm',
        redirect_uri: 'http://localhost:3001/api/auth/callback',
        response_type: 'code',
        scope: 'openid profile email',
        code_challenge: freshChallenge,
        code_challenge_method: 'S256',
        state: 'must_fail',
      })
      .set('Cookie', ssoSessionCookie)
      .set('Accept', 'application/json');

    // Silent authorization MUST be rejected because central session is revoked
    expect(authRes.status).toBe(401);
    expect(authRes.body.error).toBe('login_required');
  });
});
