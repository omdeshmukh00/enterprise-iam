import { NextRequest, NextResponse } from 'next/server';
import { AdminSessionStore, ADMIN_SESSION_COOKIE_NAME, AppUser } from '../../../../lib/sessionStore';

export async function POST(request: NextRequest) {
  const IDENTITY_SERVER_URL = process.env.NEXT_PUBLIC_IDENTITY_SERVER_URL || 'http://localhost:5000';
  const body = await request.json();

  const res = await fetch(`${IDENTITY_SERVER_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-IdentityHub-Client': 'true',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    return NextResponse.json(data, { status: res.status });
  }

  const user: AppUser = data.data.user;

  // Establish local Admin Console session
  const { rawToken } = AdminSessionStore.createSession(user);

  const response = NextResponse.json({
    success: true,
    data: { user, message: 'Authenticated successfully.' },
  });

  // 1. Set local Admin session cookie
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, rawToken, {
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  // 2. Forward central SSO session cookie from Identity Server
  const rawSetCookie = res.headers.get('set-cookie');
  if (rawSetCookie) {
    const ssoMatch = rawSetCookie.match(/(?:identityhub_sso_session|identityhub_session)=([^;]+)/);
    if (ssoMatch) {
      const ssoCookieName = process.env.SSO_SESSION_COOKIE_NAME || 'identityhub_sso_session';
      response.cookies.set(ssoCookieName, ssoMatch[1], {
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
  }

  return response;
}
