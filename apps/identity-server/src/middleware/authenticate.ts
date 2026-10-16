import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { SessionService } from '../services/session.service.js';
import { UnauthorizedError } from '../utils/errors.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const cookieName = env.SSO_SESSION_COOKIE_NAME || env.SESSION_COOKIE_NAME || 'identityhub_sso_session';
    let token = req.cookies?.[cookieName] || (env.SESSION_COOKIE_NAME ? req.cookies?.[env.SESSION_COOKIE_NAME] : undefined);

    // Also support Bearer token in Authorization header for direct API consumers / mobile / testing
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7).trim();
    }

    if (!token) {
      throw new UnauthorizedError('Authentication session required', 'SESSION_REQUIRED');
    }

    const sessionContext = await SessionService.validateSession(token);

    if (!sessionContext) {
      throw new UnauthorizedError('Invalid or expired session. Please sign in again.', 'SESSION_EXPIRED');
    }

    req.user = sessionContext.user;
    req.session = sessionContext.session;
    req.rawSessionToken = token;

    next();
  } catch (err) {
    next(err);
  }
}
