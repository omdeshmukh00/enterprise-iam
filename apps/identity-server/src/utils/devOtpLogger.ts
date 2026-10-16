import { env } from '../config/env.js';

export interface DevOtpLogOptions {
  purpose: 'EMAIL_VERIFICATION' | 'LOGIN_OTP' | string;
  email: string;
  code: string;
  expiresAt: Date;
}

/**
 * Masks an email address for privacy and secure terminal display.
 * Example: testuser@example.com -> t***r@example.com
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '***';
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return '***';
  const [local, domain] = parts;
  if (local.length <= 1) {
    return `*@${domain}`;
  }
  if (local.length === 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function isDevLogAuthOtpEnabled(): boolean {
  const currentEnv = process.env.NODE_ENV !== undefined ? process.env.NODE_ENV : env.NODE_ENV;
  if (currentEnv !== 'development') {
    return false;
  }
  if (process.env.DEV_LOG_AUTH_OTP !== undefined) {
    return process.env.DEV_LOG_AUTH_OTP === 'true';
  }
  return Boolean(env.DEV_LOG_AUTH_OTP);
}

/**
 * Safely logs generated OTP to Identity Server terminal in development mode ONLY
 * when DEV_LOG_AUTH_OTP=true is explicitly configured.
 *
 * This function NEVER outputs in production or when DEV_LOG_AUTH_OTP is false.
 * It is exclusively used for authentication/verification OTPs.
 */
export function logDevAuthOtp(options: DevOtpLogOptions): boolean {
  if (!isDevLogAuthOtpEnabled()) {
    return false;
  }

  const masked = maskEmail(options.email);
  const expiresIso = options.expiresAt instanceof Date ? options.expiresAt.toISOString() : new Date(options.expiresAt).toISOString();

  const output = [
    '',
    '================================================================================',
    ' [DEV ONLY] IDENTITYHUB AUTHENTICATION OTP ISSUED',
    '--------------------------------------------------------------------------------',
    ` Purpose:     ${options.purpose}`,
    ` Recipient:   ${masked}`,
    ` Code:        ${options.code}`,
    ` Expires At:  ${expiresIso}`,
    ' Warning:     DEV ONLY — Development OTP logging is strictly forbidden in prod.',
    '================================================================================',
    '',
  ].join('\n');

  // Use process.stdout.write / console.info for terminal output
  console.info(output);
  return true;
}
