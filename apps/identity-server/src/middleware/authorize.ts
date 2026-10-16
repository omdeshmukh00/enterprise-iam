import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export function authorize(allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          'You do not have administrative privileges to perform this action.',
          'FORBIDDEN_INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
}
