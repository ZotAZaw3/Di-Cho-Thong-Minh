import { describe, it, expect } from 'vitest';
import { hasDb, call, newUser } from '../helpers.js';

describe.skipIf(!hasDb)('Nhóm 4, 5 · Admin: category, unit, logs, tài khoản', () => {
  it('user thường bị chặn bằng 00019', async () => {
    const u = await newUser();
    for (const [m, p] of [['get', '/admin/category/'], ['post', '/admin/unit/'], ['get', '/admin/logs/'], ['get', '/admin/user/']]) {
      const res = await call(m, p, u.token).send({ name: 'x' });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('00019');
    }
  });

  it('CRUD category theo tên', async () => {
    const a = await newUser({ role: 'admin' });
    const name = `Đồ đông lạnh ${Date.now()}`;
    expect((await call('post', '/admin/category/', a.token).send({ name })).status).toBe(201);
    expect((await call('post', '/admin/category/', a.token).send({ name: name.toUpperCase() })).body.code).toBe('CONFLICT');
    const list = await call('get', '/admin/category/', a.token);
    expect(list.body.data.map((c) => c.name)).toContain(name);

    const renamed = await call('put', '/admin/category/', a.token).send({ oldName: name, newName: `${name} mới` });
    expect(renamed.body.data.name).toBe(`${name} mới`);
    expect((await call('put', '/admin/category/', a.token).send({ oldName: 'không có', newName: 'abc' })).body.code).toBe('NOT_FOUND');
    expect((await call('delete', '/admin/category/', a.token).send({ name: `${name} mới` })).status).toBe(200);
    expect((await call('delete', '/admin/category/', a.token).send({ name: 'Thịt' })).body.code).toBe('IN_USE');
  });

  it('CRUD unit theo tên, tự sinh mã', async () => {
    const a = await newUser({ role: 'admin' });
    const name = `Thìa ${Date.now()}`;
    const created = await call('post', '/admin/unit/', a.token).send({ name });
    expect(created.body.data).toMatchObject({ name, code: expect.stringMatching(/^thia_/) });
    expect((await call('get', '/admin/unit/', a.token)).body.data.map((u) => u.name)).toContain(name);
    expect((await call('put', '/admin/unit/', a.token).send({ oldName: name, newName: `${name}!` })).body.data.name).toBe(`${name}!`);
    expect((await call('delete', '/admin/unit/', a.token).query({ name: `${name}!` })).status).toBe(200);
    expect((await call('delete', '/admin/unit/', a.token).send({ name: 'kg' })).body.code).toBe('IN_USE');
  });

  it('Get logs ghi lại request', async () => {
    const a = await newUser({ role: 'admin' });
    await call('get', '/user/', a.token);
    await new Promise((r) => setTimeout(r, 100));
    const res = await call('get', '/admin/logs/', a.token).query({ userId: a.id, limit: 10 });
    expect(res.body.data.logs.some((l) => l.path === '/it4788/user/' && l.code === '00000')).toBe(true);
  });

  it('khóa tài khoản: người bị khóa không gọi được API', async () => {
    const a = await newUser({ role: 'admin' });
    const u = await newUser();
    const res = await call('put', '/admin/user/', a.token).send({ userId: u.id, status: 'blocked' });
    expect(res.body.data.status).toBe('blocked');
    expect((await call('post', '/user/login/').send({ email: u.email, password: u.password })).body.code).toBe('ACCOUNT_BLOCKED');
    const list = await call('get', '/admin/user/', a.token).query({ q: u.email });
    expect(list.body.data.users[0]).toMatchObject({ id: u.id, status: 'blocked' });
    expect((await call('put', '/admin/user/', a.token).send({ userId: a.id, status: 'blocked' })).body.code).toBe('00284');
    await call('put', '/admin/user/', a.token).send({ email: u.email, status: 'unblock' }).expect(200);
    expect((await call('post', '/user/login/').send({ email: u.email, password: u.password })).status).toBe(200);
  });
});
