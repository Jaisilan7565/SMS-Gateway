import mongoose from 'mongoose';
import { SYNC_REQUEST_STATUS, SYNC_TRIGGER_SOURCE, SYNC_FILTER_TYPES } from '../constants/statuses.js';

const SyncRequestSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
      index: true
    },
    triggerSource: {
      type: String,
      enum: Object.values(SYNC_TRIGGER_SOURCE),
      default: SYNC_TRIGGER_SOURCE.ADMIN_PULL
    },
    filterType: {
      type: String,
      enum: Object.values(SYNC_FILTER_TYPES),
      default: SYNC_FILTER_TYPES.DELTA_UNSYNCED
    },
    filterCriteria: {
      watermark: Number,
      dateFrom: Date,
      dateTo: Date,
      limit: Number
    },
    status: {
      type: String,
      enum: Object.values(SYNC_REQUEST_STATUS),
      default: SYNC_REQUEST_STATUS.PENDING,
      index: true
    },
    messagesCount: {
      type: Number,
      default: 0
    },
    failureReason: {
      type: String
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

export const SyncRequest = mongoose.model('SyncRequest', SyncRequestSchema);
export default SyncRequest;
