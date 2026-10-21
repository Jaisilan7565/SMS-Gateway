import 'package:flutter/material.dart';
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

  final _emailController = TextEditingController(text: '');
  final _passwordController = TextEditingController(text: '');

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleAuth() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter both email and password';
      });
      return;
    }

    setState(() {
      _loading = true;
      _errorMessage = '';
    });

    try {
      if (_isLogin) {
        await ApiClient.loginWithEmail(email, password);
      } else {
        await ApiClient.registerWithEmail(email, password, 'Mobile User');
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 400),
              padding: const EdgeInsets.all(28),
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
                  const SizedBox(height: 18),
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
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: AppColors.line),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() {
                              _isLogin = true;
                              _errorMessage = '';
                            }),
                            child: Container(
                              height: 38,
                              decoration: BoxDecoration(
                                color: _isLogin
                                    ? AppColors.brand800
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                'Sign In',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color:
                                      _isLogin ? Colors.white : AppColors.muted,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() {
                              _isLogin = false;
                              _errorMessage = '';
                            }),
                            child: Container(
                              height: 38,
                              decoration: BoxDecoration(
                                color: !_isLogin
                                    ? AppColors.brand800
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                'Register',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color:
                                      !_isLogin ? Colors.white : AppColors.muted,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
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
                        borderSide:
                            const BorderSide(color: AppColors.lineStrong),
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
                      prefixIcon:
                          const Icon(Icons.lock_outline_rounded, size: 20),
                      filled: true,
                      fillColor: AppColors.card,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide:
                            const BorderSide(color: AppColors.lineStrong),
                      ),
                    ),
                  ),

                  if (_errorMessage.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      _errorMessage,
                      style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.danger,
                          fontWeight: FontWeight.w500),
                    ),
                  ],

                  const SizedBox(height: 24),

                  // Primary Submit Button
                  PillButton(
                    onPressed: _loading ? null : _handleAuth,
                    child: _loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : Text(
                            _isLogin
                                ? 'Sign In & Connect Device'
                                : 'Create Account',
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 14),
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
