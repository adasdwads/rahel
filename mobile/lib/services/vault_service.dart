import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:path/path.dart' as path;

import '../config/app_config.dart';
import 'auth_service.dart';

class VaultService {
  VaultService({http.Client? client, AuthService? authService})
      : _client = client ?? http.Client(),
        _authService = authService ?? AuthService();

  final http.Client _client;
  final AuthService _authService;

  Future<Map<String, String>> _headers() async {
    final session = await _authService.restoreSession();
    final token = session?['accessToken'] as String?;
    return {
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Uri _buildUri(String pathSegment) => Uri.parse('${AppConfig.baseUrl}/vault$pathSegment');

  Future<Map<String, dynamic>> fetchFiles() async {
    final response = await _client.get(_buildUri('/files'), headers: await _headers());
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> fetchFileDetails(String fileID) async {
    final response = await _client.get(_buildUri('/files/$fileID'), headers: await _headers());
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> uploadFile({
    required File file,
    String accessTier = 'Personal',
    String description = '',
  }) async {
    final request = http.MultipartRequest('POST', _buildUri('/upload'))
      ..headers.addAll(await _headers())
      ..fields['accessTier'] = accessTier
      ..fields['description'] = description
      ..files.add(await http.MultipartFile.fromPath(
        'file',
        file.path,
        filename: path.basename(file.path),
        contentType: _mediaTypeFromPath(file.path),
      ));

    final streamedResponse = await _client.send(request);
    final response = await http.Response.fromStream(streamedResponse);
    return _handleResponse(response);
  }

  Future<Uint8List> decryptFile(String fileID) async {
    final response = await _client.post(
      _buildUri('/files/$fileID/decrypt'),
      headers: await _headers(),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return response.bodyBytes;
    }
    throw Exception('فشل فك تشفير الملف: ${response.statusCode} ${response.body}');
  }

  Future<Map<String, dynamic>> deleteFile(String fileID) async {
    final response = await _client.delete(_buildUri('/files/$fileID'), headers: await _headers());
    return _handleResponse(response);
  }

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
      headers: {
        ...(await _headers()),
        'Content-Type': 'application/json',
      },
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
      headers: {
        ...(await _headers()),
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'recipientID': recipientID}),
    );
    return _handleResponse(response);
  }

  MediaType _mediaTypeFromPath(String filePath) {
    final ext = path.extension(filePath).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return MediaType('image', 'jpeg');
      case '.png':
        return MediaType('image', 'png');
      case '.webp':
        return MediaType('image', 'webp');
      case '.pdf':
        return MediaType('application', 'pdf');
      case '.mp4':
        return MediaType('video', 'mp4');
      case '.mp3':
        return MediaType('audio', 'mpeg');
      case '.txt':
        return MediaType('text', 'plain');
      case '.json':
        return MediaType('application', 'json');
      default:
        return MediaType('application', 'octet-stream');
    }
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return <String, dynamic>{};
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('فشل طلب الخزنة: ${response.statusCode} ${response.body}');
  }
}
