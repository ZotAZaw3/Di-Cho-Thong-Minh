import { CODES } from './codes.js';

/**
 * Gửi response theo format chung { code, message, data }.
 * @param {import('express').Response} res
 * @param {keyof typeof CODES} key tên mục trong bảng mã
 * @param {unknown} [data]
 * @param {{ message?: string }} [options] ghi đè message khi cần
 */
export function send(res, key, data = null, options = {}) {
  const entry = CODES[key];
  if (!entry) throw new Error(`Mã response không tồn tại: ${key}`);
  return res.status(entry.status).json({
    code: entry.code,
    message: options.message ?? entry.message,
    data,
  });
}

/** Lỗi nghiệp vụ: service ném ApiError, errorHandler chuyển thành response. */
export class ApiError extends Error {
  /**
   * @param {keyof typeof CODES} key
   * @param {{ data?: unknown, message?: string }} [options]
   */
  constructor(key, options = {}) {
    super(options.message ?? CODES[key]?.message ?? key);
    this.name = 'ApiError';
    this.key = key;
    this.data = options.data ?? null;
    this.customMessage = options.message;
  }
}
