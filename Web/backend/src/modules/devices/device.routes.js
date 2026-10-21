import { Router } from 'express';
import deviceController from './device.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { verifyToken, verifyAdmin, verifyMobileUser } from '../../middlewares/auth.middleware.js';
import { registerDeviceSchema, updateHeartbeatSchema } from './device.validation.js';

const router = Router();

// Mobile Device registration (Called by Flutter Android app upon login)
router.post('/register', verifyToken, verifyMobileUser, validate(registerDeviceSchema), deviceController.registerDevice);
router.patch('/:id/heartbeat', verifyToken, verifyMobileUser, validate(updateHeartbeatSchema), deviceController.updateHeartbeat);
router.post('/:id/logout', verifyToken, verifyMobileUser, deviceController.logoutDevice);

// Admin queries
router.get('/', verifyToken, verifyAdmin, deviceController.getAllDevices);
router.get('/:id', verifyToken, verifyAdmin, deviceController.getDeviceById);

export default router;
