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

    const [devices, total] = await Promise.all([
      Device.find(query)
        .populate('userId', 'email fullName avatarUrl lastLoginAt')
        .sort({ lastSeenAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Device.countDocuments(query)
    ]);

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
    return device;
  }

  async updateHeartbeat(userId, deviceId, data) {
    const device = await Device.findOne({ _id: deviceId, userId });
    if (!device) {
      throw ApiError.notFound('Device not found');
    }

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
      lastSeenAt: device.lastSeenAt
    });

    return device;
  }
}

export default new DeviceService();
