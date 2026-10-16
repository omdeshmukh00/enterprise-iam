import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from '../validators/auth.schema.js';

const router: Router = Router();

router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', loginRateLimiter, validate(loginSchema), AuthController.login);
router.post('/logout', authenticate, AuthController.logout);
router.post('/logout-all', authenticate, AuthController.logoutAll);
router.get('/me', authenticate, AuthController.getMe);

// One-Time Passcode (OTP) Login
router.post('/otp/send', loginRateLimiter, validate(sendOtpSchema), AuthController.sendOtp);
router.post('/otp/verify', loginRateLimiter, validate(verifyOtpSchema), AuthController.verifyOtp);

router.post('/verify-email', validate(verifyEmailSchema), AuthController.verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), AuthController.resendVerification);

router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);

export default router;
