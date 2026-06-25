import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class HeartbeatService {
  HeartbeatService({http.Client? client, AuthService? authService})
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

  Uri _buildUri(String pathSegment) => Uri.parse('${AppConfig.baseUrl}/auth$pathSegment');

  Future<Map<String, dynamic>> fetchStatus() async {
    final response = await _client.get(_buildUri('/me'), headers: await _headers());
    final data = _handleResponse(response) as Map<String, dynamic>;
    return data;
  }

  Future<Map<String, dynamic>> acknowledge() async {
    final response = await _client.post(
      _buildUri('/heartbeat'),
      headers: await _headers(),
    );
    return _handleResponse(response);
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return <String, dynamic>{};
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('فشل طلب النبض: ${response.statusCode} ${response.body}');
  }
}
