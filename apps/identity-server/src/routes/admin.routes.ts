import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { adminUpdateStatusSchema } from '../validators/admin.schema.js';

const router: Router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate, authorize(['ADMIN']));

router.get('/stats', AdminController.getStats);
router.get('/users', AdminController.listUsers);
router.get('/users/:id', AdminController.getUserDetails);
router.patch('/users/:id/status', validate(adminUpdateStatusSchema), AdminController.updateUserStatus);
router.post('/users/:id/revoke-sessions', AdminController.revokeUserSessions);
router.get('/audit-logs', AdminController.getAuditLogs);

export default router;
