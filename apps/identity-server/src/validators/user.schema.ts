import { z } from 'zod';
import { passwordSchema } from './auth.schema.js';

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name cannot be empty').max(50, 'First name is too long').optional(),
  lastName: z.string().trim().min(1, 'Last name cannot be empty').max(50, 'Last name is too long').optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });
