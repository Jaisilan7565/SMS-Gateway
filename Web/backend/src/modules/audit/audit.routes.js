import { Router } from 'express';
import auditController from './audit.controller.js';
import { verifyToken, verifyAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/', verifyToken, verifyAdmin, auditController.getAuditLogs);

export default router;
