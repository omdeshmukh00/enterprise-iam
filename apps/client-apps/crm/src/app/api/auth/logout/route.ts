import { NextRequest, NextResponse } from 'next/server';
import { CrmSessionStore, CRM_SESSION_COOKIE_NAME } from '../../../../lib/sessionStore';

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(CRM_SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    CrmSessionStore.revokeSession(sessionToken);
  }

  const response = NextResponse.json({
    success: true,
    data: { message: 'Logged out of CRM application successfully.' },
  });

  // Clear ONLY the CRM application session cookie
  response.cookies.set(CRM_SESSION_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
  });

  return response;
}
