import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';
import { AuditService } from '../services/audit.service.js';
import { getClientIp, getUserAgent } from '../utils/helpers.js';
import { UserStatus } from '@prisma/client';

export class AdminController {
  public static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const search = req.query.search as string | undefined;
      const status = req.query.status as UserStatus | undefined;

      const result = await UserService.listUsers({ limit, offset, search, status });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getUserDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UserService.getUserDetails(req.params.id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = getClientIp(req);
      const ua = getUserAgent(req);
      const { status } = req.body;

      const user = await UserService.updateUserStatus(
        req.params.id,
        status,
        req.user!.id,
        ip,
        ua
      );

      res.status(200).json({
        success: true,
        data: {
          user,
          message: `User status successfully updated to ${status}.`,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async revokeUserSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = getClientIp(req);
      const ua = getUserAgent(req);

      const result = await UserService.revokeUserSessionsAdmin(
        req.params.id,
        req.user!.id,
        ip,
        ua
      );

      res.status(200).json({
        success: true,
        data: {
          ...result,
          message: `Successfully revoked ${result.revokedCount} active session(s).`,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const action = req.query.action as string | undefined;

      const result = await AuditService.getAdminAuditLogs({ limit, offset, action });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await UserService.getAdminStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
}
