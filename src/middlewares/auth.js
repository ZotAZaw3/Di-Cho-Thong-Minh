import { auth } from '../services/gateways/index.js';
import { findUserByAuthId } from '../repositories/user.repository.js';
import { ApiError } from '../utils/response.js';
import { isJwtExpired } from '../utils/jwt.js';

function bearer(req) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/** Bắt buộc đăng nhập: Bearer token → tài khoản Auth → dòng users → req.user. */
export async function requireAuth(req, _res, next) {
  const token = bearer(req);
  if (!token) throw new ApiError('NO_TOKEN');
  const authUser = await auth().getUser(token);
  // 00011: hết hạn (app gọi Refresh token rồi thử lại); 00012: token sai.
  if (!authUser) throw new ApiError(isJwtExpired(token) ? 'SESSION_EXPIRED' : 'UNAUTHORIZED');
  const user = await findUserByAuthId(authUser.authUserId);
  if (!user) throw new ApiError('UNAUTHORIZED');
  if (user.account_status === 'blocked') throw new ApiError('ACCOUNT_BLOCKED');
  req.user = user;
  req.accessToken = token;
  next();
}

/** Không bắt buộc: có token hợp lệ thì gắn req.accessToken (dùng cho Logout). */
export function readBearer(req, _res, next) {
  req.accessToken = bearer(req);
  next();
}
