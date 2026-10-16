import { prisma } from '../config/database.js';
import { hashToken } from '../utils/tokens.js';
import { BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { OAuthClient } from '@prisma/client';

export interface CreateClientDTO {
  clientId: string;
  name: string;
  clientSecret?: string;
  clientType?: 'PUBLIC' | 'CONFIDENTIAL';
  redirectUris: string[];
  allowedScopes: string[];
  isActive?: boolean;
}

export class ClientService {
  /**
   * Registers a new OAuth client. Client secret is hashed if provided.
   */
  public static async registerClient(data: CreateClientDTO): Promise<OAuthClient> {
    const existing = await prisma.oAuthClient.findUnique({
      where: { clientId: data.clientId },
    });

    if (existing) {
      throw new BadRequestError(`Client with ID ${data.clientId} already exists.`, 'CLIENT_EXISTS');
    }

    const clientSecretHash = data.clientSecret ? hashToken(data.clientSecret) : null;

    return prisma.oAuthClient.create({
      data: {
        clientId: data.clientId,
        name: data.name,
        clientSecretHash,
        clientType: data.clientType || 'PUBLIC',
        redirectUris: data.redirectUris,
        allowedScopes: data.allowedScopes,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  /**
   * Retrieves a client by clientId.
   */
  public static async getClientByClientId(clientId: string): Promise<OAuthClient | null> {
    return prisma.oAuthClient.findUnique({
      where: { clientId },
    });
  }

  /**
   * Validates client exists and is active.
   */
  public static async validateClient(clientId: string): Promise<OAuthClient> {
    if (!clientId) {
      throw new BadRequestError('client_id is required.', 'INVALID_CLIENT');
    }

    const client = await this.getClientByClientId(clientId);
    if (!client) {
      throw new UnauthorizedError(`Unknown client: ${clientId}`, 'INVALID_CLIENT');
    }

    if (!client.isActive) {
      throw new ForbiddenError(`Client ${clientId} is currently disabled.`, 'CLIENT_DISABLED');
    }

    return client;
  }

  /**
   * Validates that the requested redirect URI exactly matches one of the registered URIs.
   */
  public static validateRedirectUri(client: OAuthClient, redirectUri: string): boolean {
    if (!redirectUri) return false;
    return client.redirectUris.includes(redirectUri);
  }

  /**
   * Validates that requested scopes are allowed for this client.
   */
  public static validateScopes(client: OAuthClient, requestedScopes: string[]): boolean {
    if (!requestedScopes || requestedScopes.length === 0) return true;
    return requestedScopes.every((scope) => client.allowedScopes.includes(scope));
  }

  /**
   * Verifies client secret for confidential clients.
   */
  public static verifyClientSecret(client: OAuthClient, clientSecret: string): boolean {
    if (!client.clientSecretHash) return false;
    const computedHash = hashToken(clientSecret);
    return client.clientSecretHash === computedHash;
  }

  /**
   * Update active/disabled status.
   */
  public static async setClientStatus(clientId: string, isActive: boolean): Promise<OAuthClient> {
    return prisma.oAuthClient.update({
      where: { clientId },
      data: { isActive },
    });
  }

  /**
   * List all registered clients (safe representation without secret hashes).
   */
  public static async listClients() {
    return prisma.oAuthClient.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        clientId: true,
        name: true,
        clientType: true,
        redirectUris: true,
        allowedScopes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Ensures default development clients exist in database.
   */
  public static async ensureDefaultDevelopmentClients(): Promise<void> {
    const clients: CreateClientDTO[] = [
      {
        clientId: 'identityhub-admin-console',
        name: 'IdentityHub Admin Console',
        clientType: 'PUBLIC',
        redirectUris: [
          'http://localhost:3000/api/auth/callback',
          'http://localhost:3000/login',
        ],
        allowedScopes: ['openid', 'profile', 'email', 'admin'],
        isActive: true,
      },
      {
        clientId: 'identityhub-crm',
        name: 'IdentityHub CRM',
        clientType: 'PUBLIC',
        redirectUris: [
          'http://localhost:3001/api/auth/callback',
        ],
        allowedScopes: ['openid', 'profile', 'email'],
        isActive: true,
      },
    ];

    for (const c of clients) {
      const existing = await prisma.oAuthClient.findUnique({
        where: { clientId: c.clientId },
      });

      if (!existing) {
        await prisma.oAuthClient.create({
          data: {
            clientId: c.clientId,
            name: c.name,
            clientType: c.clientType || 'PUBLIC',
            redirectUris: c.redirectUris,
            allowedScopes: c.allowedScopes,
            isActive: true,
          },
        });
      } else {
        // Ensure redirectUris are up to date
        await prisma.oAuthClient.update({
          where: { clientId: c.clientId },
          data: {
            name: c.name,
            redirectUris: c.redirectUris,
            allowedScopes: c.allowedScopes,
          },
        });
      }
    }
  }
}
