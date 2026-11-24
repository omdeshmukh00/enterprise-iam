import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsSessionStore, ANALYTICS_SESSION_COOKIE_NAME } from '../../../../lib/sessionStore';

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(ANALYTICS_SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    AnalyticsSessionStore.revokeSession(sessionToken);
  }

  const response = NextResponse.json({
    success: true,
    data: { message: 'Logged out of Analytics application successfully.' },
  });

  // Clear ONLY the Analytics application session cookie
  response.cookies.set(ANALYTICS_SESSION_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
  });

  return response;
}
