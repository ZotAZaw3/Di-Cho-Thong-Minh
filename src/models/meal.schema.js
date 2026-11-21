import { z } from 'zod';
import { optText, id, date, mealType, isMealTypeWord, withAliases } from './common.js';

// Nhóm 9. Tài liệu: foodName + timestamp + name ("sáng/trưa/tối"); app: mealName + date + mealType.
// "name" là bữa nếu là sáng/trưa/tối, ngược lại coi là tên món.
const splitName = (key, typeKey, titleKey) => (input) => {
  if (!input || typeof input !== 'object') return input;
  const out = { ...input };
  if (typeof out[key] === 'string') {
    if (isMealTypeWord(out[key]) && out[typeKey] === undefined) out[typeKey] = out[key];
    else if (out[titleKey] === undefined) out[titleKey] = out[key];
  }
  return out;
};

export const createPlan = z.preprocess(
  splitName('name', 'mealType', 'mealName'),
  withAliases(
    { date: ['timestamp', 'mealDate', 'planDate'], mealName: ['title'], mealType: ['type'] },
    {
      date: date.optional(),
      mealType: mealType.default('breakfast'),
      mealName: optText(160),
      foodName: optText(160),
      recipeId: id.optional(),
      servings: z.coerce.number().positive().optional(),
      note: optText(1000),
    },
  ),
);

export const updatePlan = z.preprocess(
  (v) => splitName('name', 'mealType', 'mealName')(splitName('newName', 'newMealType', 'newMealName')(v)),
  withAliases(
    { planId: ['id', 'mealId'], newDate: ['newTimestamp'], newMealName: ['newTitle'], date: ['timestamp'] },
    {
      planId: id.optional(),
      newFoodName: optText(160),
      newRecipeId: id.optional(),
      newMealName: optText(160),
      newMealType: mealType.optional(),
      newDate: date.optional(),
      newServings: z.coerce.number().positive().optional(),
      newNote: optText(1000),
      // App gọi PUT không có planId để thêm món (xem meal.service.updatePlan).
      date: date.optional(),
      mealType: mealType.optional(),
      mealName: optText(160),
      foodName: optText(160),
      recipeId: id.optional(),
    },
  ),
);

export const planRef = withAliases({ planId: ['id', 'mealId'] }, { planId: id });
export const byDate = z.object({ date: date.optional(), from: date.optional(), to: date.optional() });
