import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/response.js';

// Supabase Auth (AUTH_DRIVER=supabase): Supabase giữ mật khẩu và gửi mã OTP qua SMTP đã cấu hình
// trong Dashboard (mẫu "Confirm signup" dùng {{ .Token }}). Mapping theo docs/architecture.md.
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
let admin;
const adminClient = () => (admin ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options));
// Client mới cho mỗi lần đăng nhập để session của người này không dính sang người khác.
const publicClient = () => createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, options);

// Cache kết quả getUser vài chục giây để không gọi Supabase ở mọi request.
const CACHE_MS = 30_000;
const cache = new Map();

function toTokens(session) {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
    authUserId: session.user.id,
  };
}

export const supabaseAuth = {
  name: 'supabase',

  async signUp({ email, password }) {
    const { data, error } = await publicClient().auth.signUp({ email, password });
    if (error) {
      if (error.code === 'user_already_exists') throw new ApiError('EMAIL_EXISTS');
      if (error.code === 'weak_password' || error.code === 'validation_failed') {
        throw new ApiError('BAD_REQUEST', { message: error.message });
      }
      throw error;
    }
    // Khi bật xác minh email, Supabase trả user giả không có identity nếu email đã tồn tại.
    if (data.user?.identities?.length === 0) throw new ApiError('EMAIL_EXISTS');
    return { authUserId: data.user.id, confirmed: Boolean(data.user.email_confirmed_at) };
  },

  async resendCode(email) {
    const { error } = await publicClient().auth.resend({ type: 'signup', email });
    if (error?.code === 'over_email_send_rate_limit') throw new ApiError('RATE_LIMITED');
    if (error && error.status >= 500) throw error;
  },

  async verifyCode(email, code) {
    const { error } = await publicClient().auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) throw new ApiError('INVALID_CODE');
  },

  async signIn(email, password) {
    const { data, error } = await publicClient().auth.signInWithPassword({ email, password });
    if (error) {
      if (error.code === 'email_not_confirmed') throw new ApiError('EMAIL_NOT_CONFIRMED');
      if (error.code === 'invalid_credentials' || error.status === 400) throw new ApiError('INVALID_CREDENTIALS');
      throw error;
    }
    return toTokens(data.session);
  },

  async refresh(refreshToken) {
    const { data, error } = await publicClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) throw new ApiError('UNAUTHORIZED');
    return toTokens(data.session);
  },

  async signOut(accessToken) {
    cache.delete(accessToken);
    await adminClient().auth.admin.signOut(accessToken, 'global');
  },

  async getUser(accessToken) {
    const hit = cache.get(accessToken);
    if (hit && hit.until > Date.now()) return hit.user;
    const { data, error } = await adminClient().auth.getUser(accessToken);
    if (error || !data.user) return null;
    const user = { authUserId: data.user.id, email: data.user.email };
    if (cache.size > 5000) cache.clear();
    cache.set(accessToken, { user, until: Date.now() + CACHE_MS });
    return user;
  },

  async updatePassword(authUserId, newPassword) {
    const { error } = await adminClient().auth.admin.updateUserById(authUserId, { password: newPassword });
    if (error) throw error;
    cache.clear();
  },

  async deleteUser(authUserId) {
    const { error } = await adminClient().auth.admin.deleteUser(authUserId);
    if (error && error.status !== 404) throw error;
    cache.clear();
  },
};
