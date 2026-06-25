import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';
import 'auth_service.dart';

class SocialMediaService {
  SocialMediaService({http.Client? client, AuthService? authService})
      : _client = client ?? http.Client(),
        _authService = authService ?? AuthService();

  final http.Client _client;
  final AuthService _authService;

  Uri _buildUri(String path) => Uri.parse('${AppConfig.baseUrl}$path');

  Future<Map<String, String>> _headers() async {
    final session = await _authService.restoreSession();
    final token = session?['accessToken'] as String?;

    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>> connectPlatform(String platformName) async {
    final response = await _client.post(
      _buildUri('/social/connect'),
      headers: await _headers(),
      body: jsonEncode({'platformName': platformName}),
    );

    final data = _handleResponse(response) as Map<String, dynamic>;
    final authUrl = data['authUrl']?.toString();
    if (authUrl != null && authUrl.isNotEmpty) {
      await launchUrl(Uri.parse(authUrl), mode: LaunchMode.inAppBrowserView);
    }

    return data;
  }

  Future<void> disconnectPlatform(String platformName) async {
    final request = http.Request('DELETE', _buildUri('/social/disconnect'));
    request.headers.addAll(await _headers());
    request.body = jsonEncode({'platformName': platformName});
    final streamed = await _client.send(request);
    final response = await http.Response.fromStream(streamed);
    _handleResponse(response);
  }

  Future<List<Map<String, dynamic>>> getConnectedPlatforms() async {
    final response = await _client.get(
      _buildUri('/social/platforms'),
      headers: await _headers(),
    );

    final data = _handleResponse(response) as Map<String, dynamic>;
    final platforms = data['platforms'] as List<dynamic>? ?? [];
    return platforms.map((item) => Map<String, dynamic>.from(item as Map)).toList();
  }

  Future<Map<String, dynamic>> postObituary(String platformName, String text) async {
    final response = await _client.post(
      _buildUri('/social/post'),
      headers: await _headers(),
      body: jsonEncode({
        'platformName': platformName,
        'text': text,
      }),
    );

    return Map<String, dynamic>.from(_handleResponse(response) as Map);
  }

  Future<Map<String, dynamic>> getLegacyConfigs() async {
    final response = await _client.get(
      _buildUri('/social-legacy/configs'),
      headers: await _headers(),
    );

    final data = _handleResponse(response) as Map<String, dynamic>;
    return {
      'socialConfigs': (data['socialConfigs'] as List<dynamic>? ?? [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList(),
      'selfDestructItems': (data['selfDestructItems'] as List<dynamic>? ?? [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList(),
    };
  }

  Future<Map<String, dynamic>> saveLegacyPlatformConfig({
    required String platform,
    required String obituaryText,
    String? donationLink,
  }) async {
    final response = await _client.post(
      _buildUri('/social-legacy/platform'),
      headers: await _headers(),
      body: jsonEncode({
        'platform': platform,
        'obituaryText': obituaryText,
        'donationLink': donationLink,
      }),
    );

    return Map<String, dynamic>.from(_handleResponse(response) as Map);
  }

  Future<Map<String, dynamic>> addSelfDestructItem({
    required String targetType,
    required String description,
    required int priority,
  }) async {
    final response = await _client.post(
      _buildUri('/social-legacy/self-destruct/add'),
      headers: await _headers(),
      body: jsonEncode({
        'targetType': targetType,
        'description': description,
        'priority': priority,
      }),
    );

    return Map<String, dynamic>.from(_handleResponse(response) as Map);
  }

  Future<void> confirmSelfDestructItem(String itemId) async {
    final response = await _client.put(
      _buildUri('/social-legacy/self-destruct/$itemId/confirm'),
      headers: await _headers(),
    );
    _handleResponse(response);
  }

  Future<void> deleteSelfDestructItem(String itemId) async {
    final response = await _client.delete(
      _buildUri('/social-legacy/self-destruct/$itemId'),
      headers: await _headers(),
    );
    _handleResponse(response);
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