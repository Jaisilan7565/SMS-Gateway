import Device from '../../models/Device.js';
import AuditLog from '../../models/AuditLog.js';
import ApiError from '../../utils/apiError.js';
import { DEVICE_STATUS, AUDIT_ACTIONS } from '../../constants/statuses.js';
import { notifyAdmins } from '../../services/socket.service.js';

class DeviceService {
  async registerDevice(userId, data, ipAddress, userAgent) {
    const {
      androidId,
      deviceName,
      manufacturer,
      model,
      osVersion,
      fcmToken,
      simSlots,
      batteryLevel,
      isCharging
    } = data;

    const device = await Device.findOneAndUpdate(
      { userId, androidId },
      {
        userId,
        androidId,
        deviceName: deviceName || 'Android Phone',
        manufacturer: manufacturer || '',
        model: model || '',
        osVersion: osVersion || '',
        fcmToken,
        simSlots: simSlots || {},
        batteryLevel: batteryLevel ?? 100,
        isCharging: isCharging ?? false,
        status: DEVICE_STATUS.ACTIVE,
        lastSeenAt: new Date()
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await AuditLog.create({
      performedBy: userId,
      action: AUDIT_ACTIONS.DEVICE_REGISTER,
      targetModel: 'Device',
      targetId: device._id,
      metadata: { androidId, model, fcmTokenPrefix: fcmToken.substring(0, 10) },
      ipAddress,
      userAgent
    });

    // Notify React dashboard live of new/updated device
    notifyAdmins('device:registered', {
      deviceId: device._id,
      userId,
      deviceName: device.deviceName,
      model: device.model,
      status: device.status,
      simSlots: device.simSlots
    });

    return device;
  }

  _computeDeviceStatus(device) {
    if (device.status === DEVICE_STATUS.LOGGED_OUT) {
      return DEVICE_STATUS.LOGGED_OUT;
    }
    if (device.status === DEVICE_STATUS.INACTIVE) {
      return DEVICE_STATUS.INACTIVE;
    }
    // Consider offline if no heartbeat or activity for > 10 minutes (accommodates Android Doze mode & battery maintenance windows)
    const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000;
    if (!device.lastSeenAt || Date.now() - new Date(device.lastSeenAt).getTime() > OFFLINE_THRESHOLD_MS) {
      return DEVICE_STATUS.OFFLINE;
    }
    return DEVICE_STATUS.ACTIVE;
  }

  async getAllDevices({ search, status, page = 1, limit = 20 }) {
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { deviceName: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { androidId: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [rawDevices, total] = await Promise.all([
      Device.find(query)
        .populate('userId', 'email fullName avatarUrl lastLoginAt')
        .sort({ lastSeenAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Device.countDocuments(query)
    ]);

    const devices = rawDevices.map((d) => {
      const devObj = d.toObject();
      devObj.status = this._computeDeviceStatus(d);
      return devObj;
    });

    return {
      devices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  async getDeviceById(deviceId) {
    const device = await Device.findById(deviceId).populate('userId', 'email fullName avatarUrl');
    if (!device) {
      throw ApiError.notFound('Device not found');
    }
    const devObj = device.toObject();
    devObj.status = this._computeDeviceStatus(device);
    return devObj;
  }

  async updateHeartbeat(userId, deviceId, data) {
    const device = await Device.findOne({ _id: deviceId, userId });
    if (!device) {
      throw ApiError.notFound('Device not found');
    }

    const previousStatus = this._computeDeviceStatus(device);

    if (data.batteryLevel !== undefined) device.batteryLevel = data.batteryLevel;
    if (data.isCharging !== undefined) device.isCharging = data.isCharging;
    if (data.fcmToken) device.fcmToken = data.fcmToken;
    device.status = DEVICE_STATUS.ACTIVE;
    device.lastSeenAt = new Date();

    await device.save();

    notifyAdmins('device:heartbeat', {
      deviceId: device._id,
      batteryLevel: device.batteryLevel,
      isCharging: device.isCharging,
      status: DEVICE_STATUS.ACTIVE,
      lastSeenAt: device.lastSeenAt
    });

    // If device was previously OFFLINE or LOGGED_OUT and regained network, instantly notify admin panel!
    if (previousStatus !== DEVICE_STATUS.ACTIVE) {
      notifyAdmins('device:status_changed', {
        deviceId: device._id,
        deviceName: device.deviceName,
        status: DEVICE_STATUS.ACTIVE
      });
    }

    const devObj = device.toObject();
    devObj.status = DEVICE_STATUS.ACTIVE;
    return devObj;
  }

  /**
   * Marks a device as LOGGED_OUT when the user explicitly signs out from mobile
   */
  async logoutDevice(userId, deviceId, ipAddress, userAgent) {
    const device = await Device.findOne({ _id: deviceId, userId });
    if (!device) {
      throw ApiError.notFound('Device not found');
    }

    device.status = DEVICE_STATUS.LOGGED_OUT;
    device.lastSeenAt = new Date();
    await device.save();

    await AuditLog.create({
      performedBy: userId,
      action: AUDIT_ACTIONS.MOBILE_LOGOUT,
      targetModel: 'Device',
      targetId: device._id,
      metadata: { deviceName: device.deviceName, model: device.model },
      ipAddress,
      userAgent
    });

    notifyAdmins('device:status_changed', {
      deviceId: device._id,
      deviceName: device.deviceName,
      status: DEVICE_STATUS.LOGGED_OUT
    });

    return { success: true, deviceId: device._id, status: DEVICE_STATUS.LOGGED_OUT };
  }
}

export default new DeviceService();
