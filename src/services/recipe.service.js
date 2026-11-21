import { withTransaction } from '../config/db.js';
import { storage } from './gateways/index.js';
import * as recipes from '../repositories/recipe.repository.js';
import { today } from '../repositories/fridge.repository.js';
import { resolveFood, toBaseUnit } from './catalog.service.js';
import { presentRecipe } from '../models/presenters.js';
import { ApiError } from '../utils/response.js';
import { getSetting } from './settings.service.js';

// Nhóm 10 · Công thức + API mở rộng #54 (gợi ý món từ đồ trong tủ lạnh).
// recipes.group_id NULL = công thức chung (seed), có giá trị = công thức của nhóm.

const notFound = () => new ApiError('NOT_FOUND', { message: 'Không tìm thấy công thức' });

async function withIngredients(rows, db) {
  const ingredients = await recipes.ingredientsOf(rows.map((r) => r.id), db);
  return rows.map((r) => presentRecipe(r, ingredients.filter((g) => g.recipe_id === r.id)));
}

/** foodName (tài liệu: món chính) + ingredients[] → các dòng recipe_ingredients. */
async function buildIngredients(group, { foodName, ingredients = [] }, db) {
  const list = [...ingredients];
  if (foodName && !list.some((g) => g.foodName?.toLowerCase() === foodName.toLowerCase())) {
    list.unshift({ foodName, quantity: 1 });
  }
  const rows = [];
  for (const g of list) {
    const food = await resolveFood(group.id, g, db);
    if (rows.some((r) => r.foodId === food.id)) continue;
    const { unitId } = await toBaseUnit(food, g.quantity ?? 1, g.unit, db);
    rows.push({ foodId: food.id, unitId, quantity: g.quantity ?? 1, optional: g.optional, note: g.note });
  }
  return rows;
}

export async function listRecipes(user, group, { foodId, q, favorite }) {
  return withIngredients(await recipes.listRecipes(group.id, { foodId, q, favorite, userId: user.id }));
}

// ----- Công thức yêu thích (đề bài: "lưu và quản lý các công thức nấu ăn yêu thích") -----

export async function addFavorite(user, group, { recipeId }) {
  if (!(await recipes.findRecipe(group.id, recipeId))) throw notFound();
  await recipes.addFavorite(user.id, recipeId);
  return (await withIngredients([await recipes.findRecipe(group.id, recipeId, undefined, user.id)]))[0];
}

export async function removeFavorite(user, group, { recipeId }) {
  const removed = await recipes.removeFavorite(user.id, recipeId);
  if (!removed) throw new ApiError('NOT_FOUND', { message: 'Công thức không có trong danh sách yêu thích' });
  return { recipeId, isFavorite: false };
}

export async function createRecipe(user, group, input, file, req) {
  const imageUrl = file ? await storage().upload('recipes', file, req) : null;
  return withTransaction(async (db) => {
    const rows = await buildIngredients(group, input, db);
    const { id } = await recipes.insertRecipe(
      {
        groupId: group.id, createdBy: user.id, title: input.name, description: input.description, steps: input.htmlContent,
        servings: input.servings, prepMinutes: input.prepMinutes, cookMinutes: input.cookMinutes, imageUrl,
      },
      db,
    );
    await recipes.replaceIngredients(id, rows, db);
    return (await withIngredients([await recipes.findRecipe(group.id, id, db)], db))[0];
  });
}

async function findOwnRecipe(group, recipeId, db) {
  const recipe = await recipes.findRecipe(group.id, recipeId, db);
  if (!recipe) throw notFound();
  if (recipe.group_id === null) throw new ApiError('FORBIDDEN', { message: 'Công thức chung chỉ admin sửa được' });
  return recipe;
}

const RECIPE_CHANGES = ['newName', 'newHtmlContent', 'newDescription', 'newFoodName', 'newServings', 'newPrepMinutes', 'newCookMinutes', 'newIngredients'];

export async function updateRecipe(group, input, file, req) {
  if (!file && RECIPE_CHANGES.every((k) => input[k] === undefined)) {
    throw new ApiError('BAD_REQUEST', { message: `Cần ít nhất một trong các trường: ${RECIPE_CHANGES.join(', ')}, image`, reason: 'need' });
  }
  const imageUrl = file ? await storage().upload('recipes', file, req) : undefined;
  return withTransaction(async (db) => {
    const recipe = await findOwnRecipe(group, input.recipeId, db);
    await recipes.updateRecipe(
      recipe.id,
      {
        title: input.newName, description: input.newDescription, steps: input.newHtmlContent, servings: input.newServings,
        prepMinutes: input.newPrepMinutes, cookMinutes: input.newCookMinutes, imageUrl,
      },
      db,
    );
    if (input.newFoodName || input.newIngredients) {
      const rows = await buildIngredients(group, { foodName: input.newFoodName, ingredients: input.newIngredients }, db);
      await recipes.replaceIngredients(recipe.id, rows, db);
    }
    return (await withIngredients([await recipes.findRecipe(group.id, recipe.id, db)], db))[0];
  });
}

export async function deleteRecipe(group, { recipeId }) {
  const recipe = await findOwnRecipe(group, recipeId);
  await recipes.deactivateRecipe(recipe.id);
  return { recipeId: recipe.id };
}

/**
 * Gợi ý món: xếp công thức theo tỉ lệ nguyên liệu bắt buộc đã có đủ trong tủ,
 * ưu tiên món dùng đồ sắp hết hạn (≤ 3 ngày).
 */
export async function suggest(user, group, { limit }) {
  const [all, stock, day, max] = await Promise.all([
    recipes.listRecipes(group.id, { userId: user.id }),
    recipes.stockByFood(group.id),
    today(group.timeZone),
    limit ?? getSetting('suggest_limit'),
  ]);
  const stockMap = new Map(stock.map((s) => [s.food_id, s]));
  const ingredients = await recipes.ingredientsOf(all.map((r) => r.id));
  const soon = new Date(`${day}T00:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + 3);
  const soonDay = soon.toISOString().slice(0, 10);

  const scored = all.map((r) => {
    const own = ingredients.filter((g) => g.recipe_id === r.id);
    const required = own.filter((g) => !g.is_optional);
    const matched = [];
    const missing = [];
    const expiring = [];
    for (const g of required) {
      const s = stockMap.get(g.food_id);
      const need = g.quantity * g.factor_to_base;
      if (s && s.quantity_base >= need) {
        matched.push(g.food_name);
        if (s.nearest_expiry && s.nearest_expiry <= soonDay) expiring.push(g.food_name);
      } else missing.push({ foodName: g.food_name, quantity: g.quantity, unitName: g.unit_name });
    }
    const ratio = required.length ? matched.length / required.length : 0;
    return { r, own, ratio, matched, missing, expiring };
  });

  return scored
    .filter((s) => s.matched.length > 0)
    .sort(
      (a, b) =>
        b.ratio - a.ratio || b.expiring.length - a.expiring.length || a.missing.length - b.missing.length ||
        Number(Boolean(b.r.is_favorite)) - Number(Boolean(a.r.is_favorite)),
    )
    .slice(0, max)
    .map((s) => ({
      recipe: presentRecipe(s.r, s.own),
      matchRatio: Math.round(s.ratio * 100) / 100,
      canCook: s.missing.length === 0,
      matched: s.matched,
      missing: s.missing,
      usesExpiring: s.expiring,
    }));
}
