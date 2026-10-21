import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:battery_plus/battery_plus.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/common/topographic_card.dart';
import '../../widgets/common/pill_button.dart';
import '../../widgets/common/status_badge.dart';
import '../../widgets/common/app_logo.dart';
import '../../services/api_client.dart';
import '../../services/sms_service.dart';
import '../../services/crypto_service.dart';
import '../../services/fcm_service.dart';
import '../auth/auth_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  String _deviceId = '';
  String _deviceName = 'Android Device';
  String _model = '';
  int _batteryLevel = 100;
  Map<String, dynamic> _simSlots = {};
  bool _syncing = false;
  String _currentSyncMode = '';
  double _syncProgress = 0.0;
  String _syncStage = '';
  String _fcmToken = '';
  bool _isOnline = true;
  String _statusText = 'Ready & listening for silent FCM requests';
  final List<String> _activityLogs = [];
  Timer? _heartbeatTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeDevice();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _heartbeatTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Whenever app is resumed from background or screen unlocked, immediately ping gateway
      _sendHeartbeat();
    }
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    // Heartbeat loop every 30 seconds ensures prompt offline-to-online transition
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
      await _sendHeartbeat();
    });
  }

  Future<void> _sendHeartbeat() async {
    if (_deviceId.isEmpty) return;
    try {
      final battery = Battery();
      final lvl = await battery.batteryLevel;
      final success = await ApiClient.sendHeartbeat(deviceId: _deviceId, batteryLevel: lvl);

      if (success) {
        if (!_isOnline) {
          if (mounted) {
            setState(() {
              _isOnline = true;
              _statusText = 'Connected to Gateway • Ready for silent sync';
            });
            _addLog('Network restored • Gateway Active');
          }
        }
        if (mounted && _batteryLevel != lvl) {
          setState(() => _batteryLevel = lvl);
        }
      } else {
        if (_isOnline && mounted) {
          setState(() {
            _isOnline = false;
            _statusText = 'Offline (Waiting for network connection...)';
          });
          _addLog('Network unavailable • Reconnecting...');
        }
      }
    } catch (_) {
      if (_isOnline && mounted) {
        setState(() {
          _isOnline = false;
          _statusText = 'Offline (Waiting for network connection...)';
        });
        _addLog('Network unavailable • Reconnecting...');
      }
    }
  }

  Future<void> _initializeDevice() async {
    // 1. Request SMS permissions
    await SMSService.requestPermissions();

    // 2. Fetch hardware telemetry
    final deviceInfo = DeviceInfoPlugin();
    String androidId = 'unknown';
    String modelName = 'Android';
    String manufacturer = 'OEM';

    if (Platform.isAndroid) {
      final androidInfo = await deviceInfo.androidInfo;
      androidId = androidInfo.id;
      modelName = androidInfo.model;
      manufacturer = androidInfo.manufacturer;
    }

    // Battery
    final battery = Battery();
    int batteryLvl = 100;
    try {
      batteryLvl = await battery.batteryLevel;
    } catch (_) {}

    // Dual SIM Carrier detection
    final simInfo = await SMSService.getSimSlots();

    // FCM token
    final fcmToken = await FCMService.getToken() ?? 'fcm_token_$androidId';

    // Register with backend
    try {
      final device = await ApiClient.registerDevice({
        'androidId': androidId,
        'deviceName': '$manufacturer $modelName',
        'manufacturer': manufacturer,
        'model': modelName,
        'osVersion': Platform.operatingSystemVersion,
        'fcmToken': fcmToken,
        'simSlots': simInfo,
        'batteryLevel': batteryLvl,
      });

      setState(() {
        _deviceId = device['_id'] ?? '';
        _deviceName = device['deviceName'] ?? '$manufacturer $modelName';
        _model = modelName;
        _batteryLevel = batteryLvl;
        _simSlots = simInfo;
        _fcmToken = fcmToken;
        _isOnline = true;
      });

      _addLog('Device registered & paired with Gateway');
      _startHeartbeat();
    } catch (e) {
      setState(() {
        _isOnline = false;
        _statusText = 'Connection pending (Will retry automatically)...';
      });
      _addLog('Connection note: ${e.toString()}');
      _startHeartbeat();
    }

    // Setup foreground FCM listener with granular progress reporting
    FCMService.initializeForegroundListener(
      onProgress: (status, progress) {
        setState(() {
          _statusText = status;
          _syncStage = status;
          _syncProgress = progress;
          _syncing = progress > 0.0 && progress < 1.0;
        });
      },
      onLog: (msg) {
        _addLog(msg);
      },
    );
  }

  void _addLog(String msg) {
    setState(() {
      _activityLogs.insert(0, '${DateTime.now().toLocal().toString().split('.').first}: $msg');
    });
  }

  Future<void> _manualSync(String mode) async {
    setState(() {
      _syncing = true;
      _currentSyncMode = mode;
      _syncProgress = 0.1;
      _syncStage = mode == 'TODAY'
          ? "Reading today's SMS messages..."
          : 'Reading all inbox SMS messages...';
      _statusText = mode == 'TODAY'
          ? "Querying today's messages from device..."
          : 'Querying all inbox messages...';
    });

    try {
      int? dateFrom;
      if (mode == 'TODAY') {
        final now = DateTime.now();
        final today = DateTime(now.year, now.month, now.day);
        dateFrom = today.millisecondsSinceEpoch;
      }

      // 1. Query native SMS ContentProvider
      final rawSms = await SMSService.queryInbox(
        limit: mode == 'TODAY' ? 500 : 1000,
        dateFrom: dateFrom,
      );

      if (rawSms.isEmpty) {
        setState(() {
          _syncProgress = 1.0;
          _syncStage = mode == 'TODAY'
              ? "No SMS messages found received today."
              : 'No SMS messages found in inbox.';
          _statusText = 'No messages matched query criteria.';
        });
        _addLog("Sync ${mode == 'TODAY' ? 'Today' : 'All'}: 0 messages found");
        return;
      }

      setState(() {
        _syncProgress = 0.25;
        _syncStage = 'Encrypting ${rawSms.length} messages with AES-256-GCM...';
        _statusText = 'Encrypting batch with AES-256-GCM...';
      });

      // 2. Encrypt batch with AES-256-GCM, updating progress iteratively
      final encryptedBatch = <Map<String, dynamic>>[];
      for (int i = 0; i < rawSms.length; i++) {
        final msg = rawSms[i];
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

        if (i % 15 == 0 || i == rawSms.length - 1) {
          final pct = 0.25 + (0.55 * (i + 1) / rawSms.length);
          setState(() {
            _syncProgress = pct;
            _syncStage = 'Encrypting ${i + 1}/${rawSms.length} messages...';
          });
        }
      }

      setState(() {
        _syncProgress = 0.85;
        _syncStage = 'Uploading ${encryptedBatch.length} encrypted records...';
        _statusText = 'Uploading ${encryptedBatch.length} messages to gateway...';
      });

      // 3. Upload encrypted batch to backend
      final res = await ApiClient.uploadSmsBatch(
        deviceId: _deviceId,
        triggerSource: 'USER_MANUAL_PUSH',
        messages: encryptedBatch,
      );

      final count = res['insertedCount'] ?? encryptedBatch.length;
      setState(() {
        _syncProgress = 1.0;
        _syncStage = 'Completed! $count new messages stored.';
        _statusText = 'Sync complete! $count new messages stored.';
        _isOnline = true;
      });
      _addLog("Sync ${mode == 'TODAY' ? 'Today' : 'All'}: Synced ${rawSms.length} messages ($count new)");
    } catch (e) {
      setState(() {
        _syncProgress = 0.0;
        _syncStage = 'Sync failed';
        _statusText = 'Sync failed: ${e.toString()}';
      });
      _addLog('Sync error: ${e.toString()}');
    } finally {
      await Future.delayed(const Duration(milliseconds: 1200));
      if (mounted) {
        setState(() {
          _syncing = false;
          _currentSyncMode = '';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leadingWidth: 52,
        leading: const Padding(
          padding: EdgeInsets.only(left: 14),
          child: Center(child: AppLogo(size: 32, showBadge: false)),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _deviceName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.ink),
            ),
            if (_model.isNotEmpty)
              Text(
                _model,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11, color: AppColors.muted),
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.muted),
            tooltip: 'Sign Out',
            onPressed: () async {
              _heartbeatTimer?.cancel();
              final navigator = Navigator.of(context);
              await ApiClient.logout();
              navigator.pushReplacement(
                MaterialPageRoute(builder: (_) => const AuthScreen()),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Hero Status Card
              TopographicCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        _isOnline
                            ? StatusBadge.good('GATEWAY ONLINE')
                            : StatusBadge.bad('OFFLINE / RECONNECTING'),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (_fcmToken.isNotEmpty && !_fcmToken.startsWith('mock_'))
                              const Padding(
                                padding: EdgeInsets.only(right: 8),
                                child: Text('⚡ FCM Active', style: TextStyle(color: AppColors.brand400, fontSize: 11, fontWeight: FontWeight.bold)),
                              ),
                            Text(
                              '$_batteryLevel% 🔋',
                              style: const TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text(
                      _isOnline ? 'Gateway Active' : 'Waiting for Network...',
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _statusText,
                      style: const TextStyle(fontSize: 13, color: Colors.white70),
                    ),

                    // Live Visual Progress Indicator
                    if (_syncing) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0x40000000),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    _syncStage.isNotEmpty ? _syncStage : 'Syncing SMS...',
                                    style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w600),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Text(
                                  '${(_syncProgress * 100).toInt()}%',
                                  style: const TextStyle(fontSize: 12, color: AppColors.brand400, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(999),
                              child: LinearProgressIndicator(
                                value: _syncProgress > 0 ? _syncProgress : null,
                                minHeight: 6,
                                backgroundColor: Colors.white24,
                                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.brand400),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // CLEAN 2 BUTTONS: Sync Today's SMS & Sync All Inbox Messages
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.panel,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.line),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x06000000),
                      blurRadius: 16,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Manual Push Actions',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.ink,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Push messages directly to web console without waiting for admin pull',
                      style: TextStyle(fontSize: 12, color: AppColors.muted),
                    ),
                    const SizedBox(height: 16),

                    // Button 1: Sync Today's SMS
                    PillButton(
                      onPressed: _syncing ? null : () => _manualSync('TODAY'),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (_syncing && _currentSyncMode == 'TODAY')
                            const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          else
                            const Icon(Icons.today_rounded, size: 20, color: Colors.white),
                          const SizedBox(width: 8),
                          const Text(
                            "Sync Today's SMS",
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Button 2: Sync All Inbox Messages
                    PillButton(
                      variant: PillButtonVariant.outline,
                      onPressed: _syncing ? null : () => _manualSync('ALL'),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (_syncing && _currentSyncMode == 'ALL')
                            const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.ink),
                            )
                          else
                            const Icon(Icons.all_inbox_rounded, size: 20, color: AppColors.ink),
                          const SizedBox(width: 8),
                          const Text(
                            'Sync All Inbox Messages',
                            style: TextStyle(
                              color: AppColors.ink,
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Dual SIM Cards Row
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.panel,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.line),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          StatusBadge.sim1('SIM 1'),
                          const SizedBox(height: 10),
                          Text(
                            _simSlots['sim1']?['carrier'] ?? 'Slot 1',
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.ink),
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Text('Primary Slot', style: TextStyle(fontSize: 11, color: AppColors.muted)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.panel,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.line),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          StatusBadge.sim2('SIM 2'),
                          const SizedBox(height: 10),
                          Text(
                            _simSlots['sim2']?['carrier'] ?? 'Slot 2',
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.ink),
                            overflow: TextOverflow.ellipsis,
                          ),
                          const Text('Secondary Slot', style: TextStyle(fontSize: 11, color: AppColors.muted)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Activity Log Container
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.panel,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.line),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Live Gateway Activity',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.ink),
                    ),
                    const SizedBox(height: 12),
                    if (_activityLogs.isEmpty)
                      const Text('No sync activity yet.', style: TextStyle(fontSize: 13, color: AppColors.muted))
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _activityLogs.length > 8 ? 8 : _activityLogs.length,
                        separatorBuilder: (_, __) => const Divider(color: AppColors.line, height: 16),
                        itemBuilder: (context, idx) {
                          return Text(
                            _activityLogs[idx],
                            style: const TextStyle(fontSize: 12, color: AppColors.ink2, fontFamily: 'monospace'),
                          );
                        },
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
