import { describe, it, expect } from 'vitest';
import { hasDb, call, newFamily } from '../helpers.js';
import { query } from '../../src/config/db.js';

describe.skipIf(!hasDb)('Nhóm 7 · Tủ lạnh', () => {
  it('thêm theo payload của app (foodId, expiryDate, nhãn tiếng Việt)', async () => {
    const { leader } = await newFamily();
    const catalog = await call('get', '/food/', leader.token);
    const egg = catalog.body.data.foods.find((f) => f.name === 'Trứng gà');
    const res = await call('post', '/fridge/', leader.token).send({
      foodId: String(egg.id), foodName: 'Trứng gà', quantity: '6', unit: 'quả', expiryDate: '2099-01-31', storageLocation: 'Ngăn đông',
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ foodName: 'Trứng gà', quantity: 6, unitName: 'quả', expiryDate: '2099-01-31', storageLocation: 'Ngăn đông', storageCode: 'freezer', status: 'fresh' });
  });

  it('thêm theo tài liệu (foodName + useWithin), quy đổi đơn vị', async () => {
    const { leader } = await newFamily();
    const res = await call('post', '/fridge/', leader.token).send({ foodName: 'Sữa tươi', quantity: 500, unit: 'ml', useWithin: 2 });
    expect(res.body.data).toMatchObject({ quantity: 0.5, unitName: 'lít', useWithin: 2, status: 'expiring' });
    const hop = await call('post', '/fridge/', leader.token).send({ foodName: 'Trứng gà', quantity: 1, unit: 'hộp' });
    expect(hop.body.data.quantity).toBe(10);
    const bad = await call('post', '/fridge/', leader.token).send({ foodName: 'Trứng gà', quantity: 1, unit: 'kg' });
    expect(bad.body).toMatchObject({ code: '00279', message: expect.stringContaining('không dùng được') });
  });

  it('lỗi: thiếu thực phẩm, sai số lượng, không tìm thấy (kèm gợi ý)', async () => {
    const { leader } = await newFamily();
    expect((await call('post', '/fridge/', leader.token).send({ quantity: 1 })).body.code).toBe('00279');
    expect((await call('post', '/fridge/', leader.token).send({ foodName: 'Trứng gà', quantity: -1 })).body.code).toBe('00279');
    const nf = await call('post', '/fridge/', leader.token).send({ foodName: 'Trứng', quantity: 1 });
    expect(nf.body).toMatchObject({ code: 'NOT_FOUND', data: { suggestions: expect.arrayContaining(['Trứng gà']) } });
  });

  it('Idempotency-Key: gửi lại không thêm trùng', async () => {
    const { leader } = await newFamily();
    const send = () => call('post', '/fridge/', leader.token).set('Idempotency-Key', 'abc-1').send({ foodName: 'Táo', quantity: 1 });
    const a = await send();
    const b = await send();
    expect(b.body.data.id).toBe(a.body.data.id);
    expect((await call('get', '/fridge/', leader.token)).body.data).toHaveLength(1);
  });

  it('sửa số lượng ghi lịch sử; xem theo tên; lọc; xóa theo foodName', async () => {
    const { leader, members: [m1] } = await newFamily(1);
    const item = (await call('post', '/fridge/', leader.token).send({ foodName: 'Thịt bò', quantity: 1, useWithin: 5 })).body.data;
    await call('post', '/fridge/', m1.token).send({ foodName: 'Thịt bò', quantity: 0.5, storageLocation: 'freezer' });
    await call('post', '/fridge/', m1.token).send({ foodName: 'Gạo', quantity: 5, storageLocation: 'Tủ bếp' });

    const upd = await call('put', '/fridge/', m1.token).send({ itemId: item.id, newQuantity: 0.4, newUseWithin: 1, newNote: 'ngăn trên' });
    expect(upd.body.data).toMatchObject({ quantity: 0.4, useWithin: 1, note: 'ngăn trên' });
    const logs = await query("SELECT event_type, quantity_base FROM inventory_logs WHERE fridge_item_id = $1 ORDER BY id", [item.id]);
    expect(logs.map((l) => l.event_type)).toEqual(['add', 'consume']);
    expect(logs[1].quantity_base).toBeCloseTo(0.6);

    expect((await call('get', '/fridge/Thịt bò/', leader.token)).body.data).toHaveLength(2);
    expect((await call('get', '/fridge/', leader.token).query({ location: 'Tủ bếp' })).body.data.map((i) => i.foodName)).toEqual(['Gạo']);
    expect((await call('put', '/fridge/', leader.token).send({ itemId: 999999, newQuantity: 1 })).body.code).toBe('NOT_FOUND');

    const del = await call('delete', '/fridge/', leader.token).send({ foodName: 'Thịt bò' });
    expect(del.body.data.deleted).toHaveLength(2);
    expect((await call('get', '/fridge/', leader.token)).body.data.map((i) => i.foodName)).toEqual(['Gạo']);
  });

  it('nhóm khác không đụng được món trong tủ', async () => {
    const a = await newFamily();
    const b = await newFamily();
    const item = (await call('post', '/fridge/', a.leader.token).send({ foodName: 'Cam', quantity: 1 })).body.data;
    expect((await call('delete', '/fridge/', b.leader.token).send({ itemId: item.id })).body.code).toBe('NOT_FOUND');
  });
});
