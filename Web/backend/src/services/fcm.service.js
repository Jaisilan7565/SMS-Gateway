import admin from 'firebase-admin';
import { getIsFCMEnabled } from '../config/firebase.js';
import logger from '../utils/logger.js';
import ApiError from '../utils/apiError.js';

class FCMService {
  /**
   * Dispatches a silent, high-priority data-only push message to wake the Android device
   * @param {object} params
   * @param {string} params.fcmToken - Android device registration token
   * @param {string} params.requestId - SyncRequest ObjectId string
   * @param {string} params.filterType - 'DELTA_UNSYNCED' | 'TODAY' | 'DATE_RANGE' | 'ALL'
   * @param {number|string} [params.watermark] - Highest timestamp already synced (for DELTA)
   * @param {string} [params.dateFrom] - Start date (for DATE_RANGE)
   * @param {string} [params.dateTo] - End date (for DATE_RANGE)
   * @param {number} [params.limit] - Max records
   */
  async sendPullTrigger({
    fcmToken,
    requestId,
    filterType = 'DELTA_UNSYNCED',
    watermark = 0,
    dateFrom = null,
    dateTo = null,
    limit = 100
  }) {
    if (!fcmToken) {
      throw ApiError.badRequest('Target device does not have an active FCM token');
    }

    // High-Priority push with visible Notification + Data payload
    const message = {
      token: fcmToken,
      notification: {
        title: '⚡ SMS Gateway Sync',
        body: 'Admin console requested SMS synchronization. Ingestion in progress...'
      },
      data: {
        action: 'PULL_SMS',
        requestId: String(requestId),
        filterType: String(filterType),
        watermark: String(watermark || 0),
        dateFrom: dateFrom ? String(dateFrom) : '',
        dateTo: dateTo ? String(dateTo) : '',
        limit: String(limit)
      },
      android: {
        priority: 'high', // Grants high-priority execution window
        ttl: 120 * 1000,  // 2 minutes TTL
        notification: {
          channelId: 'sms_gateway_sync',
          sound: 'default',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: 'public'
        }
      }
    };

    if (!getIsFCMEnabled()) {
      logger.warn(`[SIMULATION] FCM trigger simulated for requestId: ${requestId} to token: ${fcmToken.slice(0, 12)}...`);
      return { simulated: true, messageId: `mock_${Date.now()}` };
    }

    try {
      const response = await admin.messaging().send(message);
      logger.info(`FCM High-Priority push dispatched successfully: ${response} for requestId: ${requestId}`);
      return { success: true, messageId: response };
    } catch (error) {
      logger.error(`FCM dispatch error: ${error.message}`);
      throw ApiError.internal(`Failed to dispatch silent push to mobile device: ${error.message}`);
    }
  }
}

export default new FCMService();
