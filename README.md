# IdentityHub — Enterprise Identity & Access Management (IAM)

> **Milestone 2 — Session Isolation, Development OTP & OAuth 2.0 / OIDC Authorization Server (~65% Complete)**  
> *Tagline: One Identity. Every Application.*

IdentityHub is an Enterprise Identity and Access Management (IAM) platform built with Node.js, Express, TypeScript, Next.js, and Supabase PostgreSQL.

---

## 1. Milestone 1 & 2 Scope & Architecture

### Implemented in Milestone 1 & 2:
- **Core Identity Server (`apps/identity-server`, port `5000`)**:
  - **Session Isolation & Triple-Cookie Architecture**:
    - Central Identity Provider (IdP) session: `identityhub_sso_session`.
    - Admin Console local session: `identityhub_admin_session`.
    - CRM application local session: `identityhub_crm_session`.
    - All cookies configured `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
  - **Independent Application Logout**:
    - Logging out of CRM invalidates only the CRM session and clears `identityhub_crm_session`.
    - Admin Console session and central IdP SSO session remain completely valid.
    - Stored user OAuth consents remain preserved.
  - **Development OTP Terminal Output (`DEV_LOG_AUTH_OTP`)**:
    - When `NODE_ENV=development` and `DEV_LOG_AUTH_OTP=true`, logs generated OTPs to terminal with masked recipient email (`t***r@example.com`), purpose, expiration, and `DEV ONLY` warning.
    - Strictly rejected at server startup if enabled in `production` mode.
    - Works with email verification and email OTP login flows without exposing OTPs in frontend or audit logs.
  - **OAuth 2.0 Authorization Server (RFC 6749 & RFC 7636 PKCE)**:
    - Authorization Code grant with mandatory `S256` PKCE challenge method.
    - Pre-seeded registered clients: `identityhub-admin-console` and `identityhub-crm`.
    - Exact redirect URI matching, scope validation, and short-lived (5m) single-use authorization codes.
    - Automatic authorization code replay detection and revocation.
  - **Interactive User Consent Screen**:
    - Real consent screen displaying client name, requested scopes in plain language, and Allow/Deny actions.
    - Stored consent persistence (`OAuthConsent`) and user revocation endpoint (`DELETE /users/consents/:clientId`).
  - **OpenID Connect (OIDC Core 1.0)**:
    - OIDC Discovery (`GET /.well-known/openid-configuration`).
    - RFC 7517 JWKS endpoint (`GET /.well-known/jwks.json`) publishing RS256 public keys.
    - Signed RS256 ID tokens containing standard claims (`sub`, `iss`, `aud`, `email`, `name`).
    - Standard UserInfo endpoint (`GET /oidc/userinfo`).
  - **Security & IAM Foundation**:
    - Argon2id memory-hard password hashing.
    - Database-backed sessions with SHA-256 token hashing and 24h idle / 7d absolute timeouts.
    - Single-use hashed verification tokens and password reset flow.
    - Gmail SMTP email integration with responsive transactional HTML templates.
    - Granular user security activity history, session management, and admin user suspension/reactivation.
    - Login rate limiting (sliding window) and CSRF protection.

- **Admin Console & User Portal (`apps/admin-console`, port `3000`)**:
  - Built with Next.js 14 (App Router), React, and Tailwind CSS.
  - Server-side Next.js route handlers (`/api/auth/*`) maintaining isolated `identityhub_admin_session`.
  - Full user portal: `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/dashboard`, `/profile`, `/security`, `/sessions`, `/activity`.
  - Full admin portal (role-guarded): `/admin`, `/admin/users`, `/admin/users/[id]`, `/admin/activity`, `/admin/settings`.

- **First-Party Client App: CRM (`apps/client-apps/crm`, port `3001`)**:
  - Independent Next.js 14 client application acting as an OAuth 2.0 / OIDC relying party.
  - "Continue with IdentityHub" initiates Authorization Code + PKCE (`S256`) redirect.
  - Server-side callback route (`/api/auth/callback`) exchanges code and sets isolated `identityhub_crm_session`.
  - Local logout (`/api/auth/logout`) terminates CRM session without affecting central SSO.

- **First-Party Client App: Analytics (`apps/client-apps/analytics`, port `3002`)**:
  - Independent Next.js 14 client application for telemetry and identity observability.
  - Integrated OAuth 2.0 / OIDC relying party with PKCE (`S256`) authorization flow.
  - Server-side callback route (`/api/auth/callback`) maintains isolated `identityhub_analytics_session`.
  - Real-time dashboards for SSO session activity, token issuance metrics, and risk telemetry.

- **Automated Testing & Infrastructure**:
  - **59/59 automated tests passing across 8 test suites** (`100% pass rate`).
  - Integration tests for session isolation, SSO reuse, logout independence, OTP security, admin APIs, and OAuth 2.0 / OIDC.
  - Production Dockerfiles and `docker-compose.yml` for all three services.

### Reserved for Subsequent Milestones:
- Multi-factor Authentication (TOTP, MFA recovery codes).
- SCIM, LDAP, SAML, and external identity provider federation.
- Organizations, multi-tenancy, and advanced fine-grained RBAC.

---

## 2. Technology Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Zod, Argon2, Cookie-Parser, Helmet, Cors, Jose/JWT, Crypto.
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide Icons.
- **Database**: Supabase PostgreSQL with Prisma ORM 5.
- **Email Service**: Nodemailer with Gmail SMTP (STARTTLS port 587).
- **Testing**: Vitest, Supertest.
- **Package Manager**: pnpm (v9.15+ workspaces).

---

## 3. Repository Structure

```text
enterprise-iam/
├── apps/
│   ├── identity-server/         # Core IAM Express backend (Port 5000)
│   ├── admin-console/           # Next.js User Portal & Admin Console (Port 3000)
│   └── client-apps/
│       ├── crm/                 # Next.js CRM client app (Port 3001)
│       ├── analytics/           # Next.js Analytics client app (Port 3002)
│       └── hr/                  # Reserved client
├── docs/
│   ├── security/
│   │   └── milestone-1-security.md   # Comprehensive security specification
│   └── api/
│       └── email.md                  # Email templates & SMTP guide
├── infrastructure/
│   ├── docker/
│   │   ├── identity-server.Dockerfile
│   │   ├── admin-console.Dockerfile
│   │   ├── crm.Dockerfile
│   │   └── analytics.Dockerfile
│   └── docker-compose.yml
├── packages/
│   ├── logger/                  # Monorepo logging
│   ├── shared-types/            # Shared response contracts
│   └── validation/              # Shared validator utilities
├── scripts/
│   └── seed-database.ts         # Initial admin account seed script
├── .env.example
├── pnpm-workspace.yaml
└── package.json
```

---

## 4. Local Setup & Quickstart

### Prerequisites
- Node.js `v20.x` (or `>= 18.0.0`)
- pnpm `v9.15+` (`npm install -g pnpm@9`)
- Supabase PostgreSQL instance (or external PostgreSQL 15+)

### Step 1: Install Dependencies
```bash
pnpm install
```

### Step 2: Configure Environment
Copy `.env.example` in `apps/identity-server/` or configure `apps/identity-server/.env`:

```env
NODE_ENV=development
PORT=5000
APP_NAME=IdentityHub
APP_VERSION=0.1.0
APP_BASE_URL=http://localhost:5000

# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.<REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:5432/postgres"

# Application URLs & CORS
ADMIN_CONSOLE_URL=http://localhost:3000
CRM_APP_URL=http://localhost:3001
ANALYTICS_APP_URL=http://localhost:3002
HR_APP_URL=http://localhost:3003
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003

# Sessions & Cookie Isolation
SSO_SESSION_COOKIE_NAME=identityhub_sso_session
SESSION_COOKIE_NAME=identityhub_sso_session
SESSION_TTL_SECONDS=604800
SESSION_IDLE_TIMEOUT_SECONDS=86400
COOKIE_HTTP_ONLY=true
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

# Development OTP Terminal Logging (strictly forbidden in production)
DEV_LOG_AUTH_OTP=false

# Password Hashing
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=1

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=youraccount@gmail.com
SMTP_PASSWORD="your-16-char-app-password"
SMTP_FROM_EMAIL=youraccount@gmail.com
SMTP_FROM_NAME="IdentityHub"

# Administrative Bootstrap
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=ChangeMeImmediately
```

### Step 3: Apply Database Schema
```bash
pnpm --filter identity-server db:push
```

### Step 4: Seed Initial Administrator
```bash
pnpm seed:admin
```
*Creates initial admin account:*  
- **Email**: `admin@example.com`  
- **Password**: `ChangeMeImmediately` (hashed with Argon2id)

### Step 5: Start All Applications
You can start applications individually or concurrently:

```bash
# Terminal 1: Backend Identity Server (Port 5000)
pnpm dev:backend

# Terminal 2: Admin Console & User Portal (Port 3000)
pnpm dev:admin

# Terminal 3: CRM Demonstration App (Port 3001)
pnpm dev:crm

# Terminal 4: Analytics Demonstration App (Port 3002)
pnpm dev:analytics
```

---

## 5. Automated Tests & Verification

Run the comprehensive Vitest test suite covering cryptographic tokens, Argon2 password hashing, email rendering, development OTP security, session isolation, admin management, and full OAuth 2.0 / OIDC Authorization Code flows:

```bash
# Run all tests (59 tests across 8 suites)
pnpm test
# Or specifically inside the identity server workspace:
pnpm --filter identity-server test

# Typecheck all monorepo packages and apps (0 errors)
pnpm -r typecheck
```

### Test Suite Breakdown (59/59 Passed - 100%)
1. `tests/unit/tokens.test.ts` (3 tests) — Cryptographic random bytes and SHA-256 token hashing.
2. `tests/unit/password.test.ts` (3 tests) — Argon2id password hashing and validation.
3. `tests/unit/dev-otp.test.ts` (6 tests) — Phase A4/A5 Development OTP terminal logging, email masking, and production startup rejection.
4. `tests/unit/email.test.ts` (3 tests) — Gmail SMTP email templates and HTML rendering.
5. `tests/integration/session-isolation.test.ts` (7 tests) — Phase A5 session isolation, SSO reuse, and independent application logout.
6. `tests/integration/admin.test.ts` (7 tests) — Admin directory management, user suspension, and audit logs.
7. `tests/integration/auth.test.ts` (17 tests) — Registration, email verification, session lifecycle, password reset, and OTP login.
8. `tests/oauth/oauth-sso-flow.test.ts` (13 tests) — Phase B OAuth 2.0 PKCE (`S256`), interactive consent, OIDC discovery, JWKS, UserInfo, and SSO acceptance flows.

---

## 6. Architecture & Security Specifications
- [Session Isolation & OAuth 2.0 / OIDC Architecture](file:///d:/Codes/enterprise-iam/docs/architecture/session-and-oauth.md)
- [OAuth 2.0 Authorization Code + PKCE Flow](file:///d:/Codes/enterprise-iam/docs/architecture/oauth-flow.md)
- [Single Sign-On (SSO) Flow](file:///d:/Codes/enterprise-iam/docs/architecture/sso-flow.md)
- [OpenID Connect (OIDC) Implementation](file:///d:/Codes/enterprise-iam/docs/architecture/oidc-flow.md)
- [System Architecture](file:///d:/Codes/enterprise-iam/docs/architecture/system-architecture.md)
- [Security Model & Attack Mitigation](file:///d:/Codes/enterprise-iam/docs/security/milestone-1-security.md)

---

## 7. Docker Deployment

To build and run all services with Docker:

```bash
docker compose -f infrastructure/docker-compose.yml up --build
```

---

## 8. Demonstration Walkthrough

Follow this sequence to demonstrate the working system:

### DEMO 1: Portal Landing
1. Open `http://localhost:3000/login`.
2. Inspect the clean enterprise aesthetic (Inter font, indigo accents, subtle borders).
3. Navigate to `http://localhost:3000/register`.

### DEMO 2: User Registration & Email Verification
1. On the registration page, enter a new user:
   - Name: `Demo User`
   - Email: `your_test_email@gmail.com`
   - Password: `StrongPassword123!`
2. Submit the form. Notice the real-time password criteria validation and immediate creation.
3. Open the recipient Gmail inbox. Inspect the email with subject:  
   **"IdentityHub — Verify your email"**.
4. Click **Verify Email Address** (or copy link to browser).
5. The `/verify-email` page consumes the single-use token, confirms the email, and presents a success confirmation.

### DEMO 3: Authentication & User Dashboard
1. Sign in with the registered credentials.
2. The browser receives the `HttpOnly` `identityhub_admin_session` and central `identityhub_sso_session` cookies.
3. Observe the **IdentityHub Dashboard**:
   - IdentityHub Account card showing status: `ACTIVE`, email: `Verified`.
   - Last authentication timestamp.
   - Quick navigation to Profile, Security, Active Sessions, and Security Activity.

### DEMO 4: Security & Sessions
1. Navigate to **Active Sessions** (`/sessions`):
   - Notice the current database-backed session with IP address, browser user-agent, and "Current Session" badge.
2. Navigate to **Security & Password** (`/security`):
   - Change your password using current and new password.
   - Observe that a security notification email is sent to your inbox informing you of the change.

### DEMO 5: Logout & Session Invalidation
1. Click **Sign Out** from the sidebar.
2. Verify the `identityhub_admin_session` cookie is revoked and cleared.
3. Attempting to navigate back to `/dashboard` redirects immediately to `/login`.

### DEMO 6: Password Recovery
1. On the login page, click **Forgot password?**.
2. Enter your email and click **Send Reset Link**.
3. Open Gmail and locate the email: **"IdentityHub — Reset your password"**.
4. Click the link to open `/reset-password?token=...`.
5. Enter a new password, submit, and confirm successful recovery.

### DEMO 7: Admin Console Overview
1. Sign in with the seeded administrator credentials:
   - **Email**: `admin@example.com`
   - **Password**: `ChangeMeImmediately`
2. Since the user role is `ADMIN`, the **Admin Console** tab is available.
3. Navigate to `/admin`:
   - Real database metric cards: Total Users, Active Accounts, Suspended Accounts, Audit Events.
   - Real-time stream of recent authentication events.

### DEMO 8: User Directory & Suspension
1. Navigate to **User Directory** (`/admin/users`).
2. Search and locate the user created in DEMO 2.
3. Click **Suspend User**. Confirm the modal dialog.
4. The user's status becomes `SUSPENDED` and all active sessions are immediately revoked.
5. In another incognito window, attempt to sign in with the suspended user's credentials:
   - Authentication is blocked: *"Your account has been suspended."*
6. In the Admin Console, click **Activate User**. Confirm the modal.
7. Attempt sign in again: authentication succeeds immediately.

### DEMO 9: User Details & Session Revocation
1. In the User Directory, click **View Details** on any user (`/admin/users/[id]`).
2. View user profile, active sessions list, and security activity history.
3. Click **Revoke All Sessions** to demonstrate remote administrative session termination.

### DEMO 10: OAuth 2.0 PKCE & SSO Acceptance Flow
1. Sign in to Admin Console (`http://localhost:3000/login`). Central session `identityhub_sso_session` is active.
2. Open CRM at `http://localhost:3001/login` and click **"Continue with IdentityHub"**.
3. CRM initiates an OAuth 2.0 Authorization Code flow with PKCE (`S256`).
4. IdentityHub inspects `identityhub_sso_session` and presents the interactive **Consent Screen** ("IdentityHub CRM is requesting access to your account").
5. Click **Allow**. IdentityHub records consent and issues an authorization code back to CRM callback.
6. CRM validates the ID token and creates an isolated `identityhub_crm_session`.
7. CRM dashboard displays user identity.

### DEMO 11: Session Isolation & Logout Independence
1. In the CRM dashboard, click **Log out**.
2. CRM clears `identityhub_crm_session` and redirects to CRM login.
3. Switch back to Admin Console at `http://localhost:3000/dashboard` and refresh: **Admin Console remains fully authenticated!**
4. Switch back to CRM at `http://localhost:3001/login` and click **"Continue with IdentityHub"**:
5. CRM authenticates silently via the still-active `identityhub_sso_session` without prompting for password, OTP, or consent!

---

## 9. Verification & Diagnostics

- **Liveness Probe**: `GET http://localhost:5000/health`
- **Readiness Probe**: `GET http://localhost:5000/ready` (PostgreSQL connectivity)
- **SMTP Verification**: `GET http://localhost:5000/health/email` (Nodemailer connectivity check)
- **OIDC Discovery**: `GET http://localhost:5000/.well-known/openid-configuration`
- **JWKS Endpoint**: `GET http://localhost:5000/.well-known/jwks.json`