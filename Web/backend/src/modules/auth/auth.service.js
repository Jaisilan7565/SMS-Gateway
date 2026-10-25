import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../../models/User.js';
import AuditLog from '../../models/AuditLog.js';
import ApiError from '../../utils/apiError.js';
import { ROLES, AUTH_PROVIDERS } from '../../constants/roles.js';
import { AUDIT_ACTIONS } from '../../constants/statuses.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthService {
  generateTokens(user) {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role
    };

    // Mobile gateway devices run 24/7 as dedicated infrastructure and require long-lived tokens
    const isMobile = user.role === ROLES.MOBILE_USER;
    const accessExpiresIn = isMobile ? (process.env.JWT_MOBILE_EXPIRES_IN || '90d') : (process.env.JWT_EXPIRES_IN || '1d');
    const refreshExpiresIn = isMobile ? (process.env.JWT_MOBILE_REFRESH_EXPIRES_IN || '365d') : (process.env.JWT_REFRESH_EXPIRES_IN || '7d');

    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'techglora_jwt_secret_dev_key_32chars_minimum_2026!',
      { expiresIn: accessExpiresIn }
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET || 'techglora_jwt_refresh_dev_key_32chars_minimum_2026!',
      { expiresIn: refreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  async adminLogin({ email, password, ipAddress, userAgent }) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.role !== ROLES.ADMIN) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('This administrator account has been deactivated');
    }

    user.lastLoginAt = new Date();
    await user.save();

    await AuditLog.create({
      performedBy: user._id,
      action: AUDIT_ACTIONS.ADMIN_LOGIN,
      targetModel: 'User',
      targetId: user._id,
      ipAddress,
      userAgent
    });

    const tokens = this.generateTokens(user);
    return {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      },
      ...tokens
    };
  }

  async mobileRegister({ email, password, fullName, ipAddress, userAgent }) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      fullName: fullName || '',
      role: ROLES.MOBILE_USER,
      authProvider: AUTH_PROVIDERS.LOCAL
    });

    await AuditLog.create({
      performedBy: user._id,
      action: AUDIT_ACTIONS.MOBILE_REGISTER,
      targetModel: 'User',
      targetId: user._id,
      ipAddress,
      userAgent
    });

    const tokens = this.generateTokens(user);
    return {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      },
      ...tokens
    };
  }

  async mobileLogin({ email, password, ipAddress, userAgent }) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.role !== ROLES.MOBILE_USER) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('This user account has been deactivated');
    }

    user.lastLoginAt = new Date();
    await user.save();

    await AuditLog.create({
      performedBy: user._id,
      action: AUDIT_ACTIONS.MOBILE_LOGIN,
      targetModel: 'User',
      targetId: user._id,
      ipAddress,
      userAgent
    });

    const tokens = this.generateTokens(user);
    return {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      },
      ...tokens
    };
  }

  async mobileGoogleOAuth({ idToken, email: directEmail, displayName, photoUrl, googleId: directGoogleId, ipAddress, userAgent }) {
    let email, name, picture, googleId;

    if (idToken && typeof idToken === 'string' && idToken.startsWith('eyJ')) {
      try {
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id.apps.googleusercontent.com') {
          const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
          });
          const payload = ticket.getPayload();
          email = payload.email;
          name = payload.name;
          picture = payload.picture;
          googleId = payload.sub;
        } else {
          // Decode payload directly
          const decoded = jwt.decode(idToken);
          if (decoded && decoded.email) {
            email = decoded.email;
            name = decoded.name || 'Google User';
            picture = decoded.picture || '';
            googleId = decoded.sub || `google_${Date.now()}`;
          }
        }
      } catch (err) {
        logger.warn(`Google token decode warning: ${err.message}`);
      }
    }

    // Direct account fallback from Google Sign-In on mobile
    if (!email && directEmail) {
      email = directEmail;
      name = displayName || directEmail.split('@')[0];
      picture = photoUrl || '';
      googleId = directGoogleId || `google_${directEmail}`;
    }

    if (!email) {
      throw ApiError.unauthorized('Unable to verify Google account credentials. Please try again.');
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        email: email.toLowerCase(),
        fullName: name,
        role: ROLES.MOBILE_USER,
        authProvider: AUTH_PROVIDERS.GOOGLE,
        googleId,
        avatarUrl: picture
      });
    } else {
      user.lastLoginAt = new Date();
      if (!user.googleId) user.googleId = googleId;
      await user.save();
    }

    await AuditLog.create({
      performedBy: user._id,
      action: AUDIT_ACTIONS.MOBILE_LOGIN,
      targetModel: 'User',
      targetId: user._id,
      metadata: { method: 'google_oauth' },
      ipAddress,
      userAgent
    });

    const tokens = this.generateTokens(user);
    return {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl
      },
      ...tokens
    };
  }

  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw ApiError.unauthorized('Refresh token is required');
    }

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'techglora_jwt_refresh_dev_key_32chars_minimum_2026!'
      );

      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        throw ApiError.unauthorized('User session is invalid');
      }

      return this.generateTokens(user);
    } catch (err) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
  }
}

export default new AuthService();
