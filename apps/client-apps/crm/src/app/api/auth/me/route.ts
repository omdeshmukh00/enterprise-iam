import { NextRequest, NextResponse } from 'next/server';
import { CrmSessionStore, CRM_SESSION_COOKIE_NAME } from '../../../../lib/sessionStore';

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(CRM_SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json(
      { success: false, error: { message: 'CRM application session required' } },
      { status: 401 }
    );
  }

  const session = CrmSessionStore.validateSession(sessionToken);

  if (!session) {
    const response = NextResponse.json(
      { success: false, error: { message: 'Invalid or expired CRM session' } },
      { status: 401 }
    );
    // Clear dead cookie
    response.cookies.set(CRM_SESSION_COOKIE_NAME, '', {
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
