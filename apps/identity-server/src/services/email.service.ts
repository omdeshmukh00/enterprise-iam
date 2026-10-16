import nodemailer, { Transporter } from 'nodemailer';
import dotenv from 'dotenv';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class EmailService {
  private static getTransporter(): Transporter {
    dotenv.config({ override: true });
    const user = (process.env.SMTP_USER || env.SMTP_USER || '').trim();
    const pass = (process.env.SMTP_PASSWORD || env.SMTP_PASSWORD || '').replace(/\s+/g, '').replace(/"/g, '');

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || String(env.SMTP_PORT) || '587', 10),
      secure: (process.env.SMTP_SECURE || String(env.SMTP_SECURE)) === 'true',
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  /**
   * Verify SMTP connectivity (used for health checks).
   */
  public static async verifySmtpConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const user = (process.env.SMTP_USER || env.SMTP_USER || '').trim();
      const pass = (process.env.SMTP_PASSWORD || env.SMTP_PASSWORD || '').trim();

      if (!user || !pass) {
        return { connected: false, message: 'SMTP credentials are not configured in environment' };
      }
      const transporter = this.getTransporter();
      await transporter.verify();
      return { connected: true, message: 'SMTP connection established successfully' };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.warn('SMTP verification failed', { error: errorMsg });
      return { connected: false, message: errorMsg };
    }
  }

  /**
   * Base email layout conforming to IdentityHub brand guidelines.
   */
  private static renderEmailLayout(title: string, contentHtml: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 0;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .brand-header {
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 700;
      color: #4f46e5;
      letter-spacing: -0.02em;
      margin: 0;
    }
    .brand-tagline {
      font-size: 13px;
      color: #64748b;
      margin: 4px 0 0 0;
    }
    .headline {
      font-size: 22px;
      font-weight: 600;
      color: #0f172a;
      margin: 0 0 16px 0;
      letter-spacing: -0.01em;
    }
    .paragraph {
      font-size: 15px;
      line-height: 1.6;
      color: #334155;
      margin: 0 0 24px 0;
    }
    .cta-container {
      margin: 28px 0;
      text-align: center;
    }
    .cta-button {
      display: inline-block;
      background-color: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      padding: 12px 28px;
      border-radius: 6px;
      text-align: center;
    }
    .otp-box {
      background-color: #eef2ff;
      border: 2px dashed #6366f1;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #1e1b4b;
      font-family: monospace;
    }
    .callout {
      background-color: #f8fafc;
      border-left: 3px solid #4f46e5;
      padding: 16px;
      border-radius: 4px;
      font-size: 13px;
      color: #475569;
      margin: 24px 0;
      line-height: 1.5;
    }
    .security-notice {
      font-size: 13px;
      color: #64748b;
      border-top: 1px solid #f1f5f9;
      padding-top: 20px;
      margin-top: 32px;
      line-height: 1.5;
    }
    .footer {
      max-width: 560px;
      margin: 24px auto 0 auto;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="brand-header">
        <h1 class="brand-title">IdentityHub</h1>
        <p class="brand-tagline">One Identity. Every Application.</p>
      </div>
      ${contentHtml}
      <div class="security-notice">
        <strong>Security Notice:</strong> IdentityHub will never ask for your password or verification codes via email. If you did not initiate this request, please contact your security administrator immediately.
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} IdentityHub Enterprise IAM Platform. All rights reserved.</p>
      <p>This is an automated system email. Please do not reply directly to this message.</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Helper to dispatch email via Nodemailer with cleaned RFC 5322 from address.
   */
  private static async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<boolean> {
    const user = (process.env.SMTP_USER || env.SMTP_USER || '').trim();
    const rawFrom = process.env.SMTP_FROM_EMAIL || env.SMTP_FROM_EMAIL || user;
    const cleanEmail = rawFrom.replace(/.*<([^>]+)>.*/, '$1').replace(/"/g, '').trim() || user;
    const fromName = process.env.SMTP_FROM_NAME || env.SMTP_FROM_NAME || 'IdentityHub';
    const from = `${fromName} <${cleanEmail}>`;

    logger.info('Preparing to send email', {
      to: options.to,
      subject: options.subject,
    });

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info('Email sent successfully via Gmail SMTP', {
        to: options.to,
        messageId: info.messageId,
      });
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error('Failed to send email via SMTP', {
        to: options.to,
        subject: options.subject,
        error: errorMsg,
      });
      return false;
    }
  }

  /**
   * 1. Send Email Verification (includes both direct link and 6-digit OTP code)
   */
  public static async sendVerificationEmail(
    to: string,
    name: string,
    verificationUrl: string,
    otpCode?: string
  ): Promise<boolean> {
    const title = 'Verify your IdentityHub email address';
    const contentHtml = `
      <h2 class="headline">Verify your email address</h2>
      <p class="paragraph">Hello ${name},</p>
      <p class="paragraph">Thank you for creating an account with IdentityHub. To activate your enterprise access and confirm your email address, you can either enter the one-time code below or click the verification button:</p>
      
      ${
        otpCode
          ? `
      <div class="otp-box">
        <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px;">
          Your 6-Digit Verification Code
        </p>
        <span class="otp-code">${otpCode}</span>
      </div>
      `
          : ''
      }

      <div class="cta-container">
        <a href="${verificationUrl}" class="cta-button" target="_blank">Verify Email Address</a>
      </div>

      <div class="callout">
        <strong>Security Notice:</strong> This verification link and code are valid for 24 hours. If the button above does not work, copy and paste this URL into your browser:<br>
        <span style="word-break: break-all; color: #4f46e5;">${verificationUrl}</span>
      </div>
    `;

    const text = `Hello ${name},\n\nThank you for creating an account with IdentityHub.\n${
      otpCode ? `\nYour 6-digit verification code is: ${otpCode}\n` : ''
    }\nPlease verify your email by visiting the following link:\n${verificationUrl}\n\nThis verification link is valid for 24 hours.\n\nIdentityHub - One Identity. Every Application.`;

    logger.info(`[Email Verification URL for ${to}]: ${verificationUrl}`);
    if (otpCode) {
      logger.info(`[Verification OTP Code for ${to}]: ${otpCode}`);
    }

    return this.sendMail({
      to,
      subject: 'IdentityHub — Verify your email',
      html: this.renderEmailLayout(title, contentHtml),
      text,
    });
  }

  /**
   * 2. Send One-Time Login Code (OTP)
   */
  public static async sendOtpLoginEmail(
    to: string,
    name: string,
    otpCode: string
  ): Promise<boolean> {
    const title = 'IdentityHub — Your One-Time Login Code';
    const contentHtml = `
      <h2 class="headline">One-Time Login Code</h2>
      <p class="paragraph">Hello ${name},</p>
      <p class="paragraph">You requested a one-time passcode to sign in to your IdentityHub enterprise account. Enter the 6-digit code below to complete authentication:</p>
      
      <div class="otp-box">
        <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px;">
          One-Time Passcode
        </p>
        <span class="otp-code">${otpCode}</span>
      </div>

      <div class="callout">
        <strong>Important:</strong> This one-time code is single-use and will expire in 10 minutes. If you did not request this login code, someone may be attempting to access your account. Please notify your administrator.
      </div>
    `;

    const text = `Hello ${name},\n\nYour IdentityHub one-time login code is:\n\n${otpCode}\n\nThis code will expire in 10 minutes.\n\nIdentityHub - One Identity. Every Application.`;

    logger.info(`[Login OTP Code for ${to}]: ${otpCode}`);

    return this.sendMail({
      to,
      subject: 'IdentityHub — Your one-time login code',
      html: this.renderEmailLayout(title, contentHtml),
      text,
    });
  }

  /**
   * 3. Send Password Reset Email
   */
  public static async sendPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string
  ): Promise<boolean> {
    const title = 'Reset your IdentityHub password';
    const contentHtml = `
      <h2 class="headline">Password Reset Request</h2>
      <p class="paragraph">Hello ${name},</p>
      <p class="paragraph">We received a request to reset the password for your IdentityHub account. To choose a new password, click the button below:</p>
      <div class="cta-container">
        <a href="${resetUrl}" class="cta-button" target="_blank">Reset Password</a>
      </div>
      <div class="callout">
        <strong>Important:</strong> This password reset link is single-use and will expire in 1 hour. If you did not request a password reset, no action is needed and your existing password remains secure.
      </div>
    `;

    const text = `Hello ${name},\n\nWe received a request to reset your IdentityHub password.\n\nPlease reset your password using the following link:\n${resetUrl}\n\nThis link is single-use and expires in 1 hour.\n\nIdentityHub - One Identity. Every Application.`;

    logger.info(`[Password Reset URL for ${to}]: ${resetUrl}`);

    return this.sendMail({
      to,
      subject: 'IdentityHub — Reset your password',
      html: this.renderEmailLayout(title, contentHtml),
      text,
    });
  }

  /**
   * 4. Send Welcome Email
   */
  public static async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const title = 'Welcome to IdentityHub';
    const contentHtml = `
      <h2 class="headline">Welcome to IdentityHub</h2>
      <p class="paragraph">Hello ${name},</p>
      <p class="paragraph">Your email address has been verified and your account is active. You can now securely authenticate and manage your enterprise access across all connected applications.</p>
      <div class="cta-container">
        <a href="${env.ADMIN_CONSOLE_URL}" class="cta-button" target="_blank">Access Your Account</a>
      </div>
    `;

    const text = `Hello ${name},\n\nWelcome to IdentityHub! Your account is active and verified.\n\nYou can access your account at: ${env.ADMIN_CONSOLE_URL}\n\nIdentityHub - One Identity. Every Application.`;

    return this.sendMail({
      to,
      subject: 'Welcome to IdentityHub',
      html: this.renderEmailLayout(title, contentHtml),
      text,
    });
  }

  /**
   * 5. Send Security Notification Email
   */
  public static async sendSecurityNotificationEmail(
    to: string,
    name: string,
    eventDetails: {
      action: string;
      timestamp: Date;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<boolean> {
    const title = 'IdentityHub Security Notification';
    const contentHtml = `
      <h2 class="headline">Security Alert: Account Activity</h2>
      <p class="paragraph">Hello ${name},</p>
      <p class="paragraph">We noticed the following security event on your IdentityHub account:</p>
      <div class="callout">
        <strong>Event:</strong> ${eventDetails.action}<br>
        <strong>Time:</strong> ${eventDetails.timestamp.toUTCString()}<br>
        <strong>IP Address:</strong> ${eventDetails.ipAddress || 'Not recorded'}<br>
        <strong>Browser/Device:</strong> ${eventDetails.userAgent || 'Not recorded'}
      </div>
      <p class="paragraph">If this activity was initiated by you, no further action is required. If you do not recognize this activity, please change your password immediately and review active sessions.</p>
    `;

    const text = `Hello ${name},\n\nSecurity Alert: ${eventDetails.action}\nTime: ${eventDetails.timestamp.toUTCString()}\nIP: ${eventDetails.ipAddress || 'Unknown'}\nDevice: ${eventDetails.userAgent || 'Unknown'}\n\nIf this was not you, please secure your account immediately.\n\nIdentityHub - One Identity. Every Application.`;

    return this.sendMail({
      to,
      subject: `IdentityHub Security Alert: ${eventDetails.action}`,
      html: this.renderEmailLayout(title, contentHtml),
      text,
    });
  }

  /**
   * 6. Send Password Changed Email
   */
  public static async sendPasswordChangedEmail(
    to: string,
    name: string,
    eventDetails: {
      timestamp: Date;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<boolean> {
    const title = 'Your IdentityHub password has been changed';
    const contentHtml = `
      <h2 class="headline">Password Successfully Changed</h2>
      <p class="paragraph">Hello ${name},</p>
      <p class="paragraph">The password for your IdentityHub account was recently changed.</p>
      <div class="callout">
        <strong>Time:</strong> ${eventDetails.timestamp.toUTCString()}<br>
        <strong>IP Address:</strong> ${eventDetails.ipAddress || 'Not recorded'}<br>
        <strong>Browser/Device:</strong> ${eventDetails.userAgent || 'Not recorded'}
      </div>
      <p class="paragraph">As a security precaution, other active sessions on your account may have been signed out. If you did not make this change, please contact your administrator or recover your account immediately.</p>
    `;

    const text = `Hello ${name},\n\nYour IdentityHub password was successfully changed at ${eventDetails.timestamp.toUTCString()}.\n\nIf you did not make this change, please recover your account immediately.\n\nIdentityHub - One Identity. Every Application.`;

    return this.sendMail({
      to,
      subject: 'IdentityHub — Your password has been changed',
      html: this.renderEmailLayout(title, contentHtml),
      text,
    });
  }
}
