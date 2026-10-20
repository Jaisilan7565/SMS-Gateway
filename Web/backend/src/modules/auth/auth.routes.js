import { Router } from 'express';
import authController from './auth.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { authLimiter } from '../../middlewares/rateLimiter.middleware.js';
import {
  adminLoginSchema,
  mobileRegisterSchema,
  mobileLoginSchema,
  googleOAuthSchema
} from './auth.validation.js';

const router = Router();

// Admin Authentication
router.post('/admin/login', authLimiter, validate(adminLoginSchema), authController.adminLogin);

// Mobile App Authentication (Email/Password & Google OAuth)
router.post('/mobile/register', authLimiter, validate(mobileRegisterSchema), authController.mobileRegister);
router.post('/mobile/login', authLimiter, validate(mobileLoginSchema), authController.mobileLogin);
router.post('/mobile/google', authLimiter, validate(googleOAuthSchema), authController.mobileGoogleOAuth);

// Common Session Management
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/me', verifyToken, authController.getCurrentUser);

export default router;
