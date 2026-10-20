import logger from '../utils/logger.js';
import ApiError from '../utils/apiError.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Convert non-ApiError errors to ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error.errors || []);
  }

  const { statusCode, message, errors } = error;

  // Log error
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${statusCode} - ${message}\nStack: ${err.stack}`);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - ${statusCode} - ${message}`);
  }

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: errors.length > 0 ? errors : undefined,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default errorHandler;
