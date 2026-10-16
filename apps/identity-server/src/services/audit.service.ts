import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

export interface CreateAuditLogParams {
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  status: 'SUCCESS' | 'FAILURE';
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export class AuditService {
  /**
   * Records a security or system audit event to the database.
   */
  public static async logEvent(params: CreateAuditLogParams) {
    try {
      return await prisma.auditLog.create({
        data: {
          actorUserId: params.actorUserId || null,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId || null,
          status: params.status,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });
    } catch (err) {
      logger.error('Failed to write audit log to database', {
        action: params.action,
        error: err instanceof Error ? err.message : String(err),
      });
      // Do not throw to avoid crashing core business logic
      return null;
    }
  }

  /**
   * Retrieves security activity for a specific user (for /users/me/activity).
   */
  public static async getUserActivity(userId: string, limit = 20) {
    return prisma.auditLog.findMany({
      where: {
        OR: [
          { actorUserId: userId },
          { resourceId: userId, resourceType: 'USER' },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        timestamp: true,
        action: true,
        status: true,
        ipAddress: true,
        userAgent: true,
        metadata: true,
      },
    });
  }

  /**
   * Retrieves all audit logs for the admin console.
   */
  public static async getAdminAuditLogs(options?: {
    limit?: number;
    offset?: number;
    action?: string;
  }) {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const where: Prisma.AuditLogWhereInput = {};
    if (options?.action) {
      where.action = options.action;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
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
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, limit, offset };
  }
}
