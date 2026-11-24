import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  const IDENTITY_SERVER_URL = process.env.NEXT_PUBLIC_IDENTITY_SERVER_URL || 'http://localhost:5000';
  const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID || 'identityhub-analytics';
  const REDIRECT_URI = 'http://localhost:3002/api/auth/callback';

  // Generate PKCE code_verifier and code_challenge (S256)
  const codeVerifier = crypto.randomBytes(48).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier, 'utf8').digest('base64url');
  const state = crypto.randomBytes(24).toString('base64url');

  const authorizeUrl = new URL(`${IDENTITY_SERVER_URL}/oauth/authorize`);
  authorizeUrl.searchParams.set('client_id', CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'openid profile email');
  authorizeUrl.searchParams.set('code_challenge', codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authorizeUrl.toString());

  // Store PKCE verifier and state in temporary HttpOnly cookies
  response.cookies.set('analytics_pkce_verifier', codeVerifier, {
    path: '/',
    maxAge: 600, // 10 minutes
    httpOnly: true,
    sameSite: 'lax',
  });

  response.cookies.set('analytics_oauth_state', state, {
    path: '/',
    maxAge: 600,
    httpOnly: true,
    sameSite: 'lax',
  });

  return response;
}
