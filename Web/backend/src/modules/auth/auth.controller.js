import authService from './auth.service.js';
import ApiResponse from '../../utils/apiResponse.js';

class AuthController {
  async adminLogin(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.adminLogin({
        email,
        password,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Set HTTP-only secure refresh cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return ApiResponse.success(res, result, 'Administrator logged in successfully');
    } catch (err) {
      next(err);
    }
  }

  async mobileRegister(req, res, next) {
    try {
      const { email, password, fullName } = req.body;
      const result = await authService.mobileRegister({
        email,
        password,
        fullName,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.created(res, result, 'Mobile user account created successfully');
    } catch (err) {
      next(err);
    }
  }

  async mobileLogin(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.mobileLogin({
        email,
        password,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, result, 'Mobile user logged in successfully');
    } catch (err) {
      next(err);
    }
  }

  async mobileGoogleOAuth(req, res, next) {
    try {
      const { idToken, email, displayName, photoUrl, googleId } = req.body;
      const result = await authService.mobileGoogleOAuth({
        idToken,
        email,
        displayName,
        photoUrl,
        googleId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return ApiResponse.success(res, result, 'Google authentication successful');
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      const result = await authService.refreshToken(token);
      return ApiResponse.success(res, result, 'Tokens refreshed successfully');
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    res.clearCookie('refreshToken');
    return ApiResponse.success(res, {}, 'Logged out successfully');
  }

  async getCurrentUser(req, res, next) {
    return ApiResponse.success(res, { user: req.user }, 'Current session profile');
  }
}

export default new AuthController();
