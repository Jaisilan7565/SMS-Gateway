/**
 * Standardized API Error class modeled after EduTechLab 3-layer architecture
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad Request', errors = []) {
    return new ApiError(400, msg, errors);
  }

  static unauthorized(msg = 'Unauthorized') {
    return new ApiError(401, msg);
  }

  static forbidden(msg = 'Forbidden') {
    return new ApiError(403, msg);
  }

  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg);
  }

  static conflict(msg = 'Conflict detected') {
    return new ApiError(409, msg);
  }

  static tooManyRequests(msg = 'Too many requests. Please slow down.') {
    return new ApiError(429, msg);
  }

  static internal(msg = 'Internal server error', errors = []) {
    return new ApiError(500, msg, errors);
  }
}

export default ApiError;
