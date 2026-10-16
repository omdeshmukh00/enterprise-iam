export interface SessionInfo {
  id: string;
  userId: string;
  expiresAt: Date;
  lastActiveAt: Date;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent?: boolean;
}
