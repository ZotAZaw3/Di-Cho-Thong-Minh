import { SignJWT, jwtVerify } from 'jose';
import { jwtSecret } from '../config/env.js';
import { withTransaction } from '../config/db.js';
import { auth } from './gateways/index.js';
import * as users from '../repositories/user.repository.js';
import { findActiveMembership } from '../repositories/group.repository.js';
import { presentUser } from '../models/presenters.js';
import { ApiError } from '../utils/response.js';

// Nhóm 1 · Xác thực. Mật khẩu, mã OTP và token do auth gateway lo (Supabase Auth hoặc local);
// service này giữ bảng users khớp với tài khoản Auth.

const verifyKey = new TextEncoder().encode(`${jwtSecret}:verify-email`);

/** Chuỗi trả về lúc Register, gửi lại ở Verify email để biết email nào (architecture.md). */
function signVerifyToken(email) {
  return new SignJWT({ email }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('2d').sign(verifyKey);
}

async function readVerifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, verifyKey, { algorithms: ['HS256'] });
    return payload.email;
  } catch {
    throw new ApiError('INVALID_CODE', { message: 'Token xác minh không hợp lệ hoặc đã hết hạn' });
  }
}

async function registerDevice(userId, deviceToken) {
  if (deviceToken) await users.upsertDeviceToken(userId, deviceToken, 'android');
}

export async function register({ email, password, name, username, language, deviceId }) {
  if (await users.findUserByEmail(email)) throw new ApiError('EMAIL_EXISTS');
  if (username && (await users.isUsernameTaken(username))) throw new ApiError('USERNAME_EXISTS');

  const { authUserId, confirmed } = await auth().signUp({ email, password });
  let user;
  try {
    user = await users.insertUser({ fullName: name ?? username ?? email.split('@')[0], email, username, language, authUserId });
  } catch (err) {
    await auth().deleteUser(authUserId).catch(() => {});
    throw err;
  }
  await registerDevice(user.id, deviceId);
  return {
    user: presentUser(user),
    token: await signVerifyToken(email),
    needVerification: !confirmed,
  };
}

export async function sendVerificationCode({ email }) {
  await auth().resendCode(email);
  return { email };
}

export async function verifyEmail({ code, token, email }) {
  const target = email ?? (token ? await readVerifyToken(token) : null);
  if (!target) throw new ApiError('BAD_REQUEST', { message: 'Cần gửi token (nhận lúc đăng ký) hoặc email' });
  await auth().verifyCode(target, code);
  return { email: target, verified: true };
}

export async function login({ email, password, deviceId }) {
  const tokens = await auth().signIn(email, password);
  let user = await users.findUserByAuthId(tokens.authUserId);
  if (!user) {
    // Tài khoản tạo thẳng trên Supabase Dashboard: tạo dòng users khi đăng nhập lần đầu.
    user = await withTransaction(async (db) => {
      const existing = await users.findUserByEmail(email, db);
      if (existing && !existing.auth_user_id) {
        return (await db.query('UPDATE users SET auth_user_id = $2 WHERE id = $1 RETURNING *', [existing.id, tokens.authUserId])).rows[0];
      }
      return users.insertUser({ fullName: email.split('@')[0], email, authUserId: tokens.authUserId }, db);
    });
  }
  if (user.account_status === 'blocked') throw new ApiError('ACCOUNT_BLOCKED');
  await registerDevice(user.id, deviceId);
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    tokenType: 'Bearer',
    user: presentUser(user, await findActiveMembership(user.id)),
  };
}

export async function refreshToken({ refreshToken: token }) {
  const tokens = await auth().refresh(token);
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresIn: tokens.expiresIn, tokenType: 'Bearer' };
}

export async function logout(accessToken) {
  if (accessToken) await auth().signOut(accessToken).catch(() => {});
  return null;
}

export async function changePassword(user, { oldPassword, newPassword }) {
  try {
    await auth().signIn(user.email, oldPassword);
  } catch (err) {
    if (err instanceof ApiError && err.key === 'INVALID_CREDENTIALS') throw new ApiError('WRONG_PASSWORD');
    throw err;
  }
  await auth().updatePassword(user.auth_user_id, newPassword);
  return null;
}
