import crypto from 'node:crypto';
import ApiError from '../utils/apiError.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended by NIST SP 800-38D
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

class CryptoService {
  constructor() {
    this._initKey();
  }

  _initKey() {
    const secret = process.env.ENCRYPTION_MASTER_KEY || 'techglora_military_grade_aes_256_gcm_master_secret_2026';
    // Derive a fixed 32-byte (256-bit) key using HKDF-SHA256
    this.key = crypto.hkdfSync('sha256', secret, 'sms-transfer-salt', 'sms-payload-encryption', 32);
  }

  /**
   * Encrypts plaintext string or JSON using AES-256-GCM
   * @param {string|object} data - Data to encrypt
   * @param {string} [aad] - Additional Authenticated Data (e.g. userId:deviceId)
   * @returns {{ ciphertext: string, iv: string, authTag: string, aad?: string, v: string }}
   */
  encrypt(data, aad = null) {
    try {
      const plaintext = typeof data === 'object' ? JSON.stringify(data) : String(data);
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, {
        authTagLength: AUTH_TAG_LENGTH
      });

      if (aad) {
        cipher.setAAD(Buffer.from(aad, 'utf8'));
      }

      let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
      ciphertext += cipher.final('base64');
      const authTag = cipher.getAuthTag().toString('base64');

      return {
        ciphertext,
        iv: iv.toString('base64'),
        authTag,
        aad: aad || undefined,
        v: 'gcm-v1'
      };
    } catch (err) {
      throw ApiError.internal('Cryptographic encryption failure', [err.message]);
    }
  }

  /**
   * Decrypts and authenticates AES-256-GCM payload
   * @param {{ ciphertext: string, iv: string, authTag: string, aad?: string }} payload
   * @returns {string|object} Decrypted plaintext (or parsed JSON)
   */
  decrypt({ ciphertext, iv, authTag, aad = null }) {
    try {
      const ivBuffer = Buffer.from(iv, 'base64');
      const authTagBuffer = Buffer.from(authTag, 'base64');

      if (ivBuffer.length !== IV_LENGTH) {
        throw new Error('Invalid Initialization Vector length');
      }
      if (authTagBuffer.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid Authentication Tag length');
      }

      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, ivBuffer, {
        authTagLength: AUTH_TAG_LENGTH
      });

      if (aad) {
        decipher.setAAD(Buffer.from(aad, 'utf8'));
      }

      decipher.setAuthTag(authTagBuffer);

      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (err) {
      throw ApiError.unauthorized('Cryptographic integrity check failed. Message was tampered with.');
    }
  }

  /**
   * Generates a deterministic SHA-256 hash for deduplication
   */
  hashMessage(userId, sender, date, body) {
    return crypto
      .createHash('sha256')
      .update(`${userId}|${sender}|${date}|${body}`)
      .digest('hex');
  }
}

export default new CryptoService();
