import { send, ApiError } from '../utils/response.js';
import { env } from '../config/env.js';

export function notFound(_req, res) {
  return send(res, 'ROUTE_NOT_FOUND');
}

// Mọi lỗi (kể cả lỗi bất ngờ) đều trả về format { code, message, data }.
// Express 5 tự chuyển lỗi của handler async vào đây.
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return send(res, err.key, err.data, { message: err.customMessage });
  }
  // Body JSON sai cú pháp hoặc quá lớn (express.json).
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
    return send(res, 'BAD_REQUEST');
  }
  if (env.NODE_ENV !== 'test') console.error(err);
  return send(res, 'INTERNAL_ERROR');
}
