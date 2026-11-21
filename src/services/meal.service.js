import { withTransaction } from '../config/db.js';
import * as meals from '../repositories/meal.repository.js';
import * as recipes from '../repositories/recipe.repository.js';
import * as fridge from '../repositories/fridge.repository.js';
import { resolveFood, toBaseUnit } from './catalog.service.js';
import { presentMeal } from '../models/presenters.js';
import { ApiError } from '../utils/response.js';

// Nhóm 9 · Bữa ăn. Một mục trong bữa có thể là công thức (recipeId), thực phẩm (foodName)
// hoặc chỉ là tên món tự do (mealName), do tài liệu và app gửi khác nhau.

const notFound = () => new ApiError('NOT_FOUND', { message: 'Không tìm thấy kế hoạch bữa ăn' });

async function resolveTarget(group, { foodName, recipeId }, db) {
  const out = {};
  if (foodName) out.foodId = (await resolveFood(group.id, { foodName }, db)).id;
  if (recipeId) {
    if (!(await recipes.findRecipe(group.id, recipeId, db))) throw new ApiError('NOT_FOUND', { message: 'Không tìm thấy công thức', reason: 'recipe' });
    out.recipeId = recipeId;
  }
  return out;
}

const MAX_RANGE_DAYS = 62;

/** Xem theo ngày (date) hoặc theo tuần / khoảng ngày (from, to; tối đa 62 ngày). */
export async function getByDate(group, { date, from, to }) {
  const start = date ?? from ?? to ?? (await fridge.today(group.timeZone));
  const end = date ? date : (to ?? start);
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000;
  if (days < 0) throw new ApiError('BAD_REQUEST', { message: '"from" phải trước hoặc bằng "to"' });
  if (days > MAX_RANGE_DAYS) throw new ApiError('BAD_REQUEST', { message: `Chỉ xem tối đa ${MAX_RANGE_DAYS} ngày một lần` });
  const rows = await meals.listByDates(group.id, start, end);
  return rows.map(presentMeal);
}

export async function createPlan(user, group, input) {
  const { date, mealType, mealName, foodName, recipeId, servings, note } = input;
  if (!mealName && !foodName && !recipeId) {
    throw new ApiError('BAD_REQUEST', { message: 'Cần foodName, recipeId hoặc tên món (mealName)', reason: 'missing' });
  }
  return withTransaction(async (db) => {
    const target = await resolveTarget(group, { foodName, recipeId }, db);
    const day = date ?? (await fridge.today(group.timeZone, db));
    const plan = await meals.upsertPlan({ groupId: group.id, date: day, mealType, createdBy: user.id }, db);
    const { id } = await meals.insertItem({ planId: plan.id, groupId: group.id, ...target, title: mealName, servings, note }, db);
    return presentMeal(await meals.findItem(group.id, id, db));
  });
}

/** Update meal plan. Không có planId: tạo mới (app nhánh fe-tien gọi PUT để thêm món). */
export async function updatePlan(user, group, input) {
  const { planId, newFoodName, newRecipeId, newMealName, newMealType, newDate, newServings, newNote } = input;
  if (!planId) {
    return createPlan(user, group, {
      date: newDate ?? input.date, mealType: newMealType ?? input.mealType ?? 'breakfast',
      mealName: newMealName ?? input.mealName, foodName: newFoodName ?? input.foodName,
      recipeId: newRecipeId ?? input.recipeId, servings: newServings, note: newNote,
    });
  }
  const changes = [newFoodName, newRecipeId, newMealName, newMealType, newDate, newServings, newNote];
  if (changes.every((v) => v === undefined)) {
    throw new ApiError('BAD_REQUEST', {
      message: 'Cần ít nhất một trong các trường: newFoodName, newRecipeId, newName, newMealType, newDate, newServings, newNote',
      reason: 'need',
    });
  }
  return withTransaction(async (db) => {
    const item = await meals.findItem(group.id, planId, db);
    if (!item) throw notFound();
    const target = await resolveTarget(group, { foodName: newFoodName, recipeId: newRecipeId }, db);
    let newPlanId;
    if (newDate || newMealType) {
      const plan = await meals.upsertPlan(
        { groupId: group.id, date: newDate ?? item.plan_date, mealType: newMealType ?? item.meal_type, createdBy: user.id },
        db,
      );
      newPlanId = plan.id;
    }
    await meals.updateItem(item.id, { planId: newPlanId, ...target, title: newMealName, servings: newServings, note: newNote }, db);
    return presentMeal(await meals.findItem(group.id, item.id, db));
  });
}

export async function deletePlan(group, { planId }) {
  const item = await meals.findItem(group.id, planId);
  if (!item) throw notFound();
  // Đã ghi tiêu thụ theo mục này thì chỉ hủy, giữ lịch sử.
  if (await meals.itemReferencedByLogs(item.id)) await meals.cancelItem(item.id);
  else await meals.deleteItem(item.id);
  return { planId: item.id };
}

const round = (n) => Math.round(n * 1000) / 1000;

/**
 * Nấu xong một món trong kế hoạch: trừ nguyên liệu khỏi tủ lạnh (món hết hạn sớm dùng trước) và ghi
 * 'consume' gắn với mục bữa ăn, để thống kê tiêu thụ đúng. Món là công thức: lượng theo khẩu phần
 * (planned_servings / base_servings). Món là thực phẩm: trừ `quantity` nếu gửi.
 * Thiếu nguyên liệu bắt buộc thì báo lỗi kèm danh sách thiếu, trừ khi force=true (trừ phần đang có).
 */
export async function cookPlan(user, group, { planId, force = false, quantity, unit }) {
  return withTransaction(async (db) => {
    const item = await meals.findItem(group.id, planId, db, { lock: true });
    if (!item || item.item_status === 'cancelled') throw notFound();
    if (item.item_status === 'cooked') throw new ApiError('CONFLICT', { message: 'Món này đã được đánh dấu nấu xong', reason: 'cooked' });

    const needs = [];
    if (item.recipe_id) {
      const recipe = await db.query('SELECT base_servings FROM recipes WHERE id = $1', [item.recipe_id]).then((r) => r.rows[0]);
      const scale = item.planned_servings / (recipe?.base_servings || 1);
      for (const g of await recipes.ingredientsOf([item.recipe_id], db)) {
        needs.push({
          foodId: g.food_id, foodName: g.food_name, unitName: g.unit_name, factor: g.factor_to_base,
          quantity: g.quantity * scale, optional: g.is_optional,
        });
      }
    } else if (item.food_id && quantity !== undefined) {
      const food = await resolveFood(group.id, { foodId: item.food_id }, db);
      const { factor, unitId } = await toBaseUnit(food, quantity, unit, db);
      const unitName = unit ?? food.unit_name;
      needs.push({ foodId: food.id, foodName: food.name, unitName, unitId, factor, quantity, optional: false });
    }

    const plan = [];
    const missing = [];
    for (const n of needs) {
      const stock = await fridge.lockStock(group.id, n.foodId, db);
      const have = stock.reduce((sum, s) => sum + s.quantity_base, 0);
      const need = n.quantity * n.factor;
      if (have < need && !n.optional) {
        missing.push({ foodName: n.foodName, unitName: n.unitName, need: round(n.quantity), have: round(have / n.factor) });
      }
      plan.push({ n, stock, take: Math.min(need, have) });
    }
    if (missing.length && !force) {
      throw new ApiError('BAD_REQUEST', {
        message: `Thiếu nguyên liệu: ${missing.map((m) => m.foodName).join(', ')}. Gửi force=true để vẫn nấu với phần đang có`,
        data: { missing },
      });
    }

    const used = [];
    for (const { n, stock, take } of plan) {
      let left = take;
      for (const s of stock) {
        if (left <= 1e-9) break;
        const part = Math.min(left, s.quantity_base);
        await fridge.updateItem(s.id, { quantityBase: s.quantity_base - part }, db);
        await fridge.insertLog(
          {
            groupId: group.id, fridgeItemId: s.id, foodId: n.foodId, mealPlanItemId: item.id, actorId: user.id,
            eventType: 'consume', quantityBase: part, idempotencyKey: `cook:${item.id}:${s.id}`,
          },
          db,
        );
        left -= part;
      }
      if (take > 0) used.push({ foodName: n.foodName, quantity: round(take / n.factor), unitName: n.unitName });
    }
    await meals.markCooked(item.id, db);
    return { meal: presentMeal(await meals.findItem(group.id, item.id, db)), used, missing };
  });
}
