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

/** GET food/: danh mục thực phẩm của nhóm, lọc theo tên (không dấu) và category. */
export async function getFoodCatalog(group, { q, category } = {}) {
  const [foods, categories, units] = await Promise.all([
    catalog.listFoods(group.id, { q, category }),
    catalog.listCategories(),
    catalog.listUnits(),
  ]);
  return { foods: foods.map(presentFood), categories: categories.map(presentOption), units: units.map(presentOption) };
}

/**
 * Đơn vị phụ [{ unitName, factor }]: 1 unitName = factor đơn vị gốc (vd. 1 hộp = 10 quả).
 * Bỏ qua dòng trùng đơn vị gốc.
 */
async function saveConversions(food, baseUnitId, conversions = [], db) {
  for (const c of conversions) {
    const unit = await catalog.findUnitByName(c.unitName, db);
    if (!unit) throw notFound('đơn vị', c.unitName);
    if (unit.id === baseUnitId) continue;
    await catalog.upsertFoodUnit(food.id, unit.id, c.factor, db);
  }
}

/** groupId null = thực phẩm trong danh mục chung (admin). */
async function insertFoodIn(groupId, user, { name, categoryName, unitName, units }, file, req) {
  const category = await catalog.findCategoryByName(categoryName);
  if (!category) throw notFound('category', categoryName);
  const unit = await catalog.findUnitByName(unitName);
  if (!unit) throw notFound('đơn vị', unitName);
  const existing = await catalog.findFoodByName(groupId, name);
  // Nhóm được tạo món riêng trùng tên món chung? Không: món chung đã dùng được, tạo thêm chỉ gây nhầm.
  if (existing) throw new ApiError('CONFLICT', { message: `Thực phẩm "${name}" đã tồn tại${existing.group_id === null && groupId ? ' trong danh mục chung' : ''}` });
  const imageUrl = file ? await storage().upload('foods', file, req) : null;
  return withTransaction(async (db) => {
    const row = await catalog.insertFood({ groupId, name, categoryId: category.id, unitId: unit.id, imageUrl, createdBy: user.id }, db);
    await catalog.ensureFoodUnit(row.id, unit.id, 1, db);
    await saveConversions(row, unit.id, units, db);
    return presentFood(await catalog.findFoodById(groupId, row.id, db));
  });
}

async function updateFoodIn(groupId, food, { newName, newCategory, newUnit, units }, file, req) {
  const category = newCategory ? await catalog.findCategoryByName(newCategory) : null;
  if (newCategory && !category) throw notFound('category', newCategory);
  const unit = newUnit ? await catalog.findUnitByName(newUnit) : null;
  if (newUnit && !unit) throw notFound('đơn vị', newUnit);
  if (unit && unit.id !== food.base_unit_id && (await catalog.foodInStock(food.id))) {
    throw new ApiError('IN_USE', { message: 'Không đổi được đơn vị khi thực phẩm còn trong tủ lạnh hoặc danh sách mua' });
  }
  if (newName && newName.toLowerCase() !== food.name.toLowerCase()) {
    const dup = await catalog.findFoodByName(groupId, newName);
    if (dup && dup.id !== food.id) throw new ApiError('CONFLICT', { message: `Thực phẩm "${newName}" đã tồn tại` });
  }
  const imageUrl = file ? await storage().upload('foods', file, req) : undefined;
  return withTransaction(async (db) => {
    await catalog.updateFood(food.id, { name: newName, categoryId: category?.id, unitId: unit?.id, imageUrl }, db);
    if (unit) await catalog.ensureFoodUnit(food.id, unit.id, 1, db);
    await saveConversions(food, unit?.id ?? food.base_unit_id, units, db);
    return presentFood(await catalog.findFoodById(groupId, food.id, db));
  });
}

export const createFood = (user, group, input, file, req) => insertFoodIn(group.id, user, input, file, req);

async function findOwnFood(group, name) {
  const food = await catalog.findFoodByName(group.id, name);
  if (!food) throw notFound('thực phẩm', name);
  if (food.group_id === null) {
    throw new ApiError('FORBIDDEN', { message: 'Thực phẩm trong danh mục chung chỉ admin sửa được' });
  }
  return food;
}

export async function updateFood(group, input, file, req) {
  return updateFoodIn(group.id, await findOwnFood(group, input.name), input, file, req);
}

export async function deleteFood(group, { name }) {
  const food = await findOwnFood(group, name);
  await catalog.deactivateFood(food.id);
  return null;
}

// ----- Danh mục thực phẩm chung (admin) -----

async function findGlobalFood(name) {
  const food = await catalog.findFoodByName(null, name);
  if (!food) throw notFound('thực phẩm trong danh mục chung', name);
  return food;
}

/** scope=all: xem cả thực phẩm riêng của các nhóm (để kiểm duyệt). */
export async function adminListFoods({ q, category, scope }) {
  return (await catalog.listFoods(null, { q, category, scope })).map(presentFood);
}
export const adminCreateFood = (admin, input, file, req) => insertFoodIn(null, admin, input, file, req);
export const adminUpdateFood = async (input, file, req) => updateFoodIn(null, await findGlobalFood(input.name), input, file, req);
export async function adminDeleteFood({ name }) {
  const food = await findGlobalFood(name);
  await catalog.deactivateFood(food.id);
  return null;
}
