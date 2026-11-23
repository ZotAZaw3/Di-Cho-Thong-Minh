import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { query, queryOne } from '../src/config/db.js';

export const hasDb = Boolean(process.env.TEST_DATABASE_URL);
export const app = createApp();
export const P = '/it4788';

const uid = () => randomUUID().slice(0, 8);

/** Gọi API, có token thì gắn Bearer. */
export function call(method, path, token) {
  const req = request(app)[method](encodeURI(P + path));
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
}

/** Đăng ký + xác minh (đọc mã trong DB) + đăng nhập. */
export async function newUser({ name = 'Người dùng test', role = 'user' } = {}) {
  const email = `u${uid()}@test.local`;
  const username = `user_${uid()}`;
  const password = 'matkhau1';
  const reg = await call('post', '/user/').send({ email, password, name, username });
  if (reg.status !== 201) throw new Error(`register lỗi: ${JSON.stringify(reg.body)}`);
  const { verify_code: code } = await queryOne('SELECT verify_code FROM auth_local_accounts WHERE lower(email) = $1', [email]);
  await call('post', '/user/verify-email/').send({ code, token: reg.body.data.token });
  if (role === 'admin') await query("UPDATE users SET system_role = 'admin' WHERE email = $1", [email]);
  const login = await call('post', '/user/login/').send({ email, password });
  return { email, username, password, token: login.body.data.accessToken, refreshToken: login.body.data.refreshToken, id: reg.body.data.user.id };
}

/** Người dùng đã có nhóm (là trưởng nhóm), kèm các thành viên nếu cần. */
export async function newFamily(memberCount = 0) {
  const leader = await newUser({ name: 'Trưởng nhóm' });
  const g = await call('post', '/user/group/', leader.token).send({ name: `Nhóm ${uid()}` });
  const members = [];
  for (let i = 0; i < memberCount; i += 1) {
    const m = await newUser({ name: `Thành viên ${i + 1}` });
    await call('post', '/user/group/add/', leader.token).send({ username: m.username });
    members.push(m);
  }
  return { leader, members, groupId: g.body.data.group.id };
}
