import { env } from '../config/env.js';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const levelWeights: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentWeight = levelWeights[env.LOG_LEVEL] ?? 3;

function sanitize(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const sensitiveKeys = [
    'password',
    'passwordhash',
    'token',
    'tokenhash',
    'rawtoken',
    'smtppassword',
    'secret',
    'cookie',
    'authorization',
  ];

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitize(value);
    }
  }
  return sanitized;
}

function formatLog(level: LogLevel, message: string, meta?: unknown) {
  const timestamp = new Date().toISOString();
  const metaObj = meta !== undefined ? sanitize(meta) : undefined;
  
  if (env.NODE_ENV === 'test') return;

  const output = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...(metaObj !== undefined ? { meta: metaObj } : {}),
  };

  const line = `[${timestamp}] [${level.toUpperCase()}] ${message} ${
    metaObj ? JSON.stringify(metaObj) : ''
  }`.trim();

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  error: (msg: string, meta?: unknown) => {
    if (levelWeights.error <= currentWeight) formatLog('error', msg, meta);
  },
  warn: (msg: string, meta?: unknown) => {
    if (levelWeights.warn <= currentWeight) formatLog('warn', msg, meta);
  },
  info: (msg: string, meta?: unknown) => {
    if (levelWeights.info <= currentWeight) formatLog('info', msg, meta);
  },
  debug: (msg: string, meta?: unknown) => {
    if (levelWeights.debug <= currentWeight) formatLog('debug', msg, meta);
  },
};
