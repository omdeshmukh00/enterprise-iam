import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { ForbiddenError } from '../utils/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF Protection Strategy:
 * 1. Checks that state-changing requests (POST, PUT, PATCH, DELETE) have a valid Origin or Referer
 *    originating from allowed application origins.
 * 2. Accepts custom client headers (e.g. X-Requested-With, X-IdentityHub-Action) which modern browsers
 *    do not permit cross-origin attackers to set without explicit CORS authorization.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Skip CSRF checks in test environment
  if (env.NODE_ENV === 'test') {
    return next();
  }

  // Skip CSRF checks for server-to-server OAuth token endpoint
  if (req.path === '/oauth/token' || req.path === '/.well-known/jwks.json') {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const customHeader = req.headers['x-requested-with'] || req.headers['x-identityhub-client'];

  // If a recognized custom AJAX header is present, browser preflight CORS protects the request
  if (customHeader) {
    return next();
  }

  const allowedOrigins = [...env.CORS_ALLOWED_ORIGINS, env.APP_BASE_URL, 'http://localhost:5000'];

  // If origin is provided and not literal "null", validate strictly against allowed origins
  if (origin && origin !== 'null') {
    if (allowedOrigins.includes(origin)) {
      return next();
    }
    return next(new ForbiddenError('Cross-Site Request Forgery (CSRF) blocked: Invalid request origin.', 'CSRF_INVALID_ORIGIN'));
  }

  // If origin is absent or "null", check referer against allowed origins
  if (referer) {
    const isAllowedReferer = allowedOrigins.some((allowed) => referer.startsWith(allowed));
    if (isAllowedReferer) {
      return next();
    }
    return next(new ForbiddenError('Cross-Site Request Forgery (CSRF) blocked: Invalid request referer.', 'CSRF_INVALID_REFERER'));
  }

  // Internal OAuth consent & login forms rendered directly by Identity Server
  if (req.path === '/oauth/consent' || req.path === '/oauth/login') {
    return next();
  }

  // If request contains session cookies but no origin/referer/custom header, reject
  const cookieName = env.SSO_SESSION_COOKIE_NAME || env.SESSION_COOKIE_NAME || 'identityhub_sso_session';
  if (req.cookies?.[cookieName] || req.cookies?.[env.SESSION_COOKIE_NAME]) {
    return next(new ForbiddenError('Cross-Site Request Forgery (CSRF) blocked: Missing required origin verification.', 'CSRF_MISSING_ORIGIN'));
  }

  next();
}
