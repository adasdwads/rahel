import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class ApiService {
  final http.Client _client;
  final AuthService? _authService;

  ApiService({http.Client? client, AuthService? authService})
      : _client = client ?? http.Client(),
        _authService = authService;

  Uri _buildUri(String path) => Uri.parse('${AppConfig.baseUrl}$path');

  Future<dynamic> get(String path) async {
    final response = await _client.get(_buildUri(path), headers: await _headers());
    return _handleResponse(response);
  }

  Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final response = await _client.post(
      _buildUri(path),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  Future<dynamic> put(String path, Map<String, dynamic> body) async {
    final response = await _client.put(
      _buildUri(path),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    return _handleResponse(response);
  }

  Future<dynamic> delete(String path) async {
    final response = await _client.delete(_buildUri(path), headers: await _headers());
    return _handleResponse(response);
  }

  Future<Map<String, String>> _headers() async {
    final session = await (_authService ?? AuthService()).restoreSession();
    final token = session?['accessToken'] as String?;
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) {
        return null;
      }
      return jsonDecode(response.body);
    }

    throw Exception('API request failed: ${response.statusCode} ${response.body}');
  }
}