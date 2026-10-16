import argon2 from 'argon2';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class PasswordService {
  /**
   * Hashes a password using Argon2id with enterprise-grade parameters.
   */
  public static async hashPassword(password: string): Promise<string> {
    try {
      return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: env.ARGON2_MEMORY_COST,
        timeCost: env.ARGON2_TIME_COST,
        parallelism: env.ARGON2_PARALLELISM,
      });
    } catch (err) {
      logger.error('Failed to hash password with Argon2', err);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verifies a candidate plaintext password against an Argon2 hash.
   */
  public static async verifyPassword(hash: string, candidate: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, candidate);
    } catch (err) {
      logger.error('Failed to verify password with Argon2', err);
      return false;
    }
  }
}
