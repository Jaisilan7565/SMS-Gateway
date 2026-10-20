import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'core/theme/app_colors.dart';
import 'services/api_client.dart';
import 'services/crypto_service.dart';
import 'services/fcm_service.dart';
import 'features/auth/auth_screen.dart';
import 'features/home/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase (safely catches if google-services.json isn't present in local dev)
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  } catch (e) {
    debugPrint('Firebase init note (local dev): $e');
  }

  // Initialize Services
  await ApiClient.initialize();
  await CryptoService.initialize();

  final loggedIn = await ApiClient.isLoggedIn();

  runApp(SMSGatewayApp(initialLoggedIn: loggedIn));
}

class SMSGatewayApp extends StatelessWidget {
  final bool initialLoggedIn;

  const SMSGatewayApp({super.key, required this.initialLoggedIn});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SMS Gateway',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: AppColors.canvas,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.brand800,
          surface: AppColors.card,
        ),
        fontFamily: 'Roboto',
      ),
      home: initialLoggedIn ? const HomeScreen() : const AuthScreen(),
    );
  }
}
