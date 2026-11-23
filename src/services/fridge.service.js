import { randomUUID } from 'node:crypto';
import { withTransaction } from '../config/db.js';
import * as fridge from '../repositories/fridge.repository.js';
import { resolveFood, toBaseUnit } from './catalog.service.js';
import { presentFridgeItem } from '../models/presenters.js';
import { ApiError } from '../utils/response.js';

// Nhóm 7 · Tủ lạnh. Số lượng lưu theo đơn vị gốc của thực phẩm (quantity_base).
// Mọi thay đổi số lượng đều ghi inventory_logs (phục vụ thống kê). "Xóa" đưa số lượng về 0
// và ghi 'discard' thay vì xóa dòng, vì lịch sử còn trỏ tới món đó.

function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function view(group, id, db) {
  const [item, day] = await Promise.all([fridge.findItem(group.id, id, db), fridge.today(group.timeZone, db)]);
  return presentFridgeItem(item, day);
}

export async function listItems(group, filters) {
  const [items, day] = await Promise.all([fridge.listItems(group.id, filters), fridge.today(group.timeZone)]);
  return items.map((i) => presentFridgeItem(i, day));
}

export async function getByFoodName(group, foodName) {
  const food = await resolveFood(group.id, { foodName });
  const [items, day] = await Promise.all([fridge.listItems(group.id, { foodId: food.id }), fridge.today(group.timeZone)]);
  return items.map((i) => presentFridgeItem(i, day));
}

/**
 * @param {string | undefined} idempotencyKey header Idempotency-Key: app gửi lại cùng khóa thì không thêm trùng.
 */
export async function createItem(user, group, input, idempotencyKey) {
  return withTransaction(async (db) => {
    const key = idempotencyKey ? `add:${idempotencyKey}` : `add:${randomUUID()}`;
    if (idempotencyKey) {
      const prior = await fridge.findLogByKey(group.id, key, db);
      if (prior) return view(group, prior.fridge_item_id, db);
    }
    const food = await resolveFood(group.id, input, db);
    const { quantityBase } = await toBaseUnit(food, input.quantity, input.unit, db);
    const expiresOn = input.expiryDate ?? (input.useWithin !== undefined ? addDays(await fridge.today(group.timeZone, db), input.useWithin) : null);
    const { id } = await fridge.insertItem(
      { groupId: group.id, foodId: food.id, quantityBase, expiresOn, location: input.storageLocation, note: input.note },
      db,
    );
    await fridge.insertLog(
      { groupId: group.id, fridgeItemId: id, foodId: food.id, actorId: user.id, eventType: 'add', quantityBase, idempotencyKey: key },
      db,
    );
    return view(group, id, db);
  });
}

export async function updateItem(user, group, input) {
  return withTransaction(async (db) => {
    const item = await fridge.findItem(group.id, input.itemId, db, { lock: true });
    if (!item || item.quantity_base <= 0) throw new ApiError('NOT_FOUND', { message: 'Không tìm thấy món trong tủ lạnh' });

    let next = null;
    if (input.newFoodName) {
      next = await resolveFood(group.id, { foodName: input.newFoodName }, db);
      if (next.id === item.food_id) next = null;
      else if (next.base_unit_id !== item.base_unit_id) {
        throw new ApiError('BAD_REQUEST', { message: 'Chỉ đổi được sang thực phẩm cùng đơn vị gốc' });
      }
    }
    const foodId = next?.id;
    const unitFood = next ?? { id: item.food_id, name: item.food_name, unit_name: item.unit_name, base_unit_id: item.base_unit_id };
    const qty = input.newQuantity !== undefined ? (await toBaseUnit(unitFood, input.newQuantity, input.newUnit, db)).quantityBase : undefined;
    const expiresOn = input.newExpiryDate ?? (input.newUseWithin !== undefined ? addDays(await fridge.today(group.timeZone, db), input.newUseWithin) : undefined);

    if (foodId) {
      // Đổi thực phẩm: bỏ khỏi kho món cũ, thêm vào món mới để lịch sử khớp.
      const keep = qty ?? item.quantity_base;
      await fridge.insertLog({ groupId: group.id, fridgeItemId: item.id, foodId: item.food_id, actorId: user.id, eventType: 'adjust_out', quantityBase: item.quantity_base, reason: 'Đổi thực phẩm', idempotencyKey: `upd:${randomUUID()}` }, db);
      await fridge.updateItem(item.id, { foodId, quantityBase: keep, expiresOn, location: input.newStorageLocation, note: input.newNote }, db);
      await fridge.insertLog({ groupId: group.id, fridgeItemId: item.id, foodId, actorId: user.id, eventType: 'adjust_in', quantityBase: keep, reason: 'Đổi thực phẩm', idempotencyKey: `upd:${randomUUID()}` }, db);
    } else {
      await fridge.updateItem(item.id, { quantityBase: qty, expiresOn, location: input.newStorageLocation, note: input.newNote }, db);
      if (qty !== undefined && qty !== item.quantity_base) {
        const diff = qty - item.quantity_base;
        await fridge.insertLog(
          {
            groupId: group.id, fridgeItemId: item.id, foodId: item.food_id, actorId: user.id,
            // Giảm số lượng = đã dùng (tính vào thống kê tiêu thụ); tăng = điều chỉnh, cần lý do.
            eventType: diff < 0 ? 'consume' : 'adjust_in',
            quantityBase: Math.abs(diff),
            reason: diff < 0 ? null : 'Cập nhật số lượng',
            idempotencyKey: `upd:${randomUUID()}`,
          },
          db,
        );
      }
    }
    return view(group, item.id, db);
  });
}

export async function deleteItems(user, group, { itemId, foodName }) {
  return withTransaction(async (db) => {
    let items;
    if (itemId) {
      const item = await fridge.findItem(group.id, itemId, db, { lock: true });
      items = item && item.quantity_base > 0 ? [item] : [];
    } else {
      const food = await resolveFood(group.id, { foodName }, db);
      items = await fridge.listItems(group.id, { foodId: food.id }, db);
    }
    if (items.length === 0) throw new ApiError('NOT_FOUND', { message: 'Không tìm thấy món trong tủ lạnh' });
    for (const item of items) {
      await fridge.insertLog(
        { groupId: group.id, fridgeItemId: item.id, foodId: item.food_id, actorId: user.id, eventType: 'discard', quantityBase: item.quantity_base, idempotencyKey: `del:${item.id}:${randomUUID()}` },
        db,
      );
      await fridge.updateItem(item.id, { quantityBase: 0 }, db);
    }
    return { deleted: items.map((i) => i.id) };
  });
}
