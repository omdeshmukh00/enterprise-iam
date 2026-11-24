/**
 * IdentityHub Authentication Integration for Analytics Client Application.
 *
 * Communicates strictly via standard HTTP APIs with IdentityHub Identity Server.
 * Does not store passwords or credentials in localStorage.
 */

const IDENTITY_SERVER_URL =
  process.env.NEXT_PUBLIC_IDENTITY_SERVER_URL || 'http://localhost:5000';
const IDENTITY_CONSOLE_URL =
  process.env.NEXT_PUBLIC_IDENTITY_CONSOLE_URL || 'http://localhost:3000';

export interface IdentityHubUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  emailVerified: boolean;
}

export const identityhub = {
  /**
   * Retrieves the current authenticated identity from the local Analytics application session.
   */
  async getCurrentUser(): Promise<IdentityHubUser | null> {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!res.ok) {
        return null;
      }

      const json = await res.json();
      if (!json.success || !json.data?.user) {
        return null;
      }

      return json.data.user;
    } catch {
      return null;
    }
  },

  /**
   * Signs the user out of the Analytics application session only.
   * Does NOT revoke or invalidate the central IdentityHub session or Admin Console session.
   */
  async logout(): Promise<boolean> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Returns the OAuth 2.0 PKCE login redirect URL.
   */
  getLoginUrl(_returnTo = 'http://localhost:3002'): string {
    return '/api/auth/login';
  },
};
