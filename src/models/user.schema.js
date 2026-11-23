import { z } from 'zod';
import { text, optText, email, password, withAliases, pagination, id } from './common.js';

// Nhóm 1, 2, 3 + API mở rộng #50, #53.

export const register = withAliases(
  { name: ['fullName', 'full_name'], deviceId: ['fcmToken', 'deviceToken'] },
  {
    email,
    password,
    name: optText(120),
    username: optText(60),
    language: optText(10),
    deviceId: optText(500),
  },
);

export const login = withAliases(
  { deviceId: ['fcmToken', 'deviceToken'] },
  { email, password: z.string({ error: 'bắt buộc' }).min(1, 'không được để trống'), deviceId: optText(500) },
);

export const refreshToken = withAliases({ refreshToken: ['refresh_token', 'refresh'] }, { refreshToken: text(4000) });
export const sendCode = z.object({ email });
export const verifyEmail = withAliases(
  { code: ['otp'] },
  { code: z.coerce.string().trim().regex(/^\d{6}$/, 'phải gồm 6 chữ số'), token: optText(2000), email: email.optional() },
);
export const changePassword = withAliases(
  { oldPassword: ['currentPassword', 'old_password'], newPassword: ['new_password', 'password'] },
  { oldPassword: z.string({ error: 'bắt buộc' }).min(1, 'không được để trống'), newPassword: password },
);
export const editUser = withAliases(
  { name: ['fullName', 'full_name'] },
  { name: optText(120), username: optText(60), language: optText(10) },
);
export const device = withAliases(
  { token: ['fcmToken', 'deviceId', 'deviceToken'] },
  { token: text(500), platform: z.enum(['android', 'ios', 'web']).optional() },
);

export const createGroup = withAliases({ name: ['groupName'] }, { name: optText(120) });
export const memberRef = withAliases({ username: ['email', 'memberUsername', 'userName'] }, { username: text(254) });

export const adminListUsers = z.object({ q: optText(100), status: z.enum(['active', 'blocked']).optional(), ...pagination });
export const adminSetStatus = withAliases(
  { userId: ['id'] },
  {
    userId: id.optional(),
    email: email.optional(),
    status: z.preprocess(
      (v) => ({ block: 'blocked', lock: 'blocked', unblock: 'active', unlock: 'active' })[v] ?? v,
      z.enum(['active', 'blocked'], { error: 'phải là active hoặc blocked' }),
    ),
  },
).refine((v) => v.userId || v.email, { message: 'cần userId hoặc email', path: ['userId'] });
