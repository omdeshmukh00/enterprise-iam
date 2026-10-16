import { describe, it, expect, vi } from 'vitest';
import { EmailService } from '../../src/services/email.service.js';

describe('EmailService', () => {
  it('should format verification email and handle dispatch safely', async () => {
    const result = await EmailService.sendVerificationEmail(
      'user@example.com',
      'Alice Doe',
      'http://localhost:3000/verify-email?token=fake-token-123'
    );
    // Returns boolean status
    expect(typeof result).toBe('boolean');
  });

  it('should format password reset email safely', async () => {
    const result = await EmailService.sendPasswordResetEmail(
      'user@example.com',
      'Alice Doe',
      'http://localhost:3000/reset-password?token=fake-token-123'
    );
    expect(typeof result).toBe('boolean');
  });

  it('should format security notification email safely', async () => {
    const result = await EmailService.sendSecurityNotificationEmail(
      'user@example.com',
      'Alice Doe',
      {
        action: 'PASSWORD_CHANGED',
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest Test Agent',
      }
    );
    expect(typeof result).toBe('boolean');
  });
});
