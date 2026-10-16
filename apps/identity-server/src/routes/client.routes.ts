import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { ClientService } from '../services/client.service.js';

const router: Router = Router();

router.use(authenticate, authorize(['ADMIN']));

/**
 * GET /admin/clients
 * List all registered applications
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const clients = await ClientService.listClients();
    res.json({ success: true, data: { clients } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/clients
 * Register a new OAuth application
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = await ClientService.registerClient(req.body);
    res.status(201).json({ success: true, data: { client } });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /admin/clients/:clientId/status
 * Enable or disable a client
 */
router.patch('/:clientId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive } = req.body;
    const client = await ClientService.setClientStatus(req.params.clientId, Boolean(isActive));
    res.json({ success: true, data: { client } });
  } catch (err) {
    next(err);
  }
});

export default router;
