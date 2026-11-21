import { describe, it, expect } from 'vitest';
import { hasDb, call, newUser, newFamily } from '../helpers.js';

describe.skipIf(!hasDb)('Nhóm 3 · Nhóm gia đình', () => {
  it('tạo nhóm: người tạo là trưởng nhóm; đã có nhóm thì không tạo thêm', async () => {
    const u = await newUser();
    const res = await call('post', '/user/group/', u.token).send({ name: 'Nhà mình' });
    expect(res.status).toBe(201);
    expect(res.body.data.group.name).toBe('Nhà mình');
    expect(res.body.data.members).toEqual([expect.objectContaining({ id: u.id, role: 'leader' })]);
    expect((await call('post', '/user/group/', u.token).send({})).body.code).toBe('ALREADY_IN_GROUP');
  });

  it('chưa có nhóm thì API theo nhóm trả NO_GROUP', async () => {
    const u = await newUser();
    expect((await call('get', '/fridge/', u.token)).body.code).toBe('NO_GROUP');
    expect((await call('get', '/user/group/', u.token)).body.code).toBe('NO_GROUP');
  });

  it('thêm, xem, xóa thành viên theo username; chỉ trưởng nhóm được thêm/xóa', async () => {
    const { leader, members: [m1] } = await newFamily(1);
    const outsider = await newUser();

    const list = await call('get', '/user/group/', m1.token);
    expect(list.body.data.members.map((m) => m.role)).toEqual(['leader', 'member']);

    expect((await call('post', '/user/group/add/', m1.token).send({ username: outsider.username })).body.code).toBe('00284');
    expect((await call('post', '/user/group/add/', leader.token).send({ username: 'khong-ton-tai' })).body.code).toBe('NOT_FOUND');
    expect((await call('post', '/user/group/add/', leader.token).send({ username: m1.username })).body.code).toBe('ALREADY_IN_GROUP');

    // Thêm bằng email cũng được.
    const add = await call('post', '/user/group/add/', leader.token).send({ username: outsider.email });
    expect(add.body.data.members).toHaveLength(3);

    expect((await call('delete', '/user/group/', leader.token).send({ username: leader.username })).body.code).toBe('00284');
    const del = await call('delete', '/user/group/', leader.token).send({ username: outsider.username });
    expect(del.body.data.members).toHaveLength(2);
    expect((await call('get', '/fridge/', outsider.token)).body.code).toBe('NO_GROUP');
  });

  it('người ở nhóm khác không thêm được', async () => {
    const a = await newFamily();
    const b = await newFamily();
    expect((await call('post', '/user/group/add/', a.leader.token).send({ username: b.leader.username })).body.code).toBe('ALREADY_IN_GROUP');
  });

  it('trưởng nhóm xóa tài khoản thì thành viên lên làm trưởng nhóm', async () => {
    const { leader, members: [m1] } = await newFamily(1);
    await call('delete', '/user/', leader.token).expect(200);
    const res = await call('get', '/user/group/', m1.token);
    expect(res.body.data.members).toEqual([expect.objectContaining({ id: m1.id, role: 'leader' })]);
  });
});
