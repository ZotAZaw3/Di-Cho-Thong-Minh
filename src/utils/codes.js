// Bảng mã response dùng chung cho mọi API: { code, message, data }.
//
// Mỗi mục có `code` (mã gửi cho app), `status` (HTTP status) và `message`.
// `source` ghi mã lấy từ đâu:
//   'doc'   : đã khớp tài liệu API của môn học (qua sheet kế hoạch / architecture.md).
//   'app'   : app nhánh fe-tien và slide báo cáo tuần 2 đang dùng mã này (mẫu của API Create tasks).
//   'tmp'   : mã tạm của server. Khi có bảng mã trong tài liệu, thay bằng mã 5 chữ số đúng.
// Không viết mã trực tiếp trong controller; luôn tra bảng này qua tên (OK, FORBIDDEN...).
//
// App (lib/core/network/api_client.dart) coi các mã '00287', '00000', '0', '200', 'SUCCESS' là thành công,
// và hiểu 00279 (dữ liệu sai), 00281/00284 (phiên không hợp lệ / không có quyền).
export const CODES = Object.freeze({
  OK: { code: '00000', status: 200, message: 'Thành công', source: 'tmp' },
  CREATED: { code: '00000', status: 201, message: 'Tạo thành công', source: 'tmp' },
  TASKS_CREATED: { code: '00287', status: 201, message: 'Thêm nhiệm vụ thành công', source: 'app' },

  BAD_REQUEST: { code: '00279', status: 400, message: 'Dữ liệu gửi lên không hợp lệ', source: 'app' },
  UNAUTHORIZED: { code: '00281', status: 401, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn', source: 'app' },
  FORBIDDEN: { code: '00284', status: 403, message: 'Bạn không có quyền thực hiện thao tác này', source: 'app' },
  // Sheet "Kế hoạch tuần", T05.1: user thường gọi API admin bị chặn bằng 00017/00019.
  ADMIN_ONLY: { code: '00019', status: 403, message: 'Chỉ quản trị viên được dùng chức năng này', source: 'doc' },
  // architecture.md: Login khi email chưa xác minh trả 00044.
  EMAIL_NOT_CONFIRMED: { code: '00044', status: 403, message: 'Email chưa được xác minh', source: 'doc' },
  // Sheet "Kế hoạch tuần", T02.5: giới hạn tần suất dùng mã 00024.
  RATE_LIMITED: { code: '00024', status: 429, message: 'Gửi yêu cầu quá nhiều, vui lòng thử lại sau', source: 'doc' },

  INVALID_CREDENTIALS: { code: 'INVALID_CREDENTIALS', status: 401, message: 'Email hoặc mật khẩu không đúng', source: 'tmp' },
  ACCOUNT_BLOCKED: { code: 'ACCOUNT_BLOCKED', status: 403, message: 'Tài khoản đã bị khóa', source: 'tmp' },
  EMAIL_EXISTS: { code: 'EMAIL_EXISTS', status: 409, message: 'Email đã được đăng ký', source: 'tmp' },
  USERNAME_EXISTS: { code: 'USERNAME_EXISTS', status: 409, message: 'Tên đăng nhập đã tồn tại', source: 'tmp' },
  INVALID_CODE: { code: 'INVALID_CODE', status: 400, message: 'Mã xác minh không đúng hoặc đã hết hạn', source: 'tmp' },
  WRONG_PASSWORD: { code: 'WRONG_PASSWORD', status: 400, message: 'Mật khẩu cũ không đúng', source: 'tmp' },

  NO_GROUP: { code: 'NO_GROUP', status: 403, message: 'Bạn chưa thuộc nhóm gia đình nào', source: 'tmp' },
  ALREADY_IN_GROUP: { code: 'ALREADY_IN_GROUP', status: 409, message: 'Người dùng đã ở trong một nhóm', source: 'tmp' },

  NOT_FOUND: { code: 'NOT_FOUND', status: 404, message: 'Không tìm thấy dữ liệu', source: 'tmp' },
  CONFLICT: { code: 'CONFLICT', status: 409, message: 'Dữ liệu đã tồn tại', source: 'tmp' },
  IN_USE: { code: 'IN_USE', status: 409, message: 'Dữ liệu đang được sử dụng, không thể xóa', source: 'tmp' },

  ROUTE_NOT_FOUND: { code: 'ROUTE_NOT_FOUND', status: 404, message: 'Không tìm thấy API', source: 'tmp' },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500, message: 'Lỗi máy chủ', source: 'tmp' },
});
