import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../errors/api_exception.dart';

class ApiEnvelope {
  const ApiEnvelope({
    required this.code,
    required this.message,
    required this.data,
  });

  final String code;
  final String message;
  final dynamic data;

  factory ApiEnvelope.fromJson(Map<String, dynamic> json) {
    final rawCode = json['code'];
    if (rawCode == null) {
      throw const ApiException(message: 'Phản hồi máy chủ thiếu mã kết quả.');
    }

    return ApiEnvelope(
      code: rawCode.toString(),
      message: json['message']?.toString() ?? '',
      data: json['data'],
    );
  }
}

class ApiClient {
  ApiClient({
    required String baseUrl,
    required FlutterSecureStorage storage,
  })  : _storage = storage,
        _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl.endsWith('/') ? baseUrl : '$baseUrl/',
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 20),
            sendTimeout: const Duration(seconds: 15),
            headers: const {'Accept': 'application/json'},
          ),
        ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          try {
            if (!options.path.endsWith('user/login/')) {
              final token = await _storage.read(key: accessTokenKey);
              if (token != null && token.isNotEmpty) {
                options.headers['Authorization'] = 'Bearer $token';
              }
            }
          } catch (error) {
            handler.reject(
              DioException(
                requestOptions: options,
                error: error,
                message: 'Không thể đọc phiên đăng nhập an toàn.',
              ),
            );
            return;
          }
          handler.next(options);
        },
        onError: (error, handler) {
          handler.reject(_toDioException(error));
        },
      ),
    );
  }

  static const accessTokenKey = 'smart_grocery_access_token';

  final FlutterSecureStorage _storage;
  final Dio _dio;

  Future<dynamic> getData(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) {
    return _request(() => _dio.get<dynamic>(
          path,
          queryParameters: queryParameters,
        ));
  }

  Future<dynamic> postData(
    String path, {
    Object? data,
  }) {
    return _request(() => _dio.post<dynamic>(path, data: data));
  }

  Future<dynamic> putData(
    String path, {
    Object? data,
  }) {
    return _request(() => _dio.put<dynamic>(path, data: data));
  }

  Future<dynamic> deleteData(
    String path, {
    Object? data,
  }) {
    return _request(() => _dio.delete<dynamic>(path, data: data));
  }

  Future<dynamic> _request(Future<Response<dynamic>> Function() request) async {
    try {
      final response = await request();
      final body = response.data;
      if (body is! Map<String, dynamic>) {
        throw const ApiException(
          message: 'Phản hồi máy chủ không đúng định dạng.',
        );
      }

      final envelope = ApiEnvelope.fromJson(body);
      if (!_isSuccess(response.statusCode, envelope.code)) {
        throw ApiException.fromCode(
          code: envelope.code,
          message: envelope.message,
        );
      }

      return envelope.data;
    } on DioException catch (error) {
      final cause = error.error;
      if (cause is ApiException) throw cause;
      throw _toApiException(error);
    }
  }

  // Mỗi API có mã thành công riêng theo tài liệu môn học (00047 đăng nhập,
  // 00287 thêm task...), nên dựa vào HTTP status: server trả 2xx khi thành công,
  // 4xx/5xx khi lỗi (Dio ném lỗi, xử lý ở _toApiException).
  bool _isSuccess(int? statusCode, String code) {
    if (statusCode != null) return statusCode >= 200 && statusCode < 300;
    return const {'0', '200', '00000', 'SUCCESS'}.contains(code.toUpperCase());
  }

  DioException _toDioException(DioException error) {
    if (error.error is ApiException) return error;
    return DioException(
      requestOptions: error.requestOptions,
      response: error.response,
      type: error.type,
      error: _toApiException(error),
      message: error.message,
    );
  }

  ApiException _toApiException(DioException error) {
    final responseData = error.response?.data;
    if (responseData is Map<String, dynamic> &&
        responseData['code'] != null) {
      return ApiException.fromCode(
        code: responseData['code'].toString(),
        message: responseData['message']?.toString() ?? '',
      );
    }

    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      return const ApiException(
        message: 'Kết nối bị quá thời gian. Vui lòng thử lại.',
      );
    }
    if (error.type == DioExceptionType.connectionError) {
      return const ApiException(
        message: 'Không thể kết nối máy chủ. Kiểm tra mạng và địa chỉ API.',
      );
    }

    return ApiException(
      message: error.message ?? 'Không thể hoàn tất yêu cầu.',
      statusCode: error.response?.statusCode,
    );
  }
}
