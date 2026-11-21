import { query, queryOne } from '../config/db.js';

const ITEM_SELECT = `
  SELECT i.*, p.plan_date::text AS plan_date, p.meal_type, f.name AS food_name, r.title AS recipe_title
  FROM meal_plan_items i
  JOIN meal_plans p ON p.id = i.meal_plan_id
  LEFT JOIN foods f ON f.id = i.food_id
  LEFT JOIN recipes r ON r.id = i.recipe_id`;

const ORDER = `ORDER BY p.plan_date, CASE p.meal_type WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 ELSE 3 END, i.id`;

export const listByDates = (groupId, from, to, db) =>
  query(`${ITEM_SELECT} WHERE i.group_id = $1 AND p.plan_date BETWEEN $2 AND $3 AND i.item_status <> 'cancelled' ${ORDER}`, [groupId, from, to], db);

export const findItem = (groupId, id, db) => queryOne(`${ITEM_SELECT} WHERE i.group_id = $1 AND i.id = $2`, [groupId, id], db);

/** Lấy (hoặc tạo) bữa (nhóm, ngày, sáng/trưa/tối). */
export const upsertPlan = ({ groupId, date, mealType, createdBy }, db) =>
  queryOne(
    `INSERT INTO meal_plans (group_id, plan_date, meal_type, created_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT (group_id, plan_date, meal_type) DO UPDATE SET updated_at = now() RETURNING id`,
    [groupId, date, mealType, createdBy],
    db,
  );

export const insertItem = ({ planId, groupId, recipeId, foodId, title, servings, note }, db) =>
  queryOne(
    `INSERT INTO meal_plan_items (meal_plan_id, group_id, recipe_id, food_id, title, planned_servings, note)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 1), $7) RETURNING id`,
    [planId, groupId, recipeId ?? null, foodId ?? null, title ?? null, servings ?? null, note ?? null],
    db,
  );

export const updateItem = (id, { planId, recipeId, foodId, title, servings, note }, db) =>
  query(
    `UPDATE meal_plan_items SET meal_plan_id = COALESCE($2, meal_plan_id), recipe_id = COALESCE($3, recipe_id),
       food_id = COALESCE($4, food_id), title = COALESCE($5, title), planned_servings = COALESCE($6, planned_servings),
       note = COALESCE($7, note)
     WHERE id = $1`,
    [id, planId ?? null, recipeId ?? null, foodId ?? null, title ?? null, servings ?? null, note ?? null],
    db,
  );

export const deleteItem = (id, db) => query('DELETE FROM meal_plan_items WHERE id = $1', [id], db);

export const itemReferencedByLogs = async (id, db) =>
  Boolean(await queryOne('SELECT 1 FROM inventory_logs WHERE meal_plan_item_id = $1 LIMIT 1', [id], db));

export const cancelItem = (id, db) => query("UPDATE meal_plan_items SET item_status = 'cancelled' WHERE id = $1", [id], db);
