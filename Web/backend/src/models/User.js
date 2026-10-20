import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, AUTH_PROVIDERS } from '../constants/roles.js';

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: function () {
        return this.authProvider === AUTH_PROVIDERS.LOCAL;
      }
    },
    fullName: {
      type: String,
      trim: true,
      default: ''
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.MOBILE_USER
    },
    authProvider: {
      type: String,
      enum: Object.values(AUTH_PROVIDERS),
      default: AUTH_PROVIDERS.LOCAL
    },
    googleId: {
      type: String,
      sparse: true
    },
    avatarUrl: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Method to verify password
UserSchema.methods.comparePassword = async function (password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

// Static helper to hash password
UserSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const User = mongoose.model('User', UserSchema);
export default User;
