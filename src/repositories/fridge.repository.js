import { query, queryOne } from '../config/db.js';

const ITEM_SELECT = `
  SELECT i.*, f.name AS food_name, f.image_url, f.base_unit_id, c.name AS category_name, u.name AS unit_name
  FROM fridge_items i
  JOIN foods f ON f.id = i.food_id
  JOIN categories c ON c.id = f.category_id
  JOIN units u ON u.id = f.base_unit_id`;

/** "Hôm nay" theo múi giờ của nhóm. */
export const today = async (timeZone, db) =>
  (await queryOne('SELECT (now() AT TIME ZONE $1)::date::text AS d', [timeZone], db)).d;

export const listItems = (groupId, { q, category, location, foodId } = {}, db) =>
  query(
    `${ITEM_SELECT}
     WHERE i.group_id = $1 AND i.quantity_base > 0
       AND ($2::text IS NULL OR f.name ILIKE '%' || $2 || '%')
       AND ($3::text IS NULL OR lower(c.name) = lower($3))
       AND ($4::text IS NULL OR i.storage_location = $4)
       AND ($5::bigint IS NULL OR i.food_id = $5)
     ORDER BY i.expires_on NULLS LAST, f.name, i.id`,
    [groupId, q ?? null, category ?? null, location ?? null, foodId ?? null],
    db,
  );

export const findItem = (groupId, id, db, { lock = false } = {}) =>
  queryOne(`${ITEM_SELECT} WHERE i.group_id = $1 AND i.id = $2${lock ? ' FOR UPDATE OF i' : ''}`, [groupId, id], db);

export const insertItem = ({ groupId, foodId, quantityBase, expiresOn, location, note }, db) =>
  queryOne(
    `INSERT INTO fridge_items (group_id, food_id, quantity_base, expires_on, storage_location, location_note)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'fridge'), $6) RETURNING id`,
    [groupId, foodId, quantityBase, expiresOn ?? null, location ?? null, note ?? null],
    db,
  );

export const updateItem = (id, { foodId, quantityBase, expiresOn, clearExpiry, location, note }, db) =>
  query(
    `UPDATE fridge_items SET
       food_id = COALESCE($2, food_id),
       quantity_base = COALESCE($3, quantity_base),
       expires_on = CASE WHEN $5 THEN NULL ELSE COALESCE($4, expires_on) END,
       storage_location = COALESCE($6, storage_location),
       location_note = COALESCE($7, location_note),
       updated_at = now()
     WHERE id = $1`,
    [id, foodId ?? null, quantityBase ?? null, expiresOn ?? null, Boolean(clearExpiry), location ?? null, note ?? null],
    db,
  );

/**
 * Cộng vào món cùng thực phẩm, cùng hạn dùng, cùng nơi để (nếu có), không thì tạo mới.
 * Khóa dòng để hai lần "đã mua" cùng lúc không cộng lệch.
 */
export async function addToStock({ groupId, foodId, quantityBase, expiresOn, location }, db) {
  const existing = await queryOne(
    `SELECT id FROM fridge_items
     WHERE group_id = $1 AND food_id = $2 AND storage_location = $3 AND expires_on IS NOT DISTINCT FROM $4::date AND quantity_base > 0
     ORDER BY id LIMIT 1 FOR UPDATE`,
    [groupId, foodId, location, expiresOn ?? null],
    db,
  );
  if (existing) {
    await query('UPDATE fridge_items SET quantity_base = quantity_base + $2, updated_at = now() WHERE id = $1', [existing.id, quantityBase], db);
    return existing.id;
  }
  return (await insertItem({ groupId, foodId, quantityBase, expiresOn, location }, db)).id;
}

/**
 * Ghi lịch sử kho. idempotency_key trùng thì bỏ qua (chống ghi đôi khi app gửi lại).
 * @returns {Promise<boolean>} true nếu đã ghi dòng mới
 */
export async function insertLog(log, db) {
  const row = await queryOne(
    `INSERT INTO inventory_logs (group_id, fridge_item_id, food_id, shopping_list_item_id, meal_plan_item_id,
       actor_id, event_type, quantity_base, total_cost, reason, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (group_id, idempotency_key) DO NOTHING RETURNING id`,
    [
      log.groupId, log.fridgeItemId, log.foodId, log.shoppingListItemId ?? null, log.mealPlanItemId ?? null,
      log.actorId, log.eventType, log.quantityBase, log.totalCost ?? null, log.reason ?? null, log.idempotencyKey,
    ],
    db,
  );
  return Boolean(row);
}

export const findLogByKey = (groupId, key, db) =>
  queryOne('SELECT * FROM inventory_logs WHERE group_id = $1 AND idempotency_key = $2', [groupId, key], db);
