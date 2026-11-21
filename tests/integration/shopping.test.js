import { describe, it, expect } from 'vitest';
import { hasDb, call, newFamily } from '../helpers.js';

describe.skipIf(!hasDb)('Nhóm 8 · Mua sắm', () => {
  it('tạo danh sách giao cho thành viên (payload app và tài liệu)', async () => {
    const { leader, members: [m1] } = await newFamily(1);
    const app = await call('post', '/shopping/', leader.token).send({ name: 'Chợ sáng', assignedTo: '' });
    expect(app.status).toBe(201);
    expect(app.body.data).toMatchObject({ name: 'Chợ sáng', assignedTo: '', tasks: [] });

    const doc = await call('post', '/shopping/', leader.token).send({ name: 'Chợ tối', assignToUsername: m1.username, date: '2099-05-01', note: 'mua sớm' });
    expect(doc.body.data).toMatchObject({ date: '2099-05-01', assignee: { id: m1.id }, note: 'mua sớm' });
    expect((await call('post', '/shopping/', leader.token).send({ name: 'X', assignToUsername: 'nguoi-la' })).body.code).toBe('00279');
    expect((await call('post', '/shopping/', leader.token).send({})).body.code).toBe('00279');
  });

  it('Create tasks: mã 00287; trùng món thì rollback cả lô', async () => {
    const { leader, members: [m1] } = await newFamily(1);
    const list = (await call('post', '/shopping/', leader.token).send({ name: 'L', assignToUsername: m1.username })).body.data;
    const res = await call('post', '/shopping/task/', leader.token).send({ listId: list.id, tasks: [{ foodName: 'Trứng gà', quantity: '10' }, { foodName: 'Thịt gà', quantity: '0.5' }] });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ code: '00287', message: 'Thêm nhiệm vụ thành công' });
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({ foodName: 'Trứng gà', quantity: 10, unitName: 'quả', completed: false, assignee: { id: m1.id } });

    const dup = await call('post', '/shopping/task/', leader.token).send({ listId: String(list.id), tasks: [{ foodName: 'Cam', quantity: 1 }, { foodName: 'Trứng gà', quantity: 1 }] });
    expect(dup.body.code).toBe('CONFLICT');
    const tasks = await call('get', '/shopping/task/', leader.token).query({ listId: list.id });
    expect(tasks.body.data.map((t) => t.foodName)).toEqual(['Trứng gà', 'Thịt gà']);

    expect((await call('post', '/shopping/task/', leader.token).send({ listId: list.id, tasks: [] })).body.code).toBe('00279');
    expect((await call('post', '/shopping/task/', leader.token).send({ listId: 999999, tasks: [{ foodName: 'Cam', quantity: 1 }] })).body.code).toBe('NOT_FOUND');
  });

  it('GET shopping/ trả danh sách kèm task (app đọc được)', async () => {
    const { leader } = await newFamily();
    const list = (await call('post', '/shopping/', leader.token).send({ name: 'Có món' })).body.data;
    await call('post', '/shopping/task/', leader.token).send({ listId: list.id, tasks: [{ foodName: 'Táo', quantity: 2 }] });
    const res = await call('get', '/shopping/', leader.token);
    expect(res.body.data[0]).toMatchObject({ id: list.id, tasks: [expect.objectContaining({ foodName: 'Táo', quantity: 2 })] });
  });

  it('đánh dấu đã mua → cộng vào tủ lạnh một lần; hoàn tác trừ lại', async () => {
    const { leader, members: [m1] } = await newFamily(1);
    const list = (await call('post', '/shopping/', leader.token).send({ name: 'L', assignToUsername: m1.username })).body.data;
    const [task] = (await call('post', '/shopping/task/', leader.token).send({ listId: list.id, tasks: [{ foodName: 'Trứng gà', quantity: 1, unit: 'hộp' }] })).body.data;

    const [a, b] = await Promise.all([
      call('put', '/shopping/task/done/', m1.token).send({ taskId: task.id, totalCost: 35000 }),
      call('put', '/shopping/task/done/', m1.token).send({ taskId: task.id, totalCost: 35000 }),
    ]);
    expect(a.body.data.completed).toBe(true);
    expect(b.body.data.completed).toBe(true);
    let fridge = (await call('get', '/fridge/Trứng gà/', leader.token)).body.data;
    expect(fridge.reduce((s, i) => s + i.quantity, 0)).toBe(10);

    const undo = await call('put', '/shopping/task/done/', m1.token).send({ taskId: task.id, done: false });
    expect(undo.body.data.status).toBe('todo');
    fridge = (await call('get', '/fridge/Trứng gà/', leader.token)).body.data;
    expect(fridge).toHaveLength(0);

    // Update task với isDone cũng đánh dấu được.
    const again = await call('put', '/shopping/task/', m1.token).send({ taskId: task.id, isDone: true });
    expect(again.body.data.completed).toBe(true);
    // Lần mua đã hoàn tác không tính vào thống kê (không gấp đôi số lượng / chi phí).
    const report = await call('get', '/report/', leader.token);
    expect(report.body.data.summary).toMatchObject({ purchaseEvents: 1, tasksDone: 1, totalCost: 0 });
    expect(report.body.data.foods.find((f) => f.foodName === 'Trứng gà').purchased).toBe(10);
  });

  it('sửa task, đổi người phụ trách danh sách, xóa task và danh sách; quyền', async () => {
    const { leader, members: [m1, m2] } = await newFamily(2);
    const list = (await call('post', '/shopping/', leader.token).send({ name: 'L', assignToUsername: m1.username })).body.data;
    const tasks = (await call('post', '/shopping/task/', leader.token).send({ listId: list.id, tasks: [{ foodName: 'Cam', quantity: 1 }, { foodName: 'Táo', quantity: 1 }] })).body.data;

    const upd = await call('put', '/shopping/task/', m1.token).send({ taskId: tasks[0].id, newFoodName: 'Chuối', newQuantity: '2' });
    expect(upd.body.data).toMatchObject({ foodName: 'Chuối', quantity: 2 });
    expect((await call('put', '/shopping/task/', m1.token).send({ taskId: tasks[0].id, newFoodName: 'Táo' })).body.code).toBe('CONFLICT');

    const moved = await call('put', '/shopping/', leader.token).send({ listId: list.id, newName: 'L2', newAssignToUsername: m2.username });
    expect(moved.body.data).toMatchObject({ name: 'L2', assignee: { id: m2.id } });
    expect(moved.body.data.tasks.every((t) => t.assignee.id === m2.id)).toBe(true);

    expect((await call('delete', '/shopping/task/', m1.token).send({ taskId: tasks[1].id })).body.code).toBe('00284');
    await call('delete', '/shopping/task/', leader.token).send({ taskId: tasks[1].id }).expect(200);
    expect((await call('put', '/shopping/', m1.token).send({ listId: list.id, newName: 'X' })).body.code).toBe('00284');
    await call('delete', '/shopping/', leader.token).send({ listId: list.id }).expect(200);
    expect((await call('get', '/shopping/task/', leader.token).query({ listId: list.id })).body.code).toBe('NOT_FOUND');
  });
});
