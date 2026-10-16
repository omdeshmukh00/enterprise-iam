import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors.js';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        const fieldName = firstIssue.path.join('.') || 'field';
        const message = `${fieldName}: ${firstIssue.message}`;
        next(new BadRequestError(message, 'VALIDATION_ERROR'));
      } else {
        next(err);
      }
    }
  };
}
