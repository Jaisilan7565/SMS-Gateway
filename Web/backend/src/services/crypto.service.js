import crypto from 'node:crypto';
import ApiError from '../utils/apiError.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended by NIST SP 800-38D
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

const DEFAULT_MASTER_KEY = 'techglora_military_grade_aes_256_gcm_master_secret_2026';

class CryptoService {
  constructor() {
    this._initKey();
  }

  _initKey() {
    const configuredSecret = process.env.ENCRYPTION_MASTER_KEY;
    const primarySecret = configuredSecret || DEFAULT_MASTER_KEY;

    // Primary 256-bit AES key derived with HKDF-SHA256
    this.key = crypto.hkdfSync('sha256', primarySecret, 'sms-transfer-salt', 'sms-payload-encryption', 32);

    // Fallback key derived from default secret if configured secret differs
    if (configuredSecret && configuredSecret !== DEFAULT_MASTER_KEY) {
      this.fallbackKey = crypto.hkdfSync('sha256', DEFAULT_MASTER_KEY, 'sms-transfer-salt', 'sms-payload-encryption', 32);
    } else {
      this.fallbackKey = null;
    }
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
   * Internal helper to decrypt with a specific key and optional AAD
   */
  _decryptWithKey(key, { ciphertext, iv, authTag, aad = null }) {
    const ivBuffer = Buffer.from(iv, 'base64');
    const authTagBuffer = Buffer.from(authTag, 'base64');

    if (ivBuffer.length !== IV_LENGTH) {
      throw new Error('Invalid Initialization Vector length');
    }
    if (authTagBuffer.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid Authentication Tag length');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer, {
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
  }

  /**
   * Decrypts and authenticates AES-256-GCM payload.
   * Tolerant to both no-AAD (mobile client standard) and AAD payloads,
   * as well as seamless fallback to default master key if Render env differs.
   * @param {{ ciphertext: string, iv: string, authTag: string, aad?: string }} payload
   * @returns {string|object} Decrypted plaintext (or parsed JSON)
   */
  decrypt({ ciphertext, iv, authTag, aad = null }) {
    const keysToTry = [this.key];
    if (this.fallbackKey) {
      keysToTry.push(this.fallbackKey);
    }

    for (const key of keysToTry) {
      // 1. First try without AAD (standard mobile encryption)
      try {
        return this._decryptWithKey(key, { ciphertext, iv, authTag, aad: null });
      } catch (_) {}

      // 2. If AAD was provided, try with AAD
      if (aad) {
        try {
          return this._decryptWithKey(key, { ciphertext, iv, authTag, aad });
        } catch (_) {}
      }
    }

    throw ApiError.unauthorized('Cryptographic integrity check failed. Authentication tag mismatch or key mismatch.');
  }

  /**
   * Generates a deterministic SHA-256 hash for deduplication.
   * Uses invariant message properties (userId, sender, date, identifier).
   */
  hashMessage(userId, sender, date, identifier = 'UNKNOWN') {
    return crypto
      .createHash('sha256')
      .update(`${userId}|${sender}|${date}|${identifier}`)
      .digest('hex');
  }
}

export default new CryptoService();
