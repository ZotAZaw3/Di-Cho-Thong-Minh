import { z } from 'zod';
import { text, optText, id, quantity, bool, date, withAliases, jsonArray } from './common.js';

// Nhóm 10 + API mở rộng #54.
const ingredient = withAliases(
  { unit: ['unitName'], optional: ['isOptional'] },
  { foodId: id.optional(), foodName: optText(160), quantity: quantity.optional(), unit: optText(60), optional: bool.optional(), note: optText(300) },
).refine((v) => v.foodId || v.foodName, { message: 'cần foodName', path: ['foodName'] });

const minutes = z.coerce.number().int().min(0).max(10_000);

export const createRecipe = withAliases(
  { name: ['title', 'recipeName'], htmlContent: ['content', 'steps', 'html'], servings: ['baseServings'], cookMinutes: ['duration', 'cookingTime'] },
  {
    name: text(160),
    foodName: optText(160),
    htmlContent: text(100_000),
    description: optText(2000),
    servings: z.coerce.number().positive().optional(),
    prepMinutes: minutes.optional(),
    cookMinutes: minutes.optional(),
    ingredients: jsonArray(ingredient).optional(),
  },
);

export const updateRecipe = withAliases(
  { recipeId: ['id'], newName: ['newTitle'], newHtmlContent: ['newContent', 'newSteps'], newIngredients: ['ingredients'] },
  {
    recipeId: id,
    newName: optText(160),
    newHtmlContent: optText(100_000),
    newDescription: optText(2000),
    newFoodName: optText(160),
    newServings: z.coerce.number().positive().optional(),
    newPrepMinutes: minutes.optional(),
    newCookMinutes: minutes.optional(),
    newIngredients: jsonArray(ingredient).optional(),
  },
);

export const recipeRef = withAliases({ recipeId: ['id'] }, { recipeId: id });
export const listQuery = withAliases(
  { q: ['name', 'search', 'keyword'], favorite: ['favorites', 'isFavorite'] },
  { foodId: id.optional(), q: optText(100), favorite: bool.optional() },
);
export const suggestQuery = z.object({ limit: z.coerce.number().int().min(1).max(50).optional() });
export const reportQuery = z.object({ from: date.optional(), to: date.optional() });
export { text };
