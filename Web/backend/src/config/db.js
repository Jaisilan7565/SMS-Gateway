import dns from 'node:dns';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

// Fix for Windows/ISP DNS rejecting MongoDB Atlas SRV (_mongodb._tcp) queries
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore in sandboxed environments where setServers is restricted
}

export const connectDB = async () => {
  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sms_transfer';

  // If URI ends with '/', append default db name 'sms_transfer'
  if (uri.endsWith('/')) {
    uri = `${uri}sms_transfer?retryWrites=true&w=majority`;
  }

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export default connectDB;
