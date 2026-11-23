import { STORAGE_LABELS, MEAL_LABELS } from './common.js';

// Chuyển dòng DB → JSON trả cho app (camelCase). Mọi đối tượng đều có `id`;
// thêm các tên trường mà tài liệu API / app đang dùng (listId, taskId, foodName...) để app đọc được.

export const presentUser = (u, group = null) =>
  u && {
    id: u.id,
    email: u.email,
    name: u.full_name,
    fullName: u.full_name,
    username: u.username,
    language: u.language,
    avatarUrl: u.avatar_url,
    role: u.system_role,
    status: u.account_status,
    createdAt: u.created_at,
    group: group && { id: group.id, name: group.name, role: group.role },
  };

export const presentMember = (m) => ({
  id: m.id,
  name: m.full_name,
  username: m.username,
  email: m.email,
  avatarUrl: m.avatar_url,
  role: m.group_role,
  joinedAt: m.joined_at,
});

export const presentOption = (r) => ({ id: r.id, name: r.name, ...(r.code ? { code: r.code } : {}) });

export const presentFood = (f) => ({
  id: f.id,
  foodId: f.id,
  name: f.name,
  foodName: f.name,
  categoryId: f.category_id,
  categoryName: f.category_name,
  unitId: f.base_unit_id,
  unitName: f.unit_name,
  imageUrl: f.image_url,
  isGlobal: f.group_id === null,
  units: f.units ?? undefined,
  createdAt: f.created_at,
});

function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export const presentFridgeItem = (i, today) => {
  const useWithin = i.expires_on && today ? daysBetween(today, i.expires_on) : null;
  return {
    id: i.id,
    itemId: i.id,
    foodId: i.food_id,
    foodName: i.food_name,
    categoryName: i.category_name,
    imageUrl: i.image_url,
    quantity: i.quantity_base,
    unitName: i.unit_name,
    expiryDate: i.expires_on,
    useWithin,
    status: useWithin === null ? 'unknown' : useWithin < 0 ? 'expired' : useWithin <= 3 ? 'expiring' : 'fresh',
    storageLocation: STORAGE_LABELS[i.storage_location],
    storageCode: i.storage_location,
    note: i.location_note,
    acquiredAt: i.acquired_at,
    updatedAt: i.updated_at,
  };
};

export const presentTask = (t) => ({
  id: t.id,
  taskId: t.id,
  itemId: t.item_id,
  listId: t.shopping_list_id,
  foodId: t.food_id,
  foodName: t.food_name,
  quantity: t.quantity,
  unitName: t.unit_name,
  note: t.note,
  status: t.task_status,
  completed: t.task_status === 'done',
  isDone: t.task_status === 'done',
  completedAt: t.completed_at,
  assignee: t.assigned_to ? { id: t.assigned_to, name: t.assignee_name } : null,
});

export const presentList = (l, tasks = []) => ({
  id: l.id,
  listId: l.id,
  name: l.title,
  title: l.title,
  date: l.shopping_date,
  status: l.list_status,
  note: l.note,
  assignedTo: l.assignee_name ?? '',
  assignee: l.assigned_to ? { id: l.assigned_to, name: l.assignee_name, username: l.assignee_username } : null,
  createdBy: { id: l.created_by, name: l.creator_name },
  createdAt: l.created_at,
  tasks: tasks.map(presentTask),
});

export const presentMeal = (m) => {
  const mealName = m.title ?? m.recipe_title ?? m.food_name ?? MEAL_LABELS[m.meal_type];
  return {
    id: m.id,
    planId: m.id,
    date: m.plan_date,
    mealType: MEAL_LABELS[m.meal_type],
    mealTypeCode: m.meal_type,
    mealName,
    title: mealName,
    foodId: m.food_id,
    foodName: m.food_name,
    recipeId: m.recipe_id,
    recipeName: m.recipe_title,
    servings: m.planned_servings,
    status: m.item_status,
    note: m.note,
  };
};

export const presentRecipe = (r, ingredients = []) => {
  const minutes = (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0);
  return {
    id: r.id,
    recipeId: r.id,
    name: r.title,
    title: r.title,
    description: r.description,
    htmlContent: r.steps,
    servings: r.base_servings,
    prepMinutes: r.prep_minutes,
    cookMinutes: r.cook_minutes,
    duration: minutes ? `${minutes} phút` : '',
    imageUrl: r.image_url,
    isGlobal: r.group_id === null,
    isFavorite: Boolean(r.is_favorite),
    ingredients: ingredients.map((g) => ({
      foodId: g.food_id,
      foodName: g.food_name,
      quantity: g.quantity,
      unitName: g.unit_name,
      optional: g.is_optional,
      note: g.note,
    })),
    createdAt: r.created_at,
  };
};
