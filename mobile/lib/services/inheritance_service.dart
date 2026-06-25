import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class InheritanceService {
  InheritanceService({http.Client? client, AuthService? authService})
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

  Uri _buildUri(String pathSegment) => Uri.parse('${AppConfig.baseUrl}/vault$pathSegment');

  Future<Map<String, dynamic>> fetchHeirs() async {
    final response = await _client.get(_buildUri('/heirs'), headers: await _headers());
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> addHeir({
    required String recipientName,
    required String phone,
    String? email,
    String? relationship,
    String accessTier = 'Personal',
  }) async {
    final response = await _client.post(
      _buildUri('/heirs'),
      headers: await _headers(),
      body: jsonEncode({
        'recipientName': recipientName,
        'phone': phone,
        'email': email,
        'relationship': relationship,
        'accessTier': accessTier,
      }),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> deleteHeir(String recipientID) async {
    final response = await _client.delete(
      _buildUri('/heirs/$recipientID'),
      headers: await _headers(),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> assignShard({
    required String shardID,
    required String recipientID,
  }) async {
    final response = await _client.post(
      _buildUri('/shards/$shardID/assign'),
      headers: await _headers(),
      body: jsonEncode({'recipientID': recipientID}),
    );
    return _handleResponse(response);
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return <String, dynamic>{};
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('فشل طلب الورثة: ${response.statusCode} ${response.body}');
  }
}
