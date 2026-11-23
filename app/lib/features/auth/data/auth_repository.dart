import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/network/api_client.dart';

class AuthRepository {
  const AuthRepository({
    required ApiClient apiClient,
    required FlutterSecureStorage storage,
  })  : _api = apiClient,
        _storage = storage;

  final ApiClient _api;
  final FlutterSecureStorage _storage;

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final data = await _api.postData(
      'user/login/',
      data: {'email': email, 'password': password},
    );
    final payload = _toMap(data);
    final token = data is String ? data : _readToken(payload);
    if (token == null || token.isEmpty) {
      throw const FormatException(
        'Đăng nhập thành công nhưng máy chủ không trả về access token.',
      );
    }

    await _storage.write(key: ApiClient.accessTokenKey, value: token);
    return payload;
  }

  Future<Map<String, dynamic>> currentUser() async {
    final data = await _api.getData('user/');
    final userData = _toMap(data);
    final nestedUser = _toMap(userData['user']);
    if (nestedUser.isNotEmpty) return nestedUser;
    if (userData.isNotEmpty) return userData;
    throw const FormatException('Thông tin người dùng trả về không hợp lệ.');
  }

  Future<String?> readToken() => _storage.read(key: ApiClient.accessTokenKey);

  Future<void> logout() => _storage.delete(key: ApiClient.accessTokenKey);

  String? _readToken(Map<String, dynamic> data) {
    final rawNested = data['tokens'] ?? data['token'];
    final nested = _toMap(rawNested);
    final candidate = data['accessToken'] ??
        data['access_token'] ??
        data['access'] ??
        nested['accessToken'] ??
        nested['access_token'] ??
        nested['access'] ??
        (data['token'] is String ? data['token'] : null);
    return candidate?.toString();
  }

  Map<String, dynamic> _toMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return const {};
  }
}
