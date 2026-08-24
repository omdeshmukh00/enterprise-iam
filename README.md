# IdentityHub

Enterprise Identity and Access Management (IAM) platform with OAuth 2.0, OpenID Connect (OIDC), and Single Sign-On (SSO).

**Current Status**: Foundation initialized.

---

## 1. Architecture Overview

IdentityHub is designed as a clean, performant, solo-developer friendly monorepo architecture:

- **Identity Server (`apps/identity-server`)**: Core backend API built with Node.js, Express, TypeScript, Zod validation, and Prisma ORM.
- **Admin Console (`apps/admin-console`)**: Web-based administration console built with Next.js (App Router), React, TypeScript, and Tailwind CSS.
- **Client Applications (`apps/client-apps/`)**: Reserved containers for future sample OIDC client applications (`analytics`, `crm`, `hr`).
- **Database**: PostgreSQL with Prisma ORM singleton client connection.

---

## 2. Repository Structure

```text
enterprise-iam/
├── apps/
│   ├── admin-console/        # Next.js Admin Portal
│   ├── client-apps/          # Future OIDC Client Apps (analytics, crm, hr)
│   └── identity-server/      # Express + TypeScript Core Backend
├── docs/                     # Architecture, API, Security documentation
├── infrastructure/           # Docker Compose & Nginx configuration
├── packages/                 # Monorepo packages (logger, shared-types, validation)
├── scripts/                  # Seed & administration TypeScript scripts
├── .env.example              # Template environment configuration
├── pnpm-workspace.yaml       # Monorepo pnpm workspace definition
└── tsconfig.json             # Root TypeScript base configuration
```

---

## 3. How to Install Dependencies

IdentityHub uses `pnpm` workspaces for package management.

```bash
pnpm install
```

---

## 4. How to Configure Environment Variables

Copy the example environment file for the Identity Server:

```bash
cp apps/identity-server/.env.example apps/identity-server/.env
```

Environment variables inside `apps/identity-server/.env`:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/identityhub?schema=public
APP_BASE_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
```

---

## 5. How to Start the Identity Server

To run the backend identity server in development mode with hot reload:

```bash
pnpm --filter identity-server dev
```

To build and run in production mode:

```bash
pnpm --filter identity-server build
pnpm --filter identity-server start
```

---

## 6. How to Start the Admin Console

To run the admin console frontend in development mode:

```bash
pnpm --filter admin-console dev
```

The console will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 7. Health & Readiness Endpoints

The Identity Server exposes system health endpoints:

- **Liveness probe**: `GET http://localhost:4000/health`
  ```json
  {
    "success": true,
    "service": "identity-server",
    "status": "healthy"
  }
  ```

- **Readiness probe**: `GET http://localhost:4000/ready`
  Checks PostgreSQL database connectivity.
  ```json
  {
    "success": true,
    "service": "identity-server",
    "status": "ready",
    "database": "connected"
  }
  ```

---

## 8. Database Setup

To generate the Prisma client for PostgreSQL:

```bash
pnpm --filter identity-server db:generate
```

To push schema changes to PostgreSQL:

```bash
pnpm --filter identity-server db:push
```