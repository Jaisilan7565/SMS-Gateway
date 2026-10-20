import dns from 'node:dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../../models/User.js';
import { ROLES, AUTH_PROVIDERS } from '../../constants/roles.js';
import logger from '../../utils/logger.js';

// Fix for Windows/ISP DNS rejecting MongoDB Atlas SRV (_mongodb._tcp) queries
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore in sandboxed environments
}

dotenv.config();

export const seedAdmin = async () => {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@smstransfer.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePassword#2026';
  const adminName = process.env.ADMIN_NAME || 'Super Administrator';

  try {
    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      logger.info(`Super Admin already exists: ${adminEmail}`);
      return existing;
    }

    const passwordHash = await User.hashPassword(adminPassword);
    const admin = await User.create({
      email: adminEmail,
      passwordHash,
      fullName: adminName,
      role: ROLES.ADMIN,
      authProvider: AUTH_PROVIDERS.LOCAL,
      isActive: true
    });

    logger.info('==================================================');
    logger.info(' SUPER ADMIN SEEDED SUCCESSFULLY');
    logger.info(` Email:    ${adminEmail}`);
    logger.info(` Password: ${adminPassword}`);
    logger.info(' (Change this password in production environment)');
    logger.info('==================================================');

    return admin;
  } catch (error) {
    logger.error(`Error seeding admin: ${error.message}`);
    throw error;
  }
};

// If run directly via CLI (`npm run seed`)
if (process.argv[1]?.endsWith('seedAdmin.js')) {
  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sms_transfer';
  if (uri.endsWith('/')) {
    uri = `${uri}sms_transfer?retryWrites=true&w=majority`;
  }

  mongoose
    .connect(uri)
    .then(async () => {
      await seedAdmin();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      logger.error(`Seeding failed: ${err.message}`);
      process.exit(1);
    });
}

export default seedAdmin;
