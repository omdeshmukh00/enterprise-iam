import { NextRequest, NextResponse } from 'next/server';
import { AdminSessionStore, ADMIN_SESSION_COOKIE_NAME, AppUser } from '../../../../lib/sessionStore';

export async function GET(request: NextRequest) {
  const IDENTITY_SERVER_URL = process.env.NEXT_PUBLIC_IDENTITY_SERVER_URL || 'http://localhost:5000';
  const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID || 'identityhub-admin-console';
  const REDIRECT_URI = 'http://localhost:3000/api/auth/callback';

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
  }

  const codeVerifier = request.cookies.get('admin_pkce_verifier')?.value;

  try {
    const tokenRes = await fetch(`${IDENTITY_SERVER_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier || '',
      }),
    });

    if (!tokenRes.ok) {
      const errJson = await tokenRes.json().catch(() => ({}));
      const msg = errJson?.error_description || errJson?.error || 'Token exchange failed';
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, request.url));
    }

    const tokenData = await tokenRes.json();
    const idToken = tokenData.id_token;

    let claims: any = {};
    if (idToken) {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      }
    }

    const user: AppUser = {
      id: claims.sub || 'admin',
      email: claims.email || '',
      firstName: claims.given_name || claims.name?.split(' ')[0] || 'Admin',
      lastName: claims.family_name || claims.name?.split(' ').slice(1).join(' ') || '',
      role: (claims.role as 'ADMIN' | 'USER') || 'ADMIN',
      status: 'ACTIVE',
      emailVerified: Boolean(claims.email_verified),
    };

    const { rawToken } = AdminSessionStore.createSession(user, {
      accessToken: tokenData.access_token,
      idToken: tokenData.id_token,
      expiresIn: tokenData.expires_in,
    });

    const targetPath = user.role === 'ADMIN' ? '/admin' : '/dashboard';
    const response = NextResponse.redirect(new URL(targetPath, request.url));

    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, rawToken, {
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    response.cookies.set('admin_pkce_verifier', '', { path: '/', maxAge: 0 });

    return response;
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err.message || 'Authorization failed')}`, request.url)
    );
  }
}
