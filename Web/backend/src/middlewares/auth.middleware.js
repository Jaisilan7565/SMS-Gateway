import jwt from 'jsonwebtoken';
import ApiError from '../utils/apiError.js';
import User from '../models/User.js';
import { ROLES } from '../constants/roles.js';

export const verifyToken = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(ApiError.unauthorized('Authentication token is required'));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'techglora_jwt_secret_dev_key_32chars_minimum_2026!'
    );

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return next(ApiError.unauthorized('The user belonging to this token no longer exists'));
    }

    if (!user.isActive) {
      return next(ApiError.forbidden('This user account has been deactivated'));
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Authentication token has expired'));
    }
    return next(ApiError.unauthorized('Invalid authentication token'));
  }
};

export const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return next(ApiError.forbidden('Access restricted to Super Administrators only'));
  }
  return next();
};

export const verifyMobileUser = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.MOBILE_USER) {
    return next(ApiError.forbidden('Access restricted to enrolled Mobile Users only'));
  }
  return next();
};
