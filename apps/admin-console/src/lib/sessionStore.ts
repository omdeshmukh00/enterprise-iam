import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppSession {
  id: string;
  tokenHash: string;
  user: AppUser;
  tokens?: {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  };
  createdAt: number;
  expiresAt: number;
  lastActiveAt: number;
  revokedAt: number | null;
}

// In-memory store with file persistence fallback for local development stability
const CACHE_FILE = path.resolve(process.cwd(), '.admin-sessions.json');
const sessions = new Map<string, AppSession>();

try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed: Record<string, AppSession> = JSON.parse(raw);
    for (const [hash, session] of Object.entries(parsed)) {
      if (session.expiresAt > Date.now() && !session.revokedAt) {
        sessions.set(hash, session);
      }
    }
  }
} catch {
  // Ignore filesystem cache load errors
}

function persistSessions() {
  try {
    const obj: Record<string, AppSession> = {};
    const now = Date.now();
    sessions.forEach((session, hash) => {
      if (session.expiresAt > now && !session.revokedAt) {
        obj[hash] = session;
      }
    });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {
    // Ignore filesystem cache write errors
  }
}

export const ADMIN_SESSION_COOKIE_NAME =
  process.env.ADMIN_SESSION_COOKIE_NAME || 'identityhub_admin_session';

export const AdminSessionStore = {
  /**
   * Creates a new local Admin application session.
   * Generates a 32-byte cryptographically secure random token.
   * Stores only the SHA-256 hash in session storage.
   */
  createSession(
    user: AppUser,
    tokens?: { accessToken?: string; idToken?: string; refreshToken?: string; expiresIn?: number },
    ttlSeconds = 7 * 24 * 60 * 60
  ): { rawToken: string; session: AppSession } {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const now = Date.now();

    const session: AppSession = {
      id: crypto.randomUUID(),
      tokenHash,
      user,
      tokens,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
      lastActiveAt: now,
      revokedAt: null,
    };

    sessions.set(tokenHash, session);
    persistSessions();

    return { rawToken, session };
  },

  /**
   * Validates a session by raw token.
   * Only hashes are compared against persistent session storage.
   */
  validateSession(rawToken: string): AppSession | null {
    if (!rawToken || typeof rawToken !== 'string') return null;

    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const session = sessions.get(tokenHash);

    if (!session) return null;
    if (session.revokedAt !== null) return null;
    if (session.expiresAt <= Date.now()) {
      sessions.delete(tokenHash);
      persistSessions();
      return null;
    }

    session.lastActiveAt = Date.now();
    return session;
  },

  /**
   * Revokes a session by raw token.
   */
  revokeSession(rawToken: string): boolean {
    if (!rawToken || typeof rawToken !== 'string') return false;

    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const session = sessions.get(tokenHash);

    if (!session) return false;

    session.revokedAt = Date.now();
    sessions.delete(tokenHash);
    persistSessions();
    return true;
  },
};
