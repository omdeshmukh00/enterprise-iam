import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import { VerificationService } from './verification.service.js';
import { AuditService } from './audit.service.js';
import { EmailService } from './email.service.js';
import { BadRequestError, UnauthorizedError, ConflictError, ForbiddenError } from '../utils/errors.js';
import { toSafeUser, SafeUser } from '../utils/helpers.js';
import { hashToken, generateSecureToken } from '../utils/tokens.js';
import { logDevAuthOtp } from '../utils/devOtpLogger.js';
import { RegisterDTO, LoginDTO } from '../types/auth.types.js';

export class AuthService {
  /**
   * User Registration
   */
  public static async register(
    data: RegisterDTO,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: SafeUser; verificationToken: string }> {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('An account with this email address already exists.', 'USER_ALREADY_EXISTS');
    }

    const passwordHash = await PasswordService.hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: false,
      },
    });

    // Create verification token and 6-digit OTP code
    const { rawToken, otpCode } = await VerificationService.createVerificationToken(user.id);
    const verificationUrl = `${env.EMAIL_VERIFICATION_URL}?token=${rawToken}`;

    // Development OTP terminal logging (only when enabled and NODE_ENV=development)
    logDevAuthOtp({
      purpose: 'EMAIL_VERIFICATION',
      email: user.email,
      code: otpCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Send verification email via Gmail SMTP
    await EmailService.sendVerificationEmail(
      user.email,
      `${user.firstName} ${user.lastName}`,
      verificationUrl,
      otpCode
    );

    // Audit log
    await AuditService.logEvent({
      actorUserId: user.id,
      action: 'USER_REGISTERED',
      resourceType: 'USER',
      resourceId: user.id,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: { email: user.email },
    });

    return {
      user: toSafeUser(user),
      verificationToken: rawToken,
    };
  }

  /**
   * User Login
   */
  public static async login(
    data: LoginDTO,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: SafeUser; rawToken: string }> {
    const email = data.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await AuditService.logEvent({
        action: 'LOGIN_FAILED',
        resourceType: 'AUTH',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        metadata: { email, reason: 'ACCOUNT_NOT_FOUND' },
      });
      throw new UnauthorizedError('Unable to sign in with the provided credentials.', 'INVALID_CREDENTIALS');
    }

    if (user.status === 'SUSPENDED') {
      await AuditService.logEvent({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        resourceType: 'AUTH',
        resourceId: user.id,
        status: 'FAILURE',
        ipAddress,
        userAgent,
        metadata: { email, reason: 'ACCOUNT_SUSPENDED' },
      });
      throw new ForbiddenError(
        'Your account has been suspended. Please contact your system administrator.',
        'ACCOUNT_SUSPENDED'
      );
    }

    const isPasswordValid = await PasswordService.verifyPassword(user.passwordHash, data.password);
    if (!isPasswordValid) {
      await AuditService.logEvent({
        actorUserId: user.id,
        action: 'LOGIN_FAILED',
        resourceType: 'AUTH',
        resourceId: user.id,
        status: 'FAILURE',
        ipAddress,
        userAgent,
        metadata: { email, reason: 'INVALID_PASSWORD' },
      });
      throw new UnauthorizedError('Unable to sign in with the provided credentials.', 'INVALID_CREDENTIALS');
    }

    // Create database session
    const { rawToken, session } = await SessionService.createSession(user.id, ipAddress, userAgent);

    // Update lastLoginAt
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Audit log
    await AuditService.logEvent({
      actorUserId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'AUTH',
      resourceId: session.id,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: { sessionId: session.id },
    });

    return {
      user: toSafeUser(updatedUser),
      rawToken,
    };
  }

  /**
   * User Logout (current session)
   */
  public static async logout(
    rawToken: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    const success = await SessionService.revokeSessionByToken(rawToken);

    if (userId) {
      await AuditService.logEvent({
        actorUserId: userId,
        action: 'LOGOUT',
        resourceType: 'AUTH',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
      });
    }

    return success;
  }

  /**
   * Logout from all sessions
   */
  public static async logoutAll(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<number> {
    const count = await SessionService.revokeAllUserSessions(userId);

    await AuditService.logEvent({
      actorUserId: userId,
      action: 'SESSION_REVOKED',
      resourceType: 'USER',
      resourceId: userId,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: { revokedAllCount: count },
    });

    return count;
  }

  /**
   * Request Login One-Time Passcode (OTP)
   */
  public static async sendLoginOtp(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.status === 'SUSPENDED') {
      await AuditService.logEvent({
        actorUserId: user.id,
        action: 'LOGIN_OTP_FAILED',
        resourceType: 'AUTH',
        resourceId: user.id,
        status: 'FAILURE',
        ipAddress,
        userAgent,
        metadata: { email: normalizedEmail, reason: 'ACCOUNT_SUSPENDED' },
      });
      throw new ForbiddenError(
        'Your account has been suspended. Please contact your system administrator.',
        'ACCOUNT_SUSPENDED'
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = hashToken(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate existing unused login OTPs for this email
    await prisma.loginOtp.updateMany({
      where: { email: normalizedEmail, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.loginOtp.create({
      data: {
        email: normalizedEmail,
        codeHash,
        expiresAt,
      },
    });

    // Development OTP terminal logging (only when enabled and NODE_ENV=development)
    logDevAuthOtp({
      purpose: 'LOGIN_OTP',
      email: normalizedEmail,
      code,
      expiresAt,
    });

    // Send email via Gmail SMTP
    const recipientName = user ? `${user.firstName} ${user.lastName}` : (normalizedEmail.split('@')[0] || 'User');
    await EmailService.sendOtpLoginEmail(
      normalizedEmail,
      recipientName,
      code
    );

    await AuditService.logEvent({
      actorUserId: user?.id,
      action: 'LOGIN_OTP_REQUESTED',
      resourceType: 'AUTH',
      resourceId: user?.id,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: { email: normalizedEmail },
    });

    return {
      success: true,
      message: `A 6-digit login code has been sent to ${normalizedEmail}.`,
    };
  }

  /**
   * Verify Login One-Time Passcode (OTP)
   */
  public static async verifyLoginOtp(
    email: string,
    code: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: SafeUser; rawToken: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const codeHash = hashToken(code.trim());

    const otpRecord = await prisma.loginOtp.findFirst({
      where: {
        email: normalizedEmail,
        codeHash,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      await AuditService.logEvent({
        action: 'LOGIN_OTP_FAILED',
        resourceType: 'AUTH',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        metadata: { email: normalizedEmail, reason: 'INVALID_CODE' },
      });
      throw new UnauthorizedError('Invalid or unrecognized login code.', 'INVALID_OTP');
    }

    if (otpRecord.expiresAt <= new Date()) {
      await AuditService.logEvent({
        action: 'LOGIN_OTP_FAILED',
        resourceType: 'AUTH',
        status: 'FAILURE',
        ipAddress,
        userAgent,
        metadata: { email: normalizedEmail, reason: 'EXPIRED_CODE' },
      });
      throw new UnauthorizedError('Login code has expired. Please request a new code.', 'OTP_EXPIRED');
    }

    // Mark OTP as consumed
    await prisma.loginOtp.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.status === 'SUSPENDED') {
      throw new ForbiddenError(
        'Your account has been suspended. Please contact your system administrator.',
        'ACCOUNT_SUSPENDED'
      );
    }

    if (!user) {
      // Auto-provision user upon email code verification
      const rawSecret = generateSecureToken(32);
      const passwordHash = await PasswordService.hashPassword(rawSecret);
      const nameParts = normalizedEmail.split('@')[0].split(/[._-]/);
      const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'User';
      const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : '';

      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName,
          lastName,
          role: 'USER',
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          ...(user.emailVerified ? {} : { emailVerified: true, emailVerifiedAt: new Date() }),
        },
      });
    }

    // Create session
    const { rawToken, session } = await SessionService.createSession(user.id, ipAddress, userAgent);

    await AuditService.logEvent({
      actorUserId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'AUTH',
      resourceId: session.id,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: { sessionId: session.id, method: 'OTP' },
    });

    return {
      user: toSafeUser(user),
      rawToken,
    };
  }
}
