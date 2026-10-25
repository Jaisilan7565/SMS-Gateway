import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static final FlutterSecureStorage _storage = const FlutterSecureStorage();
  static late Dio _dio;
  static String _baseUrl =
      'https://sms-transfer-backend.onrender.com/api/v1'; // Default Android Emulator to localhost

  static Completer<bool>? _refreshCompleter;

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
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, ErrorInterceptorHandler handler) async {
          final path = error.requestOptions.path;
          final isAuthEndpoint = path.contains('/auth/mobile/login') ||
              path.contains('/auth/mobile/register') ||
              path.contains('/auth/mobile/google') ||
              path.contains('/auth/refresh');

          // If request failed with 401 Unauthorized, automatically refresh session token
          if (error.response?.statusCode == 401 && !isAuthEndpoint) {
            final refreshed = await tryRefreshToken();
            if (refreshed) {
              final newToken = await _storage.read(key: 'access_token');
              final options = error.requestOptions;
              options.headers['Authorization'] = 'Bearer $newToken';
              try {
                final response = await _dio.fetch(options);
                return handler.resolve(response);
              } catch (retryError) {
                if (retryError is DioException) {
                  return handler.next(retryError);
                }
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  /// Refreshes the mobile JWT access token using the stored refresh token
  static Future<bool> tryRefreshToken() async {
    if (_refreshCompleter != null) {
      return await _refreshCompleter!.future;
    }

    _refreshCompleter = Completer<bool>();
    try {
      final refreshToken = await _storage.read(key: 'refresh_token');
      if (refreshToken == null || refreshToken.isEmpty) {
        _refreshCompleter?.complete(false);
        _refreshCompleter = null;
        return false;
      }

      final refreshDio = Dio(
        BaseOptions(
          baseUrl: _baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
          headers: {'Content-Type': 'application/json'},
        ),
      );

      final res = await refreshDio.post('/auth/refresh', data: {
        'refreshToken': refreshToken,
      });

      if (res.statusCode == 200 && res.data['data'] != null) {
        final data = res.data['data'];
        final newAccess = data['accessToken'] as String?;
        final newRefresh = data['refreshToken'] as String?;

        if (newAccess != null && newAccess.isNotEmpty) {
          await _storage.write(key: 'access_token', value: newAccess);
        }
        if (newRefresh != null && newRefresh.isNotEmpty) {
          await _storage.write(key: 'refresh_token', value: newRefresh);
        }

        _refreshCompleter?.complete(true);
        _refreshCompleter = null;
        return true;
      }

      _refreshCompleter?.complete(false);
      _refreshCompleter = null;
      return false;
    } catch (_) {
      _refreshCompleter?.complete(false);
      _refreshCompleter = null;
      return false;
    }
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
    if (data['refreshToken'] != null && (data['refreshToken'] as String).isNotEmpty) {
      await _storage.write(key: 'refresh_token', value: data['refreshToken']);
    }
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
    if (data['refreshToken'] != null && (data['refreshToken'] as String).isNotEmpty) {
      await _storage.write(key: 'refresh_token', value: data['refreshToken']);
    }
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
    if (displayName != null && displayName.isNotEmpty) {
      payload['displayName'] = displayName;
    }
    if (photoUrl != null && photoUrl.isNotEmpty) payload['photoUrl'] = photoUrl;
    if (googleId != null && googleId.isNotEmpty) payload['googleId'] = googleId;

    final res = await _dio.post('/auth/mobile/google', data: payload);
    final data = res.data['data'];
    await _storage.write(key: 'access_token', value: data['accessToken']);
    if (data['refreshToken'] != null && (data['refreshToken'] as String).isNotEmpty) {
      await _storage.write(key: 'refresh_token', value: data['refreshToken']);
    }
    if (data['user']?['email'] != null) {
      await _storage.write(key: 'user_email', value: data['user']['email']);
    }
    return data;
  }

  static Future<void> logout() async {
    final deviceId = await _storage.read(key: 'device_id');
    if (deviceId != null && deviceId.isNotEmpty) {
      try {
        await _dio.post('/devices/$deviceId/logout');
      } catch (_) {}
    }
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
    await _storage.delete(key: 'device_id');
    await _storage.delete(key: 'user_email');
  }

  static Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: 'access_token');
    return token != null && token.isNotEmpty;
  }

  // --- Device Registration & Telemetry ---
  static Future<Map<String, dynamic>> registerDevice(
      Map<String, dynamic> deviceData) async {
    final res = await _dio.post('/devices/register', data: deviceData);
    final device = res.data['data']['device'];
    await _storage.write(key: 'device_id', value: device['_id']);
    return device;
  }

  static Future<bool> sendHeartbeat({
    required String deviceId,
    int? batteryLevel,
    bool? isCharging,
    String? fcmToken,
  }) async {
    try {
      final res = await _dio.patch('/devices/$deviceId/heartbeat', data: {
        if (batteryLevel != null) 'batteryLevel': batteryLevel,
        if (isCharging != null) 'isCharging': isCharging,
        if (fcmToken != null && fcmToken.isNotEmpty) 'fcmToken': fcmToken,
      });
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
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
