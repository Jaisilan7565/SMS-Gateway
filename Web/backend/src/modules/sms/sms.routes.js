import { Router } from 'express';
import smsController from './sms.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { verifyToken, verifyAdmin, verifyMobileUser } from '../../middlewares/auth.middleware.js';
import { pullTriggerLimiter } from '../../middlewares/rateLimiter.middleware.js';
import {
  triggerPullSchema,
  batchUploadSchema,
  listMessagesSchema,
  batchDeleteSchema
} from './sms.validation.js';

const router = Router();

// 1. Admin triggers on-demand pull from Android device
router.post(
  '/trigger-pull',
  verifyToken,
  verifyAdmin,
  pullTriggerLimiter,
  validate(triggerPullSchema),
  smsController.triggerPull
);

// 2. Android App uploads encrypted batch (FCM response or user manual push)
router.post(
  '/batch-upload',
  verifyToken,
  verifyMobileUser,
  validate(batchUploadSchema),
  smsController.batchUpload
);

// 3. Admin queries decrypted messages with filters
router.get(
  '/messages',
  verifyToken,
  verifyAdmin,
  validate(listMessagesSchema),
  smsController.getMessages
);

// 4. Admin deletion
router.delete(
  '/messages/:id',
  verifyToken,
  verifyAdmin,
  smsController.deleteMessage
);

router.post(
  '/messages/batch-delete',
  verifyToken,
  verifyAdmin,
  validate(batchDeleteSchema),
  smsController.batchDeleteMessages
);

// 5. Admin queries summary of users, their devices and SMS counts
router.get(
  '/users-summary',
  verifyToken,
  verifyAdmin,
  smsController.getUsersSummary
);

// 6. Admin sync requests history
router.get(
  '/sync-requests',
  verifyToken,
  verifyAdmin,
  smsController.getSyncRequests
);

// 7. Admin database maintenance & purge (preserves main admin)
router.post(
  '/purge-all-data',
  verifyToken,
  verifyAdmin,
  smsController.purgeSystemData
);

export default router;
