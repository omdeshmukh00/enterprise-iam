import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export { AppError };

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const fieldName = firstIssue.path.join('.') || 'field';
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: `${fieldName}: ${firstIssue.message}`,
        details: err.issues,
      },
    });
    return;
  }

  logger.error('Unhandled Server Exception', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred.',
      ...(env.NODE_ENV === 'development' && { details: err.message }),
    },
  });
};
