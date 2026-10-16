import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { ConsentService } from '../services/consent.service.js';
import { getClientIp, getUserAgent } from '../utils/helpers.js';

const router: Router = Router();

router.use(authenticate);

/**
 * GET /users/consents
 * List all active application consents granted by the authenticated user
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const consents = await ConsentService.getUserConsents(req.user!.id);
    res.json({ success: true, data: { consents } });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /users/consents/:clientId
 * Revoke application access
 */
router.delete('/:clientId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const success = await ConsentService.revokeConsent(
      req.user!.id,
      req.params.clientId,
      getClientIp(req),
      getUserAgent(req)
    );
    res.json({ success, message: 'Application access revoked successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
