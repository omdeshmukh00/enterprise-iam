import { Request } from 'express';
import { User } from '@prisma/client';

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || req.ip || 'unknown';
}

export function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
