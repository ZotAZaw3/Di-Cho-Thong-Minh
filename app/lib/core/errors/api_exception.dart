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
      '00006' || '00011' || '00012' =>
        'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
      '00017' || '00019' => 'Bạn không có quyền thực hiện thao tác này.',
      '00024' => 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
      _ when message.isNotEmpty => message,
      _ => 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    };

    return ApiException(message: friendlyMessage, code: code);
  }

  /// Mã phiên đăng nhập không hợp lệ theo bảng mã của môn học
  /// (00006 thiếu token, 00011 hết hạn, 00012 token sai).
  bool get isSessionInvalid =>
      code == '00006' || code == '00011' || code == '00012';

  @override
  String toString() => message;
}
