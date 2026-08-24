import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database.js';

const router: Router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    service: 'identity-server',
    status: 'healthy',
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

export default router;
