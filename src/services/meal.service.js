import { withTransaction } from '../config/db.js';
import * as meals from '../repositories/meal.repository.js';
import * as recipes from '../repositories/recipe.repository.js';
import { today } from '../repositories/fridge.repository.js';
import { resolveFood } from './catalog.service.js';
import { presentMeal } from '../models/presenters.js';
import { ApiError } from '../utils/response.js';

// Nhóm 9 · Bữa ăn. Một mục trong bữa có thể là công thức (recipeId), thực phẩm (foodName)
// hoặc chỉ là tên món tự do (mealName), do tài liệu và app gửi khác nhau.

const notFound = () => new ApiError('NOT_FOUND', { message: 'Không tìm thấy kế hoạch bữa ăn' });

async function resolveTarget(group, { foodName, recipeId }, db) {
  const out = {};
  if (foodName) out.foodId = (await resolveFood(group.id, { foodName }, db)).id;
  if (recipeId) {
    if (!(await recipes.findRecipe(group.id, recipeId, db))) throw new ApiError('NOT_FOUND', { message: 'Không tìm thấy công thức' });
    out.recipeId = recipeId;
  }
  return out;
}

export async function getByDate(group, { date, from, to }) {
  const day = date ?? from ?? (await today(group.timeZone));
  const rows = await meals.listByDates(group.id, day, to ?? day);
  return rows.map(presentMeal);
}

export async function createPlan(user, group, input) {
  const { date, mealType, mealName, foodName, recipeId, servings, note } = input;
  if (!mealName && !foodName && !recipeId) {
    throw new ApiError('BAD_REQUEST', { message: 'Cần foodName, recipeId hoặc tên món (mealName)' });
  }
  return withTransaction(async (db) => {
    const target = await resolveTarget(group, { foodName, recipeId }, db);
    const day = date ?? (await today(group.timeZone, db));
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
