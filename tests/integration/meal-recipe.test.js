import { describe, it, expect } from 'vitest';
import { hasDb, call, newFamily } from '../helpers.js';

describe.skipIf(!hasDb)('Nhóm 9 · Bữa ăn', () => {
  it('app gọi PUT không có planId để thêm món; tài liệu gọi POST với foodName + name', async () => {
    const { leader } = await newFamily();
    const app = await call('put', '/meal/', leader.token).send({ mealName: 'Phở bò', date: '2099-03-01', mealType: 'Bữa trưa' });
    expect(app.body.data).toMatchObject({ mealName: 'Phở bò', date: '2099-03-01', mealType: 'Bữa trưa', mealTypeCode: 'lunch' });

    const doc = await call('post', '/meal/', leader.token).send({ foodName: 'Thịt gà', timestamp: '2099-03-01T12:00:00+07:00', name: 'tối' });
    expect(doc.status).toBe(201);
    expect(doc.body.data).toMatchObject({ foodName: 'Thịt gà', mealTypeCode: 'dinner', date: '2099-03-01' });

    const day = await call('get', '/meal/', leader.token).query({ date: '2099-03-01' });
    expect(day.body.data.map((m) => m.mealTypeCode)).toEqual(['lunch', 'dinner']);

    expect((await call('post', '/meal/', leader.token).send({ date: '2099-03-01', mealType: 'lunch' })).body.code).toBe('00313');
    expect((await call('post', '/meal/', leader.token).send({ mealName: 'X', mealType: 'bữa khuya' })).body.code).toBe('00316');
  });

  it('sửa (đổi ngày, đổi bữa) và xóa', async () => {
    const { leader } = await newFamily();
    const m = (await call('post', '/meal/', leader.token).send({ mealName: 'Cơm rang', date: '2099-04-01', mealType: 'breakfast' })).body.data;
    const upd = await call('put', '/meal/', leader.token).send({ planId: m.planId, newTimestamp: '2099-04-02', newName: 'trưa', newMealName: 'Cơm rang dưa bò' });
    expect(upd.body.data).toMatchObject({ date: '2099-04-02', mealTypeCode: 'lunch', mealName: 'Cơm rang dưa bò' });
    expect((await call('get', '/meal/', leader.token).query({ date: '2099-04-01' })).body.data).toHaveLength(0);
    await call('delete', '/meal/', leader.token).send({ planId: m.planId }).expect(200);
    expect((await call('delete', '/meal/', leader.token).send({ planId: m.planId })).body.code).toBe('00325');
  });
});

describe.skipIf(!hasDb)('Nhóm 10 · Công thức + gợi ý món', () => {
  it('tạo, lấy theo foodId, sửa, xóa', async () => {
    const { leader } = await newFamily();
    const res = await call('post', '/recipe/', leader.token).send({
      name: 'Gà luộc lá chanh', foodName: 'Thịt gà', htmlContent: '<p>Luộc gà 30 phút</p>', description: 'Đơn giản', cookMinutes: 30,
      ingredients: [{ foodName: 'Muối', quantity: 5, unit: 'g', optional: true }],
    });
    expect(res.status).toBe(201);
    const r = res.body.data;
    expect(r).toMatchObject({ name: 'Gà luộc lá chanh', duration: '30 phút', isGlobal: false });
    expect(r.ingredients.map((g) => g.foodName)).toEqual(['Thịt gà', 'Muối']);

    const chicken = r.ingredients[0].foodId;
    const byFood = await call('get', '/recipe/', leader.token).query({ foodId: chicken });
    expect(byFood.body.data.map((x) => x.id)).toContain(r.id);
    expect((await call('get', '/recipe/', leader.token)).body.data.length).toBeGreaterThan(5);

    const upd = await call('put', '/recipe/', leader.token).send({ recipeId: r.id, newName: 'Gà luộc', newHtmlContent: '<p>Mới</p>' });
    expect(upd.body.data).toMatchObject({ name: 'Gà luộc', htmlContent: '<p>Mới</p>' });

    const global = byFood.body.data.find((x) => x.isGlobal) ?? (await call('get', '/recipe/', leader.token)).body.data.find((x) => x.isGlobal);
    expect((await call('delete', '/recipe/', leader.token).send({ recipeId: global.id })).body.code).toBe('00017');
    await call('delete', '/recipe/', leader.token).send({ recipeId: r.id }).expect(200);
    expect((await call('get', '/recipe/', leader.token).query({ foodId: chicken })).body.data.map((x) => x.id)).not.toContain(r.id);
    expect((await call('post', '/recipe/', leader.token).send({ name: 'Thiếu nội dung' })).body.code).toBe('00349');
  });

  it('gợi ý món: ưu tiên công thức có đủ nguyên liệu trong tủ', async () => {
    const { leader } = await newFamily();
    await call('post', '/fridge/', leader.token).send({ foodName: 'Trứng gà', quantity: 6, useWithin: 1 });
    await call('post', '/fridge/', leader.token).send({ foodName: 'Cà chua', quantity: 0.5 });
    const res = await call('get', '/recipe/suggest/', leader.token);
    const top = res.body.data[0];
    expect(top.canCook).toBe(true);
    expect(['Trứng chiên cà chua', 'Canh cà chua trứng']).toContain(top.recipe.name);
    expect(top.usesExpiring).toContain('Trứng gà');
  });
});
