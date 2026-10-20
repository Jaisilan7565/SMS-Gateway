import mongoose from 'mongoose';
import { AUDIT_ACTIONS } from '../constants/statuses.js';

const AuditLogSchema = new mongoose.Schema(
  {
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTIONS),
      required: true,
      index: true
    },
    targetModel: {
      type: String,
      default: ''
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;
