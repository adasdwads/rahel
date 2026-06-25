import 'package:flutter/material.dart';

import '../services/wallet_service.dart';

class WalletProvider extends ChangeNotifier {
  WalletProvider({WalletService? walletService})
      : _walletService = walletService ?? WalletService();

  final WalletService _walletService;

  List<dynamic> _transactions = [];
  bool _isLoading = false;
  String? _error;

  List<dynamic> get transactions => _transactions;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadTransactions() async {
    _setLoading(true);
    try {
      final data = await _walletService.fetchTransactions();
      _transactions = data['transactions'] as List<dynamic>? ?? [];
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> fundWallet({
    required String flowID,
    required double amount,
    String paymentMethod = 'card',
  }) async {
    _setLoading(true);
    try {
      await _walletService.fundWallet(
        flowID: flowID,
        amount: amount,
        paymentMethod: paymentMethod,
      );
      await loadTransactions();
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _setLoading(false);
      rethrow;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }
}
