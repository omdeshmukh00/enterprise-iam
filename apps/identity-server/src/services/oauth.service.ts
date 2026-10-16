import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { generateSecureToken, hashToken } from '../utils/tokens.js';
import { verifyCodeChallenge } from '../crypto/pkce.js';
import { signJwt } from '../crypto/jwt.js';
import { ClientService } from './client.service.js';
import { ConsentService } from './consent.service.js';
import { AuditService } from './audit.service.js';
import { BadRequestError, UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { OAuthClient, User } from '@prisma/client';

export interface AuthorizeRequestParams {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  nonce?: string;
  prompt?: string;
}

export interface TokenExchangeParams {
  grantType: string;
  clientId: string;
  clientSecret?: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}

export class OAuthService {
  /**
   * Validates parameters of an incoming OAuth 2.0 authorization request.
   */
  public static async validateAuthorizeRequest(params: AuthorizeRequestParams): Promise<{
    client: OAuthClient;
    scopes: string[];
  }> {
    const { clientId, redirectUri, responseType, scope, codeChallenge, codeChallengeMethod } = params;

    const client = await ClientService.validateClient(clientId);

    // Exact redirect URI match
    if (!ClientService.validateRedirectUri(client, redirectUri)) {
      throw new BadRequestError(
        `Redirect URI '${redirectUri}' is not registered for client '${clientId}'.`,
        'invalid_redirect_uri'
      );
    }

    if (responseType !== 'code') {
      throw new BadRequestError(
        `Unsupported response_type '${responseType}'. Only 'code' is supported.`,
        'unsupported_response_type'
      );
    }

    // Require PKCE for browser clients
    if (!codeChallenge) {
      throw new BadRequestError('code_challenge is required for PKCE.', 'invalid_request');
    }

    if (codeChallengeMethod !== 'S256') {
      throw new BadRequestError(
        `code_challenge_method '${codeChallengeMethod}' is invalid. Only 'S256' is permitted.`,
        'invalid_request'
      );
    }

    const requestedScopes = scope
      ? scope.split(' ').map((s) => s.trim()).filter(Boolean)
      : ['openid', 'profile', 'email'];

    if (!ClientService.validateScopes(client, requestedScopes)) {
      throw new BadRequestError('One or more requested scopes are not allowed for this client.', 'invalid_scope');
    }

    return { client, scopes: requestedScopes };
  }

  /**
   * Issues an unpredictable, short-lived authorization code bound to client, user, redirectUri, and PKCE challenge.
   */
  public static async createAuthorizationCode(options: {
    clientId: string;
    userId: string;
    redirectUri: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    scopes: string[];
    nonce?: string;
  }): Promise<string> {
    const rawCode = generateSecureToken(32);
    const codeHash = hashToken(rawCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.oAuthAuthorizationCode.create({
      data: {
        codeHash,
        clientId: options.clientId,
        userId: options.userId,
        redirectUri: options.redirectUri,
        codeChallenge: options.codeChallenge,
        codeChallengeMethod: options.codeChallengeMethod || 'S256',
        scopes: options.scopes,
        nonce: options.nonce || null,
        expiresAt,
      },
    });

    return rawCode;
  }

  /**
   * Exchanges an authorization code for Access Token and ID Token.
   * Enforces single-use, expiry, PKCE S256 verification, and client validation.
   */
  public static async exchangeAuthorizationCode(
    params: TokenExchangeParams,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    access_token: string;
    id_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    refresh_token?: string;
  }> {
    const { grantType, clientId, clientSecret, code, redirectUri, codeVerifier } = params;

    if (grantType !== 'authorization_code') {
      throw new BadRequestError(`Unsupported grant_type '${grantType}'.`, 'unsupported_grant_type');
    }

    const client = await ClientService.validateClient(clientId);

    if (client.clientType === 'CONFIDENTIAL') {
      if (!clientSecret || !ClientService.verifyClientSecret(client, clientSecret)) {
        throw new UnauthorizedError('Client authentication failed.', 'invalid_client');
      }
    }

    if (!code) {
      throw new BadRequestError('code parameter is required.', 'invalid_request');
    }

    if (!codeVerifier) {
      throw new BadRequestError('code_verifier is required for PKCE validation.', 'invalid_request');
    }

    const codeHash = hashToken(code.trim());
    const authCode = await prisma.oAuthAuthorizationCode.findUnique({
      where: { codeHash },
      include: { user: true },
    });

    if (!authCode) {
      throw new BadRequestError('Invalid authorization code.', 'invalid_grant');
    }

    // Replay attack prevention: single use check
    if (authCode.usedAt !== null) {
      await AuditService.logEvent({
        actorUserId: authCode.userId,
        action: 'OAUTH_CODE_REPLAY_DETECTED',
        resourceType: 'OAUTH_CODE',
        resourceId: authCode.id,
        status: 'FAILURE',
        ipAddress,
        userAgent,
        metadata: { clientId, redirectUri },
      });
      throw new BadRequestError('Authorization code has already been used.', 'invalid_grant');
    }

    // Expiry check
    if (authCode.expiresAt <= new Date()) {
      throw new BadRequestError('Authorization code has expired.', 'invalid_grant');
    }

    // Bound client validation
    if (authCode.clientId !== clientId) {
      throw new BadRequestError('Authorization code was not issued to this client.', 'invalid_grant');
    }

    // Bound redirect URI validation
    if (authCode.redirectUri !== redirectUri) {
      throw new BadRequestError('Redirect URI does not match the authorization request.', 'invalid_grant');
    }

    // Verify PKCE code_verifier against code_challenge
    const pkceValid = verifyCodeChallenge(
      codeVerifier,
      authCode.codeChallenge,
      authCode.codeChallengeMethod
    );

    if (!pkceValid) {
      throw new BadRequestError('PKCE verification failed: code_verifier does not match challenge.', 'invalid_grant');
    }

    // Mark code as used immediately
    await prisma.oAuthAuthorizationCode.update({
      where: { id: authCode.id },
      data: { usedAt: new Date() },
    });

    const user = authCode.user;
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenError('User account has been suspended.', 'user_suspended');
    }

    const scopes = authCode.scopes;
    const scopeString = scopes.join(' ');
    const issuer = process.env.OIDC_ISSUER || 'http://localhost:5000';

    // 1. Access Token (JWT)
    const accessExpiresIn = 900; // 15 minutes
    const accessToken = signJwt(
      {
        sub: user.id,
        client_id: clientId,
        scope: scopeString,
        email: user.email,
        role: user.role,
      },
      {
        issuer,
        audience: 'identityhub-api',
        expiresInSeconds: accessExpiresIn,
      }
    );

    // 2. ID Token (OpenID Connect JWT)
    const idExpiresIn = 300; // 5 minutes
    const idToken = signJwt(
      {
        sub: user.id,
        email: user.email,
        email_verified: user.emailVerified,
        name: `${user.firstName} ${user.lastName}`.trim(),
        given_name: user.firstName,
        family_name: user.lastName,
        role: user.role,
      },
      {
        issuer,
        audience: clientId, // Client application is the audience of the ID token
        expiresInSeconds: idExpiresIn,
        nonce: authCode.nonce || undefined,
      }
    );

    await AuditService.logEvent({
      actorUserId: user.id,
      action: 'OAUTH_TOKEN_ISSUED',
      resourceType: 'OAUTH_CLIENT',
      resourceId: clientId,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: { clientId, scopes: authCode.scopes },
    });

    return {
      access_token: accessToken,
      id_token: idToken,
      token_type: 'Bearer',
      expires_in: accessExpiresIn,
      scope: scopeString,
    };
  }
}
