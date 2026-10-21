import deviceService from './device.service.js';
import ApiResponse from '../../utils/apiResponse.js';

class DeviceController {
  async registerDevice(req, res, next) {
    try {
      const device = await deviceService.registerDevice(
        req.user._id,
        req.body,
        req.ip,
        req.headers['user-agent']
      );
      return ApiResponse.success(res, { device }, 'Device registered and paired successfully');
    } catch (err) {
      next(err);
    }
  }

  async getAllDevices(req, res, next) {
    try {
      const { search, status, page, limit } = req.query;
      const result = await deviceService.getAllDevices({ search, status, page, limit });
      return ApiResponse.success(res, result, 'Connected devices retrieved');
    } catch (err) {
      next(err);
    }
  }

  async getDeviceById(req, res, next) {
    try {
      const device = await deviceService.getDeviceById(req.params.id);
      return ApiResponse.success(res, { device }, 'Device details retrieved');
    } catch (err) {
      next(err);
    }
  }

  async updateHeartbeat(req, res, next) {
    try {
      const device = await deviceService.updateHeartbeat(req.user._id, req.params.id, req.body);
      return ApiResponse.success(res, { device }, 'Heartbeat updated');
    } catch (err) {
      next(err);
    }
  }

  async logoutDevice(req, res, next) {
    try {
      const result = await deviceService.logoutDevice(
        req.user._id,
        req.params.id,
        req.ip,
        req.headers['user-agent']
      );
      return ApiResponse.success(res, result, 'Device logged out successfully');
    } catch (err) {
      next(err);
    }
  }
}

export default new DeviceController();
