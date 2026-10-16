import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be at most 128 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name is too long'),
    lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Last name is too long'),
    email: z.string().trim().email('Invalid email address').toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, 'Verification token or code is required'),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
});

export const sendOtpSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  code: z
    .string()
    .trim()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers'),
});
