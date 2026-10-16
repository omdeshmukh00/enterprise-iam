import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { generateSecureToken, hashToken } from '../utils/tokens.js';
import { BadRequestError } from '../utils/errors.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import { AuditService } from './audit.service.js';
import { EmailService } from './email.service.js';

export class PasswordResetService {
  /**
   * Request a password reset. Prevents user enumeration by always returning success.
   */
  public static async requestPasswordReset(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (user && user.status === 'ACTIVE') {
      const rawToken = generateSecureToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Invalidate existing unused tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      const resetUrl = `${env.PASSWORD_RESET_URL}?token=${rawToken}`;

      await EmailService.sendPasswordResetEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        resetUrl
      );

      await AuditService.logEvent({
        actorUserId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resourceType: 'USER',
        resourceId: user.id,
        status: 'SUCCESS',
        ipAddress,
        userAgent,
      });
    }

    return {
      success: true,
      message: 'If the provided email corresponds to an active account, a password reset link has been dispatched.',
    };
  }

  /**
   * Resets password using a validated one-time token.
   * Invalidates token and revokes all active sessions for the user.
   */
  public static async resetPassword(
    rawToken: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!rawToken) {
      throw new BadRequestError('Password reset token is required', 'INVALID_TOKEN');
    }

    const tokenHash = hashToken(rawToken);
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new BadRequestError('Invalid or unrecognized password reset token', 'INVALID_TOKEN');
    }

    if (tokenRecord.usedAt !== null) {
      throw new BadRequestError('This password reset link has already been used', 'TOKEN_ALREADY_USED');
    }

    if (tokenRecord.expiresAt <= new Date()) {
      throw new BadRequestError(
        'This password reset link has expired. Please request a new one.',
        'TOKEN_EXPIRED'
      );
    }

    const newPasswordHash = await PasswordService.hashPassword(newPassword);

    // Atomically invalidate token and update password
    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash: newPasswordHash },
      }),
    ]);

    // Invalidate all existing sessions
    await SessionService.revokeAllUserSessions(tokenRecord.userId);

    // Record audit event
    await AuditService.logEvent({
      actorUserId: tokenRecord.userId,
      action: 'PASSWORD_RESET_COMPLETED',
      resourceType: 'USER',
      resourceId: tokenRecord.userId,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    // Send security notification email
    await EmailService.sendPasswordChangedEmail(
      tokenRecord.user.email,
      `${tokenRecord.user.firstName} ${tokenRecord.user.lastName}`,
      {
        timestamp: new Date(),
        ipAddress,
        userAgent,
      }
    );

    return {
      success: true,
      message: 'Your password has been successfully reset. Please sign in with your new credentials.',
    };
  }
}
