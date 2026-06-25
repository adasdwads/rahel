import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class CapsuleService {
  CapsuleService({http.Client? client, AuthService? authService})
      : _client = client ?? http.Client(),
        _authService = authService ?? AuthService();

  final http.Client _client;
  final AuthService _authService;

  Future<Map<String, String>> _headers() async {
    final session = await _authService.restoreSession();
    final token = session?['accessToken'] as String?;
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Uri _buildUri(String pathSegment) => Uri.parse('${AppConfig.baseUrl}/time-capsule$pathSegment');

  Future<Map<String, dynamic>> fetchCapsules() async {
    final response = await _client.get(_buildUri('/list'), headers: await _headers());
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> createCapsule({
    required String title,
    String contentType = 'text',
    String? textContent,
    required DateTime targetReleaseDate,
    required String recipientContact,
    String? recipientName,
    String? occasion,
  }) async {
    final response = await _client.post(
      _buildUri('/create'),
      headers: await _headers(),
      body: jsonEncode({
        'title': title,
        'contentType': contentType,
        'textContent': textContent,
        'targetReleaseDate': targetReleaseDate.toUtc().toIso8601String(),
        'recipientContact': recipientContact,
        'recipientName': recipientName,
        'occasion': occasion,
      }),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> updateCapsule({
    required String capsuleID,
    String? title,
    String? textContent,
    DateTime? targetReleaseDate,
    String? recipientContact,
    String? recipientName,
    String? occasion,
  }) async {
    final response = await _client.put(
      _buildUri('/$capsuleID'),
      headers: await _headers(),
      body: jsonEncode({
        if (title != null) 'title': title,
        if (textContent != null) 'textContent': textContent,
        if (targetReleaseDate != null)
          'targetReleaseDate': targetReleaseDate.toUtc().toIso8601String(),
        if (recipientContact != null) 'recipientContact': recipientContact,
        if (recipientName != null) 'recipientName': recipientName,
        if (occasion != null) 'occasion': occasion,
      }),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> deleteCapsule(String capsuleID) async {
    final response = await _client.delete(
      _buildUri('/$capsuleID'),
      headers: await _headers(),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> fetchTimeline() async {
    final response = await _client.get(
      _buildUri('/timeline'),
      headers: await _headers(),
    );
    return _handleResponse(response);
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return <String, dynamic>{};
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('فشل طلب الكبسولة: ${response.statusCode} ${response.body}');
  }
}
