import { z } from 'zod';
import { text, optText, withAliases, pagination, id, date } from './common.js';

// Nhóm 4, 5 (admin), 6 (thực phẩm), Get logs.

export const named = z.object({ name: text(100), description: optText(500), code: optText(20) });
export const rename = withAliases({ oldName: ['name'] }, { oldName: text(100), newName: text(100) });
export const byName = z.object({ name: text(100) });

export const logsQuery = z.object({
  ...pagination,
  userId: id.optional(),
  method: optText(8),
  status: z.coerce.number().int().optional(),
  from: date.optional(),
  to: date.optional(),
});

export const createFood = withAliases(
  { categoryName: ['foodCategoryName', 'category'], unitName: ['unit'] },
  { name: text(160), categoryName: text(100), unitName: text(60) },
);
export const updateFood = withAliases(
  { newCategory: ['newCategoryName', 'newFoodCategoryName'], newUnit: ['newUnitName'] },
  { name: text(160), newName: optText(160), newCategory: optText(100), newUnit: optText(60) },
);
export const deleteFood = byName;
