import { describe, it, expect } from 'vitest';
import { hasDb, call, newFamily } from '../helpers.js';

describe.skipIf(!hasDb)('Nhóm 6 · Thực phẩm', () => {
  it('GET food/ trả danh mục chung + category + unit (dạng app đọc được)', async () => {
    const { leader } = await newFamily();
    const res = await call('get', '/food/', leader.token);
    expect(res.body.data.foods.find((f) => f.name === 'Trứng gà')).toMatchObject({ categoryName: 'Trứng & sữa', unitName: 'quả', isGlobal: true });
    expect(res.body.data.categories.map((c) => c.name)).toContain('Thịt');
    expect(res.body.data.units.map((u) => u.name)).toContain('kg');
    expect((await call('get', '/food/unit/', leader.token)).body.data.length).toBeGreaterThan(5);
    expect((await call('get', '/food/category/', leader.token)).body.data.length).toBeGreaterThan(5);
  });

  it('tạo thực phẩm riêng của nhóm (form-data có ảnh), nhóm khác không thấy', async () => {
    const a = await newFamily();
    const b = await newFamily();
    const png = Buffer.from('89504e470d0a1a0a', 'hex');
    const res = await call('post', '/food/', a.leader.token)
      .field('name', 'Chả lụa')
      .field('foodCategoryName', 'Thịt')
      .field('unitName', 'kg')
      .attach('image', png, { filename: 'c.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Chả lụa', categoryName: 'Thịt', unitName: 'kg', isGlobal: false });
    expect(res.body.data.imageUrl).toContain('/uploads/foods/');

    const dup = await call('post', '/food/', a.leader.token).send({ name: 'chả lụa', categoryName: 'Thịt', unitName: 'kg' });
    expect(dup.body.code).toBe('00151');
    expect((await call('post', '/food/', a.leader.token).send({ name: 'Trứng gà', categoryName: 'Thịt', unitName: 'kg' })).body.code).toBe('00151');
    expect((await call('post', '/food/', a.leader.token).send({ name: 'X', categoryName: 'Không có', unitName: 'kg' })).body.code).toBe('00155');

    const other = await call('get', '/food/', b.leader.token);
    expect(other.body.data.foods.map((f) => f.name)).not.toContain('Chả lụa');
  });

  it('sửa và xóa thực phẩm của nhóm; không sửa được danh mục chung', async () => {
    const { leader } = await newFamily();
    await call('post', '/food/', leader.token).send({ name: 'Nem chua', categoryName: 'Thịt', unitName: 'cái' });
    const upd = await call('put', '/food/', leader.token).send({ name: 'Nem chua', newName: 'Nem chua Thanh Hóa', newCategory: 'Khác' });
    expect(upd.body.data).toMatchObject({ name: 'Nem chua Thanh Hóa', categoryName: 'Khác' });
    expect((await call('put', '/food/', leader.token).send({ name: 'Thịt bò', newName: 'Bò' })).body.code).toBe('00167');

    await call('delete', '/food/', leader.token).send({ name: 'Nem chua Thanh Hóa' }).expect(200);
    expect((await call('delete', '/food/', leader.token).send({ name: 'Nem chua Thanh Hóa' })).body.code).toBe('00180');
  });
});
