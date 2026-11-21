import { ApiError } from '../utils/response.js';

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
      throw new ApiError('BAD_REQUEST', {
        message: `Trường "${errors[0].field}" ${errors[0].message}`,
        data: { errors },
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
