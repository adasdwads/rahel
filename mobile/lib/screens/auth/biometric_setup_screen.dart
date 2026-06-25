import 'dart:math';

import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';
import 'package:provider/provider.dart';

import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';

class BiometricSetupScreen extends StatefulWidget {
  const BiometricSetupScreen({super.key});

  @override
  State<BiometricSetupScreen> createState() => _BiometricSetupScreenState();
}

class _BiometricSetupScreenState extends State<BiometricSetupScreen> {
  final _emailController = TextEditingController();
  final _localAuth = LocalAuthentication();
  bool _isSubmitting = false;
  String? _message;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _setupBiometric() async {
    setState(() {
      _isSubmitting = true;
      _message = null;
    });

    try {
      final didAuthenticate = await _localAuth.authenticate(
        localizedReason: 'قم بتأكيد هويتك لتفعيل البصمة في Rahel',
        options: const AuthenticationOptions(biometricOnly: true, stickyAuth: true),
      );

      if (!didAuthenticate) {
        throw Exception('لم تكتمل المصادقة البيومترية');
      }

      final biometricToken = 'bio-${DateTime.now().millisecondsSinceEpoch}-${Random().nextInt(999999)}';
      await context.read<AuthProvider>().enrollBiometric(_emailController.text.trim(), biometricToken);

      setState(() {
        _message = 'تم تفعيل المصادقة البيومترية بنجاح';
      });
    } catch (error) {
      setState(() {
        _message = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      setState(() {
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('إعداد البصمة و Face ID')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.fingerprint_rounded, size: 88, color: AppTheme.accent),
            const SizedBox(height: 20),
            Text(
              'فعّل الدخول البيومتري للوصول السريع والآمن',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'البريد الإلكتروني المرتبط بالحساب',
                prefixIcon: Icon(Icons.email_outlined),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _isSubmitting ? null : _setupBiometric,
              icon: const Icon(Icons.face_retouching_natural),
              label: _isSubmitting ? const Text('جارٍ التفعيل...') : const Text('تفعيل Face ID / البصمة'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accent,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
            if (_message != null) ...[
              const SizedBox(height: 16),
              Text(
                _message!,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: _message!.contains('بنجاح') ? Colors.greenAccent : Colors.redAccent,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}