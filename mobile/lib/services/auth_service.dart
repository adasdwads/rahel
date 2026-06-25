import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';

import 'api_service.dart';

class AuthService {
  AuthService({
    ApiService? apiService,
    FlutterSecureStorage? secureStorage,
    LocalAuthentication? localAuthentication,
  })  : _apiService = apiService ?? ApiService(),
        _secureStorage = secureStorage ?? const FlutterSecureStorage(),
        _localAuthentication = localAuthentication ?? LocalAuthentication();

  final ApiService _apiService;
  final FlutterSecureStorage _secureStorage;
  final LocalAuthentication _localAuthentication;

  static const _accessTokenKey = 'rahel_access_token';
  static const _refreshTokenKey = 'rahel_refresh_token';
  static const _userKey = 'rahel_user';
  static const _biometricEmailKey = 'rahel_biometric_email';
  static const _biometricTokenKey = 'rahel_biometric_token';

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiService.post('/auth/login', {
      'email': email,
      'password': password,
    });
    await _persistAuth(response);
    return Map<String, dynamic>.from(response);
  }

  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String phone,
    required String password,
  }) async {
    final response = await _apiService.post('/auth/register', {
      'name': name,
      'email': email,
      'phone': phone,
      'password': password,
    });
    await _persistAuth(response);
    return Map<String, dynamic>.from(response);
  }

  Future<Map<String, dynamic>> biometricAuth() async {
    final canCheck = await _localAuthentication.canCheckBiometrics;
    final isSupported = await _localAuthentication.isDeviceSupported();
    if (!canCheck || !isSupported) {
      throw Exception('المصادقة البيومترية غير متاحة على هذا الجهاز');
    }

    final didAuthenticate = await _localAuthentication.authenticate(
      localizedReason: 'استخدم البصمة أو Face ID للدخول إلى RAHEL',
      options: const AuthenticationOptions(biometricOnly: true, stickyAuth: true),
    );

    if (!didAuthenticate) {
      throw Exception('تم إلغاء المصادقة البيومترية');
    }

    final email = await _secureStorage.read(key: _biometricEmailKey);
    final biometricToken = await _secureStorage.read(key: _biometricTokenKey);
    if (email == null || biometricToken == null) {
      throw Exception('لم يتم إعداد المصادقة البيومترية بعد');
    }

    final response = await _apiService.post('/auth/biometric-verify', {
      'email': email,
      'biometricToken': biometricToken,
    });
    await _persistAuth(response);
    return Map<String, dynamic>.from(response);
  }

  Future<void> enrollBiometric({
    required String email,
    required String biometricToken,
  }) async {
    await _secureStorage.write(key: _biometricEmailKey, value: email);
    await _secureStorage.write(key: _biometricTokenKey, value: biometricToken);
  }

  Future<Map<String, dynamic>> uaePassAuth() async {
    final authorize = await _apiService.post('/auth/uae-pass/authorize', {
      'redirectUri': 'rahel://uae-pass/callback',
      'state': 'mobile-rahel-state',
    });

    final callback = await _apiService.post('/auth/uae-pass/callback', {
      'code': authorize['authorizationCode'],
      'redirectUri': authorize['redirectUri'],
    });

    await _persistAuth(callback);
    return Map<String, dynamic>.from(callback);
  }

  Future<Map<String, dynamic>?> restoreSession() async {
    final accessToken = await _secureStorage.read(key: _accessTokenKey);
    final refreshToken = await _secureStorage.read(key: _refreshTokenKey);
    final userJson = await _secureStorage.read(key: _userKey);

    if (accessToken == null || refreshToken == null || userJson == null) {
      return null;
    }

    return {
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'user': jsonDecode(userJson),
    };
  }

  Future<void> logout() async {
    await _secureStorage.delete(key: _accessTokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
    await _secureStorage.delete(key: _userKey);
  }

  Future<void> _persistAuth(Map<String, dynamic> response) async {
    await _secureStorage.write(key: _accessTokenKey, value: response['accessToken'] as String?);
    await _secureStorage.write(key: _refreshTokenKey, value: response['refreshToken'] as String?);
    await _secureStorage.write(key: _userKey, value: jsonEncode(response['user']));
  }
}