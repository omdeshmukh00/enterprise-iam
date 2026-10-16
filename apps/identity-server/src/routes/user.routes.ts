import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema, changePasswordSchema } from '../validators/user.schema.js';

const router: Router = Router();

// All user routes require authentication
router.use(authenticate);

router.get('/me', UserController.getProfile);
router.patch('/me', validate(updateProfileSchema), UserController.updateProfile);
router.patch('/me/password', validate(changePasswordSchema), UserController.changePassword);
router.get('/me/activity', UserController.getActivity);
router.get('/me/sessions', UserController.getSessions);
router.delete('/me/sessions/:id', UserController.revokeSession);

export default router;
