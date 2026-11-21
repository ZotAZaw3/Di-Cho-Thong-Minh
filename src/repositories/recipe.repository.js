import { query, queryOne } from '../config/db.js';

export const listRecipes = (groupId, { foodId, q }, db) =>
  query(
    `SELECT r.* FROM recipes r
     WHERE r.is_active AND (r.group_id IS NULL OR r.group_id = $1)
       AND ($2::bigint IS NULL OR EXISTS (SELECT 1 FROM recipe_ingredients g WHERE g.recipe_id = r.id AND g.food_id = $2))
       AND ($3::text IS NULL OR r.title ILIKE '%' || $3 || '%')
     ORDER BY r.title, r.id`,
    [groupId, foodId ?? null, q ?? null],
    db,
  );

export const findRecipe = (groupId, id, db) =>
  queryOne('SELECT * FROM recipes WHERE is_active AND (group_id IS NULL OR group_id = $1) AND id = $2', [groupId, id], db);

export const ingredientsOf = (recipeIds, db) =>
  recipeIds.length === 0
    ? []
    : query(
        `SELECT g.*, f.name AS food_name, u.name AS unit_name, fu.factor_to_base
         FROM recipe_ingredients g JOIN foods f ON f.id = g.food_id JOIN units u ON u.id = g.unit_id
         JOIN food_units fu ON fu.food_id = g.food_id AND fu.unit_id = g.unit_id
         WHERE g.recipe_id = ANY($1::bigint[]) ORDER BY g.is_optional, f.name`,
        [recipeIds],
        db,
      );

export const insertRecipe = (r, db) =>
  queryOne(
    `INSERT INTO recipes (group_id, created_by, title, description, steps, base_servings, prep_minutes, cook_minutes, image_url)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 1), COALESCE($7, 0), COALESCE($8, 0), $9) RETURNING id`,
    [r.groupId, r.createdBy, r.title, r.description ?? null, r.steps, r.servings ?? null, r.prepMinutes ?? null, r.cookMinutes ?? null, r.imageUrl ?? null],
    db,
  );

export const updateRecipe = (id, r, db) =>
  query(
    `UPDATE recipes SET title = COALESCE($2, title), description = COALESCE($3, description), steps = COALESCE($4, steps),
       base_servings = COALESCE($5, base_servings), prep_minutes = COALESCE($6, prep_minutes),
       cook_minutes = COALESCE($7, cook_minutes), image_url = COALESCE($8, image_url), updated_at = now()
     WHERE id = $1`,
    [id, r.title ?? null, r.description ?? null, r.steps ?? null, r.servings ?? null, r.prepMinutes ?? null, r.cookMinutes ?? null, r.imageUrl ?? null],
    db,
  );

export const deactivateRecipe = (id, db) => query('UPDATE recipes SET is_active = false, updated_at = now() WHERE id = $1', [id], db);

export const replaceIngredients = async (recipeId, rows, db) => {
  await query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId], db);
  for (const g of rows) {
    await query(
      `INSERT INTO recipe_ingredients (recipe_id, food_id, unit_id, quantity, is_optional, note) VALUES ($1, $2, $3, $4, $5, $6)`,
      [recipeId, g.foodId, g.unitId, g.quantity, g.optional ?? false, g.note ?? null],
      db,
    );
  }
};

/** Tổng tồn kho (đơn vị gốc) và hạn gần nhất của từng thực phẩm trong tủ của nhóm. */
export const stockByFood = (groupId, db) =>
  query(
    `SELECT food_id, sum(quantity_base) AS quantity_base, min(expires_on)::text AS nearest_expiry
     FROM fridge_items WHERE group_id = $1 AND quantity_base > 0 GROUP BY food_id`,
    [groupId],
    db,
  );
