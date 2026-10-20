import 'dart:convert';
import 'package:cryptography/cryptography.dart';

class CryptoService {
  static final _algorithm = AesGcm.with256bits(nonceLength: 12);
  static SecretKey? _cachedKey;

  static const String _defaultMasterSecret =
      'techglora_military_grade_aes_256_gcm_master_secret_2026';

  /// Initializes the 256-bit key using HKDF-SHA256
  static Future<void> initialize([String? masterSecret]) async {
    final secret = masterSecret ?? _defaultMasterSecret;
    final hkdf = Hkdf(hmac: Hmac.sha256(), outputLength: 32);
    final secretKey = SecretKey(utf8.encode(secret));

    _cachedKey = await hkdf.deriveKey(
      secretKey: secretKey,
      nonce: utf8.encode('sms-transfer-salt'),
      info: utf8.encode('sms-payload-encryption'),
    );
  }

  /// Encrypts plaintext string using AES-256-GCM AEAD
  static Future<Map<String, dynamic>> encrypt(
    dynamic data, {
    String? aad,
  }) async {
    if (_cachedKey == null) {
      await initialize();
    }

    final plaintext = data is String ? data : jsonEncode(data);
    final plaintextBytes = utf8.encode(plaintext);

    final secretBox = await _algorithm.encrypt(
      plaintextBytes,
      secretKey: _cachedKey!,
      aad: aad != null ? utf8.encode(aad) : const <int>[],
    );

    return {
      'ciphertext': base64Encode(secretBox.cipherText),
      'iv': base64Encode(secretBox.nonce),
      'authTag': base64Encode(secretBox.mac.bytes),
      'aad': aad,
      'v': 'gcm-v1',
    };
  }

  /// Decrypts ciphertext and verifies 128-bit authentication tag
  static Future<String> decrypt({
    required String ciphertext,
    required String iv,
    required String authTag,
    String? aad,
  }) async {
    if (_cachedKey == null) {
      await initialize();
    }

    final cipherBytes = base64Decode(ciphertext);
    final nonceBytes = base64Decode(iv);
    final tagBytes = base64Decode(authTag);

    final secretBox = SecretBox(
      cipherBytes,
      nonce: nonceBytes,
      mac: Mac(tagBytes),
    );

    final decryptedBytes = await _algorithm.decrypt(
      secretBox,
      secretKey: _cachedKey!,
      aad: aad != null ? utf8.encode(aad) : const <int>[],
    );

    return utf8.decode(decryptedBytes);
  }
}
