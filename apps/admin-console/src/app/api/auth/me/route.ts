import { NextRequest, NextResponse } from 'next/server';
import { AdminSessionStore, ADMIN_SESSION_COOKIE_NAME, AppUser } from '../../../../lib/sessionStore';

export async function GET(request: NextRequest) {
  const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (adminToken) {
    const session = AdminSessionStore.validateSession(adminToken);
    if (session) {
      return NextResponse.json({
        success: true,
        data: { user: session.user },
      });
    }
  }

  // Check if central IdentityHub SSO session cookie is present
  const ssoCookieName = process.env.SSO_SESSION_COOKIE_NAME || 'identityhub_sso_session';
  const ssoToken = request.cookies.get(ssoCookieName)?.value || request.cookies.get('identityhub_session')?.value;

  if (ssoToken) {
    const IDENTITY_SERVER_URL = process.env.NEXT_PUBLIC_IDENTITY_SERVER_URL || 'http://localhost:5000';
    try {
      const res = await fetch(`${IDENTITY_SERVER_URL}/auth/me`, {
        headers: {
          Cookie: `${ssoCookieName}=${ssoToken}`,
          'X-IdentityHub-Client': 'true',
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.user) {
          const user: AppUser = json.data.user;
          // Establish local Admin application session from active central SSO session
          const { rawToken } = AdminSessionStore.createSession(user);

          const response = NextResponse.json({
            success: true,
            data: { user },
          });

          response.cookies.set(ADMIN_SESSION_COOKIE_NAME, rawToken, {
            path: '/',
            maxAge: 7 * 24 * 60 * 60,
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          });

          return response;
        }
      }
    } catch {
      // Ignore network errors during SSO session check
    }
  }

  return NextResponse.json(
    { success: false, error: { message: 'Admin Console session required' } },
    { status: 401 }
  );
}
