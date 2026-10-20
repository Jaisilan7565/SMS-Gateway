import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import logger from '../utils/logger.js';

let firebaseApp = null;
let isFCMEnabled = false;

export const initFirebase = () => {
  try {
    if (admin.apps.length > 0) {
      firebaseApp = admin.app();
      isFCMEnabled = true;
      return firebaseApp;
    }

    let serviceAccount = null;

    // Check for inline JSON string or base64 (Ideal for Render cloud deployment)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
      if (raw.startsWith('{')) {
        serviceAccount = JSON.parse(raw);
      } else {
        // Base64 encoded
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      }
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const filePath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      if (fs.existsSync(filePath)) {
        serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    }

    if (serviceAccount) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      isFCMEnabled = true;
      logger.info('Firebase Admin SDK initialized successfully');
    } else {
      logger.warn('Firebase Service Account not provided. FCM push will run in simulated mode.');
    }
  } catch (error) {
    logger.error(`Firebase initialization warning: ${error.message}`);
  }

  return firebaseApp;
};

export const getFirebaseApp = () => firebaseApp;
export const getIsFCMEnabled = () => isFCMEnabled;

export default initFirebase;
