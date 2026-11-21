import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { hasDb, call, newFamily, newUser } from '../helpers.js';
import { query, queryOne } from '../../src/config/db.js';
import { setGateways } from '../../src/services/gateways/index.js';
import { logPush } from '../../src/services/gateways/push.js';
import { scanExpiring, dispatchDue } from '../../src/services/notification.service.js';

// Các chức năng trong đề bài IT4788 ngoài 49 API gốc + các trường hợp biên.

const recipeId = async (title) => (await queryOne('SELECT id FROM recipes WHERE title = $1 AND group_id IS NULL', [title])).id;
const stock = async (token, food) => (await call('get', `/fridge/${food}/`, token)).body.data.reduce((s, i) => s + i.quantity, 0);

describe.skipIf(!hasDb)('Tìm kiếm và phân loại thực phẩm', () => {
  it('GET food/?q= tìm không dấu, lọc theo category, escape ký tự đặc biệt', async () => {
    const { leader } = await newFamily();
    const res = await call('get', '/food/', leader.token).query({ q: 'thit ga' });
    expect(res.body.data.foods.map((f) => f.name)).toEqual(['Thịt gà']);
    const meat = await call('get', '/food/', leader.token).query({ category: 'Thịt' });
    expect(meat.body.data.foods.length).toBeGreaterThanOrEqual(3);
    expect(meat.body.data.foods.every((f) => f.categoryName === 'Thịt')).toBe(true);
    expect((await call('get', '/food/', leader.token).query({ q: '%' })).body.data.foods).toEqual([]);
    // Đơn vị quy đổi đi kèm thực phẩm.
    const egg = (await call('get', '/food/', leader.token).query({ q: 'Trứng gà' })).body.data.foods[0];
    expect(egg.units).toEqual(expect.arrayContaining([{ unitName: 'hộp', factor: 10 }]));
  });

  it('tìm trong tủ lạnh và công thức cũng không dấu', async () => {
    const { leader } = await newFamily();
    await call('post', '/fridge/', leader.token).send({ foodName: 'Cà chua', quantity: 1 });
    expect((await call('get', '/fridge/', leader.token).query({ q: 'ca chua' })).body.data).toHaveLength(1);
    const recipes = await call('get', '/recipe/', leader.token).query({ q: 'trung chien' });
    expect(recipes.body.data.map((r) => r.name)).toEqual(['Trứng chiên cà chua']);
  });

  it('thực phẩm riêng có đơn vị phụ dùng được khi thêm vào tủ', async () => {
    const { leader } = await newFamily();
    const res = await call('post', '/food/', leader.token).send({
      name: 'Bánh bao', categoryName: 'Khác', unitName: 'cái', units: JSON.stringify([{ unitName: 'gói', factor: 6 }]),
    });
    expect(res.status).toBe(201);
    expect(res.body.data.units).toEqual(expect.arrayContaining([{ unitName: 'gói', factor: 6 }]));
    await call('post', '/fridge/', leader.token).send({ foodName: 'Bánh bao', quantity: 2, unit: 'gói' });
    expect(await stock(leader.token, 'Bánh bao')).toBe(12);
    const bad = await call('post', '/food/', leader.token).send({ name: 'Bánh mì', categoryName: 'Khác', unitName: 'cái', units: [{ unitName: 'thùng', factor: 2 }] });
    expect(bad.body.code).toBe('NOT_FOUND');
    expect((await call('post', '/food/', leader.token).send({ name: 'Bánh tét', categoryName: 'Khác', unitName: 'cái', units: [{ unitName: 'gói', factor: 0 }] })).body.code).toBe('00279');
  });
});

describe.skipIf(!hasDb)('Công thức yêu thích', () => {
  it('thêm, xem, bỏ yêu thích; theo từng người', async () => {
    const { leader, members: [m1] } = await newFamily(1);
    const id = await recipeId('Canh rau muống tỏi');
    const add = await call('post', '/recipe/favorite/', leader.token).send({ recipeId: id });
    expect(add.body.data).toMatchObject({ id, isFavorite: true });
    // Gọi lại không lỗi, không trùng.
    expect((await call('post', '/recipe/favorite/', leader.token).send({ recipeId: id })).body.code).toBe('00000');

    const favs = await call('get', '/recipe/favorite/', leader.token);
    expect(favs.body.data.map((r) => r.id)).toEqual([id]);
    expect((await call('get', '/recipe/', leader.token).query({ favorite: true })).body.data).toHaveLength(1);
    const all = (await call('get', '/recipe/', leader.token)).body.data;
    expect(all.find((r) => r.id === id).isFavorite).toBe(true);
    // Thành viên khác chưa thích.
    expect((await call('get', '/recipe/favorite/', m1.token)).body.data).toEqual([]);

    expect((await call('delete', '/recipe/favorite/', leader.token).query({ recipeId: id })).body.data).toEqual({ recipeId: id, isFavorite: false });
    expect((await call('delete', '/recipe/favorite/', leader.token).send({ recipeId: id })).body.code).toBe('NOT_FOUND');
    expect((await call('post', '/recipe/favorite/', leader.token).send({ recipeId: 999999 })).body.code).toBe('NOT_FOUND');
  });

  it('công thức của nhóm khác không thích được', async () => {
    const a = await newFamily();
    const b = await newFamily();
    const own = await call('post', '/recipe/', a.leader.token).send({ name: 'Món riêng', htmlContent: '<p>x</p>', foodName: 'Cam' });
    expect((await call('post', '/recipe/favorite/', b.leader.token).send({ recipeId: own.body.data.id })).body.code).toBe('NOT_FOUND');
  });
});

describe.skipIf(!hasDb)('Danh sách mua sắm · dùng lại và phân công', () => {
  it('sao chép danh sách cũ thành danh sách mới, mọi món về chưa mua', async () => {
    const { leader, members: [m1] } = await newFamily(1);
    const list = (await call('post', '/shopping/', leader.token).send({ name: 'Chợ tuần', assignToUsername: m1.username, note: 'sáng' })).body.data;
    const tasks = (await call('post', '/shopping/task/', leader.token).send({ listId: list.id, tasks: [{ foodName: 'Trứng gà', quantity: 1, unit: 'hộp' }, { foodName: 'Cam', quantity: 2 }] })).body.data;
    await call('put', '/shopping/task/done/', m1.token).send({ taskId: tasks[0].id });
    await call('put', '/shopping/', leader.token).send({ listId: list.id, status: 'archived' });

    const copy = await call('post', '/shopping/copy/', leader.token).send({ listId: list.id, date: '2099-01-02' });
    expect(copy.status).toBe(201);
    expect(copy.body.data).toMatchObject({ name: 'Chợ tuần', date: '2099-01-02', assignee: { id: m1.id }, note: 'sáng' });
    expect(copy.body.data.id).not.toBe(list.id);
    expect(copy.body.data.tasks.map((t) => [t.foodName, t.quantity, t.unitName, t.completed])).toEqual([
      ['Trứng gà', 1, 'hộp', false],
      ['Cam', 2, 'kg', false],
    ]);
    // Danh sách gốc giữ nguyên trạng thái.
    const original = (await call('get', '/shopping/task/', leader.token).query({ listId: list.id })).body.data;
    expect(original.find((t) => t.foodName === 'Trứng gà').completed).toBe(true);
    expect((await call('post', '/shopping/copy/', leader.token).send({ listId: 999999 })).body.code).toBe('NOT_FOUND');
  });

  it('danh sách đã lưu trữ không thêm món được', async () => {
    const { leader } = await newFamily();
    const list = (await call('post', '/shopping/', leader.token).send({ name: 'Cũ' })).body.data;
    await call('put', '/shopping/', leader.token).send({ listId: list.id, status: 'archived' });
    const res = await call('post', '/shopping/task/', leader.token).send({ listId: list.id, tasks: [{ foodName: 'Cam', quantity: 1 }] });
    expect(res.body.code).toBe('CONFLICT');
  });

  it('chỉ trưởng nhóm / người tạo danh sách giao việc cho người khác', async () => {
    const { leader, members: [m1, m2] } = await newFamily(2);
    const list = (await call('post', '/shopping/', leader.token).send({ name: 'L' })).body.data;
    // Thành viên đóng góp món và tự nhận việc: được.
    const own = await call('post', '/shopping/task/', m1.token).send({ listId: list.id, tasks: [{ foodName: 'Cam', quantity: 1, assignToUsername: m1.username }] });
    expect(own.status).toBe(201);
    // Giao cho người khác: không được.
    const other = await call('post', '/shopping/task/', m1.token).send({ listId: list.id, tasks: [{ foodName: 'Táo', quantity: 1, assignToUsername: m2.username }] });
    expect(other.body.code).toBe('00284');
    const reassign = await call('put', '/shopping/task/', m1.token).send({ taskId: own.body.data[0].id, newAssignToUsername: m2.username });
    expect(reassign.body.code).toBe('00284');
    // Trưởng nhóm thì được.
    const byLeader = await call('put', '/shopping/task/', leader.token).send({ taskId: own.body.data[0].id, newAssignToUsername: m2.username });
    expect(byLeader.body.data.assignee.id).toBe(m2.id);
  });

  it('món đã mua: không sửa số lượng được cho tới khi bỏ đánh dấu', async () => {
    const { leader } = await newFamily();
    const list = (await call('post', '/shopping/', leader.token).send({ name: 'L' })).body.data;
    const [task] = (await call('post', '/shopping/task/', leader.token).send({ listId: list.id, tasks: [{ foodName: 'Cam', quantity: 1 }] })).body.data;
    await call('put', '/shopping/task/done/', leader.token).send({ taskId: task.id });
    expect((await call('put', '/shopping/task/', leader.token).send({ taskId: task.id, newQuantity: 3 })).body.code).toBe('CONFLICT');
    // Gửi lại đúng số cũ (app gửi cả form) thì vẫn được.
    expect((await call('put', '/shopping/task/', leader.token).send({ taskId: task.id, newQuantity: 1, newNote: 'ok' })).body.code).toBe('00000');
    // Bỏ đánh dấu và sửa trong cùng một lần gọi.
    const res = await call('put', '/shopping/task/', leader.token).send({ taskId: task.id, newQuantity: 3, isDone: false });
    expect(res.body.data).toMatchObject({ quantity: 3, completed: false });
    expect(await stock(leader.token, 'Cam')).toBe(0);
  });
});

describe.skipIf(!hasDb)('Nhóm gia đình · rời nhóm, chuyển trưởng nhóm', () => {
  it('thành viên tự rời nhóm; việc chưa xong chuyển cho trưởng nhóm', async () => {
    const { leader, members: [m1] } = await newFamily(1);
    const list = (await call('post', '/shopping/', leader.token).send({ name: 'L', assignToUsername: m1.username })).body.data;
    await call('post', '/shopping/task/', leader.token).send({ listId: list.id, tasks: [{ foodName: 'Cam', quantity: 1 }] });

    expect((await call('post', '/user/group/leave/', m1.token)).body.code).toBe('00000');
    expect((await call('get', '/user/group/', m1.token)).body.code).toBe('NO_GROUP');
    const tasks = (await call('get', '/shopping/task/', leader.token).query({ listId: list.id })).body.data;
    expect(tasks[0].assignee.id).toBe(leader.id);
    expect((await call('get', '/shopping/', leader.token)).body.data[0].assignee.id).toBe(leader.id);
  });

  it('chuyển quyền trưởng nhóm; trưởng nhóm rời đi một mình thì nhóm được lưu trữ', async () => {
    const { leader, members: [m1], groupId } = await newFamily(1);
    const outsider = await newUser();
    expect((await call('put', '/user/group/leader/', leader.token).send({ username: outsider.username })).body.code).toBe('NOT_FOUND');
    expect((await call('put', '/user/group/leader/', leader.token).send({ username: leader.username })).body.code).toBe('00279');
    const res = await call('put', '/user/group/leader/', leader.token).send({ username: m1.username });
    expect(res.body.data.members.find((m) => m.id === m1.id).role).toMatch(/leader|Trưởng/i);
    // Người cũ giờ là thành viên: không thêm người được nữa.
    expect((await call('post', '/user/group/add/', leader.token).send({ username: outsider.username })).body.code).toBe('00284');

    await call('post', '/user/group/leave/', leader.token);
    await call('post', '/user/group/leave/', m1.token);
    expect((await queryOne('SELECT archived_at FROM family_groups WHERE id = $1', [groupId])).archived_at).not.toBeNull();
    expect((await call('post', '/user/group/', m1.token).send({ name: 'Nhóm mới' })).status).toBe(201);
  });
});

describe.skipIf(!hasDb)('Bữa ăn · nấu từ đồ trong tủ, xem theo tuần', () => {
  it('nấu món theo công thức: trừ nguyên liệu theo khẩu phần, hạn gần dùng trước', async () => {
    const { leader } = await newFamily();
    const rid = await recipeId('Trứng chiên cà chua');
    await call('post', '/fridge/', leader.token).send({ foodName: 'Trứng gà', quantity: 4, useWithin: 10 });
    const soon = (await call('post', '/fridge/', leader.token).send({ foodName: 'Trứng gà', quantity: 4, useWithin: 1 })).body.data;
    await call('post', '/fridge/', leader.token).send({ foodName: 'Cà chua', quantity: 0.1 });
    const meal = (await call('post', '/meal/', leader.token).send({ recipeId: rid, mealType: 'breakfast', servings: 4 })).body.data;

    // Công thức cho 2 người, nấu 4 người: cần 6 trứng, 0.4 kg cà chua; hành lá là tùy chọn nên không tính thiếu.
    const short = await call('post', '/meal/cook/', leader.token).send({ planId: meal.id });
    expect(short.body.code).toBe('00279');
    expect(short.body.data.missing).toEqual([{ foodName: 'Cà chua', unitName: 'kg', need: 0.4, have: 0.1 }]);
    expect(await stock(leader.token, 'Trứng gà')).toBe(8);

    const ok = await call('post', '/meal/cook/', leader.token).send({ planId: meal.id, force: true });
    expect(ok.body.data.meal.status).toBe('cooked');
    expect(ok.body.data.used).toEqual(expect.arrayContaining([{ foodName: 'Trứng gà', quantity: 6, unitName: 'quả' }]));
    const eggs = (await call('get', '/fridge/Trứng gà/', leader.token)).body.data;
    expect(eggs).toHaveLength(1);
    expect(eggs[0]).toMatchObject({ quantity: 2 });
    expect(eggs[0].id).not.toBe(soon.id);
    expect(await stock(leader.token, 'Cà chua')).toBe(0);

    expect((await call('post', '/meal/cook/', leader.token).send({ planId: meal.id })).body.code).toBe('CONFLICT');
    const report = (await call('get', '/report/', leader.token)).body.data;
    expect(report.foods.find((f) => f.foodName === 'Trứng gà').consumed).toBe(6);
    // Xóa món đã nấu: giữ lịch sử tiêu thụ, chỉ hủy.
    expect((await call('delete', '/meal/', leader.token).send({ planId: meal.id })).body.code).toBe('00000');
    expect((await queryOne('SELECT item_status FROM meal_plan_items WHERE id = $1', [meal.id])).item_status).toBe('cancelled');
  });

  it('món là thực phẩm: trừ số lượng gửi kèm', async () => {
    const { leader } = await newFamily();
    await call('post', '/fridge/', leader.token).send({ foodName: 'Trứng gà', quantity: 1, unit: 'hộp' });
    const meal = (await call('post', '/meal/', leader.token).send({ foodName: 'Trứng gà', mealType: 'lunch' })).body.data;
    const res = await call('post', '/meal/cook/', leader.token).send({ planId: meal.id, quantity: 3 });
    expect(res.body.data.used).toEqual([{ foodName: 'Trứng gà', quantity: 3, unitName: 'quả' }]);
    expect(await stock(leader.token, 'Trứng gà')).toBe(7);
  });

  it('xem theo tuần; khoảng ngày sai hoặc quá dài bị từ chối', async () => {
    const { leader } = await newFamily();
    await call('post', '/meal/', leader.token).send({ mealName: 'Phở', date: '2099-03-02', mealType: 'sáng' });
    await call('post', '/meal/', leader.token).send({ mealName: 'Cơm', date: '2099-03-06', mealType: 'tối' });
    const week = await call('get', '/meal/', leader.token).query({ from: '2099-03-02', to: '2099-03-08' });
    expect(week.body.data.map((m) => m.mealName)).toEqual(['Phở', 'Cơm']);
    expect((await call('get', '/meal/', leader.token).query({ from: '2099-03-08', to: '2099-03-02' })).body.code).toBe('00279');
    expect((await call('get', '/meal/', leader.token).query({ from: '2099-01-01', to: '2099-12-31' })).body.code).toBe('00279');
    expect((await call('get', '/report/', leader.token).query({ from: '2099-03-08', to: '2099-03-02' })).body.code).toBe('00279');
  });
});

describe.skipIf(!hasDb)('Hộp thư thông báo', () => {
  beforeEach(async () => {
    await query("UPDATE notifications SET status = 'CANCELLED' WHERE status IN ('PENDING', 'RETRY_WAIT')");
  });
  afterAll(() => setGateways({ push: logPush }));

  it('xem thông báo nhắc hết hạn, đánh dấu đã đọc', async () => {
    const { leader, members: [m1] } = await newFamily(1);
    await call('post', '/fridge/', leader.token).send({ foodName: 'Thịt gà', quantity: 1, useWithin: 1 });
    await call('post', '/fridge/', leader.token).send({ foodName: 'Cá hồi', quantity: 1, useWithin: 2 });
    await scanExpiring(3);

    const inbox = await call('get', '/notification/', leader.token);
    expect(inbox.body.data).toMatchObject({ total: 2, unread: 2 });
    expect(inbox.body.data.notifications[0]).toMatchObject({ type: 'EXPIRY_SOON', isRead: false, foodName: expect.any(String) });

    const one = inbox.body.data.notifications[0].id;
    expect((await call('put', '/notification/read/', leader.token).send({ ids: [one] })).body.data.updated).toEqual([one]);
    expect((await call('get', '/notification/', leader.token).query({ unread: true })).body.data).toMatchObject({ total: 1, unread: 1 });
    // Không đánh dấu được thông báo của người khác.
    const others = (await call('get', '/notification/', m1.token)).body.data.notifications.map((n) => n.id);
    expect((await call('put', '/notification/read/', leader.token).send({ ids: others })).body.data.updated).toEqual([]);
    await call('put', '/notification/read/', leader.token).send({});
    expect((await call('get', '/notification/', leader.token)).body.data.unread).toBe(0);
  });

  it('đã gia hạn sau khi thông báo được tạo thì không gửi nữa', async () => {
    const sent = [];
    setGateways({ push: { sendToTokens: async (tokens, msg) => (sent.push(msg), { successCount: tokens.length, invalidTokens: [], error: null }) } });
    const { leader } = await newFamily();
    await call('put', '/user/device/', leader.token).send({ token: `tok-ext-${leader.id}` });
    const item = (await call('post', '/fridge/', leader.token).send({ foodName: 'Thịt lợn', quantity: 1, useWithin: 1 })).body.data;
    await scanExpiring(3);
    await call('put', '/fridge/', leader.token).send({ itemId: item.id, newUseWithin: 30 });
    await dispatchDue(500);
    const row = await queryOne('SELECT status FROM notifications WHERE user_id = $1', [leader.id]);
    expect(row.status).toBe('CANCELLED');
    expect(sent).toHaveLength(0);
  });
});

describe.skipIf(!hasDb)('Quản trị · danh mục thực phẩm chung và cấu hình', () => {
  it('admin thêm / sửa / xóa thực phẩm chung; nhóm thấy nhưng không sửa được', async () => {
    const admin = await newUser({ role: 'admin' });
    const { leader } = await newFamily();
    const name = `Nấm ${Date.now()}`;
    const created = await call('post', '/admin/food/', admin.token).send({ name, categoryName: 'Rau củ', unitName: 'kg', units: [{ unitName: 'g', factor: 0.001 }] });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ name, isGlobal: true });

    const seen = (await call('get', '/food/', leader.token).query({ q: name })).body.data.foods;
    expect(seen).toEqual([expect.objectContaining({ name, isGlobal: true })]);
    expect((await call('put', '/food/', leader.token).send({ name, newName: 'X' })).body.code).toBe('00284');
    expect((await call('post', '/food/', leader.token).send({ name, categoryName: 'Rau củ', unitName: 'kg' })).body.code).toBe('CONFLICT');

    const upd = await call('put', '/admin/food/', admin.token).send({ name, newCategory: 'Khác' });
    expect(upd.body.data.categoryName).toBe('Khác');
    expect((await call('get', '/admin/food/', admin.token).query({ q: name })).body.data).toHaveLength(1);
    expect((await call('post', '/admin/food/', admin.token).send({ name, categoryName: 'Khác', unitName: 'kg' })).body.code).toBe('CONFLICT');
    expect((await call('delete', '/admin/food/', admin.token).send({ name })).body.code).toBe('00000');
    expect((await call('get', '/food/', leader.token).query({ q: name })).body.data.foods).toEqual([]);
    expect((await call('get', '/admin/food/', leader.token)).body.code).toBe('00019');
  });

  it('cấu hình hệ thống: xem, sửa, kiểm tra giá trị, về mặc định', async () => {
    const admin = await newUser({ role: 'admin' });
    const list = await call('get', '/admin/config/', admin.token);
    expect(list.body.data.find((c) => c.key === 'expiry_days')).toMatchObject({ value: 3, isDefault: true });

    const upd = await call('put', '/admin/config/', admin.token).send({ expiryDays: 5, suggest_limit: '4' });
    expect(upd.body.data.find((c) => c.key === 'expiry_days')).toMatchObject({ value: 5, isDefault: false });
    expect(upd.body.data.find((c) => c.key === 'suggest_limit').value).toBe(4);
    expect((await call('put', '/admin/config/', admin.token).send({ key: 'expiry_days', value: 99 })).body.code).toBe('00279');
    expect((await call('put', '/admin/config/', admin.token).send({ khongCo: 1 })).body.code).toBe('00279');
    expect((await call('put', '/admin/config/', admin.token).send({})).body.code).toBe('00279');

    const reset = await call('put', '/admin/config/', admin.token).send({ expiryDays: null, suggestLimit: null });
    expect(reset.body.data.find((c) => c.key === 'expiry_days')).toMatchObject({ value: 3, isDefault: true });
    const user = await newUser();
    expect((await call('put', '/admin/config/', user.token).send({ expiryDays: 1 })).body.code).toBe('00019');
  });
});
