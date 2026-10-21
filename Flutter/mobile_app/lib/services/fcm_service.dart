import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'sms_service.dart';
import 'crypto_service.dart';
import 'api_client.dart';

/// Top-level background message handler for FCM
/// This runs in a separate isolate when the app is in the background or terminated!
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
    await ApiClient.initialize();
    await CryptoService.initialize();

    final data = message.data;
    if (data['action'] == 'PULL_SMS') {
      final requestId = data['requestId'];
      final limit = int.tryParse(data['limit'] ?? '100') ?? 100;
      final watermarkStr = data['watermark'];
      final watermark = watermarkStr != null && watermarkStr.isNotEmpty ? int.tryParse(watermarkStr) : null;
      final dateFromStr = data['dateFrom'];
      final dateFrom = dateFromStr != null && dateFromStr.isNotEmpty ? int.tryParse(dateFromStr) : null;
      final dateToStr = data['dateTo'];
      final dateTo = dateToStr != null && dateToStr.isNotEmpty ? int.tryParse(dateToStr) : null;

      final effectiveDateFrom = dateFrom ?? (watermark != null && watermark > 0 ? watermark : null);

      final deviceId = await ApiClient.getSavedDeviceId();
      if (deviceId == null) return;

      // Show system notification that sync has started
      await SMSService.showNotification(
        title: '⚡ SMS Gateway Sync',
        body: 'Admin console requested SMS synchronization. Ingesting messages...',
      );

      try {
        // 1. Ingest SMS from Android Telephony
        final rawMessages = await SMSService.queryInbox(
          limit: limit,
          dateFrom: effectiveDateFrom,
          dateTo: dateTo,
        );

        // 2. Encrypt each message with AES-256-GCM
        final encryptedBatch = <Map<String, dynamic>>[];
        for (final msg in rawMessages) {
          final bodyText = msg['body'] as String? ?? '';
          final encrypted = await CryptoService.encrypt(bodyText);

          encryptedBatch.add({
            'smsId': msg['smsId'],
            'sender': msg['sender'],
            'encryptedBody': encrypted['ciphertext'],
            'iv': encrypted['iv'],
            'authTag': encrypted['authTag'],
            'messageDate': msg['messageDate'],
            'simSlot': msg['simSlot'],
            'isRead': msg['isRead'],
          });
        }

        // 3. Upload encrypted batch to backend via single HTTPS POST
        await ApiClient.uploadSmsBatch(
          deviceId: deviceId,
          requestId: requestId,
          triggerSource: 'ADMIN_PULL',
          messages: encryptedBatch,
        );

        // Show completion system notification
        await SMSService.showNotification(
          title: '✓ SMS Sync Complete',
          body: 'Successfully synchronized ${rawMessages.length} messages with Gateway.',
        );
      } catch (e) {
        debugPrint('Error during background SMS pull: $e');
        // Report error to backend so request does not hang or show false success
        try {
          await ApiClient.uploadSmsBatch(
            deviceId: deviceId,
            requestId: requestId,
            triggerSource: 'ADMIN_PULL',
            messages: [],
            error: e.toString(),
          );
        } catch (_) {}

        await SMSService.showNotification(
          title: '❌ SMS Sync Error',
          body: 'Failed to complete SMS sync: ${e.toString()}',
        );
      }
    }
  } catch (err) {
    debugPrint('Background FCM handler caught: $err');
  }
}

class FCMService {
  static Future<String?> getToken() async {
    try {
      // 1. Request Android runtime notification permission
      await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      // 2. Obtain real FCM registration token
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) {
        return token;
      }
    } catch (e) {
      debugPrint('FCM getToken note: $e');
    }
    // Return mock fallback for local simulator/offline mode
    return 'mock_fcm_token_device_${DateTime.now().millisecondsSinceEpoch}';
  }

  static void initializeForegroundListener({
    required Function(String status, double progress) onProgress,
    required Function(String log) onLog,
  }) {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
      final data = message.data;
      if (data['action'] == 'PULL_SMS') {
        final requestId = data['requestId'];
        final limit = int.tryParse(data['limit'] ?? '100') ?? 100;
        final watermarkStr = data['watermark'];
        final watermark = watermarkStr != null && watermarkStr.isNotEmpty ? int.tryParse(watermarkStr) : null;
        final dateFromStr = data['dateFrom'];
        final dateFrom = dateFromStr != null && dateFromStr.isNotEmpty ? int.tryParse(dateFromStr) : null;
        final dateToStr = data['dateTo'];
        final dateTo = dateToStr != null && dateToStr.isNotEmpty ? int.tryParse(dateToStr) : null;

        final effectiveDateFrom = dateFrom ?? (watermark != null && watermark > 0 ? watermark : null);

        final deviceId = await ApiClient.getSavedDeviceId();
        if (deviceId == null) return;

        // Show system notification when pull starts
        await SMSService.showNotification(
          title: '⚡ SMS Gateway Sync',
          body: 'Admin console requested SMS synchronization. Ingesting messages...',
        );

        try {
          onLog('Received Admin Pull request #$requestId');
          onProgress('Reading SMS from phone inbox...', 0.15);

          final rawMessages = await SMSService.queryInbox(
            limit: limit,
            dateFrom: effectiveDateFrom,
            dateTo: dateTo,
          );

          onProgress('Found ${rawMessages.length} messages. Encrypting with AES-256-GCM...', 0.35);

          final encryptedBatch = <Map<String, dynamic>>[];
          for (int i = 0; i < rawMessages.length; i++) {
            final msg = rawMessages[i];
            final bodyText = msg['body'] as String? ?? '';
            final encrypted = await CryptoService.encrypt(bodyText);

            encryptedBatch.add({
              'smsId': msg['smsId'],
              'sender': msg['sender'],
              'encryptedBody': encrypted['ciphertext'],
              'iv': encrypted['iv'],
              'authTag': encrypted['authTag'],
              'messageDate': msg['messageDate'],
              'simSlot': msg['simSlot'],
              'isRead': msg['isRead'],
            });

            if (i % 25 == 0 || i == rawMessages.length - 1) {
              final pct = 0.35 + (0.45 * (i + 1) / (rawMessages.isEmpty ? 1 : rawMessages.length));
              onProgress('Encrypting message ${i + 1}/${rawMessages.length}...', pct);
            }
          }

          onProgress('Uploading ${encryptedBatch.length} encrypted records...', 0.85);

          final res = await ApiClient.uploadSmsBatch(
            deviceId: deviceId,
            requestId: requestId,
            triggerSource: 'ADMIN_PULL',
            messages: encryptedBatch,
          );

          final count = res['insertedCount'] ?? encryptedBatch.length;
          onProgress('Sync complete! $count new messages ingested.', 1.0);
          onLog('Admin Pull complete: ${rawMessages.length} messages sent ($count new)');

          // Update system notification upon completion
          await SMSService.showNotification(
            title: '✓ SMS Sync Complete',
            body: 'Synchronized ${rawMessages.length} messages ($count new ingested).',
          );
        } catch (e) {
          // Report error to backend with reason
          try {
            await ApiClient.uploadSmsBatch(
              deviceId: deviceId,
              requestId: requestId,
              triggerSource: 'ADMIN_PULL',
              messages: [],
              error: e.toString(),
            );
          } catch (_) {}

          onProgress('Pull error: $e', 0.0);
          onLog('Error processing pull: $e');

          await SMSService.showNotification(
            title: '❌ SMS Sync Error',
            body: 'Failed to process pull: ${e.toString()}',
          );
        }
      }
    });
  }
}
