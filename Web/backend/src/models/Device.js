import mongoose from 'mongoose';
import { DEVICE_STATUS } from '../constants/statuses.js';

const DeviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    androidId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    deviceName: {
      type: String,
      default: 'Android Device'
    },
    manufacturer: {
      type: String,
      default: ''
    },
    model: {
      type: String,
      default: ''
    },
    osVersion: {
      type: String,
      default: ''
    },
    fcmToken: {
      type: String,
      required: true,
      trim: true
    },
    simSlots: {
      sim1: {
        carrier: { type: String, default: 'Not detected' },
        slotIndex: { type: Number, default: 0 },
        subId: { type: Number }
      },
      sim2: {
        carrier: { type: String, default: 'Not detected' },
        slotIndex: { type: Number, default: 1 },
        subId: { type: Number }
      }
    },
    lastSyncWatermark: {
      type: Number,
      default: 0,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(DEVICE_STATUS),
      default: DEVICE_STATUS.ACTIVE
    },
    batteryLevel: {
      type: Number,
      default: 100
    },
    isCharging: {
      type: Boolean,
      default: false
    },
    lastSeenAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure 1 unique device per user per androidId
DeviceSchema.index({ userId: 1, androidId: 1 }, { unique: true });

export const Device = mongoose.model('Device', DeviceSchema);
export default Device;
