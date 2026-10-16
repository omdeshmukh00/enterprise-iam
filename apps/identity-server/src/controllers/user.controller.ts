import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';
import { SessionService } from '../services/session.service.js';
import { AuditService } from '../services/audit.service.js';
import { getClientIp, getUserAgent, toSafeUser } from '../utils/helpers.js';

export class UserController {
  public static async getProfile(req: Request, res: Response, next: NextFunction) {
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

  public static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = getClientIp(req);
      const ua = getUserAgent(req);
      const user = await UserService.updateProfile(req.user!.id, req.body, ip, ua);

      res.status(200).json({
        success: true,
        data: {
          user,
          message: 'Profile updated successfully.',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = getClientIp(req);
      const ua = getUserAgent(req);
      const result = await UserService.changePassword(
        req.user!.id,
        req.body.currentPassword,
        req.body.newPassword,
        req.session?.id,
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

  public static async getActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;
      const activity = await AuditService.getUserActivity(req.user!.id, limit);

      res.status(200).json({
        success: true,
        data: {
          activity,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await SessionService.getUserSessions(req.user!.id);
      const enriched = sessions.map((s) => ({
        ...s,
        isCurrent: s.id === req.session?.id,
      }));

      res.status(200).json({
        success: true,
        data: {
          sessions: enriched,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async revokeSession(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.id;
      const success = await SessionService.revokeSessionById(sessionId, req.user!.id);

      res.status(200).json({
        success,
        data: {
          message: success ? 'Session revoked successfully.' : 'Unable to revoke session.',
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
