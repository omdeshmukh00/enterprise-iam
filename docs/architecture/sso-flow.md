# Single Sign-On (SSO) & Session Isolation Flow

## Overview
IdentityHub provides centralized Single Sign-On (SSO) across enterprise applications while maintaining complete session isolation between the Identity Provider (IdP) and consuming applications.

## Session Topology

IdentityHub enforces three distinct cookie boundaries:
- **`identityhub_sso_session`**: Central IdP session managed by the Identity Server (`:5000`).
- **`identityhub_admin_session`**: Local session managed by Admin Console (`:3000`).
- **`identityhub_crm_session`**: Local session managed by CRM Client (`:3001`).

## SSO Acceptance Sequence

1. **Initial Login via Admin Console**:
   - User signs in at `http://localhost:3000/login`.
   - Admin Console creates its own session (`identityhub_admin_session`) and establishes the central IdP session (`identityhub_sso_session`).
   - Admin Console renders authenticated view.

2. **Seamless Single Sign-On into CRM**:
   - User navigates to `http://localhost:3001/login` and clicks "Continue with IdentityHub".
   - CRM redirects browser to Identity Server `/oauth/authorize`.
   - Identity Server inspects incoming request and finds valid `identityhub_sso_session`.
   - Identity Server skips credential and OTP prompts.
   - If user already granted required scopes, skips consent screen.
   - Fresh authorization code is minted and redirected back to CRM callback.
   - CRM exchanges code for ID token via PKCE and creates independent `identityhub_crm_session`.

3. **Application Logout Independence**:
   - User clicks **Log out** inside CRM (`:3001`).
   - CRM revokes its local session and clears `identityhub_crm_session`.
   - Central session `identityhub_sso_session` **remains valid**.
   - Admin Console session `identityhub_admin_session` **remains valid**.
   - If user re-opens CRM, they can re-authenticate instantly via the central session.

4. **Session Revocation & Expiration**:
   - If the user explicitly logs out of Identity Server or revokes sessions via the Security portal, `identityhub_sso_session` is invalidated in PostgreSQL.
   - Future authorization attempts require re-authenticating with credentials.
