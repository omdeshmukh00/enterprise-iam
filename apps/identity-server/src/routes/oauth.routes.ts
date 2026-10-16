import { Router, Request, Response, NextFunction } from 'express';
import { OAuthService } from '../services/oauth.service.js';
import { ClientService } from '../services/client.service.js';
import { ConsentService } from '../services/consent.service.js';
import { SessionService } from '../services/session.service.js';
import { AuthService } from '../services/auth.service.js';
import { env } from '../config/env.js';
import { getClientIp, getUserAgent } from '../utils/helpers.js';

const router: Router = Router();

function getCentralSessionToken(req: Request): string | undefined {
  const cookieName = env.SSO_SESSION_COOKIE_NAME || env.SESSION_COOKIE_NAME || 'identityhub_sso_session';
  return req.cookies?.[cookieName] || (env.SESSION_COOKIE_NAME ? req.cookies?.[env.SESSION_COOKIE_NAME] : undefined);
}

/**
 * GET /oauth/authorize
 * Standards-based Authorization Endpoint with PKCE and Central SSO Session Check
 */
router.get('/authorize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = req.query.client_id as string;
    const redirectUri = req.query.redirect_uri as string;
    const responseType = req.query.response_type as string;
    const scope = req.query.scope as string;
    const state = req.query.state as string;
    const codeChallenge = req.query.code_challenge as string;
    const codeChallengeMethod = (req.query.code_challenge_method as string) || 'S256';
    const nonce = req.query.nonce as string;
    const prompt = req.query.prompt as string;

    // Validate client and parameters first (never redirect to invalid redirect URIs)
    const { client, scopes } = await OAuthService.validateAuthorizeRequest({
      clientId,
      redirectUri,
      responseType,
      scope,
      state,
      codeChallenge,
      codeChallengeMethod,
      nonce,
      prompt,
    });

    // Check central SSO session
    const ssoToken = getCentralSessionToken(req);
    const sessionContext = ssoToken ? await SessionService.validateSession(ssoToken) : null;

    // If no valid session or prompt=login, user must authenticate first
    if (!sessionContext || prompt === 'login') {
      // If client requests JSON (e.g. API client test)
      if (req.headers.accept?.includes('application/json')) {
        return res.status(401).json({
          error: 'login_required',
          error_description: 'Active central session required to complete authorization.',
        });
      }

      // Render clean SSO login screen that preserves OAuth parameters
      const errorMsg = req.query.login_error ? String(req.query.login_error) : '';
      const html = renderSsoLoginPage({
        clientName: client.name,
        error: errorMsg,
        params: {
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: responseType,
          scope: scopes.join(' '),
          state: state || '',
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          nonce: nonce || '',
        },
      });
      return res.send(html);
    }

    const user = sessionContext.user;

    // Check if user has already granted consent for all requested scopes
    const alreadyConsented = await ConsentService.hasConsent(user.id, client.clientId, scopes);

    // If already consented and prompt is not consent, issue authorization code immediately
    if (alreadyConsented && prompt !== 'consent') {
      const code = await OAuthService.createAuthorizationCode({
        clientId: client.clientId,
        userId: user.id,
        redirectUri,
        codeChallenge,
        codeChallengeMethod,
        scopes,
        nonce,
      });

      const redirectTarget = new URL(redirectUri);
      redirectTarget.searchParams.set('code', code);
      if (state) redirectTarget.searchParams.set('state', state);

      return res.redirect(redirectTarget.toString());
    }

    // Otherwise, render the real Consent Screen
    const scopeDescriptions = ConsentService.describeScopes(scopes);
    const consentHtml = renderConsentPage({
      clientName: client.name,
      userEmail: user.email,
      scopes: scopeDescriptions,
      params: {
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: responseType,
        scope: scopes.join(' '),
        state: state || '',
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
        nonce: nonce || '',
      },
    });

    return res.send(consentHtml);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /oauth/login
 * Handles authentication directly within OAuth flow if user was not yet logged in.
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, client_id, redirect_uri, response_type, scope, state, code_challenge, code_challenge_method, nonce } = req.body;
    const ip = getClientIp(req);
    const ua = getUserAgent(req);

    let authResult;
    try {
      authResult = await AuthService.login({ email, password }, ip, ua);
    } catch (loginErr: any) {
      const queryParams = new URLSearchParams({
        client_id,
        redirect_uri,
        response_type: response_type || 'code',
        scope: scope || 'openid profile email',
        state: state || '',
        code_challenge,
        code_challenge_method: code_challenge_method || 'S256',
        nonce: nonce || '',
        login_error: loginErr.message || 'Invalid email or password.',
      });
      return res.redirect(`/oauth/authorize?${queryParams.toString()}`);
    }

    // Establish Central IdentityHub SSO Session
    SessionService.setSessionCookie(res, authResult.rawToken);

    // Re-route back to authorize with session established
    const queryParams = new URLSearchParams({
      client_id,
      redirect_uri,
      response_type: response_type || 'code',
      scope: scope || 'openid profile email',
      state: state || '',
      code_challenge,
      code_challenge_method: code_challenge_method || 'S256',
      nonce: nonce || '',
    });

    return res.redirect(`/oauth/authorize?${queryParams.toString()}`);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /oauth/consent
 * Handles user approval or denial on the real consent screen.
 */
router.post('/consent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method, nonce } = req.body;
    const ip = getClientIp(req);
    const ua = getUserAgent(req);

    // Validate redirect URI before returning errors
    const client = await ClientService.validateClient(client_id);
    if (!ClientService.validateRedirectUri(client, redirect_uri)) {
      return res.status(400).json({ error: 'invalid_redirect_uri', error_description: 'Redirect URI is invalid.' });
    }

    // Must have central session
    const ssoToken = getCentralSessionToken(req);
    const sessionContext = ssoToken ? await SessionService.validateSession(ssoToken) : null;

    if (!sessionContext) {
      return res.redirect(`/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&code_challenge=${code_challenge}&code_challenge_method=${code_challenge_method}&state=${state}`);
    }

    const redirectTarget = new URL(redirect_uri);
    if (state) redirectTarget.searchParams.set('state', state);

    // Handle Denial
    if (action !== 'allow') {
      redirectTarget.searchParams.set('error', 'access_denied');
      redirectTarget.searchParams.set('error_description', 'User denied application consent.');
      return res.redirect(redirectTarget.toString());
    }

    // Handle Approval
    const scopes = scope ? scope.split(' ').filter(Boolean) : ['openid', 'profile', 'email'];
    await ConsentService.grantConsent(sessionContext.user.id, client_id, scopes, ip, ua);

    const code = await OAuthService.createAuthorizationCode({
      clientId: client_id,
      userId: sessionContext.user.id,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method || 'S256',
      scopes,
      nonce,
    });

    redirectTarget.searchParams.set('code', code);
    return res.redirect(redirectTarget.toString());
  } catch (err) {
    next(err);
  }
});

/**
 * POST /oauth/token
 * Token Endpoint for Authorization Code + PKCE verification
 */
router.post('/token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = getClientIp(req);
    const ua = getUserAgent(req);

    // Support both JSON and URL-encoded bodies, as well as HTTP Basic Client Auth
    let clientId = req.body.client_id;
    let clientSecret = req.body.client_secret;

    if (!clientId && req.headers.authorization?.startsWith('Basic ')) {
      const basicStr = Buffer.from(req.headers.authorization.substring(6), 'base64').toString('utf-8');
      const [u, p] = basicStr.split(':');
      clientId = decodeURIComponent(u);
      clientSecret = decodeURIComponent(p || '');
    }

    const grantType = req.body.grant_type;
    const code = req.body.code;
    const redirectUri = req.body.redirect_uri;
    const codeVerifier = req.body.code_verifier;

    const tokenResponse = await OAuthService.exchangeAuthorizationCode(
      {
        grantType,
        clientId,
        clientSecret,
        code,
        redirectUri,
        codeVerifier,
      },
      ip,
      ua
    );

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    return res.status(200).json(tokenResponse);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /oauth/revoke
 * Application Access Revocation Endpoint
 */
router.post('/revoke', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ssoToken = getCentralSessionToken(req);
    const sessionContext = ssoToken ? await SessionService.validateSession(ssoToken) : null;

    if (!sessionContext) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId is required' });
    }

    const success = await ConsentService.revokeConsent(
      sessionContext.user.id,
      clientId,
      getClientIp(req),
      getUserAgent(req)
    );

    return res.json({ success, message: 'Application access revoked successfully.' });
  } catch (err) {
    next(err);
  }
});

// UI Rendering Helpers for Standalone Central Provider Screens

function renderSsoLoginPage(props: { clientName: string; error?: string; params: Record<string, string> }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In — IdentityHub Enterprise IAM</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      background-image: radial-gradient(at 50% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, rgba(79, 70, 229, 0.04) 0px, transparent 50%);
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      width: 100%;
      max-width: 440px;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .brand-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.35);
      color: #ffffff;
    }
    .brand-icon svg {
      width: 26px;
      height: 26px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 13px;
      color: #64748b;
    }
    .subtitle strong {
      color: #1e293b;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.04), 0 20px 25px -5px rgba(15, 23, 42, 0.05);
      padding: 32px 28px;
    }
    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 12px 14px;
      border-radius: 10px;
      font-size: 13px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .form-group {
      margin-bottom: 18px;
    }
    .form-label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #475569;
      margin-bottom: 7px;
    }
    .form-input {
      width: 100%;
      padding: 10px 14px;
      font-size: 14px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      background: #ffffff;
      color: #0f172a;
      transition: all 0.15s ease;
      outline: none;
    }
    .form-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }
    .btn-primary {
      width: 100%;
      padding: 12px 18px;
      background: linear-gradient(180deg, #4f46e5 0%, #4338ca 100%);
      color: #ffffff;
      border: 1px solid #3730a3;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.18);
      transition: all 0.15s ease;
      margin-top: 6px;
    }
    .btn-primary:hover {
      background: linear-gradient(180deg, #4338ca 0%, #3730a3 100%);
      box-shadow: 0 6px 16px -2px rgba(79, 70, 229, 0.35);
      transform: translateY(-1px);
    }
    .footer-note {
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand-icon">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
      </div>
      <h1 class="title">IdentityHub Enterprise SSO</h1>
      <p class="subtitle">Authenticate to continue to <strong>${props.clientName}</strong></p>
    </div>

    <div class="card">
      ${props.error ? `<div class="alert-error">${props.error}</div>` : ''}
      <form action="/oauth/login" method="POST">
        ${Object.entries(props.params).map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`).join('\n        ')}
        <div class="form-group">
          <label class="form-label">Corporate Email</label>
          <input type="email" name="email" required autofocus class="form-input" placeholder="user@company.com">
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input type="password" name="password" required class="form-input" placeholder="••••••••••••">
        </div>
        <button type="submit" class="btn-primary">
          Sign In & Authorize
        </button>
      </form>
    </div>

    <p class="footer-note">IdentityHub Enterprise Single Sign-On Platform</p>
  </div>
</body>
</html>`;
}

function renderConsentPage(props: {
  clientName: string;
  userEmail: string;
  scopes: { scope: string; name: string; description: string }[];
  params: Record<string, string>;
}): string {
  const initial = props.userEmail ? props.userEmail.charAt(0).toUpperCase() : 'U';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize Access — IdentityHub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      background-image: radial-gradient(at 50% 0%, rgba(99, 102, 241, 0.08) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, rgba(79, 70, 229, 0.04) 0px, transparent 50%);
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      width: 100%;
      max-width: 480px;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .brand-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.35);
      color: #ffffff;
    }
    .brand-icon svg {
      width: 26px;
      height: 26px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 13px;
      color: #64748b;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.04), 0 20px 25px -5px rgba(15, 23, 42, 0.06);
      padding: 30px 26px;
    }
    .app-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #edf2f7;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }
    .app-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .app-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #e0e7ff;
      color: #4338ca;
      font-weight: 700;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .app-name {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .app-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #ecfdf5;
      color: #047857;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid #a7f3d0;
    }
    .app-badge .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }
    .user-pill {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 8px 12px;
      margin-bottom: 22px;
    }
    .user-pill-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .user-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .user-email {
      font-size: 12px;
      font-weight: 500;
      color: #334155;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-status {
      font-size: 10px;
      font-weight: 600;
      color: #059669;
      background: #f0fdf4;
      padding: 2px 7px;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 12px;
    }
    .permissions-list {
      list-style: none;
      margin-bottom: 24px;
    }
    .permission-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #fcfcfd;
      border: 1px solid #f1f5f9;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 8px;
      transition: border-color 0.15s ease;
    }
    .permission-item:hover {
      border-color: #e2e8f0;
      background: #ffffff;
    }
    .check-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .permission-content h4 {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .permission-content p {
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
    }
    .button-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .btn-allow {
      width: 100%;
      padding: 12px 18px;
      background: linear-gradient(180deg, #4f46e5 0%, #4338ca 100%);
      color: #ffffff;
      border: 1px solid #3730a3;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.18);
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-allow:hover {
      background: linear-gradient(180deg, #4338ca 0%, #3730a3 100%);
      box-shadow: 0 6px 16px -2px rgba(79, 70, 229, 0.35);
      transform: translateY(-1px);
    }
    .btn-deny {
      width: 100%;
      padding: 10px 18px;
      background: #ffffff;
      color: #475569;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-deny:hover {
      background: #f8fafc;
      color: #0f172a;
      border-color: #94a3b8;
    }
    .security-notice {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 18px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
    .security-notice svg {
      width: 14px;
      height: 14px;
      color: #64748b;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand-icon">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
      </div>
      <h1 class="title">Authorize Application</h1>
      <p class="subtitle">Grant access to your IdentityHub organization identity</p>
    </div>

    <div class="card">
      <div class="app-banner">
        <div class="app-info">
          <div class="app-avatar">${props.clientName.charAt(0)}</div>
          <div class="app-name">${props.clientName}</div>
        </div>
        <div class="app-badge">
          <span class="dot"></span>
          <span>Verified Client</span>
        </div>
      </div>

      <div class="user-pill">
        <div class="user-pill-left">
          <div class="user-avatar">${initial}</div>
          <span class="user-email">${props.userEmail}</span>
        </div>
        <span class="user-status">Active Session</span>
      </div>

      <div class="section-title">Requested Permissions</div>
      <ul class="permissions-list">
        ${props.scopes
          .map(
            (s) => `
          <li class="permission-item">
            <div class="check-icon">✓</div>
            <div class="permission-content">
              <h4>${s.name}</h4>
              <p>${s.description}</p>
            </div>
          </li>`
          )
          .join('')}
      </ul>

      <form action="/oauth/consent" method="POST" class="button-group">
        ${Object.entries(props.params).map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`).join('\n        ')}
        <button type="submit" name="action" value="allow" class="btn-allow">
          <span>Allow Access</span>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
          </svg>
        </button>
        <button type="submit" name="action" value="deny" class="btn-deny">
          Deny Access
        </button>
      </form>

      <div class="security-notice">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>You can revoke application access at any time in your IdentityHub account settings.</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export default router;
