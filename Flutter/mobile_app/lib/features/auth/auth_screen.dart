import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/common/pill_button.dart';
import '../../widgets/common/app_logo.dart';
import '../../services/api_client.dart';
import '../home/home_screen.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _isLogin = true;
  bool _loading = false;
  String _errorMessage = '';

  final _emailController = TextEditingController(text: 'user@example.com');
  final _passwordController = TextEditingController(text: 'Password#2026');

  final GoogleSignIn _googleSignIn = GoogleSignIn(scopes: ['email', 'profile']);

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleAuth() async {
    setState(() {
      _loading = true;
      _errorMessage = '';
    });

    try {
      if (_isLogin) {
        await ApiClient.loginWithEmail(
          _emailController.text.trim(),
          _passwordController.text,
        );
      } else {
        await ApiClient.registerWithEmail(
          _emailController.text.trim(),
          _passwordController.text,
          'Mobile User',
        );
      }

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const HomeScreen()),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleGoogleSignIn() async {
    setState(() {
      _loading = true;
      _errorMessage = '';
    });

    try {
      final account = await _googleSignIn.signIn();
      if (account == null) {
        setState(() => _loading = false);
        return;
      }

      final auth = await account.authentication;
      await ApiClient.loginWithGoogle(
        idToken: auth.idToken,
        email: account.email,
        displayName: account.displayName,
        photoUrl: account.photoUrl,
        googleId: account.id,
      );

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const HomeScreen()),
        );
      }
    } catch (e) {
      final errStr = e.toString();
      if (errStr.contains('10') || errStr.contains('12500')) {
        setState(() {
          _errorMessage = 'Google OAuth API error (SHA-1 / google-services.json mismatch).\n'
              'Use "Instant 1-Click Quick Connect" below to connect immediately!';
        });
      } else {
        setState(() {
          _errorMessage = 'Google Sign-In: $errStr';
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _handleQuickDemoLogin() async {
    setState(() {
      _loading = true;
      _errorMessage = '';
    });

    try {
      try {
        await ApiClient.loginWithEmail('mobile_tester@sms.com', 'Pass#123456');
      } catch (_) {
        await ApiClient.registerWithEmail(
          'mobile_tester@sms.com',
          'Pass#123456',
          'Mobile Tester Phone',
        );
      }

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const HomeScreen()),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'One-Click Login: ${e.toString()}';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 420),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.panel,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: AppColors.line),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x0A000000),
                    blurRadius: 24,
                    offset: Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // App Brand Logo
                  const Center(
                    child: AppLogo(size: 64),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'SMS Gateway Mobile',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: AppColors.ink,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'AES-256-GCM Secure Android Telemetry',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: AppColors.muted),
                  ),
                  const SizedBox(height: 24),

                  // Mode Toggle
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _isLogin = true),
                          child: Container(
                            height: 38,
                            decoration: BoxDecoration(
                              color: _isLogin ? AppColors.brand800 : Colors.transparent,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Sign In',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: _isLogin ? Colors.white : AppColors.muted,
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _isLogin = false),
                          child: Container(
                            height: 38,
                            decoration: BoxDecoration(
                              color: !_isLogin ? AppColors.brand800 : Colors.transparent,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Register',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: !_isLogin ? Colors.white : AppColors.muted,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Email Input
                  TextField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(
                      labelText: 'Email Address',
                      prefixIcon: const Icon(Icons.email_outlined, size: 20),
                      filled: true,
                      fillColor: AppColors.card,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: AppColors.lineStrong),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Password Input
                  TextField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: 'Password',
                      prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                      filled: true,
                      fillColor: AppColors.card,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: AppColors.lineStrong),
                      ),
                    ),
                  ),

                  if (_errorMessage.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      _errorMessage,
                      style: const TextStyle(fontSize: 12, color: AppColors.danger, fontWeight: FontWeight.w500),
                    ),
                  ],

                  const SizedBox(height: 20),

                  // Primary Submit Button
                  PillButton(
                    onPressed: _loading ? null : _handleAuth,
                    child: _loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Text(
                            _isLogin ? 'Sign In & Connect Device' : 'Create Account',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                  ),
                  const SizedBox(height: 12),

                  // Google Sign-In Button
                  PillButton(
                    variant: PillButtonVariant.outline,
                    onPressed: _loading ? null : _handleGoogleSignIn,
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.g_mobiledata_rounded, size: 26, color: AppColors.ink),
                        SizedBox(width: 4),
                        Text(
                          'Sign in with Google',
                          style: TextStyle(color: AppColors.ink, fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Instant One-Click Login Button (Zero-Config Test)
                  PillButton(
                    variant: PillButtonVariant.light,
                    onPressed: _loading ? null : _handleQuickDemoLogin,
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.flash_on_rounded, size: 18, color: AppColors.brand900),
                        SizedBox(width: 6),
                        Text(
                          'Instant 1-Click Quick Connect',
                          style: TextStyle(color: AppColors.brand900, fontWeight: FontWeight.w700, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
