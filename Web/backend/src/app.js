import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { globalLimiter } from './middlewares/rateLimiter.middleware.js';
import errorHandler from './middlewares/error.middleware.js';
import setupSwagger from './config/swagger.js';
import ApiError from './utils/apiError.js';
import ApiResponse from './utils/apiResponse.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import deviceRoutes from './modules/devices/device.routes.js';
import smsRoutes from './modules/sms/sms.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing
const rawCorsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const corsOrigin = rawCorsOrigin === '*' 
  ? '*' 
  : rawCorsOrigin.includes(',') 
    ? rawCorsOrigin.split(',').map((o) => o.trim()) 
    : rawCorsOrigin;

app.use(
  cors({
    origin: corsOrigin === '*' ? true : corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })
);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// HTTP request logger (skip health checks to keep logs clean)
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      skip: (req) => req.url === '/api/health' || req.url === '/health'
    })
  );
}

// Health check endpoint (for Render load balancers & uptime monitors — exempt from rate limit)
app.get('/api/health', (req, res) => {
  return ApiResponse.success(res, { status: 'healthy', timestamp: new Date() }, 'API Gateway Online');
});

// Global rate limiting for API endpoints
app.use('/api', globalLimiter);

// Swagger OpenAPI documentation
setupSwagger(app);

// Mount API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);
app.use('/api/v1/sms', smsRoutes);
app.use('/api/v1/audit-logs', auditRoutes);

// Catch-all for undefined routes
app.use('*', (req, res, next) => {
  next(ApiError.notFound(`Endpoint not found: ${req.method} ${req.originalUrl}`));
});

// Global centralized error handling middleware
app.use(errorHandler);

export default app;
