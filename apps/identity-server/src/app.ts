import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import oauthRoutes from './routes/oauth.routes.js';
import oidcRoutes from './routes/oidc.routes.js';
import consentRoutes from './routes/consent.routes.js';
import clientRoutes from './routes/client.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './utils/errors.js';
import { csrfProtection } from './middleware/csrf.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { logger } from './utils/logger.js';

const app: Express = express();

// Security HTTP headers with Content Security Policy permitting self-contained styling
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
      },
    },
  })
);

// CORS configuration - strict origin checking, credentials allowed
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin or 'null' (e.g. mobile apps, curl, server-to-server, or same-origin form POSTs)
      if (!origin || origin === 'null') return callback(null, true);

      const allowed = [...env.CORS_ALLOWED_ORIGINS, env.APP_BASE_URL, 'http://localhost:5000'];
      if (allowed.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`CORS blocked for origin: ${origin}`);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-IdentityHub-Client'],
  })
);

// Cookie parsing
app.use(cookieParser());

// Body parsing with size limiting
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl || req.path} ${res.statusCode} [${duration}ms]`);
  });
  next();
});

// General API rate limiter
app.use(apiRateLimiter);

// CSRF Defense for state-changing operations
app.use(csrfProtection);

// Mount Application Routes
app.use('/', healthRoutes);
app.use('/', oidcRoutes);
app.use('/oauth', oauthRoutes);
app.use('/auth', authRoutes);
app.use('/users/consents', consentRoutes);
app.use('/users', userRoutes);
app.use('/admin/clients', clientRoutes);
app.use('/admin', adminRoutes);

// 404 Handler
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError('The requested endpoint does not exist.'));
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
