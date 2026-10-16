import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { VerificationService } from '../services/verification.service.js';
import { PasswordResetService } from '../services/passwordReset.service.js';
import { SessionService } from '../services/session.service.js';
import { getClientIp, getUserAgent, toSafeUser } from '../utils/helpers.js';
import { env } from '../config/env.js';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = getClientIp(req);
      const ua = getUserAgent(req);
      const { user } = await AuthService.register(req.body, ip, ua);

      res.status(201).json({
        success: true,
        data: {
          user,
          message: 'Account created successfully. Please check your email to verify your address.',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = getClientIp(req);
      const ua = getUserAgent(req);
      const { user, rawToken } = await AuthService.login(req.body, ip, ua);

      SessionService.setSessionCookie(res, rawToken);

      res.status(200).json({
        success: true,
        data: {
          user,
          message: 'Authenticated successfully.',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const cookieName = env.SSO_SESSION_COOKIE_NAME || env.SESSION_COOKIE_NAME || 'identityhub_sso_session';
      const token = req.rawSessionToken || req.cookies?.[cookieName] || (env.SESSION_COOKIE_NAME ? req.cookies?.[env.SESSION_COOKIE_NAME] : undefined);
      const ip = getClientIp(req);
      const ua = getUserAgent(req);

      if (token) {
        await AuthService.logout(token, req.user?.id, ip, ua);
      }

      SessionService.clearSessionCookie(res);

      res.status(200).json({
        success: true,
        data: {
          message: 'Signed out successfully.',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async logoutAll(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = getClientIp(req);
      const ua = getUserAgent(req);

      if (req.user) {
        await AuthService.logoutAll(req.user.id, ip, ua);
      }

      SessionService.clearSessionCookie(res);

      res.status(200).json({
        success: true,
        data: {
          message: 'All active sessions have been revoked.',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        success: true,
        data: {
          user: toSafeUser(req.user!),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = getClientIp(req);
      const ua = getUserAgent(req);
      const result = await VerificationService.verifyEmail(req.body.token, ip, ua);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = getClientIp(req);
      const ua = getUserAgent(req);
      const result = await VerificationService.resendVerification(req.body.email, ip, ua);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = getClientIp(req);
      const ua = getUserAgent(req);
      const result = await PasswordResetService.requestPasswordReset(req.body.email, ip, ua);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = getClientIp(req);
      const ua = getUserAgent(req);
      const result = await PasswordResetService.resetPassword(
        req.body.token,
        req.body.password,
        ip,
        ua
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = getClientIp(req);
      const ua = getUserAgent(req);
      const result = await AuthService.sendLoginOtp(req.body.email, ip, ua);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = getClientIp(req);
      const ua = getUserAgent(req);
      const { user, rawToken } = await AuthService.verifyLoginOtp(
        req.body.email,
        req.body.code,
        ip,
        ua
      );

      SessionService.setSessionCookie(res, rawToken);

      res.status(200).json({
        success: true,
        data: {
          user,
          message: 'Authenticated successfully via one-time passcode.',
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
