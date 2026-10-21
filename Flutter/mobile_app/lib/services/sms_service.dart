import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';

class SMSService {
  static const MethodChannel _channel = MethodChannel('com.smstransfer.sms/telephony');

  /// Requests Android runtime SMS and Phone permissions
  static Future<bool> requestPermissions() async {
    final smsStatus = await Permission.sms.request();
    await Permission.phone.request();
    return smsStatus.isGranted;
  }

  /// Checks if SMS permission is granted
  static Future<bool> hasPermission() async {
    return await Permission.sms.isGranted;
  }

  /// Reads SMS messages from native Android Telephony ContentProvider
  /// Safe to call in both background isolates and foreground UI!
  static Future<List<Map<String, dynamic>>> queryInbox({
    int limit = 100,
    int? dateFrom,
    int? dateTo,
  }) async {
    final result = await _channel.invokeMethod<List<dynamic>>('getMessages', {
      'limit': limit,
      'dateFrom': dateFrom,
      'dateTo': dateTo,
    });

    if (result == null) return [];

    return result.map((item) => Map<String, dynamic>.from(item as Map)).toList();
  }

  /// Displays a local Android system notification via MethodChannel
  static Future<void> showNotification({required String title, required String body}) async {
    try {
      await _channel.invokeMethod('showNotification', {
        'title': title,
        'body': body,
      });
    } catch (_) {}
  }

  /// Detects active SIM cards and carrier display names
  static Future<Map<String, dynamic>> getSimSlots() async {
    try {
      final result = await _channel.invokeMethod<Map<dynamic, dynamic>>('getSimSlots');
      if (result == null) return {};
      return Map<String, dynamic>.from(result);
    } catch (_) {
      return {
        'sim1': {'carrier': 'Not detected', 'slotIndex': 0},
        'sim2': {'carrier': 'Not detected', 'slotIndex': 1},
      };
    }
  }

  static void Function(Map<String, dynamic> sms)? _incomingSmsListener;

  /// Initializes real-time incoming SMS stream from native Android
  /// Listens on MethodChannel callback 'onIncomingSms' and processes any pending messages
  static Future<void> initializeIncomingSmsListener(void Function(Map<String, dynamic> sms) onSms) async {
    _incomingSmsListener = onSms;

    _channel.setMethodCallHandler((call) async {
      if (call.method == 'onIncomingSms') {
        try {
          if (call.arguments is Map) {
            final data = Map<String, dynamic>.from(call.arguments as Map);
            _incomingSmsListener?.call(data);
          }
        } catch (_) {}
      }
    });

    // Check and dispatch any SMS that arrived while the engine was booting
    try {
      final pendingList = await getPendingIncomingSms();
      for (final sms in pendingList) {
        _incomingSmsListener?.call(sms);
      }
    } catch (_) {}
  }

  /// Retrieves and clears any incoming SMS queued in native Android SharedPreferences
  static Future<List<Map<String, dynamic>>> getPendingIncomingSms() async {
    try {
      final result = await _channel.invokeMethod<List<dynamic>>('getPendingIncomingSms');
      if (result == null) return [];
      return result.map((item) => Map<String, dynamic>.from(item as Map)).toList();
    } catch (_) {
      return [];
    }
  }
}
