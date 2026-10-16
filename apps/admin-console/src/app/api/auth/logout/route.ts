import { NextRequest, NextResponse } from 'next/server';
import { AdminSessionStore, ADMIN_SESSION_COOKIE_NAME } from '../../../../lib/sessionStore';

export async function POST(request: NextRequest) {
  const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (adminToken) {
    AdminSessionStore.revokeSession(adminToken);
  }

  const response = NextResponse.json({
    success: true,
    data: { message: 'Signed out of Admin Console successfully.' },
  });

  // Clear ONLY the local Admin Console session cookie
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
  });

  return response;
}
