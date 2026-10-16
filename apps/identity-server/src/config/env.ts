import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  APP_NAME: z.string().default('IdentityHub'),
  APP_VERSION: z.string().default('0.1.0'),
  APP_BASE_URL: z.string().url().default('http://localhost:5000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),

  ADMIN_CONSOLE_URL: z.string().url().default('http://localhost:3000'),
  CRM_APP_URL: z.string().url().default('http://localhost:3001'),
  ANALYTICS_APP_URL: z.string().url().default('http://localhost:3002'),
  HR_APP_URL: z.string().url().default('http://localhost:3003'),

  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003')
    .transform((val) => val.split(',').map((origin) => origin.trim()).filter(Boolean)),

  SSO_SESSION_COOKIE_NAME: z.string().default('identityhub_sso_session'),
  SESSION_COOKIE_NAME: z.string().default('identityhub_sso_session'),
  SESSION_TTL_SECONDS: z.string().transform((val) => parseInt(val, 10)).default('604800'),
  SESSION_IDLE_TIMEOUT_SECONDS: z.string().transform((val) => parseInt(val, 10)).default('86400'),

  COOKIE_HTTP_ONLY: z.string().transform((val) => val !== 'false').default('true'),
  COOKIE_SECURE: z.string().transform((val) => val === 'true').default('false'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z.string().optional().default(''),
  COOKIE_PATH: z.string().default('/'),

  ARGON2_MEMORY_COST: z.string().transform((val) => parseInt(val, 10)).default('65536'),
  ARGON2_TIME_COST: z.string().transform((val) => parseInt(val, 10)).default('3'),
  ARGON2_PARALLELISM: z.string().transform((val) => parseInt(val, 10)).default('1'),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().transform((val) => parseInt(val, 10)).default('587'),
  SMTP_SECURE: z.string().transform((val) => val === 'true').default('false'),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM_EMAIL: z.string().default(''),
  SMTP_FROM_NAME: z.string().default('IdentityHub'),

  EMAIL_VERIFICATION_URL: z.string().url().default('http://localhost:3000/verify-email'),
  PASSWORD_RESET_URL: z.string().url().default('http://localhost:3000/reset-password'),
  SECURITY_NOTIFICATION_URL: z.string().url().default('http://localhost:3000/security'),

  LOGIN_MAX_ATTEMPTS: z.string().transform((val) => parseInt(val, 10)).default('5'),
  LOGIN_RATE_LIMIT_WINDOW_SECONDS: z.string().transform((val) => parseInt(val, 10)).default('900'),
  API_RATE_LIMIT_WINDOW_SECONDS: z.string().transform((val) => parseInt(val, 10)).default('900'),
  API_RATE_LIMIT_MAX_REQUESTS: z.string().transform((val) => parseInt(val, 10)).default('100'),

  INITIAL_ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  INITIAL_ADMIN_PASSWORD: z.string().default('ChangeMeImmediately'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('debug'),

  // Development OTP logging flag - strictly forbidden in production
  DEV_LOG_AUTH_OTP: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (rawEnv: NodeJS.ProcessEnv): Env => {
  // If SSO_SESSION_COOKIE_NAME is not set but SESSION_COOKIE_NAME is set, copy it
  const envToParse = { ...rawEnv };
  if (!envToParse.SSO_SESSION_COOKIE_NAME && envToParse.SESSION_COOKIE_NAME) {
    envToParse.SSO_SESSION_COOKIE_NAME = envToParse.SESSION_COOKIE_NAME;
  }

  const result = envSchema.safeParse(envToParse);
  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${JSON.stringify(result.error.format())}`);
  }

  if (result.data.NODE_ENV === 'production' && result.data.DEV_LOG_AUTH_OTP) {
    throw new Error('DEV_LOG_AUTH_OTP cannot be enabled in production environments.');
  }

  return result.data;
};

const parseEnv = (): Env => {
  try {
    return validateEnv(process.env);
  } catch (err: any) {
    console.error('❌ Invalid environment variables configuration:');
    console.error(err.message || err);
    process.exit(1);
  }
};

export const env = parseEnv();

