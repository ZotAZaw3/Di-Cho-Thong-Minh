import { withTransaction } from '../config/db.js';
import { storage } from './gateways/index.js';
import * as catalog from '../repositories/catalog.repository.js';
import { presentFood, presentOption } from '../models/presenters.js';
import { ApiError } from '../utils/response.js';

// Nhóm 4 (Category), 5 (Unit) do admin quản lý; nhóm 6 (Thực phẩm) theo nhóm gia đình.

const notFound = (what, name) => new ApiError('NOT_FOUND', { message: `Không tìm thấy ${what} "${name}"` });

// ----- Category -----
export const listCategories = async () => (await catalog.listCategories()).map(presentOption);

export async function createCategory({ name, description }) {
  if (await catalog.findCategoryByName(name)) throw new ApiError('CONFLICT', { message: `Category "${name}" đã tồn tại` });
  return presentOption(await catalog.insertCategory(name, description));
}

export async function renameCategory({ oldName, newName }) {
  const cat = await catalog.findCategoryByName(oldName);
  if (!cat) throw notFound('category', oldName);
  const dup = await catalog.findCategoryByName(newName);
  if (dup && dup.id !== cat.id) throw new ApiError('CONFLICT', { message: `Category "${newName}" đã tồn tại` });
  return presentOption(await catalog.renameCategory(cat.id, newName));
}

export async function deleteCategory({ name }) {
  const cat = await catalog.findCategoryByName(name);
  if (!cat) throw notFound('category', name);
  if (await catalog.categoryInUse(cat.id)) throw new ApiError('IN_USE', { message: `Còn thực phẩm thuộc category "${name}"` });
  await catalog.deactivateCategory(cat.id);
  return null;
}

// ----- Unit -----
export const listUnits = async () => (await catalog.listUnits()).map(presentOption);

function codeFrom(name) {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 16);
  return base || 'unit';
}

export async function createUnit({ name, code }) {
  if (await catalog.findUnitByName(name)) throw new ApiError('CONFLICT', { message: `Đơn vị "${name}" đã tồn tại` });
  let finalCode = code ?? codeFrom(name);
  if (code && (await catalog.codeTaken(code))) throw new ApiError('CONFLICT', { message: `Mã đơn vị "${code}" đã tồn tại` });
  for (let i = 2; !code && (await catalog.codeTaken(finalCode)); i += 1) finalCode = `${codeFrom(name)}_${i}`;
  return presentOption(await catalog.insertUnit(finalCode, name));
}

export async function renameUnit({ oldName, newName }) {
  const unit = await catalog.findUnitByName(oldName);
  if (!unit) throw notFound('đơn vị', oldName);
  const dup = await catalog.findUnitByName(newName);
  if (dup && dup.id !== unit.id) throw new ApiError('CONFLICT', { message: `Đơn vị "${newName}" đã tồn tại` });
  return presentOption(await catalog.renameUnit(unit.id, newName));
}

export async function deleteUnit({ name }) {
  const unit = await catalog.findUnitByName(name);
  if (!unit) throw notFound('đơn vị', name);
  if (await catalog.unitInUse(unit.id)) throw new ApiError('IN_USE', { message: `Đơn vị "${name}" đang được thực phẩm sử dụng` });
  await catalog.deactivateUnit(unit.id);
  return null;
}

// ----- Food -----

/** Lấy thực phẩm theo id hoặc tên trong phạm vi nhóm; không có thì NOT_FOUND. */
export async function resolveFood(groupId, { foodId, foodName }, db) {
  const food = foodId ? await catalog.findFoodById(groupId, foodId, db) : await catalog.findFoodByName(groupId, foodName, db);
  if (food) return food;
  const similar = foodName ? await catalog.similarFoodNames(groupId, foodName, db) : [];
  throw new ApiError('NOT_FOUND', {
    message: `Không tìm thấy thực phẩm "${foodName ?? foodId}"${similar.length ? `. Có phải: ${similar.join(', ')}?` : ''}`,
    data: similar.length ? { suggestions: similar } : null,
  });
}

/**
 * Quy đổi số lượng sang đơn vị gốc của thực phẩm.
 * @returns {Promise<{ unitId: number, factor: number, quantityBase: number }>}
 */
export async function toBaseUnit(food, quantity, unitName, db) {
  if (!unitName || unitName.toLowerCase() === food.unit_name.toLowerCase()) {
    return { unitId: food.base_unit_id, factor: 1, quantityBase: quantity };
  }
  const fu = await catalog.findFoodUnit(food.id, unitName, db);
  if (!fu) {
    throw new ApiError('BAD_REQUEST', {
      message: `Đơn vị "${unitName}" không dùng được cho "${food.name}" (đơn vị gốc: ${food.unit_name})`,
    });
  }
  return { unitId: fu.unit_id, factor: fu.factor_to_base, quantityBase: quantity * fu.factor_to_base };
}

export async function getFoodCatalog(group) {
  const [foods, categories, units] = await Promise.all([catalog.listFoods(group.id), catalog.listCategories(), catalog.listUnits()]);
  return { foods: foods.map(presentFood), categories: categories.map(presentOption), units: units.map(presentOption) };
}

export async function createFood(user, group, { name, categoryName, unitName }, file, req) {
  const category = await catalog.findCategoryByName(categoryName);
  if (!category) throw notFound('category', categoryName);
  const unit = await catalog.findUnitByName(unitName);
  if (!unit) throw notFound('đơn vị', unitName);
  if (await catalog.findFoodByName(group.id, name)) throw new ApiError('CONFLICT', { message: `Thực phẩm "${name}" đã tồn tại` });
  const imageUrl = file ? await storage().upload('foods', file, req) : null;
  const food = await withTransaction(async (db) => {
    const row = await catalog.insertFood({ groupId: group.id, name, categoryId: category.id, unitId: unit.id, imageUrl, createdBy: user.id }, db);
    await catalog.ensureFoodUnit(row.id, unit.id, 1, db);
    return catalog.findFoodById(group.id, row.id, db);
  });
  return presentFood(food);
}

async function findOwnFood(group, name) {
  const food = await catalog.findFoodByName(group.id, name);
  if (!food) throw notFound('thực phẩm', name);
  if (food.group_id === null) {
    throw new ApiError('FORBIDDEN', { message: 'Thực phẩm trong danh mục chung chỉ admin sửa được' });
  }
  return food;
}

export async function updateFood(group, { name, newName, newCategory, newUnit }, file, req) {
  const food = await findOwnFood(group, name);
  const category = newCategory ? await catalog.findCategoryByName(newCategory) : null;
  if (newCategory && !category) throw notFound('category', newCategory);
  const unit = newUnit ? await catalog.findUnitByName(newUnit) : null;
  if (newUnit && !unit) throw notFound('đơn vị', newUnit);
  if (unit && unit.id !== food.base_unit_id && (await catalog.foodInStock(food.id))) {
    throw new ApiError('IN_USE', { message: 'Không đổi được đơn vị khi thực phẩm còn trong tủ lạnh hoặc danh sách mua' });
  }
  if (newName && newName.toLowerCase() !== food.name.toLowerCase() && (await catalog.findFoodByName(group.id, newName))) {
    throw new ApiError('CONFLICT', { message: `Thực phẩm "${newName}" đã tồn tại` });
  }
  const imageUrl = file ? await storage().upload('foods', file, req) : undefined;
  return withTransaction(async (db) => {
    await catalog.updateFood(food.id, { name: newName, categoryId: category?.id, unitId: unit?.id, imageUrl }, db);
    if (unit) await catalog.ensureFoodUnit(food.id, unit.id, 1, db);
    return presentFood(await catalog.findFoodById(group.id, food.id, db));
  });
}

export async function deleteFood(group, { name }) {
  const food = await findOwnFood(group, name);
  await catalog.deactivateFood(food.id);
  return null;
}
