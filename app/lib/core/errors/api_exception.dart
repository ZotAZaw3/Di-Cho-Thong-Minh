class ApiException implements Exception {
  const ApiException({
    required this.message,
    this.code,
    this.statusCode,
  });

  final String message;
  final String? code;
  final int? statusCode;

  factory ApiException.fromCode({
    required String code,
    required String message,
  }) {
    final friendlyMessage = switch (code) {
      '00279' => 'Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.',
      '00281' || '00284' =>
        'Phiên đăng nhập không hợp lệ hoặc bạn không có quyền thực hiện.',
      _ when message.isNotEmpty => message,
      _ => 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    };

    return ApiException(message: friendlyMessage, code: code);
  }

  @override
  String toString() => message;
}
