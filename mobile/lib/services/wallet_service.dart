import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'auth_service.dart';

class WalletService {
  WalletService({http.Client? client, AuthService? authService})
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

  Future<Map<String, dynamic>> fundWallet({
    required String flowID,
    required double amount,
    String paymentMethod = 'card',
  }) async {
    final response = await _client.post(
      _buildUri('/wallet/fund'),
      headers: await _headers(),
      body: jsonEncode({
        'flowID': flowID,
        'amount': amount,
        'paymentMethod': paymentMethod,
      }),
    );
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> fetchTransactions() async {
    final response = await _client.get(
      _buildUri('/wallet/transactions'),
      headers: await _headers(),
    );
    return _handleResponse(response);
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return <String, dynamic>{};
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('فشل طلب المحفظة: ${response.statusCode} ${response.body}');
  }
}
