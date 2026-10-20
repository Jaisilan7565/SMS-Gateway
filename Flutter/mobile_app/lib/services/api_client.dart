import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static final FlutterSecureStorage _storage = const FlutterSecureStorage();
  static late Dio _dio;
  static String _baseUrl =
      'https://sms-transfer-backend.onrender.com/api/v1'; // Default Android Emulator to localhost

  static Future<void> initialize() async {
    final savedUrl = await _storage.read(key: 'server_url');
    if (savedUrl != null && savedUrl.isNotEmpty) {
      _baseUrl = savedUrl;
    }

    _dio = Dio(
      BaseOptions(
        baseUrl: _baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: 'access_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
      ),
    );
  }

  static String get baseUrl => _baseUrl;

  static Future<void> setServerUrl(String url) async {
    String cleanUrl = url.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.substring(0, cleanUrl.length - 1);
    }
    if (!cleanUrl.endsWith('/api/v1')) {
      cleanUrl = '$cleanUrl/api/v1';
    }
    _baseUrl = cleanUrl;
    await _storage.write(key: 'server_url', value: cleanUrl);
    _dio.options.baseUrl = cleanUrl;
  }

  // --- Auth APIs ---
  static Future<Map<String, dynamic>> loginWithEmail(
      String email, String password) async {
    final res = await _dio.post('/auth/mobile/login', data: {
      'email': email,
      'password': password,
    });
    final data = res.data['data'];
    await _storage.write(key: 'access_token', value: data['accessToken']);
    await _storage.write(key: 'user_email', value: email);
    return data;
  }

  static Future<Map<String, dynamic>> registerWithEmail(
    String email,
    String password, [
    String? fullName,
  ]) async {
    final res = await _dio.post('/auth/mobile/register', data: {
      'email': email,
      'password': password,
      'fullName': fullName,
    });
    final data = res.data['data'];
    await _storage.write(key: 'access_token', value: data['accessToken']);
    await _storage.write(key: 'user_email', value: email);
    return data;
  }

  static Future<Map<String, dynamic>> loginWithGoogle({
    String? idToken,
    String? email,
    String? displayName,
    String? photoUrl,
    String? googleId,
  }) async {
    final payload = <String, dynamic>{};
    if (idToken != null && idToken.isNotEmpty) payload['idToken'] = idToken;
    if (email != null && email.isNotEmpty) payload['email'] = email;
    if (displayName != null && displayName.isNotEmpty)
      payload['displayName'] = displayName;
    if (photoUrl != null && photoUrl.isNotEmpty) payload['photoUrl'] = photoUrl;
    if (googleId != null && googleId.isNotEmpty) payload['googleId'] = googleId;

    final res = await _dio.post('/auth/mobile/google', data: payload);
    final data = res.data['data'];
    await _storage.write(key: 'access_token', value: data['accessToken']);
    if (data['user']?['email'] != null) {
      await _storage.write(key: 'user_email', value: data['user']['email']);
    }
    return data;
  }

  static Future<void> logout() async {
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'device_id');
  }

  static Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: 'access_token');
    return token != null && token.isNotEmpty;
  }

  // --- Device Registration ---
  static Future<Map<String, dynamic>> registerDevice(
      Map<String, dynamic> deviceData) async {
    final res = await _dio.post('/devices/register', data: deviceData);
    final device = res.data['data']['device'];
    await _storage.write(key: 'device_id', value: device['_id']);
    return device;
  }

  static Future<String?> getSavedDeviceId() async {
    return await _storage.read(key: 'device_id');
  }

  // --- Batch Upload API ---
  static Future<Map<String, dynamic>> uploadSmsBatch({
    required String deviceId,
    String? requestId,
    String triggerSource = 'ADMIN_PULL',
    required List<Map<String, dynamic>> messages,
    String? error,
  }) async {
    final payload = <String, dynamic>{
      'deviceId': deviceId,
      'requestId': requestId,
      'triggerSource': triggerSource,
      'messages': messages,
    };
    if (error != null && error.isNotEmpty) {
      payload['error'] = error;
    }
    final res = await _dio.post('/sms/batch-upload', data: payload);
    return res.data['data'] ?? {};
  }
}
