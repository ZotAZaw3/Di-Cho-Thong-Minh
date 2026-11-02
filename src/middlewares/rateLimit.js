import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { send } from '../utils/response.js';

// Lưu đếm trong bộ nhớ: server chỉ chạy 1 container nên không cần Redis.
export const rateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => send(res, 'RATE_LIMITED'),
});
