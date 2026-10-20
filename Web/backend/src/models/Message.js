import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    userId: {
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
    syncRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SyncRequest',
      index: true
    },
    sender: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    // AES-256-GCM Armored Payload
    encryptedBody: {
      type: String,
      required: true
    },
    iv: {
      type: String,
      required: true
    },
    authTag: {
      type: String,
      required: true
    },
    // Deterministic SHA-256 hash for deduplication
    messageHash: {
      type: String,
      required: true
    },
    messageDate: {
      type: Date,
      required: true,
      index: true
    },
    simSlot: {
      type: String,
      enum: ['SIM 1', 'SIM 2', 'UNKNOWN'],
      default: 'UNKNOWN',
      index: true
    },
    carrierName: {
      type: String,
      default: ''
    },
    isRead: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index ensuring idempotency & zero duplicate messages per user
MessageSchema.index({ userId: 1, messageHash: 1 }, { unique: true });
MessageSchema.index({ userId: 1, messageDate: -1 });

export const Message = mongoose.model('Message', MessageSchema);
export default Message;
