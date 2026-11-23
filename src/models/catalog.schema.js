import { z } from 'zod';
import { text, optText, withAliases, pagination, id, date, jsonArray } from './common.js';

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

// Đơn vị phụ của thực phẩm: 1 unitName = factor đơn vị gốc (vd. { unitName: 'hộp', factor: 10 } với trứng).
const conversion = withAliases(
  { unitName: ['unit', 'name'], factor: ['factorToBase', 'ratio'] },
  { unitName: text(60), factor: z.coerce.number({ error: 'phải là số' }).positive('phải lớn hơn 0').max(1_000_000) },
);
const conversions = jsonArray(conversion, 20).optional();

export const createFood = withAliases(
  { categoryName: ['foodCategoryName', 'category'], unitName: ['unit'], units: ['conversions'] },
  { name: text(160), categoryName: text(100), unitName: text(60), units: conversions },
);
export const updateFood = withAliases(
  { newCategory: ['newCategoryName', 'newFoodCategoryName'], newUnit: ['newUnitName'], units: ['conversions', 'newUnits'] },
  { name: text(160), newName: optText(160), newCategory: optText(100), newUnit: optText(60), units: conversions },
);
export const deleteFood = byName;

export const foodQuery = withAliases(
  { q: ['name', 'search', 'keyword', 'foodName'], category: ['categoryName'] },
  { q: optText(100), category: optText(100) },
);
export const adminFoodQuery = withAliases(
  { q: ['name', 'search', 'keyword', 'foodName'], category: ['categoryName'] },
  { q: optText(100), category: optText(100), scope: z.enum(['global', 'all']).default('global') },
);
