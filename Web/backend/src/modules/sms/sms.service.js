import Device from '../../models/Device.js';
import User from '../../models/User.js';
import Message from '../../models/Message.js';
import SyncRequest from '../../models/SyncRequest.js';
import AuditLog from '../../models/AuditLog.js';
import fcmService from '../../services/fcm.service.js';
import cryptoService from '../../services/crypto.service.js';
import { notifyAdmins } from '../../services/socket.service.js';
import ApiError from '../../utils/apiError.js';
import logger from '../../utils/logger.js';
import {
  SYNC_REQUEST_STATUS,
  SYNC_TRIGGER_SOURCE,
  SYNC_FILTER_TYPES,
  DEVICE_STATUS,
  AUDIT_ACTIONS
} from '../../constants/statuses.js';
import { ROLES } from '../../constants/roles.js';

class SMSService {
  /**
   * Admin triggers an on-demand pull from a specific device via silent FCM
   */
  async triggerPull({ adminId, deviceId, filterType, dateFrom, dateTo, limit, ipAddress, userAgent }) {
    const device = await Device.findById(deviceId);
    if (!device) {
      throw ApiError.notFound('Target device not found');
    }

    if (device.status === DEVICE_STATUS.LOGGED_OUT) {
      throw ApiError.badRequest(`Cannot pull SMS: ${device.deviceName} is currently logged out. The mobile user must sign in first.`);
    }

    if (!device.fcmToken) {
      throw ApiError.badRequest('Target device does not have an active FCM registration token');
    }

    // Determine watermark if DELTA_UNSYNCED
    let watermark = 0;
    if (filterType === SYNC_FILTER_TYPES.DELTA_UNSYNCED) {
      watermark = device.lastSyncWatermark || 0;
    } else if (filterType === SYNC_FILTER_TYPES.TODAY) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      watermark = today.getTime();
    }

    // Normalize dateTo to end of day if it was provided as a date string without time
    let processedDateTo = null;
    if (dateTo) {
      const dTo = new Date(dateTo);
      if (dTo.getUTCHours() === 0 && dTo.getUTCMinutes() === 0 && dTo.getUTCSeconds() === 0) {
        dTo.setHours(23, 59, 59, 999);
      }
      processedDateTo = dTo;
    }

    // Create SyncRequest in database
    const syncRequest = await SyncRequest.create({
      requestedBy: adminId,
      targetUserId: device.userId,
      deviceId: device._id,
      triggerSource: SYNC_TRIGGER_SOURCE.ADMIN_PULL,
      filterType,
      filterCriteria: {
        watermark,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: processedDateTo || (dateTo ? new Date(dateTo) : undefined),
        limit
      },
      status: SYNC_REQUEST_STATUS.PENDING
    });

    await AuditLog.create({
      performedBy: adminId,
      action: AUDIT_ACTIONS.TRIGGER_PULL,
      targetModel: 'SyncRequest',
      targetId: syncRequest._id,
      metadata: { deviceId, filterType, watermark },
      ipAddress,
      userAgent
    });

    // Dispatch FCM High-Priority Push to Android device
    try {
      await fcmService.sendPullTrigger({
        fcmToken: device.fcmToken,
        requestId: syncRequest._id.toString(),
        filterType,
        watermark,
        dateFrom: dateFrom ? new Date(dateFrom).getTime() : null,
        dateTo: processedDateTo ? processedDateTo.getTime() : (dateTo ? new Date(dateTo).getTime() : null),
        limit
      });

      syncRequest.status = SYNC_REQUEST_STATUS.PROCESSING;
      await syncRequest.save();

      notifyAdmins('sync:triggered', {
        requestId: syncRequest._id,
        deviceId: device._id,
        deviceName: device.deviceName,
        filterType,
        status: syncRequest.status
      });

      // Automatically fail and notify admins if phone does not respond within 45s
      setTimeout(async () => {
        try {
          const currentReq = await SyncRequest.findById(syncRequest._id);
          if (currentReq && (currentReq.status === SYNC_REQUEST_STATUS.PENDING || currentReq.status === SYNC_REQUEST_STATUS.PROCESSING)) {
            currentReq.status = SYNC_REQUEST_STATUS.FAILED;
            currentReq.failureReason = 'Device did not respond within 45s. The device may be offline, asleep, or disconnected.';
            currentReq.completedAt = new Date();
            await currentReq.save();

            notifyAdmins('sync:failed', {
              requestId: currentReq._id,
              deviceId: device._id,
              deviceName: device.deviceName,
              error: currentReq.failureReason
            });
          }
        } catch (e) {
          logger.warn(`Sync timeout check error for ${syncRequest._id}: ${e.message}`);
        }
      }, 45000);

      return syncRequest;
    } catch (error) {
      syncRequest.status = SYNC_REQUEST_STATUS.FAILED;
      syncRequest.failureReason = error.message;
      await syncRequest.save();
      throw error;
    }
  }

  /**
   * Receives encrypted batch of messages from Android app
   * (Supports both FCM-triggered response and Mobile User Manual Push!)
   */
  async batchUpload({ userId, deviceId, requestId, triggerSource, messages, error }) {
    const device = await Device.findOne({ _id: deviceId, userId });
    if (!device) {
      throw ApiError.notFound('Device verification failed');
    }

    let syncRequest = null;
    if (requestId) {
      syncRequest = await SyncRequest.findById(requestId);
    } else if (triggerSource === SYNC_TRIGGER_SOURCE.USER_MANUAL_PUSH) {
      syncRequest = await SyncRequest.create({
        requestedBy: userId,
        targetUserId: userId,
        deviceId: device._id,
        triggerSource: SYNC_TRIGGER_SOURCE.USER_MANUAL_PUSH,
        filterType: SYNC_FILTER_TYPES.DELTA_UNSYNCED,
        status: SYNC_REQUEST_STATUS.PROCESSING
      });
    }

    // Handle device-reported errors gracefully
    if (error) {
      logger.warn(`Mobile batch upload reported error for device ${deviceId}, request ${requestId}: ${error}`);
      if (syncRequest) {
        syncRequest.status = SYNC_REQUEST_STATUS.FAILED;
        syncRequest.failureReason = error;
        syncRequest.completedAt = new Date();
        await syncRequest.save();
      }

      notifyAdmins('sync:failed', {
        requestId: syncRequest?._id,
        deviceId: device._id,
        deviceName: device.deviceName,
        error
      });

      return { count: 0, error };
    }

    if (!messages || messages.length === 0) {
      if (syncRequest) {
        syncRequest.status = SYNC_REQUEST_STATUS.COMPLETED;
        syncRequest.messagesCount = 0;
        syncRequest.completedAt = new Date();
        await syncRequest.save();
      }

      notifyAdmins('admin:sms_synced', {
        requestId: syncRequest?._id,
        deviceId: device._id,
        deviceName: device.deviceName,
        count: 0,
        messages: [],
        filterType: syncRequest?.filterType,
        watermark: device.lastSyncWatermark || 0
      });

      return { count: 0, totalSynced: 0, watermark: device.lastSyncWatermark || 0 };
    }

    // Process and deduplicate messages
    let highestTimestamp = device.lastSyncWatermark || 0;
    const bulkOps = [];
    const decryptedForBroadcast = [];

    for (const msg of messages) {
      const msgTimestamp = Number(msg.messageDate);
      if (msgTimestamp > highestTimestamp) {
        highestTimestamp = msgTimestamp;
      }

      // Compute deterministic SHA-256 hash for deduplication
      // Uses invariant metadata (userId, sender, date, id/slot) so repeated uploads are idempotent
      const idKey = msg.smsId ? `id:${msg.smsId}` : `slot:${msg.simSlot || 'UNKNOWN'}`;
      const messageHash = cryptoService.hashMessage(
        userId.toString(),
        msg.sender,
        msgTimestamp,
        idKey
      );

      const messageDoc = {
        userId,
        deviceId: device._id,
        syncRequestId: syncRequest?._id,
        sender: msg.sender,
        encryptedBody: msg.encryptedBody,
        iv: msg.iv,
        authTag: msg.authTag,
        messageHash,
        smsId: msg.smsId || null,
        messageDate: new Date(msgTimestamp),
        simSlot: msg.simSlot || 'UNKNOWN',
        carrierName: msg.carrierName || '',
        isRead: Boolean(msg.isRead)
      };

      bulkOps.push({
        updateOne: {
          filter: { userId, messageHash },
          update: { $setOnInsert: messageDoc },
          upsert: true
        }
      });

      // Decrypt in memory for real-time live preview in React Admin table
      try {
        const decryptedBody = cryptoService.decrypt({
          ciphertext: msg.encryptedBody,
          iv: msg.iv,
          authTag: msg.authTag
        });

        decryptedForBroadcast.push({
          sender: msg.sender,
          body: typeof decryptedBody === 'object' ? JSON.stringify(decryptedBody) : String(decryptedBody),
          messageDate: new Date(msgTimestamp),
          simSlot: msg.simSlot,
          carrierName: msg.carrierName,
          isRead: msg.isRead
        });
      } catch (e) {
        decryptedForBroadcast.push({
          sender: msg.sender,
          body: '[Encrypted - Protected Message]',
          messageDate: new Date(msgTimestamp),
          simSlot: msg.simSlot,
          carrierName: msg.carrierName,
          isRead: msg.isRead
        });
      }
    }

    // Execute bulk upsert (zero duplicates guaranteed)
    const bulkResult = await Message.bulkWrite(bulkOps, { ordered: false });
    const insertedCount = bulkResult.upsertedCount || 0;

    // Update watermark and status
    device.lastSyncWatermark = highestTimestamp;
    device.lastSeenAt = new Date();
    await device.save();

    if (syncRequest) {
      syncRequest.status = SYNC_REQUEST_STATUS.COMPLETED;
      syncRequest.messagesCount = messages.length;
      syncRequest.completedAt = new Date();
      await syncRequest.save();
    }

    // Notify React Admin dashboard live via Socket.io
    notifyAdmins('admin:sms_synced', {
      requestId: syncRequest?._id,
      deviceId: device._id,
      deviceName: device.deviceName,
      count: messages.length,
      insertedCount,
      messages: decryptedForBroadcast.slice(0, 20) // send top 20 for instant preview
    });

    return {
      requestId: syncRequest?._id,
      received: messages.length,
      insertedCount,
      watermark: highestTimestamp
    };
  }

  /**
   * Retrieves messages for the Admin dashboard, decrypted in memory
   */
  async getMessages({ deviceId, userId, sender, simSlot, dateFrom, dateTo, search, page = 1, limit = 20 }) {
    const query = { isDeleted: false };

    if (deviceId) query.deviceId = deviceId;
    if (userId) query.userId = userId;
    if (sender) query.sender = { $regex: sender, $options: 'i' };
    if (simSlot && simSlot !== 'ALL') query.simSlot = simSlot;

    if (dateFrom || dateTo) {
      query.messageDate = {};
      if (dateFrom) query.messageDate.$gte = new Date(dateFrom);
      if (dateTo) query.messageDate.$lte = new Date(dateTo);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [rawMessages, total] = await Promise.all([
      Message.find(query)
        .populate('userId', 'email fullName')
        .populate('deviceId', 'deviceName model manufacturer simSlots')
        .sort({ messageDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Message.countDocuments(query)
    ]);

    // Decrypt message bodies in-memory for authorized admin viewing
    const decryptedMessages = rawMessages.map((msg) => {
      let bodyText = '[Encrypted Message]';
      try {
        const decrypted = cryptoService.decrypt({
          ciphertext: msg.encryptedBody,
          iv: msg.iv,
          authTag: msg.authTag
        });
        bodyText = typeof decrypted === 'object' ? JSON.stringify(decrypted) : String(decrypted);
      } catch {
        bodyText = '[Decryption error: authentication tag mismatch]';
      }

      return {
        id: msg._id,
        userId: msg.userId,
        deviceId: msg.deviceId,
        sender: msg.sender,
        body: bodyText,
        messageDate: msg.messageDate,
        simSlot: msg.simSlot,
        carrierName: msg.carrierName,
        isRead: msg.isRead,
        createdAt: msg.createdAt
      };
    });

    // If text search filter is provided on decrypted body
    let finalMessages = decryptedMessages;
    if (search && search.trim() !== '') {
      const q = search.toLowerCase();
      finalMessages = decryptedMessages.filter(
        (m) => m.body.toLowerCase().includes(q) || m.sender.toLowerCase().includes(q)
      );
    }

    const totalPages = Math.ceil(total / Number(limit)) || 1;
    return {
      messages: finalMessages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasPrevPage: Number(page) > 1,
        hasNextPage: Number(page) < totalPages
      }
    };
  }

  /**
   * Retrieves summary of all users with enrolled devices and SMS counts
   * Enables admin to filter and view each user's / device's SMS separately!
   */
  async getUsersSummary() {
    const devices = await Device.find()
      .populate('userId', 'email fullName role')
      .sort({ lastSeenAt: -1 });

    const [countsByDevice, countsByUser] = await Promise.all([
      Message.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$deviceId', count: { $sum: 1 }, lastMessageDate: { $max: '$messageDate' } } }
      ]),
      Message.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$userId', count: { $sum: 1 }, lastMessageDate: { $max: '$messageDate' } } }
      ])
    ]);

    const countsMap = new Map();
    for (const item of countsByDevice) {
      if (item._id) countsMap.set(item._id.toString(), item);
    }

    const userCountsMap = new Map();
    for (const item of countsByUser) {
      if (item._id) userCountsMap.set(item._id.toString(), item);
    }

    const usersMap = new Map();

    for (const dev of devices) {
      const u = dev.userId;
      if (!u) continue;
      const uid = u._id.toString();

      if (!usersMap.has(uid)) {
        usersMap.set(uid, {
          userId: u._id,
          email: u.email,
          fullName: u.fullName,
          totalMessages: userCountsMap.get(uid)?.count || 0,
          lastMessageDate: userCountsMap.get(uid)?.lastMessageDate || null,
          devices: []
        });
      }

      const devStats = countsMap.get(dev._id.toString());
      usersMap.get(uid).devices.push({
        deviceId: dev._id,
        deviceName: dev.deviceName,
        model: dev.model,
        manufacturer: dev.manufacturer,
        status:
          dev.status === DEVICE_STATUS.LOGGED_OUT
            ? DEVICE_STATUS.LOGGED_OUT
            : dev.status === DEVICE_STATUS.INACTIVE
            ? DEVICE_STATUS.INACTIVE
            : !dev.lastSeenAt || Date.now() - new Date(dev.lastSeenAt).getTime() > 5 * 60 * 1000
            ? DEVICE_STATUS.OFFLINE
            : DEVICE_STATUS.ACTIVE,
        batteryLevel: dev.batteryLevel,
        lastSeenAt: dev.lastSeenAt,
        messageCount: devStats?.count || 0,
        lastMessageDate: devStats?.lastMessageDate || null,
        simSlots: dev.simSlots
      });
    }

    return Array.from(usersMap.values());
  }

  async deleteMessage(adminId, messageId, ipAddress, userAgent) {
    const message = await Message.findById(messageId);
    if (!message) {
      throw ApiError.notFound('Message not found');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    await AuditLog.create({
      performedBy: adminId,
      action: AUDIT_ACTIONS.DELETE_SMS,
      targetModel: 'Message',
      targetId: message._id,
      metadata: { sender: message.sender, messageDate: message.messageDate },
      ipAddress,
      userAgent
    });

    notifyAdmins('sms:deleted', { messageId });

    return { success: true, messageId };
  }

  async batchDeleteMessages(adminId, messageIds, ipAddress, userAgent) {
    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    await AuditLog.create({
      performedBy: adminId,
      action: AUDIT_ACTIONS.BATCH_DELETE_SMS,
      targetModel: 'Message',
      metadata: { count: messageIds.length, messageIds },
      ipAddress,
      userAgent
    });

    notifyAdmins('sms:batch_deleted', { messageIds });

    return { success: true, deletedCount: messageIds.length };
  }

  async getSyncRequests({ page = 1, limit = 20 }) {
    const skip = (Number(page) - 1) * Number(limit);
    const [requests, total] = await Promise.all([
      SyncRequest.find()
        .populate('requestedBy', 'email fullName role')
        .populate('targetUserId', 'email fullName')
        .populate('deviceId', 'deviceName model')
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      SyncRequest.countDocuments()
    ]);

    return {
      requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  /**
   * Purges all application data from database while strictly preserving
   * the main seeded Super Administrator account!
   */
  async purgeSystemData({ adminId, ipAddress, userAgent }) {
    // 1. Delete all SMS messages
    const msgResult = await Message.deleteMany({});

    // 2. Delete all sync requests
    const syncResult = await SyncRequest.deleteMany({});

    // 3. Delete all enrolled devices
    const devResult = await Device.deleteMany({});

    // 4. Delete all users EXCEPT admin role
    const userResult = await User.deleteMany({ role: { $ne: ROLES.ADMIN } });

    // 5. Delete all old audit logs
    await AuditLog.deleteMany({});

    // 6. Record single new audit entry for the purge action
    await AuditLog.create({
      performedBy: adminId,
      action: AUDIT_ACTIONS.PURGE_SYSTEM_DATA,
      targetModel: 'System',
      metadata: {
        deletedMessages: msgResult.deletedCount,
        deletedSyncRequests: syncResult.deletedCount,
        deletedDevices: devResult.deletedCount,
        deletedUsers: userResult.deletedCount
      },
      ipAddress,
      userAgent
    });

    // 7. Broadcast real-time purge event to all connected admin panels
    notifyAdmins('system:purged', {
      purgedAt: new Date(),
      adminId,
      deleted: {
        messages: msgResult.deletedCount,
        syncRequests: syncResult.deletedCount,
        devices: devResult.deletedCount,
        users: userResult.deletedCount
      }
    });

    logger.warn(`SYSTEM DATA PURGE executed by admin ${adminId}: ${msgResult.deletedCount} msgs, ${devResult.deletedCount} devices, ${userResult.deletedCount} users removed.`);

    return {
      success: true,
      deletedMessages: msgResult.deletedCount,
      deletedSyncRequests: syncResult.deletedCount,
      deletedDevices: devResult.deletedCount,
      deletedUsers: userResult.deletedCount
    };
  }
}

export default new SMSService();
