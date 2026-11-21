import multer from 'multer';
import { send, ApiError } from '../utils/response.js';
import { env } from '../config/env.js';

export function notFound(_req, res) {
  return send(res, 'ROUTE_NOT_FOUND');
}

// Lỗi ràng buộc của Postgres mà service chưa bắt riêng → mã nghiệp vụ chung.
const PG_ERRORS = {
  23505: 'CONFLICT', // unique_violation
  23503: 'IN_USE', // foreign_key_violation
  23514: 'BAD_REQUEST', // check_violation
  23502: 'BAD_REQUEST', // not_null_violation
  '22P02': 'BAD_REQUEST', // invalid_text_representation
  22003: 'BAD_REQUEST', // numeric_value_out_of_range
  22001: 'BAD_REQUEST', // string_data_right_truncation
  22007: 'BAD_REQUEST', // invalid_datetime_format
  22008: 'BAD_REQUEST', // datetime_field_overflow
};

// Mọi lỗi (kể cả lỗi bất ngờ) đều trả về format { code, message, data }.
// Express 5 tự chuyển lỗi của handler async vào đây.
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return send(res, err.key, err.data, { message: err.customMessage, reasons: err.reasons });
  }
  // Body JSON sai cú pháp hoặc quá lớn (express.json).
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
    return send(res, 'BAD_REQUEST');
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Ảnh quá lớn (tối đa 5 MB)' : `Upload lỗi: ${err.message}`;
    return send(res, 'BAD_REQUEST', null, { message });
  }
  if (err?.code && PG_ERRORS[err.code]) {
    if (env.NODE_ENV === 'development') console.warn('Postgres:', err.code, err.detail ?? err.message);
    return send(res, PG_ERRORS[err.code]);
  }
  if (env.NODE_ENV !== 'test') console.error(err);
  return send(res, 'INTERNAL_ERROR');
}
