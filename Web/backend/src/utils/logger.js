import winston from 'winston';

/**
 * Custom Winston format that automatically redacts OTPs (4-8 digits)
 * and mobile phone numbers from application logs
 */
const redactPII = winston.format((info) => {
  if (typeof info.message === 'string') {
    info.message = info.message
      .replace(/\b\d{4,8}\b/g, '[REDACTED_OTP]')
      .replace(/(?:\+?\d{1,3})?[ -.]?\(?\d{3}\)?[ -.]?\d{3}[ -.]?\d{4}/g, '[REDACTED_PHONE]');
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    redactPII(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'sms-transfer-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          return `${timestamp} [${level}]: ${stack || message}`;
        })
      )
    })
  ]
});

export default logger;
