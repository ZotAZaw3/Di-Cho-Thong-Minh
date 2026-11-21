import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { SignJWT, jwtVerify } from 'jose';
import { env, jwtSecret } from '../../config/env.js';
import { query, queryOne } from '../../config/db.js';
import { ApiError } from '../../utils/response.js';

// Đăng nhập không cần Supabase: dùng cho dev, test và demo offline (AUTH_DRIVER=local).
// Mật khẩu băm bằng scrypt, token là JWT HS256. Đăng xuất / đổi mật khẩu tăng token_version
// để mọi token cũ hết hiệu lực.
const scrypt = promisify(scryptCb);
const key = new TextEncoder().encode(jwtSecret);
const CODE_TTL_MINUTES = 15;

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 32);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

async function checkPassword(password, stored) {
  const [, salt, hex] = stored.split('$');
  const hash = await scrypt(password, salt, 32);
  return timingSafeEqual(hash, Buffer.from(hex, 'hex'));
}

async function issueTokens(account) {
  const sign = (typ, ttl) =>
    new SignJWT({ typ, ver: account.token_version })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(account.auth_user_id)
      .setIssuedAt()
      .setExpirationTime(`${ttl}s`)
      .sign(key);
  return {
    accessToken: await sign('access', env.ACCESS_TOKEN_TTL),
    refreshToken: await sign('refresh', env.REFRESH_TOKEN_TTL),
    expiresIn: env.ACCESS_TOKEN_TTL,
    authUserId: account.auth_user_id,
  };
}

async function readToken(token, typ) {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    if (payload.typ !== typ) return null;
    const account = await queryOne('SELECT * FROM auth_local_accounts WHERE auth_user_id = $1', [payload.sub]);
    if (!account || account.token_version !== payload.ver) return null;
    return account;
  } catch {
    return null;
  }
}

function newCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function deliverCode(email, code) {
  // Chế độ local không gửi mail thật: in mã ra log để người chạy server nhập vào app.
  if (env.NODE_ENV !== 'test') console.log(`[auth:local] Mã xác minh cho ${email}: ${code}`);
}

export const localAuth = {
  name: 'local',

  async signUp({ email, password }) {
    const exists = await queryOne('SELECT 1 FROM auth_local_accounts WHERE lower(email) = lower($1)', [email]);
    if (exists) throw new ApiError('EMAIL_EXISTS');
    const code = newCode();
    const row = await queryOne(
      `INSERT INTO auth_local_accounts (email, password_hash, email_confirmed_at, verify_code, verify_code_expires_at)
       VALUES ($1, $2, CASE WHEN $3 THEN now() END, $4, now() + make_interval(mins => $5))
       RETURNING auth_user_id, email_confirmed_at`,
      [email, await hashPassword(password), env.LOCAL_AUTO_CONFIRM, code, CODE_TTL_MINUTES],
    );
    if (!row.email_confirmed_at) deliverCode(email, code);
    return { authUserId: row.auth_user_id, confirmed: Boolean(row.email_confirmed_at) };
  },

  async resendCode(email) {
    const code = newCode();
    const row = await queryOne(
      `UPDATE auth_local_accounts SET verify_code = $2, verify_code_expires_at = now() + make_interval(mins => $3)
       WHERE lower(email) = lower($1) AND email_confirmed_at IS NULL RETURNING email`,
      [email, code, CODE_TTL_MINUTES],
    );
    if (row) deliverCode(email, code);
  },

  async verifyCode(email, code) {
    const row = await queryOne(
      `UPDATE auth_local_accounts SET email_confirmed_at = now(), verify_code = NULL, verify_code_expires_at = NULL
       WHERE lower(email) = lower($1) AND verify_code = $2 AND verify_code_expires_at > now()
       RETURNING auth_user_id`,
      [email, code],
    );
    if (!row) throw new ApiError('INVALID_CODE');
  },

  async signIn(email, password) {
    const account = await queryOne('SELECT * FROM auth_local_accounts WHERE lower(email) = lower($1)', [email]);
    if (!account || !(await checkPassword(password, account.password_hash))) throw new ApiError('INVALID_CREDENTIALS');
    if (!account.email_confirmed_at) throw new ApiError('EMAIL_NOT_CONFIRMED');
    return issueTokens(account);
  },

  async refresh(refreshToken) {
    const account = await readToken(refreshToken, 'refresh');
    if (!account) throw new ApiError('UNAUTHORIZED');
    return issueTokens(account);
  },

  async signOut(accessToken) {
    const account = await readToken(accessToken, 'access');
    if (account) {
      await query('UPDATE auth_local_accounts SET token_version = token_version + 1 WHERE auth_user_id = $1', [
        account.auth_user_id,
      ]);
    }
  },

  async getUser(accessToken) {
    const account = await readToken(accessToken, 'access');
    return account ? { authUserId: account.auth_user_id, email: account.email } : null;
  },

  async updatePassword(authUserId, newPassword) {
    await query(
      'UPDATE auth_local_accounts SET password_hash = $2, token_version = token_version + 1 WHERE auth_user_id = $1',
      [authUserId, await hashPassword(newPassword)],
    );
  },

  async deleteUser(authUserId) {
    await query('DELETE FROM auth_local_accounts WHERE auth_user_id = $1', [authUserId]);
  },
};
