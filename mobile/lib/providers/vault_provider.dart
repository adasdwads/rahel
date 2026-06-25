import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../services/vault_service.dart';

class VaultProvider extends ChangeNotifier {
  VaultProvider({VaultService? vaultService})
      : _vaultService = vaultService ?? VaultService();

  final VaultService _vaultService;

  List<dynamic> _files = [];
  List<dynamic> _heirs = [];
  bool _isLoading = false;
  String? _error;
  Map<String, dynamic>? _lastUpload;

  List<dynamic> get files => _files;
  List<dynamic> get heirs => _heirs;
  bool get isLoading => _isLoading;
  String? get error => _error;
  Map<String, dynamic>? get lastUpload => _lastUpload;

  Future<void> loadFiles() async {
    _setLoading(true);
    try {
      final data = await _vaultService.fetchFiles();
      _files = data['files'] as List<dynamic>? ?? [];
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadHeirs() async {
    _setLoading(true);
    try {
      final data = await _vaultService.fetchHeirs();
      _heirs = data['heirs'] as List<dynamic>? ?? [];
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> uploadFile({
    required File file,
    String accessTier = 'Personal',
    String description = '',
  }) async {
    _setLoading(true);
    try {
      _lastUpload = await _vaultService.uploadFile(
        file: file,
        accessTier: accessTier,
        description: description,
      );
      await loadFiles();
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _setLoading(false);
      rethrow;
    }
  }

  Future<void> deleteFile(String fileID) async {
    _setLoading(true);
    try {
      await _vaultService.deleteFile(fileID);
      await loadFiles();
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _setLoading(false);
      rethrow;
    }
  }

  Future<void> addHeir({
    required String recipientName,
    required String phone,
    String? email,
    String? relationship,
    String accessTier = 'Personal',
  }) async {
    _setLoading(true);
    try {
      await _vaultService.addHeir(
        recipientName: recipientName,
        phone: phone,
        email: email,
        relationship: relationship,
        accessTier: accessTier,
      );
      await loadHeirs();
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _setLoading(false);
      rethrow;
    }
  }

  Future<void> deleteHeir(String recipientID) async {
    _setLoading(true);
    try {
      await _vaultService.deleteHeir(recipientID);
      await loadHeirs();
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _setLoading(false);
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchFileDetails(String fileID) async {
    _setLoading(true);
    try {
      final details = await _vaultService.fetchFileDetails(fileID);
      _error = null;
      return details;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  Future<Uint8List> decryptFile(String fileID) async {
    _setLoading(true);
    try {
      final bytes = await _vaultService.decryptFile(fileID);
      _error = null;
      return bytes;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> assignShard({
    required String shardID,
    required String recipientID,
  }) async {
    _setLoading(true);
    try {
      await _vaultService.assignShard(shardID: shardID, recipientID: recipientID);
      await loadFiles();
      _error = null;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _setLoading(false);
      rethrow;
    } finally {
      _setLoading(false);
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
