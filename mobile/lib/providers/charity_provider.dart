import 'package:flutter/material.dart';

import '../services/charity_service.dart';

class CharityProvider extends ChangeNotifier {
  CharityProvider({CharityService? charityService})
      : _charityService = charityService ?? CharityService();

  final CharityService _charityService;

  List<dynamic> _flows = [];
  List<dynamic> _endpoints = [];
  Map<String, dynamic>? _summary;
  bool _isLoading = false;
  String? _error;

  List<dynamic> get flows => _flows;
  List<dynamic> get endpoints => _endpoints;
  Map<String, dynamic>? get summary => _summary;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadFlows() async {
    _setLoading(true);
    try {
      final data = await _charityService.fetchFlows();
      _flows = data['flows'] as List<dynamic>? ?? [];
      _summary = data['summary'] as Map<String, dynamic>?;
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadEndpoints() async {
    _setLoading(true);
    try {
      final data = await _charityService.fetchCharityEndpoints();
      _endpoints = data['endpoints'] as List<dynamic>? ?? [];
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> createFlow({
    required String charityCode,
    required double recurringAmount,
    String frequency = 'monthly',
    double walletFundAmount = 0,
  }) async {
    _setLoading(true);
    try {
      await _charityService.createFlow(
        charityCode: charityCode,
        recurringAmount: recurringAmount,
        frequency: frequency,
        walletFundAmount: walletFundAmount,
      );
      await loadFlows();
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _setLoading(false);
      rethrow;
    }
  }

  Future<void> updateFlow({
    required String flowID,
    double? recurringAmount,
    String? frequency,
    bool? isActive,
  }) async {
    _setLoading(true);
    try {
      await _charityService.updateFlow(
        flowID: flowID,
        recurringAmount: recurringAmount,
        frequency: frequency,
        isActive: isActive,
      );
      await loadFlows();
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _setLoading(false);
      rethrow;
    }
  }

  Future<void> deleteFlow(String flowID) async {
    _setLoading(true);
    try {
      await _charityService.deleteFlow(flowID);
      await loadFlows();
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
