import { ApiError } from '../utils/response.js';

/** Chỉ tài khoản có system_role = 'admin' (dùng sau requireAuth). */
export function adminOnly(req, _res, next) {
  if (req.user?.system_role !== 'admin') throw new ApiError('ADMIN_ONLY');
  next();
}
