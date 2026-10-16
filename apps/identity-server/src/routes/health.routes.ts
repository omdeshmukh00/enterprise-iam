import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database.js';
import { EmailService } from '../services/email.service.js';
import { env } from '../config/env.js';

const router: Router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    service: 'identity-server',
    status: 'healthy',
    version: env.APP_VERSION,
  });
});

router.get('/ready', async (_req: Request, res: Response) => {
  const isDbConnected = await checkDatabaseConnection();

  if (isDbConnected) {
    res.status(200).json({
      success: true,
      service: 'identity-server',
      status: 'ready',
      database: 'connected',
    });
  } else {
    res.status(503).json({
      success: false,
      service: 'identity-server',
      status: 'not_ready',
      database: 'disconnected',
    });
  }
});

router.get('/health/email', async (_req: Request, res: Response) => {
  if (env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Email health check is disabled in production.',
      },
    });
  }

  const result = await EmailService.verifySmtpConnection();

  res.status(result.connected ? 200 : 503).json({
    success: result.connected,
    service: 'identity-server',
    smtp: {
      status: result.connected ? 'connected' : 'error',
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      details: result.message,
    },
  });
});

export default router;
