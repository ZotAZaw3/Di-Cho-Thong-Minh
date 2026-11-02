// Bảng mã response dùng chung cho mọi API: { code, message, data }.
//
// Mỗi mục có `code` (mã gửi cho app), `status` (HTTP status) và `message`.
// `verified: true` nghĩa là mã đã khớp tài liệu API của môn học.
// Các mục `verified: false` là mã tạm của khung server: khi có bảng mã trong tài liệu,
// thay `code` bằng mã 5 chữ số đúng và thêm mã riêng của từng API vào đây.
// Không viết mã trực tiếp trong controller; luôn tra bảng này qua tên (OK, RATE_LIMITED...).
export const CODES = Object.freeze({
  OK: { code: 'OK', status: 200, message: 'Thành công', verified: false },
  BAD_REQUEST: { code: 'BAD_REQUEST', status: 400, message: 'Dữ liệu gửi lên không hợp lệ', verified: false },
  ROUTE_NOT_FOUND: { code: 'ROUTE_NOT_FOUND', status: 404, message: 'Không tìm thấy API', verified: false },
  // Sheet "Kế hoạch tuần", T02.5: giới hạn tần suất dùng mã 00024.
  RATE_LIMITED: { code: '00024', status: 429, message: 'Gửi yêu cầu quá nhiều, vui lòng thử lại sau', verified: true },
  NOT_IMPLEMENTED: { code: 'NOT_IMPLEMENTED', status: 501, message: 'API chưa được cài đặt', verified: false },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500, message: 'Lỗi máy chủ', verified: false },
});
