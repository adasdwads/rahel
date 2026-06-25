import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class CharityService {
  CharityService({http.Client? client, AuthService? authService})
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

  Uri _buildUri(String pathSegment) => Uri.parse('${AppConfig.baseUrl}/charity$pathSegment');

  Future<Map<String, dynamic>> fetchFlows() async {
    final response = await _client.get(_buildUri('/flows'), headers: await _headers());
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> createFlow({
    required String charityCode,
    required double recurringAmount,
    String frequency = 'monthly',
    double walletFundAmount = 0,
  }) async {
    final response = await _client.post(
      _buildUri('/flows'),
      headers: await _headers(),
      body: jsonEncode({
        'charityCode': charityCode,
        'recurringAmount': recurringAmount,
        'frequency': frequency,
        'walletFundAmount': walletFundAmount,
      }),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> updateFlow({
    required String flowID,
    double? recurringAmount,
    String? frequency,
    bool? isActive,
  }) async {
    final response = await _client.put(
      _buildUri('/flows/$flowID'),
      headers: await _headers(),
      body: jsonEncode({
        if (recurringAmount != null) 'recurringAmount': recurringAmount,
        if (frequency != null) 'frequency': frequency,
        if (isActive != null) 'isActive': isActive,
      }),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> deleteFlow(String flowID) async {
    final response = await _client.delete(
      _buildUri('/flows/$flowID'),
      headers: await _headers(),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> fetchCharityEndpoints() async {
    final response = await _client.get(
      _buildUri('/endpoints'),
      headers: await _headers(),
    );
    return _handleResponse(response);
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return <String, dynamic>{};
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('فشل طلب الصدقات: ${response.statusCode} ${response.body}');
  }
}
