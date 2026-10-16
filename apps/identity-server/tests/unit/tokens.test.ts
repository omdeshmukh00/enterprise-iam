import { describe, it, expect } from 'vitest';
import { generateSecureToken, hashToken, timingSafeEqual } from '../../src/utils/tokens.js';

describe('Token Utilities', () => {
  it('should generate secure random tokens of the specified byte length', () => {
    const token = generateSecureToken(32);
    expect(token).toBeDefined();
    expect(token.length).toBe(64); // 32 bytes in hex = 64 characters
  });

  it('should generate deterministic sha256 hashes of tokens', () => {
    const token = 'sample-test-token-12345';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('should perform timing-safe equality checks', () => {
    const a = 'abcdef123456';
    const b = 'abcdef123456';
    const c = 'abcdef123457';
    expect(timingSafeEqual(a, b)).toBe(true);
    expect(timingSafeEqual(a, c)).toBe(false);
  });
});
