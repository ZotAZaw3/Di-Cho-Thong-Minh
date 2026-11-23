import { ApiError } from '../utils/response.js';
import { NEED_ONE } from '../models/common.js';

/**
 * Kiểm tra req.body (hoặc req.query) bằng schema zod; kết quả đã chuẩn hóa đặt vào req.valid.
 * Sai thì trả BAD_REQUEST, message nêu trường lỗi đầu tiên, data liệt kê mọi lỗi.
 * @param {import('zod').ZodType} schema
 * 'input' gộp query và body (DELETE: tài liệu gửi trong body, nhưng nhiều thư viện HTTP chỉ gửi được query).
 * @param {'body' | 'query' | 'input'} [source]
 */
export const validate = (schema, source = 'body') => {
  const middleware = (req, _res, next) => {
    const raw = source === 'input' ? { ...req.query, ...(req.body ?? {}) } : (req[source] ?? {});
    const result = schema.safeParse(raw);
    if (!result.success) {
      const missing = (path) => path.reduce((v, k) => (v == null ? undefined : v[k]), raw) === undefined;
      const errors = result.error.issues.map((i) => ({
        field: i.path.join('.') || source,
        message: i.code === 'invalid_type' && missing(i.path) ? 'bắt buộc' : i.message,
      }));
      const first = result.error.issues[0];
      const field = String(first.path[0] ?? '');
      // reasons chọn mã riêng của API theo tài liệu (src/utils/codes.js): trường lỗi, 'missing' khi thiếu,
      // 'need' khi API sửa không có trường nào để sửa; '*' = mã chung của API.
      let reasons;
      if (field === NEED_ONE) reasons = ['need', 'missing'];
      else if (missing(first.path.slice(0, 1))) reasons = [`missing:${field}`, 'missing', field];
      else reasons = [field, 'missing'];
      throw new ApiError('BAD_REQUEST', {
        message: field === NEED_ONE ? errors[0].message : `Trường "${errors[0].field}" ${errors[0].message}`,
        data: { errors },
        reasons,
      });
    }
    req.valid = { ...(req.valid ?? {}), ...result.data };
    next();
  };
  // Tài liệu OpenAPI (src/docs/openapi.js) đọc schema từ đây.
  middleware.schema = schema;
  middleware.source = source;
  return middleware;
};
