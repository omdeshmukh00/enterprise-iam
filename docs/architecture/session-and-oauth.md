# IdentityHub — Session Isolation, Development OTP, and OAuth 2.0 / OIDC Architecture

This specification documents the architecture and security model implemented in **IdentityHub Milestone 2: Session Isolation, Development OTP, and OAuth 2.0 / OpenID Connect**.

---

## 1. Identity Provider Session vs. Client Application Sessions

### Architecture Overview
In previous iterations, the Admin Console (`http://localhost:3000`), CRM (`http://localhost:3001`), and Identity Server (`http://localhost:5000`) all ran on `localhost`. Because browser cookies are partitioned by hostname/domain and **not isolated by port**, sharing a cookie named `identityhub_session` caused immediate state collisions: logging out of one application or clearing cookies destroyed sessions across all applications.

To establish proper zero-trust session boundaries, IdentityHub defines three distinct session entities:

```
+---------------------------------------------------------------------------------------+
|                                    User Browser                                       |
|                                                                                       |
|   Admin Console (Port 3000)        CRM Application (Port 3001)        Identity Server |
|   Cookie: identityhub_admin_session  Cookie: identityhub_crm_session   Cookie: identityhub_sso_session
+---------------+--------------------------------+------------------------------+-------+
                |                                |                              |
                v                                v                              v
+---------------+-----------+    +---------------+-----------+    +-------------+-------+
|  Admin Console Backend    |    |   CRM Application Backend |    |   IdentityHub IdP   |
|  (/api/auth/* handlers)   |    |   (/api/auth/* handlers)  |    |     (Port 5000)     |
|                           |    |                           |    |                     |
|  Local App Session Store  |    |  Local App Session Store  |    | Persistent Session  |
|  - Cryptographic tokens   |    |  - Cryptographic tokens   |    |  Storage (Prisma DB)|
|  - SHA-256 hashed keys    |    |  - SHA-256 hashed keys    |    | - SHA-256 token hash|
|  - User context & ID token|    |  - User context & ID token|    | - Idle & absolute   |
|                           |    |                           |      expiration      |
+---------------------------+    +---------------------------+    +---------------------+
```

### Session Characteristics

| Parameter | Identity Provider Central Session | Admin Console Local Session | CRM Client Local Session |
|---|---|---|---|
| **Cookie Name** | `identityhub_sso_session` (configurable via `SSO_SESSION_COOKIE_NAME`) | `identityhub_admin_session` (configurable via `ADMIN_SESSION_COOKIE_NAME`) | `identityhub_crm_session` (configurable via `CRM_SESSION_COOKIE_NAME`) |
| **Issuer** | Identity Server (`:5000`) | Admin Console Next.js Backend (`:3000`) | CRM Client Next.js Backend (`:3001`) |
| **Token Format** | 256-bit cryptographically secure random token (`crypto.randomBytes(32).toString('hex')`) | 256-bit random hex token | 256-bit random hex token |
| **Storage Security** | SHA-256 hashed in PostgreSQL `Session` table | SHA-256 hashed in secure server-side session memory store | SHA-256 hashed in secure server-side session memory store |
| **Browser Storage** | `HttpOnly`, `SameSite=Lax`, `Secure` in prod, `Path=/` | `HttpOnly`, `SameSite=Lax`, `Secure` in prod, `Path=/` | `HttpOnly`, `SameSite=Lax`, `Secure` in prod, `Path=/` |
| **Browser `localStorage`** | **Strictly prohibited** | **Strictly prohibited** | **Strictly prohibited** |
| **Lifecycle** | 7 days absolute, 24 hours idle sliding window | Synchronized with user login state | Synchronized with user login state |

---

## 2. Local Application Logout vs. Identity Provider Logout

### Isolated Logout Semantics
When a user clicks **Log out** inside the CRM application:
1. CRM invokes its local logout endpoint `POST /api/auth/logout`.
2. The CRM local session token is looked up, hashed, and revoked from the CRM session store.
3. The CRM cookie `identityhub_crm_session` is cleared using `Max-Age=0; Path=/; HttpOnly`.
4. The central session cookie `identityhub_sso_session` **remains intact and valid**.
5. The Admin Console's cookie `identityhub_admin_session` **remains intact and valid**.
6. Stored user consent grants (`OAuthConsent`) are **preserved** (logging out of an app does not revoke authorizations).

When the user selects **Log out** inside the Admin Console:
1. Admin Console invokes its local logout endpoint `POST /api/auth/logout`.
2. The Admin local session token is revoked from Admin session storage.
3. `identityhub_admin_session` is cleared.
4. The central IdentityHub SSO session and any peer application sessions (e.g., CRM) remain completely untouched.

### Single Logout (SLO) Clarification
In accordance with OIDC specifications (OpenID Connect Back-Channel / Front-Channel Logout), true global Single Logout invalidates all registered client sessions via back-channel notifications. Because external application back-channel broadcast endpoints are not enabled, **IdentityHub does not claim global Single Logout support**, keeping local app logout strictly isolated.

---

## 3. Development OTP Terminal Logging & Production Prohibition

### Behavior
For rapid local testing and integration development without requiring continuous email inbox inspection:
- When `NODE_ENV=development` **and** `DEV_LOG_AUTH_OTP=true`:
  - Whenever an OTP is generated (such as for email verification or email OTP login), IdentityHub logs formatted terminal output directly to `stdout`.
  - Recipient email address is strictly masked (e.g. `te****er@example.com`).
  - Terminal output clearly indicates the OTP purpose, formatted expiration time, and prominent `DEV ONLY` warning banners.
- When `DEV_LOG_AUTH_OTP=false`:
  - No OTP logging occurs under any circumstances.

### Production Startup Prohibition
In `apps/identity-server/src/config/env.ts`:
```typescript
if (env.NODE_ENV === 'production' && env.DEV_LOG_AUTH_OTP) {
  logger.fatal('SECURITY VIOLATION: DEV_LOG_AUTH_OTP=true is strictly forbidden in production mode!');
  process.exit(1);
}
```
If an operator attempts to boot Identity Server with `NODE_ENV=production` and `DEV_LOG_AUTH_OTP=true`, the process terminates immediately with exit code 1.

### Security Guarantees
- The logged OTP is the exact cryptographic OTP expected by the verification endpoint.
- All security guarantees (10-minute expiration, single-use invalidation, attempt limits, and Argon2/SHA-256 token hashing) remain active and enforced.
- OTPs are never exposed in frontend responses, API payloads, or audit log metadata.

---

## 4. OAuth 2.0 Authorization Code Flow with PKCE (RFC 7636)

IdentityHub implements an RFC 6749 and RFC 7636 compliant Authorization Code flow:

```
+----------+          +---------------+          +-----------------+          +---------------+
| Browser  |          | Client (CRM)  |          | Identity Server |          | Database      |
+----+-----+          +-------+-------+          +--------+--------+          +-------+-------+
     |                        |                           |                           |
     | 1. "Login" click       |                           |                           |
     +----------------------->|                           |                           |
     |                        | 2. Generate PKCE verifier |                           |
     |                        |    + S256 challenge       |                           |
     | 3. 302 Redirect to IdP |                           |                           |
     |<-----------------------+                           |                           |
     |                                                    |                           |
     | 4. GET /oauth/authorize?client_id=...&code_challenge=...&code_challenge_method=S256    |
     +--------------------------------------------------->|                           |
     |                                                    | 5. Validate client & URI  |
     |                                                    |    Check sso_session      |
     | 6. Consent Screen (if not previously consented)    |                           |
     |<---------------------------------------------------+                           |
     | 7. User clicks "Allow"                             |                           |
     +--------------------------------------------------->| 8. Persist OAuthConsent   |
     |                                                    |    Create AuthCode (5min) |
     | 9. 302 Redirect to Client redirect_uri?code=XYZ    |                           |
     |<---------------------------------------------------+                           |
     |                                                    |                           |
     | 10. GET /api/auth/callback?code=XYZ                |                           |
     +----------------------->|                           |                           |
     |                        | 11. POST /oauth/token     |                           |
     |                        |     (code + code_verifier)|                           |
     |                        +-------------------------->| 12. Verify SHA-256 verifier|
     |                        |                           |     Burn code (single use)|
     |                        | 13. Return Tokens:        |     Issue RS256 JWTs      |
     |                        |     access_token, id_token|                           |
     |                        |<--------------------------+                           |
     |                        | 14. Verify ID Token       |                           |
     |                        |     Create local session  |                           |
     | 15. Set-Cookie:        |     Set crm_session cookie|                           |
     |     identityhub_crm_session                        |                           |
     |<-----------------------+                           |                           |
```

### Protocol Details & Invariants
- **Code Challenge Method**: Mandatory `S256`. Plain challenge methods or missing challenges are rejected with `invalid_request`.
  $$\text{Code Challenge} = \text{BASE64URL}(\text{SHA256}(\text{code\_verifier}))$$
- **Code Lifetime**: Short-lived (5 minutes max).
- **Code Storage**: Hashed via SHA-256 before storage in `OAuthAuthorizationCode`.
- **Replay Protection**: Re-redeeming a code results in immediate rejection (`invalid_grant`) and revocation.
- **Client Binding**: Codes are strictly bound to `client_id`, `redirect_uri`, and user `userId`.

---

## 5. Client Registration

Clients are stored in the `OAuthClient` table with strict validation:
- **Client ID**: Unique slug identifier (`identityhub-admin-console`, `identityhub-crm`).
- **Client Type**: `public` (SPA/Next.js client-side) or `confidential` (server-side with hashed client secrets).
- **Allowed Redirect URIs**: Exact matching is enforced. No wildcard matching or path traversal is permitted.
- **Allowed Scopes**: e.g., `openid`, `profile`, `email`.
- **Status**: `isActive = true`. Disabled clients cannot initiate authorization requests.

### Pre-Seeded Development Clients
```json
[
  {
    "clientId": "identityhub-admin-console",
    "name": "IdentityHub Admin Console",
    "clientType": "public",
    "redirectUris": ["http://localhost:3000/api/auth/callback"],
    "allowedScopes": ["openid", "profile", "email"]
  },
  {
    "clientId": "identityhub-crm",
    "name": "IdentityHub CRM",
    "clientType": "public",
    "redirectUris": ["http://localhost:3001/api/auth/callback"],
    "allowedScopes": ["openid", "profile", "email"]
  }
]
```

---

## 6. Consent Management and Revocation

1. **Interactive Consent Screen**:
   - Rendered by Identity Server at `/oauth/authorize` when a user has not yet consented to the requested client and scopes.
   - Shows application name, requested scopes translated into plain human terms (e.g., "Access your email address", "View basic profile details").
   - Provides clear **Allow** and **Deny** actions.
2. **Denial Handling**:
   - Rejection redirects back to the registered callback with `error=access_denied&error_description=...`.
3. **Approval Handling**:
   - Grants are saved to the `OAuthConsent` table with a timestamp and exact scopes granted.
   - Subsequent authorizations with the same or subset of scopes proceed silently via SSO.
4. **Access Revocation**:
   - Users can revoke an application's access via `DELETE /users/consents/:clientId`.
   - Logging out of an application **does not** revoke consent; consent revocation specifically requires user action.

---

## 7. Token Lifecycle & OpenID Connect

### RS256 Cryptographic Key Infrastructure
- **Keys**: 2048-bit RSA key pair (`jwt-private.pem` / `jwt-public.pem` or Base64 environment fallback).
- **JWKS Endpoint**: `GET /.well-known/jwks.json` publishes the public key in standard RFC 7517 format:
  ```json
  {
    "keys": [
      {
        "kty": "RSA",
        "use": "sig",
        "alg": "RS256",
        "kid": "identityhub-key-01",
        "n": "...",
        "e": "AQAB"
      }
    ]
  }
  ```
- **OIDC Discovery**: `GET /.well-known/openid-configuration` provides issuer endpoints, signing algorithms, and claim capabilities.
- **ID Tokens**: Signed with RS256 containing standard OIDC claims:
  - `iss`: Identity Server URL (`http://localhost:5000`)
  - `sub`: User UUID
  - `aud`: Requesting `client_id`
  - `exp`: 5-minute expiration
  - `email`, `email_verified`, `name`, `given_name`, `family_name`
- **UserInfo Endpoint**: `GET /oidc/userinfo` accepts `Bearer <access_token>` and responds with normalized user claims.
