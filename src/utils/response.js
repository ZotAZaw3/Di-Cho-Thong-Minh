import { CODES, resolveCode } from './codes.js';

/** 'POST /user/login' của request hiện tại (null khi không khớp route nào, vd. 404). */
export function routeKey(req) {
  return req?.route ? `${req.method} ${req.route.path}` : null;
}

/**
 * Gửi response theo format chung { code, message, data }.
 * Mã lấy theo route của request (bảng API_CODES), không có thì dùng mã chung trong CODES.
 * @param {import('express').Response} res
 * @param {keyof typeof CODES} key tên mục trong bảng mã
 * @param {unknown} [data]
 * @param {{ message?: string, reasons?: string[] }} [options] message ghi đè; reasons chọn mã riêng (xem codes.js)
 */
export function send(res, key, data = null, options = {}) {
  const entry = CODES[key];
  if (!entry) throw new Error(`Mã response không tồn tại: ${key}`);
  const { code, message } = resolveCode(routeKey(res.req), key, options.reasons);
  return res.status(entry.status).json({ code, message: options.message ?? message, data });
}

/** Lỗi nghiệp vụ: service ném ApiError, errorHandler chuyển thành response. */
export class ApiError extends Error {
  /**
   * @param {keyof typeof CODES} key
   * @param {{ data?: unknown, message?: string, reason?: string, reasons?: string[] }} [options]
   *   reason: trường hợp cụ thể để chọn mã riêng của API (vd. 'food' = không tìm thấy thực phẩm)
   */
  constructor(key, options = {}) {
    super(options.message ?? CODES[key]?.message ?? key);
    this.name = 'ApiError';
    this.key = key;
    this.data = options.data ?? null;
    this.customMessage = options.message;
    this.reasons = options.reasons ?? (options.reason ? [options.reason] : []);
  }
}
