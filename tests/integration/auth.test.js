import { describe, it, expect } from 'vitest';
import { hasDb, call, newUser } from '../helpers.js';
import { queryOne } from '../../src/config/db.js';

describe.skipIf(!hasDb)('Nhóm 1 + 2 · Xác thực và tài khoản', () => {
  it('đăng ký → chưa xác minh thì không đăng nhập được (00044) → xác minh → đăng nhập', async () => {
    const email = `reg${Date.now()}@test.local`;
    const reg = await call('post', '/user/').send({ email, password: 'abc123', name: 'Lan', username: `lan${Date.now()}` });
    expect(reg.status).toBe(201);
    expect(reg.body.data).toMatchObject({ needVerification: true, user: { email, name: 'Lan' } });

    const early = await call('post', '/user/login/').send({ email, password: 'abc123' });
    expect(early.body.code).toBe('00044');

    const wrong = await call('post', '/user/verify-email/').send({ code: '000000', token: reg.body.data.token });
    expect(wrong.body.code).toBe('INVALID_CODE');

    await call('post', '/user/send-verification-code/').send({ email }).expect(200);
    const { verify_code: code } = await queryOne('SELECT verify_code FROM auth_local_accounts WHERE email = $1', [email]);
    const ok = await call('post', '/user/verify-email/').send({ code, token: reg.body.data.token });
    expect(ok.body).toMatchObject({ code: '00000', data: { verified: true } });

    const login = await call('post', '/user/login/').send({ email, password: 'abc123', deviceId: 'fcm-token-1' });
    expect(login.status).toBe(200);
    expect(login.body.data).toMatchObject({ tokenType: 'Bearer', user: { email, group: null } });
    expect(login.body.data.accessToken).toBeTruthy();
    expect(await queryOne('SELECT 1 FROM device_tokens WHERE token = $1', ['fcm-token-1'])).toBeTruthy();
  });

  it('đăng ký trùng email, mật khẩu ngắn, email sai', async () => {
    const u = await newUser();
    expect((await call('post', '/user/').send({ email: u.email, password: 'abcdef' })).body.code).toBe('EMAIL_EXISTS');
    const short = await call('post', '/user/').send({ email: 'x@test.local', password: '123' });
    expect(short.body).toMatchObject({ code: '00279', message: expect.stringContaining('password') });
    expect((await call('post', '/user/').send({ email: 'khong-phai-email', password: 'abcdef' })).body.code).toBe('00279');
  });

  it('sai mật khẩu trả INVALID_CREDENTIALS', async () => {
    const u = await newUser();
    const res = await call('post', '/user/login/').send({ email: u.email, password: 'sai-roi' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('refresh token cấp token mới; logout làm token cũ hết hiệu lực', async () => {
    const u = await newUser();
    const r = await call('post', '/user/refresh-token/').send({ refreshToken: u.refreshToken });
    expect(r.body.data.accessToken).toBeTruthy();
    expect((await call('post', '/user/refresh-token/').send({ refreshToken: 'rac' })).body.code).toBe('00281');

    await call('post', '/user/logout/', r.body.data.accessToken).expect(200);
    expect((await call('get', '/user/', r.body.data.accessToken)).body.code).toBe('00281');
  });

  it('Get user, Edit user (JSON và form-data có ảnh)', async () => {
    const u = await newUser();
    const me = await call('get', '/user/', u.token);
    expect(me.body.data).toMatchObject({ email: u.email, username: u.username, role: 'user' });

    const edit = await call('put', '/user/', u.token).send({ name: 'Tên mới', language: 'en' });
    expect(edit.body.data).toMatchObject({ name: 'Tên mới', language: 'en' });

    const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
    const withImage = await call('put', '/user/', u.token).field('name', 'Có ảnh').attach('image', png, { filename: 'a.png', contentType: 'image/png' });
    expect(withImage.body.data.avatarUrl).toMatch(/\/it4788\/uploads\/avatars\/.+\.png$/);

    const bad = await call('put', '/user/', u.token).attach('image', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(bad.body.code).toBe('00279');
  });

  it('đổi mật khẩu: sai mật khẩu cũ bị từ chối; đổi xong token cũ hết hiệu lực', async () => {
    const u = await newUser();
    expect((await call('post', '/user/change-password/', u.token).send({ oldPassword: 'sai', newPassword: 'moi123' })).body.code).toBe('WRONG_PASSWORD');
    await call('post', '/user/change-password/', u.token).send({ oldPassword: u.password, newPassword: 'moi123' }).expect(200);
    expect((await call('get', '/user/', u.token)).body.code).toBe('00281');
    expect((await call('post', '/user/login/').send({ email: u.email, password: 'moi123' })).status).toBe(200);
  });

  it('PUT user/device lưu FCM token; Delete user xóa tài khoản', async () => {
    const u = await newUser();
    const d = await call('put', '/user/device/', u.token).send({ fcmToken: 'tok-xyz', platform: 'android' });
    expect(d.body.data).toMatchObject({ token: 'tok-xyz', platform: 'android' });

    await call('delete', '/user/', u.token).expect(200);
    expect((await call('post', '/user/login/').send({ email: u.email, password: u.password })).body.code).toBe('INVALID_CREDENTIALS');
    expect(await queryOne('SELECT 1 FROM device_tokens WHERE token = $1', ['tok-xyz'])).toBeNull();
  });
});
