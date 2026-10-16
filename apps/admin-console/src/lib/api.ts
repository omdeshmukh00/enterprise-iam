const BASE_URL = process.env.NEXT_PUBLIC_IDENTITY_SERVER_URL || 'http://localhost:5000';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionItem {
  id: string;
  userId: string;
  expiresAt: string;
  lastActiveAt: string;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent?: boolean;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  status: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
  actor?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isLocalAuthRoute =
    endpoint === '/auth/me' ||
    endpoint === '/auth/login' ||
    endpoint === '/auth/logout' ||
    endpoint === '/auth/otp/verify';
  const url = isLocalAuthRoute ? `/api${endpoint}` : `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // Required for CSRF protection on state-changing requests
  headers.set('X-IdentityHub-Client', 'true');

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Sends HttpOnly identityhub_session cookie
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid JSON response received from identity server');
  }

  if (!res.ok || !data.success) {
    const errorMsg = data?.error?.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg) as any;
    err.code = data?.error?.code || 'UNKNOWN_ERROR';
    err.details = data?.error?.details;
    err.status = res.status;
    throw err;
  }

  return data.data;
}

export const api = {
  auth: {
    getMe: () => request<{ user: User }>('/auth/me'),
    login: (credentials: { email: string; password: string }) =>
      request<{ user: User; message: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (payload: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      confirmPassword: string;
    }) =>
      request<{ user: User; message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    logout: () =>
      request<{ message: string }>('/auth/logout', {
        method: 'POST',
      }),
    logoutAll: () =>
      request<{ message: string }>('/auth/logout-all', {
        method: 'POST',
      }),
    verifyEmail: (token: string) =>
      request<{ success: boolean; message: string }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    resendVerification: (email: string) =>
      request<{ success: boolean; message: string }>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    forgotPassword: (email: string) =>
      request<{ success: boolean; message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (payload: { token: string; password: string; confirmPassword: string }) =>
      request<{ success: boolean; message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    sendOtp: (email: string) =>
      request<{ success: boolean; message: string }>('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    verifyOtp: (payload: { email: string; code: string }) =>
      request<{ user: User; message: string }>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  user: {
    getProfile: () => request<{ user: User }>('/users/me'),
    updateProfile: (data: { firstName?: string; lastName?: string }) =>
      request<{ user: User; message: string }>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    changePassword: (data: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) =>
      request<{ success: boolean; message: string }>('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    getActivity: (limit = 25) =>
      request<{ activity: AuditLogItem[] }>(`/users/me/activity?limit=${limit}`),
    getSessions: () => request<{ sessions: SessionItem[] }>('/users/me/sessions'),
    revokeSession: (sessionId: string) =>
      request<{ message: string }>(`/users/me/sessions/${sessionId}`, {
        method: 'DELETE',
      }),
  },
  admin: {
    getStats: () =>
      request<{
        totalUsers: number;
        activeUsers: number;
        suspendedUsers: number;
        recentAuditLogs: AuditLogItem[];
      }>('/admin/stats'),
    listUsers: (params?: { limit?: number; offset?: number; search?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      if (params?.search) q.set('search', params.search);
      if (params?.status) q.set('status', params.status);
      return request<{ users: User[]; total: number; limit: number; offset: number }>(
        `/admin/users?${q.toString()}`
      );
    },
    getUserDetails: (userId: string) =>
      request<{ user: User; sessions: SessionItem[]; activity: AuditLogItem[] }>(
        `/admin/users/${userId}`
      ),
    updateUserStatus: (userId: string, status: 'ACTIVE' | 'SUSPENDED') =>
      request<{ user: User; message: string }>(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    revokeUserSessions: (userId: string) =>
      request<{ revokedCount: number; message: string }>(
        `/admin/users/${userId}/revoke-sessions`,
        {
          method: 'POST',
        }
      ),
    getAuditLogs: (params?: { limit?: number; offset?: number; action?: string }) => {
      const q = new URLSearchParams();
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      if (params?.action) q.set('action', params.action);
      return request<{ logs: AuditLogItem[]; total: number; limit: number; offset: number }>(
        `/admin/audit-logs?${q.toString()}`
      );
    },
  },
  health: {
    checkHealth: () => request<any>('/health'),
    checkReady: () => request<any>('/ready'),
    checkEmail: () => request<any>('/health/email'),
  },
};
