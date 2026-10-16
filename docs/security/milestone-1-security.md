# IdentityHub — Milestone 1 Security Architecture

This document outlines the security architecture and defensive controls implemented for **IdentityHub Milestone 1 (First ~30% Functional Milestone)**.

---

## 1. Password Hashing (Argon2id)

IdentityHub uses **Argon2id** (the hybrid version of Argon2 recommended by OWASP and the winner of the Password Hashing Competition) to store all user passwords.

- **Algorithm**: `argon2id`
- **Memory Cost (`m`)**: `65536` KiB (64 MiB)
- **Time Cost (`t`)**: `3` iterations
- **Parallelism (`p`)**: `1` thread
- **Implementation**: Native bindings via the `argon2` npm library.
- **Defenses**:
  - Memory-hard function defeats GPU/ASIC brute-force cracking attacks.
  - Side-channel resistant against timing and cache-based attacks.
  - No passwords or hashes are ever logged or returned in API responses.

---

## 2. Session Architecture & Cookie Security

In Milestone 1, browser sessions are **database-backed**, avoiding premature stateless JWT pitfalls.

### Token Generation & Storage
1. When a user authenticates, the server generates an opaque 32-byte (256-bit entropy) cryptographically random hex token using `crypto.randomBytes(32)`.
2. The server computes a SHA-256 digest of this token:
   $$\text{tokenHash} = \text{SHA-256}(\text{rawToken})$$
3. Only the `tokenHash` is stored in the database `sessions` table. Even with full database read compromises, attackers cannot authenticate because SHA-256 is non-reversible.
4. The client receives the raw token inside an `HttpOnly` cookie.

### Cookie Configuration
| Directive | Development | Production | Rationale |
| :--- | :--- | :--- | :--- |
| **HttpOnly** | `true` | `true` | Prevents JavaScript read access; mitigates XSS session hijacking |
| **Secure** | `false` | `true` | Enforces HTTPS-only transmission in production |
| **SameSite** | `lax` | `lax` | Protects against cross-site request forgery while permitting safe top-level navigations |
| **Path** | `/` | `/` | Accessible to all relevant authentication routes |
| **Name** | `identityhub_session` | `identityhub_session` | Standard opaque session identifier |

### Session Lifecycle & Revocation
- **Absolute TTL**: 7 days (`604,800` seconds).
- **Idle Timeout**: 24 hours (`86,400` seconds) of inactivity.
- **Activity Refresh**: `lastActiveAt` is refreshed throttled (every 60s max per session) on valid requests.
- **Revocation**:
  - Individual session revocation (`DELETE /users/me/sessions/:id`).
  - Global user revocation on logout (`POST /auth/logout-all`), password change, or admin user suspension.

---

## 3. One-Time Token Security (Verification & Password Reset)

Email verification tokens and password reset tokens adhere to strict security invariants:
- **Entropy**: 256 bits (`crypto.randomBytes(32)`).
- **Hashed Storage**: Only `tokenHash` ($\text{SHA-256}$) is stored in the database.
- **Single-Use**: Once consumed, the record's `usedAt` timestamp is set in an atomic database transaction. Subsequent attempts are rejected with `TOKEN_ALREADY_USED`.
- **Expiration**:
  - Email Verification tokens expire after 24 hours.
  - Password Reset tokens expire after 1 hour.
- **Invalidation of Predecessors**: Generating a new token invalidates any previously issued, unconsumed token for that user.

---

## 4. Account Enumeration Defense

- The `/auth/forgot-password` endpoint returns an identical generic confirmation message (`200 OK`) whether the provided email address exists or does not exist:
  ```json
  {
    "success": true,
    "data": {
      "message": "If the provided email corresponds to an active account, a password reset link has been dispatched."
    }
  }
  ```
- Similarly, `/auth/resend-verification` returns a generic confirmation message to avoid leaking account registration status.

---

## 5. Cross-Site Request Forgery (CSRF) Defense

IdentityHub combines defense-in-depth mechanisms for cookie-authenticated requests:
1. **`SameSite=Lax` Cookie Policy**: Default browser cookie isolation stops automatic cross-site POST form submissions.
2. **Custom Request Header Validation**: All state-changing API mutations (`POST`, `PUT`, `PATCH`, `DELETE`) require the presence of custom headers (`X-IdentityHub-Client` or `X-Requested-With`) or strict `Origin`/`Referer` matching against configured whitelist origins (`CORS_ALLOWED_ORIGINS`).
   - Cross-origin sites cannot set custom headers without passing a CORS preflight (`OPTIONS`) request, which the Identity Server denies for unapproved origins.

---

## 6. Cross-Origin Resource Sharing (CORS)

- **No Wildcards with Credentials**: The server explicitly checks the incoming `Origin` against `CORS_ALLOWED_ORIGINS` (comma-separated list from `.env`).
- Wildcards (`*`) with `credentials: true` are prohibited by modern browsers and strictly rejected by the server.
- Supported Origins:
  - Admin Console: `http://localhost:3000`
  - CRM Client: `http://localhost:3001`
  - Analytics Client: `http://localhost:3002`
  - HR Client: `http://localhost:3003`

---

## 7. Rate Limiting

IdentityHub implements sliding-window in-memory rate limiters:
- **Login Rate Limiter**: Maximum 5 failed attempts per 15-minute window per IP/email pair (`LOGIN_MAX_ATTEMPTS=5`, `LOGIN_RATE_LIMIT_WINDOW_SECONDS=900`). Returns HTTP 429 `RATE_LIMIT_EXCEEDED`.
- **API Rate Limiter**: 100 requests per 15-minute window per IP (`API_RATE_LIMIT_MAX_REQUESTS=100`, `API_RATE_LIMIT_WINDOW_SECONDS=900`).
- Headers: Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.

---

## 8. Audit Logging & Zero Plaintext Secrets

- All authentication and security events (`USER_REGISTERED`, `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `PASSWORD_CHANGED`, `ADMIN_USER_SUSPENDED`, etc.) are written directly to PostgreSQL `audit_logs`.
- **Audit logs never record**:
  - Plaintext passwords or candidate passwords.
  - Argon2 password hashes.
  - Raw session tokens or raw reset tokens.
  - SMTP credentials or private keys.
- Structured logger redacts sensitive field names automatically.

---

## 9. Role-Based Access Control (RBAC) Server-Side Enforcement

- Administrative endpoints (`/admin/*`) require server-side validation of both:
  1. An authenticated, non-revoked database session.
  2. `user.role === 'ADMIN'`.
- Normal users attempting to invoke admin routes receive HTTP 403 `FORBIDDEN_INSUFFICIENT_PERMISSIONS`. Frontend route guards are purely cosmetic; authorization is enforced on every single API request.
