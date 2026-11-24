import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsSessionStore, ANALYTICS_SESSION_COOKIE_NAME } from '../../../../lib/sessionStore';

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(ANALYTICS_SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json(
      { success: false, error: { message: 'Analytics application session required' } },
      { status: 401 }
    );
  }

  const session = AnalyticsSessionStore.validateSession(sessionToken);

  if (!session) {
    const response = NextResponse.json(
      { success: false, error: { message: 'Invalid or expired Analytics session' } },
      { status: 401 }
    );
    // Clear dead cookie
    response.cookies.set(ANALYTICS_SESSION_COOKIE_NAME, '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
    });
    return response;
  }

  return NextResponse.json({
    success: true,
    data: {
      user: session.user,
    },
  });
}
