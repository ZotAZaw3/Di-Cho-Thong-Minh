import { query, queryOne } from '../config/db.js';

// Category, unit, thực phẩm và quy đổi đơn vị (food_units).

// ----- Category -----
export const listCategories = (db) => query('SELECT id, name, description FROM categories WHERE is_active ORDER BY name', [], db);
export const findCategoryByName = (name, db) =>
  queryOne('SELECT * FROM categories WHERE is_active AND lower(name) = lower($1)', [name], db);
export const insertCategory = (name, description, db) =>
  queryOne('INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id, name, description', [name, description ?? null], db);
export const renameCategory = (id, name, db) =>
  queryOne('UPDATE categories SET name = $2 WHERE id = $1 RETURNING id, name, description', [id, name], db);
export const deactivateCategory = (id, db) => query('UPDATE categories SET is_active = false WHERE id = $1', [id], db);
export const categoryInUse = async (id, db) =>
  Boolean(await queryOne('SELECT 1 FROM foods WHERE category_id = $1 AND is_active LIMIT 1', [id], db));

// ----- Unit -----
export const listUnits = (db) => query('SELECT id, code, name FROM units WHERE is_active ORDER BY name', [], db);
export const findUnitByName = (name, db) =>
  queryOne('SELECT * FROM units WHERE is_active AND (lower(name) = lower($1) OR lower(code) = lower($1)) ORDER BY (lower(name) = lower($1)) DESC LIMIT 1', [name], db);
export const insertUnit = (code, name, db) =>
  queryOne('INSERT INTO units (code, name) VALUES ($1, $2) RETURNING id, code, name', [code, name], db);
export const renameUnit = (id, name, db) => queryOne('UPDATE units SET name = $2 WHERE id = $1 RETURNING id, code, name', [id, name], db);
export const deactivateUnit = (id, db) => query('UPDATE units SET is_active = false WHERE id = $1', [id], db);
export const codeTaken = async (code, db) => Boolean(await queryOne('SELECT 1 FROM units WHERE lower(code) = lower($1)', [code], db));
export const unitInUse = async (id, db) =>
  Boolean(
    await queryOne(
      `SELECT 1 FROM foods WHERE base_unit_id = $1 AND is_active
       UNION ALL SELECT 1 FROM food_units fu JOIN foods f ON f.id = fu.food_id WHERE fu.unit_id = $1 AND f.is_active LIMIT 1`,
      [id],
      db,
    ),
  );

// ----- Food -----
const FOOD_SELECT = `
  SELECT f.*, c.name AS category_name, u.name AS unit_name
  FROM foods f JOIN categories c ON c.id = f.category_id JOIN units u ON u.id = f.base_unit_id`;

/** Thực phẩm nhóm thấy được: danh mục chung + món riêng của nhóm. */
export const listFoods = (groupId, db) =>
  query(`${FOOD_SELECT} WHERE f.is_active AND (f.group_id IS NULL OR f.group_id = $1) ORDER BY c.name, f.name`, [groupId], db);

/** Tìm theo tên; trùng tên thì ưu tiên món riêng của nhóm. */
export const findFoodByName = (groupId, name, db) =>
  queryOne(
    `${FOOD_SELECT} WHERE f.is_active AND (f.group_id IS NULL OR f.group_id = $1) AND lower(f.name) = lower($2)
     ORDER BY f.group_id NULLS LAST LIMIT 1`,
    [groupId, name],
    db,
  );

export const findFoodById = (groupId, id, db) =>
  queryOne(`${FOOD_SELECT} WHERE f.is_active AND (f.group_id IS NULL OR f.group_id = $1) AND f.id = $2`, [groupId, id], db);

export const insertFood = ({ groupId, name, categoryId, unitId, imageUrl, createdBy }, db) =>
  queryOne(
    `INSERT INTO foods (group_id, name, category_id, base_unit_id, image_url, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [groupId, name, categoryId, unitId, imageUrl ?? null, createdBy],
    db,
  );

export const updateFood = (id, { name, categoryId, unitId, imageUrl }, db) =>
  query(
    `UPDATE foods SET name = COALESCE($2, name), category_id = COALESCE($3, category_id),
       base_unit_id = COALESCE($4, base_unit_id), image_url = COALESCE($5, image_url), updated_at = now()
     WHERE id = $1`,
    [id, name ?? null, categoryId ?? null, unitId ?? null, imageUrl ?? null],
    db,
  );

export const deactivateFood = (id, db) => query('UPDATE foods SET is_active = false, updated_at = now() WHERE id = $1', [id], db);

export const foodInStock = async (foodId, db) =>
  Boolean(
    await queryOne(
      `SELECT 1 FROM fridge_items WHERE food_id = $1 AND quantity_base > 0
       UNION ALL SELECT 1 FROM shopping_list_items WHERE food_id = $1 LIMIT 1`,
      [foodId],
      db,
    ),
  );

/** Đảm bảo food_units có dòng cho đơn vị (mặc định hệ số 1 = đơn vị gốc). */
export const ensureFoodUnit = (foodId, unitId, factor = 1, db) =>
  query(
    'INSERT INTO food_units (food_id, unit_id, factor_to_base) VALUES ($1, $2, $3) ON CONFLICT (food_id, unit_id) DO NOTHING',
    [foodId, unitId, factor],
    db,
  );

/** Hệ số quy đổi đơn vị `unitName` sang đơn vị gốc của thực phẩm; null nếu không dùng được. */
export const findFoodUnit = (foodId, unitName, db) =>
  queryOne(
    `SELECT fu.unit_id, fu.factor_to_base, u.name AS unit_name FROM food_units fu JOIN units u ON u.id = fu.unit_id
     WHERE fu.food_id = $1 AND (lower(u.name) = lower($2) OR lower(u.code) = lower($2))`,
    [foodId, unitName],
    db,
  );

/** Gợi ý tên gần giống khi không tìm thấy thực phẩm. */
export const similarFoodNames = async (groupId, name, db) =>
  (
    await query(
      `SELECT name FROM foods WHERE is_active AND (group_id IS NULL OR group_id = $1) AND name ILIKE '%' || $2 || '%'
       ORDER BY length(name), name LIMIT 3`,
      [groupId, name],
      db,
    )
  ).map((r) => r.name);
