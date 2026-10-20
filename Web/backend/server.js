import http from 'node:http';
import dotenv from 'dotenv';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { initFirebase } from './src/config/firebase.js';
import { initSocket } from './src/services/socket.service.js';
import { seedAdmin } from './src/database/seeders/seedAdmin.js';
import logger from './src/utils/logger.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const rawCorsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const corsOrigin = rawCorsOrigin === '*' 
  ? '*' 
  : rawCorsOrigin.includes(',') 
    ? rawCorsOrigin.split(',').map((o) => o.trim()) 
    : rawCorsOrigin;

const startServer = async () => {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Auto-seed Admin if database is empty
    await seedAdmin().catch((err) => {
      logger.warn(`Admin auto-seed note: ${err.message}`);
    });

    // 3. Initialize Firebase Admin SDK
    initFirebase();

    // 4. Create HTTP Server
    const httpServer = http.createServer(app);

    // 5. Initialize Socket.io Real-Time Engine
    initSocket(httpServer, corsOrigin);

    // 6. Start Listening on all network interfaces
    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info('====================================================');
      logger.info(` SMS Transfer & Real-Time Sync Engine is Running`);
      logger.info(` Environment:  ${process.env.NODE_ENV || 'development'}`);
      logger.info(` Server Port:  ${PORT} (Bound to 0.0.0.0)`);
      logger.info(` Health Check: http://localhost:${PORT}/api/health`);
      logger.info(` Swagger Docs: http://localhost:${PORT}/api/docs`);
      logger.info('====================================================');
    });

    // Graceful Shutdown
    const shutdown = () => {
      logger.info('Shutting down HTTP server gracefully...');
      httpServer.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error(`Critical startup failure: ${error.message}`);
    process.exit(1);
  }
};

startServer();
