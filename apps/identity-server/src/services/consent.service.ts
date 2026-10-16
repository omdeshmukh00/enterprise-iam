import { prisma } from '../config/database.js';
import { AuditService } from './audit.service.js';
import { OAuthConsent } from '@prisma/client';

export interface ScopeDescription {
  scope: string;
  name: string;
  description: string;
}

export class ConsentService {
  /**
   * Translates OAuth scopes into user-friendly descriptions for the consent screen.
   */
  public static describeScopes(scopes: string[]): ScopeDescription[] {
    const scopeDictionary: Record<string, { name: string; description: string }> = {
      openid: {
        name: 'OpenID Identity',
        description: 'Verify your identity and authenticate you with OpenID Connect.',
      },
      profile: {
        name: 'Basic Profile',
        description: 'View your name, role, and profile details.',
      },
      email: {
        name: 'Email Address',
        description: 'View your primary email address and verification status.',
      },
      admin: {
        name: 'Administrative Access',
        description: 'Manage users, system health, and IAM configurations.',
      },
    };

    return scopes.map((s) => ({
      scope: s,
      name: scopeDictionary[s]?.name || s,
      description: scopeDictionary[s]?.description || `Access permission for ${s}`,
    }));
  }

  /**
   * Checks if user has already granted active consent covering all requested scopes.
   */
  public static async hasConsent(
    userId: string,
    clientId: string,
    requestedScopes: string[]
  ): Promise<boolean> {
    const consent = await prisma.oAuthConsent.findUnique({
      where: {
        userId_clientId: { userId, clientId },
      },
    });

    if (!consent || consent.revokedAt !== null) {
      return false;
    }

    // Must cover all requested scopes
    return requestedScopes.every((scope) => consent.scopes.includes(scope));
  }

  /**
   * Persists a user's consent grant for an application.
   */
  public static async grantConsent(
    userId: string,
    clientId: string,
    scopes: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<OAuthConsent> {
    const consent = await prisma.oAuthConsent.upsert({
      where: {
        userId_clientId: { userId, clientId },
      },
      create: {
        userId,
        clientId,
        scopes,
        revokedAt: null,
      },
      update: {
        scopes,
        revokedAt: null,
      },
    });

    await AuditService.logEvent({
      actorUserId: userId,
      action: 'CONSENT_GRANTED',
      resourceType: 'OAUTH_CLIENT',
      resourceId: clientId,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: { clientId, scopes },
    });

    return consent;
  }

  /**
   * Revokes a user's consent grant for an application.
   * This is separate from application logout.
   */
  public static async revokeConsent(
    userId: string,
    clientId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      await prisma.oAuthConsent.updateMany({
        where: {
          userId,
          clientId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      // Also revoke active refresh tokens for this user and client
      await prisma.oAuthRefreshToken.updateMany({
        where: {
          userId,
          clientId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      await AuditService.logEvent({
        actorUserId: userId,
        action: 'CONSENT_REVOKED',
        resourceType: 'OAUTH_CLIENT',
        resourceId: clientId,
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        metadata: { clientId },
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lists active application consents for a user.
   */
  public static async getUserConsents(userId: string) {
    const consents = await prisma.oAuthConsent.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      include: {
        client: {
          select: {
            clientId: true,
            name: true,
            clientType: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return consents.map((c) => ({
      id: c.id,
      clientId: c.clientId,
      clientName: c.client.name,
      scopes: c.scopes,
      grantedAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }
}
