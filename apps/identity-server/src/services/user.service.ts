import { prisma } from '../config/database.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import { AuditService } from './audit.service.js';
import { EmailService } from './email.service.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { toSafeUser, SafeUser } from '../utils/helpers.js';
import { UserStatus } from '@prisma/client';

export class UserService {
  /**
   * Update profile fields (firstName, lastName).
   */
  public static async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string },
    ipAddress?: string,
    userAgent?: string
  ): Promise<SafeUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName ?? user.firstName,
        lastName: data.lastName ?? user.lastName,
      },
    });

    await AuditService.logEvent({
      actorUserId: userId,
      action: 'PROFILE_UPDATED',
      resourceType: 'USER',
      resourceId: userId,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: { fields: Object.keys(data) },
    });

    return toSafeUser(updated);
  }

  /**
   * Authenticated password change.
   */
  public static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentSessionId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await PasswordService.verifyPassword(user.passwordHash, currentPassword);
    if (!isMatch) {
      await AuditService.logEvent({
        actorUserId: userId,
        action: 'PASSWORD_CHANGE_FAILED',
        resourceType: 'USER',
        resourceId: userId,
        status: 'FAILURE',
        ipAddress,
        userAgent,
      });
      throw new BadRequestError('Current password is incorrect', 'INVALID_CREDENTIALS');
    }

    const newHash = await PasswordService.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Invalidate all other sessions (keep current session active for continuous UX)
    await SessionService.revokeAllUserSessions(userId, currentSessionId);

    // Audit event
    await AuditService.logEvent({
      actorUserId: userId,
      action: 'PASSWORD_CHANGED',
      resourceType: 'USER',
      resourceId: userId,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    // Send security notification email
    await EmailService.sendPasswordChangedEmail(
      user.email,
      `${user.firstName} ${user.lastName}`,
      {
        timestamp: new Date(),
        ipAddress,
        userAgent,
      }
    );

    return { success: true, message: 'Password changed successfully.' };
  }

  /**
   * Admin: List all users with filtering and pagination.
   */
  public static async listUsers(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    status?: UserStatus;
  }) {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const where: any = {};
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map(toSafeUser),
      total,
      limit,
      offset,
    };
  }

  /**
   * Admin: Get detailed user profile with active sessions and security activity.
   */
  public static async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const [sessions, activity] = await Promise.all([
      SessionService.getUserSessions(userId),
      AuditService.getUserActivity(userId, 15),
    ]);

    return {
      user: toSafeUser(user),
      sessions,
      activity,
    };
  }

  /**
   * Admin: Update user status (ACTIVE | SUSPENDED).
   */
  public static async updateUserStatus(
    userId: string,
    status: UserStatus,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SafeUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    // If suspended, revoke all active sessions immediately!
    if (status === 'SUSPENDED') {
      await SessionService.revokeAllUserSessions(userId);
    }

    const action = status === 'SUSPENDED' ? 'ADMIN_USER_SUSPENDED' : 'ADMIN_USER_ACTIVATED';

    await AuditService.logEvent({
      actorUserId: adminUserId,
      action,
      resourceType: 'USER',
      resourceId: userId,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: { targetEmail: user.email, previousStatus: user.status, newStatus: status },
    });

    return toSafeUser(updated);
  }

  /**
   * Admin: Revoke all sessions for a user.
   */
  public static async revokeUserSessionsAdmin(
    userId: string,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ revokedCount: number }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const revokedCount = await SessionService.revokeAllUserSessions(userId);

    await AuditService.logEvent({
      actorUserId: adminUserId,
      action: 'ADMIN_SESSIONS_REVOKED',
      resourceType: 'USER',
      resourceId: userId,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: { revokedCount },
    });

    return { revokedCount };
  }

  /**
   * Admin Dashboard statistics.
   */
  public static async getAdminStats() {
    const [totalUsers, activeUsers, suspendedUsers, recentAuditLogs] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      recentAuditLogs,
    };
  }
}
