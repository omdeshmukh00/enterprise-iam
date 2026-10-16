import { Response } from 'express';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { generateSecureToken, hashToken } from '../utils/tokens.js';
import { logger } from '../utils/logger.js';
import { Session, User } from '@prisma/client';

export class SessionService {
  /**
   * Generates a new secure database session, storing only the token hash.
   * Returns the raw opaque token to be set in the HttpOnly cookie.
   */
  public static async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ rawToken: string; session: Session }> {
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000);

    const session = await prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    return { rawToken, session };
  }

  /**
   * Validates a session by raw token string.
   * Checks expiration, idle timeout, revocation, and active user status.
   */
  public static async validateSession(
    rawToken: string
  ): Promise<{ session: Session; user: User } | null> {
    if (!rawToken) return null;

    const tokenHash = hashToken(rawToken);
    const now = new Date();

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) return null;

    // Check if revoked
    if (session.revokedAt !== null) return null;

    // Check absolute expiration
    if (session.expiresAt <= now) return null;

    // Check idle timeout
    const idleLimit = env.SESSION_IDLE_TIMEOUT_SECONDS * 1000;
    const timeSinceLastActive = now.getTime() - session.lastActiveAt.getTime();
    if (timeSinceLastActive > idleLimit) {
      // Mark as revoked due to idle timeout
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: now },
      });
      return null;
    }

    // Check if user is suspended
    if (session.user.status === 'SUSPENDED') {
      return null;
    }

    // Refresh lastActiveAt if more than 60 seconds have elapsed
    if (timeSinceLastActive > 60 * 1000) {
      await prisma.session.update({
        where: { id: session.id },
        data: { lastActiveAt: now },
      });
    }

    return { session, user: session.user };
  }

  /**
   * Revoke a session by raw token.
   */
  public static async revokeSessionByToken(rawToken: string): Promise<boolean> {
    if (!rawToken) return false;
    const tokenHash = hashToken(rawToken);

    try {
      await prisma.session.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return true;
    } catch (err) {
      logger.error('Failed to revoke session by token', err);
      return false;
    }
  }

  /**
   * Revoke a single session by its ID.
   */
  public static async revokeSessionById(sessionId: string, userId?: string): Promise<boolean> {
    try {
      const where: { id: string; userId?: string } = { id: sessionId };
      if (userId) where.userId = userId;

      await prisma.session.updateMany({
        where: { ...where, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return true;
    } catch (err) {
      logger.error('Failed to revoke session by id', err);
      return false;
    }
  }

  /**
   * Revoke all active sessions for a user (optionally preserving current session).
   */
  public static async revokeAllUserSessions(
    userId: string,
    exceptSessionId?: string
  ): Promise<number> {
    const where: { userId: string; revokedAt: null; id?: { not: string } } = {
      userId,
      revokedAt: null,
    };
    if (exceptSessionId) {
      where.id = { not: exceptSessionId };
    }

    const result = await prisma.session.updateMany({
      where,
      data: { revokedAt: new Date() },
    });

    return result.count;
  }

  /**
   * List active sessions for a given user.
   */
  public static async getUserSessions(userId: string) {
    const now = new Date();
    return prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        lastActiveAt: true,
        createdAt: true,
        ipAddress: true,
        userAgent: true,
      },
    });
  }

  /**
   * Helper to set session cookie on Express response.
   */
  public static setSessionCookie(res: Response, rawToken: string) {
    const cookieName = env.SSO_SESSION_COOKIE_NAME || env.SESSION_COOKIE_NAME || 'identityhub_sso_session';
    res.cookie(cookieName, rawToken, {
      httpOnly: env.COOKIE_HTTP_ONLY,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      domain: env.COOKIE_DOMAIN || undefined,
      path: env.COOKIE_PATH,
      maxAge: env.SESSION_TTL_SECONDS * 1000,
    });
  }

  /**
   * Helper to clear session cookie on Express response.
   */
  public static clearSessionCookie(res: Response) {
    const cookieName = env.SSO_SESSION_COOKIE_NAME || env.SESSION_COOKIE_NAME || 'identityhub_sso_session';
    res.clearCookie(cookieName, {
      httpOnly: env.COOKIE_HTTP_ONLY,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      domain: env.COOKIE_DOMAIN || undefined,
      path: env.COOKIE_PATH,
    });
  }
}

