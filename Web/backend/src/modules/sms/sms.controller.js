import smsService from './sms.service.js';
import ApiResponse from '../../utils/apiResponse.js';

class SMSController {
  async triggerPull(req, res, next) {
    try {
      const { deviceId, filterType, dateFrom, dateTo, limit } = req.body;
      const result = await smsService.triggerPull({
        adminId: req.user._id,
        deviceId,
        filterType,
        dateFrom,
        dateTo,
        limit,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.accepted(res, result, 'Pull request dispatched to Android device via FCM');
    } catch (err) {
      next(err);
    }
  }

  async batchUpload(req, res, next) {
    try {
      const { deviceId, requestId, triggerSource, messages, error } = req.body;
      const result = await smsService.batchUpload({
        userId: req.user._id,
        deviceId,
        requestId,
        triggerSource,
        messages,
        error
      });

      return ApiResponse.success(res, result, 'Encrypted SMS batch uploaded and stored successfully');
    } catch (err) {
      next(err);
    }
  }

  async getMessages(req, res, next) {
    try {
      const result = await smsService.getMessages(req.query);
      return ApiResponse.success(res, result, 'Messages retrieved');
    } catch (err) {
      next(err);
    }
  }

  async deleteMessage(req, res, next) {
    try {
      const result = await smsService.deleteMessage(
        req.user._id,
        req.params.id,
        req.ip,
        req.headers['user-agent']
      );
      return ApiResponse.success(res, result, 'Message deleted');
    } catch (err) {
      next(err);
    }
  }

  async batchDeleteMessages(req, res, next) {
    try {
      const { messageIds } = req.body;
      const result = await smsService.batchDeleteMessages(
        req.user._id,
        messageIds,
        req.ip,
        req.headers['user-agent']
      );
      return ApiResponse.success(res, result, 'Messages deleted');
    } catch (err) {
      next(err);
    }
  }

  async getUsersSummary(req, res, next) {
    try {
      const result = await smsService.getUsersSummary();
      return ApiResponse.success(res, result, 'Users summary retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getSyncRequests(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await smsService.getSyncRequests({ page, limit });
      return ApiResponse.success(res, result, 'Sync requests history');
    } catch (err) {
      next(err);
    }
  }

  async purgeSystemData(req, res, next) {
    try {
      const result = await smsService.purgeSystemData({
        adminId: req.user._id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      return ApiResponse.success(res, result, 'System data successfully purged');
    } catch (err) {
      next(err);
    }
  }
}

export default new SMSController();
