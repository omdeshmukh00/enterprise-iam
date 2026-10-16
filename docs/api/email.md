# IdentityHub — Email Integration & Templates

IdentityHub utilizes **Nodemailer** configured for Gmail SMTP to deliver transactional authentication emails.

---

## 1. SMTP Configuration

IdentityHub connects to Gmail's mail exchange server over STARTTLS:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=youraccount@gmail.com
SMTP_PASSWORD="16-character-app-password"
SMTP_FROM_EMAIL=youraccount@gmail.com
SMTP_FROM_NAME="IdentityHub"
```

### Generating a Gmail App Password
1. Navigate to your **Google Account**: [https://myaccount.google.com/](https://myaccount.google.com/).
2. Select **Security** from the navigation sidebar.
3. Ensure **2-Step Verification** is enabled.
4. Under "How you sign in to Google", click **2-Step Verification**, scroll to the bottom, and select **App Passwords**.
5. Create a new App Password named `IdentityHub`.
6. Copy the generated 16-character string (spaces are automatically stripped by the email service) and paste it into `SMTP_PASSWORD` in `apps/identity-server/.env`.

---

## 2. Branding & Design System

IdentityHub emails are built with responsive HTML compatible across modern email clients (Gmail web, iOS Mail, Outlook):
- **Container**: Max-width `560px`, centered, `#ffffff` card on `#f8fafc` background.
- **Brand Colors**: Primary Indigo accent (`#4F46E5`), Deep Slate text (`#0F172A`), Muted Slate details (`#64748B`).
- **Typography**: System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`).
- **Components**:
  - Brand header with IdentityHub title and tagline: *"One Identity. Every Application."*
  - Clear message headline & explanatory body text.
  - Prominent primary CTA button with fallback text URL.
  - Security advisory callout banner.
  - Footer with copyright and anti-spoofing notice.
- **Plain-text fallback**: Every template generates an accompanying plain-text version for terminal / text-only clients.

---

## 3. Transactional Email Types

### 1. Verification Email (`sendVerificationEmail`)
- **Subject**: `IdentityHub — Verify your email`
- **Trigger**: Dispatched immediately upon user registration (`POST /auth/register`) or manual resend (`POST /auth/resend-verification`).
- **Contains**: Single-use verification link valid for 24 hours (`http://localhost:3000/verify-email?token=...`).

### 2. Password Reset Email (`sendPasswordResetEmail`)
- **Subject**: `IdentityHub — Reset your password`
- **Trigger**: Dispatched when a user requests password recovery (`POST /auth/forgot-password`).
- **Contains**: Single-use recovery link valid for 1 hour (`http://localhost:3000/reset-password?token=...`).

### 3. Password Changed Notification (`sendPasswordChangedEmail`)
- **Subject**: `IdentityHub — Your password has been changed`
- **Trigger**: Dispatched immediately after an authenticated password change (`PATCH /users/me/password`) or a successful recovery reset (`POST /auth/reset-password`).
- **Contains**: Timestamp, IP address, and browser agent string with instructions to contact an administrator if unauthorized.

### 4. Security Notification Email (`sendSecurityNotificationEmail`)
- **Subject**: `IdentityHub Security Alert: <ACTION>`
- **Trigger**: Dispatched on high-impact security operations (e.g. suspicious activity or access modifications).
- **Contains**: Detailed audit metadata (action, timestamp, client IP, device).

### 5. Welcome Email (`sendWelcomeEmail`)
- **Subject**: `Welcome to IdentityHub`
- **Trigger**: Dispatched immediately when an email address is successfully confirmed.

---

## 4. Development Diagnostics

In non-production environments, administrators and developers can verify SMTP configuration without sending test emails:

```http
GET /health/email
```

**Response Example (Connected)**:
```json
{
  "success": true,
  "service": "identity-server",
  "smtp": {
    "status": "connected",
    "host": "smtp.gmail.com",
    "port": 587,
    "details": "SMTP connection established successfully"
  }
}
```

**Response Example (Credentials Missing or Bad App Password)**:
```json
{
  "success": false,
  "service": "identity-server",
  "smtp": {
    "status": "error",
    "host": "smtp.gmail.com",
    "port": 587,
    "details": "Invalid login: 535-5.7.8 Username and Password not accepted"
  }
}
```

In development, if SMTP credentials are temporarily invalid or unconfigured, the Identity Server logs the full verification and password reset URLs directly to the terminal so manual testing and evaluation can proceed uninterrupted.
