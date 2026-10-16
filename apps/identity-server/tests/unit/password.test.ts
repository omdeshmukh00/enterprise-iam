import { describe, it, expect } from 'vitest';
import { PasswordService } from '../../src/services/password.service.js';

describe('PasswordService (Argon2)', () => {
  const password = 'StrongPassword123!';

  it('should hash a password with Argon2id', async () => {
    const hash = await PasswordService.hashPassword(password);
    expect(hash).toBeDefined();
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('should successfully verify a correct password', async () => {
    const hash = await PasswordService.hashPassword(password);
    const isValid = await PasswordService.verifyPassword(hash, password);
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const hash = await PasswordService.hashPassword(password);
    const isValid = await PasswordService.verifyPassword(hash, 'WrongPassword123!');
    expect(isValid).toBe(false);
  });
});
