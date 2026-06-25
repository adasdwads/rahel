import 'package:flutter/material.dart';

import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  AuthProvider({AuthService? authService}) : _authService = authService ?? AuthService();

  final AuthService _authService;

  bool _isLoading = false;
  bool _isAuthenticated = false;
  String? _errorMessage;
  Map<String, dynamic>? _user;

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  String? get errorMessage => _errorMessage;
  Map<String, dynamic>? get user => _user;

  Future<void> restoreSession() async {
    _isLoading = true;
    notifyListeners();

    final session = await _authService.restoreSession();
    _user = session?['user'] as Map<String, dynamic>?;
    _isAuthenticated = session != null;
    _isLoading = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    return _runAuthAction(() async {
      final response = await _authService.login(email: email, password: password);
      _user = Map<String, dynamic>.from(response['user']);
    });
  }

  Future<bool> register(String name, String email, String phone, String password) async {
    return _runAuthAction(() async {
      final response = await _authService.register(
        name: name,
        email: email,
        phone: phone,
        password: password,
      );
      _user = Map<String, dynamic>.from(response['user']);
    });
  }

  Future<bool> biometricLogin() async {
    return _runAuthAction(() async {
      final response = await _authService.biometricAuth();
      _user = Map<String, dynamic>.from(response['user']);
    });
  }

  Future<bool> uaePassLogin() async {
    return _runAuthAction(() async {
      final response = await _authService.uaePassAuth();
      _user = Map<String, dynamic>.from(response['user']);
    });
  }

  Future<void> enrollBiometric(String email, String biometricToken) async {
    await _authService.enrollBiometric(email: email, biometricToken: biometricToken);
  }

  Future<void> logout() async {
    await _authService.logout();
    _isAuthenticated = false;
    _user = null;
    notifyListeners();
  }

  Future<bool> _runAuthAction(Future<void> Function() action) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await action();
      _isAuthenticated = true;
      return true;
    } catch (error) {
      _errorMessage = error.toString().replaceFirst('Exception: ', '');
      _isAuthenticated = false;
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}