import 'package:flutter/material.dart';

import '../services/heartbeat_service.dart';

class HeartbeatProvider extends ChangeNotifier {
  HeartbeatProvider({HeartbeatService? heartbeatService})
      : _heartbeatService = heartbeatService ?? HeartbeatService();

  final HeartbeatService _heartbeatService;

  Map<String, dynamic>? _status;
  bool _isLoading = false;
  String? _error;
  String? _lastAcknowledged;

  Map<String, dynamic>? get status => _status;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get lastAcknowledged => _lastAcknowledged;

  bool get isOverdue {
    if (_status == null) return false;
    return _status!['isOverdue'] == true;
  }

  int? get daysUntilTrigger => _status?['daysUntilTrigger'] as int?;

  Future<void> loadStatus() async {
    _setLoading(true);
    try {
      _status = await _heartbeatService.fetchStatus();
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> acknowledge() async {
    _setLoading(true);
    try {
      final result = await _heartbeatService.acknowledge();
      _lastAcknowledged = result['lastHeartbeat'] as String?;
      await loadStatus();
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
