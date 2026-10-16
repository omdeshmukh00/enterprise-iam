# IdentityHub System Architecture

## Architecture Overview

IdentityHub is structured as a monorepo containing three core applications:

1. **Identity Server (`apps/identity-server`, port 5000)**:
   - Central Identity Provider (IdP) and OAuth 2.0 / OpenID Connect Authorization Server.
   - Built with Express, TypeScript, and Prisma ORM against Supabase PostgreSQL.
   - Manages user identities, credentials, verification OTPs, database-backed sessions, OAuth clients, consents, authorization codes, and refresh tokens.
   - Emits RS256 signed JWT tokens.

2. **Admin Console (`apps/admin-console`, port 3000)**:
   - Administrative portal and end-user self-service identity dashboard.
   - Built with Next.js 14 App Router, React, and Tailwind CSS.
   - Manages users, security activity, sessions, and system audit logs.
   - Maintains an isolated local session (`identityhub_admin_session`).

3. **CRM Client Application (`apps/client-apps/crm`, port 3001)**:
   - Independent enterprise line-of-business consumer application.
   - Authenticates via OAuth 2.0 Authorization Code Flow with PKCE (`S256`) against IdentityHub.
   - Maintains an isolated local session (`identityhub_crm_session`).

## Database Schema (Prisma)

Core models:
- `User`: Primary identity table (email, password hash, status, MFA flags).
- `Session`: Database-backed sessions for the central IdP (SHA-256 token hash, IP, user-agent, expiresAt).
- `OAuthClient`: Registered OAuth 2.0 / OIDC clients (client ID, hashed secret, redirect URIs, scopes, type, status).
- `OAuthAuthorizationCode`: Short-lived single-use codes (SHA-256 code hash, PKCE challenge, redirect URI, scope).
- `OAuthConsent`: Persisted user scope grants per client.
- `OAuthRefreshToken`: Long-lived refresh tokens with rotation and replay detection.
- `AuditLog`: System-wide immutable security audit log.
- `VerificationToken`: Single-use email verification and password reset tokens.
- `UserSecurityActivity`: Granular user event history (login, logout, password change).

## Network Topology & Security Boundaries

```
                    +--------------------------------+
                    |        User Web Browser        |
                    +---+--------------------+---+---+
                        |                    |   |
      http://localhost:3000                  |   http://localhost:3001
                        |                    |   |
                        v                    |   v
              +---------+----------+         | +-+----------------+
              |   Admin Console    |         | |   CRM Client     |
              |   Next.js Server   |         | |  Next.js Server  |
              +---------+----------+         | +-+----------------+
                        |                    |   |
                        | Server-to-Server   |   | OAuth Token Exchange
                        | API / Proxy        |   | (code + PKCE verifier)
                        |                    |   |
                        v                    v   v
                    +---+--------------------+---+---+
                    |        Identity Server         |
                    |     Express.js (Port 5000)     |
                    +---------------+----------------+
                                    |
                                    v
                    +---------------+----------------+
                    |    Supabase PostgreSQL (DB)    |
                    +--------------------------------+
```
