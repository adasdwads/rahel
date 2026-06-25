import 'package:flutter/material.dart';

import '../services/capsule_service.dart';

class CapsuleProvider extends ChangeNotifier {
  CapsuleProvider({CapsuleService? capsuleService})
      : _capsuleService = capsuleService ?? CapsuleService();

  final CapsuleService _capsuleService;

  List<dynamic> _capsules = [];
  List<dynamic> _timeline = [];
  Map<String, dynamic>? _summary;
  bool _isLoading = false;
  String? _error;

  List<dynamic> get capsules => _capsules;
  List<dynamic> get timeline => _timeline;
  Map<String, dynamic>? get summary => _summary;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadCapsules() async {
    _setLoading(true);
    try {
      final data = await _capsuleService.fetchCapsules();
      _capsules = data['capsules'] as List<dynamic>? ?? [];
      _summary = data['summary'] as Map<String, dynamic>?;
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadTimeline() async {
    _setLoading(true);
    try {
      final data = await _capsuleService.fetchTimeline();
      _timeline = data['timeline'] as List<dynamic>? ?? [];
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> createCapsule({
    required String title,
    String contentType = 'text',
    String? textContent,
    required DateTime targetReleaseDate,
    required String recipientContact,
    String? recipientName,
    String? occasion,
  }) async {
    _setLoading(true);
    try {
      await _capsuleService.createCapsule(
        title: title,
        contentType: contentType,
        textContent: textContent,
        targetReleaseDate: targetReleaseDate,
        recipientContact: recipientContact,
        recipientName: recipientName,
        occasion: occasion,
      );
      await loadCapsules();
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _setLoading(false);
      rethrow;
    }
  }

  Future<void> updateCapsule({
    required String capsuleID,
    String? title,
    String? textContent,
    DateTime? targetReleaseDate,
    String? recipientContact,
    String? recipientName,
    String? occasion,
  }) async {
    _setLoading(true);
    try {
      await _capsuleService.updateCapsule(
        capsuleID: capsuleID,
        title: title,
        textContent: textContent,
        targetReleaseDate: targetReleaseDate,
        recipientContact: recipientContact,
        recipientName: recipientName,
        occasion: occasion,
      );
      await loadCapsules();
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _setLoading(false);
      rethrow;
    }
  }

  Future<void> deleteCapsule(String capsuleID) async {
    _setLoading(true);
    try {
      await _capsuleService.deleteCapsule(capsuleID);
      await loadCapsules();
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
