import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { generateSecureToken, hashToken } from '../utils/tokens.js';
import { BadRequestError } from '../utils/errors.js';
import { AuditService } from './audit.service.js';
import { EmailService } from './email.service.js';
import { logDevAuthOtp } from '../utils/devOtpLogger.js';

export class VerificationService {
  /**
   * Generates a new single-use email verification token and 6-digit OTP code.
   * Older unconsumed verification tokens for this user are invalidated.
   */
  public static async createVerificationToken(userId: string): Promise<{ rawToken: string; otpCode: string }> {
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Invalidate existing unused verification tokens
    await prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        otpCode,
        expiresAt,
      },
    });

    return { rawToken, otpCode };
  }

  /**
   * Validates and consumes an email verification token or 6-digit OTP code.
   */
  public static async verifyEmail(
    identifier: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string }> {
    const trimmed = identifier ? identifier.trim() : '';
    if (!trimmed) {
      throw new BadRequestError('Verification token or 6-digit code is required', 'INVALID_TOKEN');
    }

    const isOtp = /^\d{6}$/.test(trimmed);
    let tokenRecord = null;

    if (isOtp) {
      // Look for active matching OTP
      tokenRecord = await prisma.emailVerificationToken.findFirst({
        where: { otpCode: trimmed, usedAt: null },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      });

      // If not found as active, check if already used for a friendly message
      if (!tokenRecord) {
        const used = await prisma.emailVerificationToken.findFirst({
          where: { otpCode: trimmed },
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        });
        if (used) {
          tokenRecord = used;
        }
      }
    } else {
      const tokenHash = hashToken(trimmed);
      tokenRecord = await prisma.emailVerificationToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });
    }

    if (!tokenRecord) {
      throw new BadRequestError('Invalid or unrecognized verification code/token', 'INVALID_TOKEN');
    }

    if (tokenRecord.usedAt !== null) {
      // If user is already verified, provide friendly idempotency
      if (tokenRecord.user.emailVerified) {
        return { success: true, message: 'Email is already verified.' };
      }
      throw new BadRequestError(
        'This verification token or code has already been used.',
        'TOKEN_ALREADY_USED'
      );
    }

    if (tokenRecord.expiresAt <= new Date()) {
      throw new BadRequestError(
        'This verification token or code has expired. Please request a new one.',
        'TOKEN_EXPIRED'
      );
    }

    // Mark token as used and user as verified in a transaction
    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
    ]);

    // Audit log
    await AuditService.logEvent({
      actorUserId: tokenRecord.userId,
      action: 'EMAIL_VERIFIED',
      resourceType: 'USER',
      resourceId: tokenRecord.userId,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: { email: tokenRecord.user.email, method: isOtp ? 'OTP' : 'LINK' },
    });

    // Send welcome email
    await EmailService.sendWelcomeEmail(
      tokenRecord.user.email,
      `${tokenRecord.user.firstName} ${tokenRecord.user.lastName}`
    );

    return { success: true, message: 'Email verified successfully.' };
  }

  /**
   * Resend verification email if user is not yet verified.
   */
  public static async resendVerification(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Never leak whether user exists
    if (!user) {
      return {
        success: true,
        message: 'If the account exists and is unverified, a verification email has been sent.',
      };
    }

    if (user.emailVerified) {
      return {
        success: true,
        message: 'Email address is already verified.',
      };
    }

    const { rawToken, otpCode } = await this.createVerificationToken(user.id);
    const verificationUrl = `${env.EMAIL_VERIFICATION_URL}?token=${rawToken}`;

    // Development OTP terminal logging (only when enabled and NODE_ENV=development)
    logDevAuthOtp({
      purpose: 'EMAIL_VERIFICATION',
      email: user.email,
      code: otpCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await EmailService.sendVerificationEmail(
      user.email,
      `${user.firstName} ${user.lastName}`,
      verificationUrl,
      otpCode
    );

    await AuditService.logEvent({
      actorUserId: user.id,
      action: 'VERIFICATION_EMAIL_RESENT',
      resourceType: 'USER',
      resourceId: user.id,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'If the account exists and is unverified, a verification email has been sent.',
    };
  }
}
