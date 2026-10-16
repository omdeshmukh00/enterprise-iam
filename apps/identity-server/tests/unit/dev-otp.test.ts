import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logDevAuthOtp, maskEmail } from '../../src/utils/devOtpLogger.js';
import { validateEnv } from '../../src/config/env.js';
import { AuthService } from '../../src/services/auth.service.js';
import { prisma } from '../../src/config/database.js';

describe('A4/A5. Development OTP Terminal Logging & Security Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. Email Masking Utility', () => {
    it('should correctly mask email addresses preserving domain and edge chars', () => {
      expect(maskEmail('john.doe@example.com')).toBe('j***e@example.com');
      expect(maskEmail('admin@identityhub.app')).toBe('a***n@identityhub.app');
      expect(maskEmail('a@b.com')).toBe('*@b.com');
      expect(maskEmail('ab@b.com')).toBe('a*@b.com');
      expect(maskEmail('invalid')).toBe('***');
    });
  });

  describe('2. Development OTP Terminal Output Flag Behavior', () => {
    it('should log OTP with purpose, masked email, expiry, and DEV ONLY warning when enabled in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.DEV_LOG_AUTH_OTP = 'true';

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const logged = logDevAuthOtp({
        purpose: 'LOGIN_OTP',
        email: 'developer@example.com',
        code: '654321',
        expiresAt,
      });

      expect(logged).toBe(true);
      expect(consoleSpy).toHaveBeenCalledTimes(1);

      const logOutput = consoleSpy.mock.calls[0][0];
      expect(logOutput).toContain('[DEV ONLY]');
      expect(logOutput).toContain('Purpose:     LOGIN_OTP');
      expect(logOutput).toContain('Recipient:   d***r@example.com');
      expect(logOutput).toContain('Code:        654321');
      expect(logOutput).toContain('Expires At:');
      expect(logOutput).toContain('DEV ONLY — Development OTP logging is strictly forbidden in prod.');
    });

    it('should NOT output to terminal when DEV_LOG_AUTH_OTP is false', () => {
      process.env.NODE_ENV = 'development';
      process.env.DEV_LOG_AUTH_OTP = 'false';

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      const logged = logDevAuthOtp({
        purpose: 'LOGIN_OTP',
        email: 'developer@example.com',
        code: '123456',
        expiresAt: new Date(),
      });

      expect(logged).toBe(false);
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should reject startup if DEV_LOG_AUTH_OTP=true in production', () => {
      expect(() => {
        validateEnv({
          ...process.env,
          NODE_ENV: 'production',
          DEV_LOG_AUTH_OTP: 'true',
        });
      }).toThrow(/DEV_LOG_AUTH_OTP cannot be enabled in production/i);
    });
  });

  describe('3. OTP Verification Security When Logging is Enabled', () => {
    const testEmail = `devotp_${Date.now()}@example.com`;
    let capturedOtp = '';

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.DEV_LOG_AUTH_OTP = 'true';
    });

    it('should enforce that the generated OTP matches the verification requirement', async () => {
      // Mock console.info to capture logged OTP
      const spy = vi.spyOn(console, 'info').mockImplementation((output: string) => {
        const match = output.match(/Code:\s+(\d{6})/);
        if (match) {
          capturedOtp = match[1];
        }
      });

      await AuthService.sendLoginOtp(testEmail);
      expect(capturedOtp).toMatch(/^\d{6}$/);

      // Verify DB stores hash, not plain OTP
      const dbRecord = await prisma.loginOtp.findFirst({
        where: { email: testEmail },
        orderBy: { createdAt: 'desc' },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord?.codeHash).not.toBe(capturedOtp); // Must be securely hashed

      // Reject incorrect OTP
      await expect(
        AuthService.verifyLoginOtp(testEmail, '999999')
      ).rejects.toThrow(/invalid or unrecognized login code/i);

      // Accept exactly the generated OTP
      const verifyResult = await AuthService.verifyLoginOtp(testEmail, capturedOtp);
      expect(verifyResult).toBeDefined();
      expect(verifyResult.user.email).toBe(testEmail);

      // Single-use enforcement: second verification must fail
      await expect(
        AuthService.verifyLoginOtp(testEmail, capturedOtp)
      ).rejects.toThrow(/invalid or unrecognized login code/i);

      spy.mockRestore();
    });

    it('should enforce OTP expiration after time has elapsed', async () => {
      // Create an expired OTP in database
      const expiredEmail = `expired_${Date.now()}@example.com`;
      const code = '112233';
      const { hashToken } = await import('../../src/utils/tokens.js');

      await prisma.loginOtp.create({
        data: {
          email: expiredEmail,
          codeHash: hashToken(code),
          expiresAt: new Date(Date.now() - 1000), // in the past
        },
      });

      await expect(
        AuthService.verifyLoginOtp(expiredEmail, code)
      ).rejects.toThrow(/expired/i);
    });
  });
});
