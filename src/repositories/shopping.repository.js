import { query, queryOne } from '../config/db.js';

const LIST_SELECT = `
  SELECT l.*, a.full_name AS assignee_name, a.username AS assignee_username, c.full_name AS creator_name
  FROM shopping_lists l
  LEFT JOIN users a ON a.id = l.assigned_to
  JOIN users c ON c.id = l.created_by`;

const TASK_SELECT = `
  SELECT t.*, i.id AS item_id, i.shopping_list_id, i.food_id, i.unit_id, i.quantity, i.note AS item_note,
         COALESCE(t.note, i.note) AS note, f.name AS food_name, u.name AS unit_name, a.full_name AS assignee_name,
         fu.factor_to_base, l.group_id
  FROM tasks t
  JOIN shopping_list_items i ON i.id = t.shopping_list_item_id
  JOIN shopping_lists l ON l.id = i.shopping_list_id
  JOIN foods f ON f.id = i.food_id
  JOIN units u ON u.id = i.unit_id
  JOIN food_units fu ON fu.food_id = i.food_id AND fu.unit_id = i.unit_id
  JOIN users a ON a.id = t.assigned_to`;

export const findList = (groupId, id, db, { lock = false } = {}) =>
  queryOne(`${LIST_SELECT} WHERE l.group_id = $1 AND l.id = $2${lock ? ' FOR UPDATE OF l' : ''}`, [groupId, id], db);

export const listLists = (groupId, { status, date, assignedTo }, db) =>
  query(
    `${LIST_SELECT} WHERE l.group_id = $1
       AND ($2::text IS NULL OR l.list_status = $2)
       AND ($3::date IS NULL OR l.shopping_date = $3)
       AND ($4::bigint IS NULL OR l.assigned_to = $4)
     ORDER BY l.shopping_date DESC, l.id DESC`,
    [groupId, status ?? null, date ?? null, assignedTo ?? null],
    db,
  );

export const insertList = ({ groupId, title, date, assignedTo, note, createdBy }, db) =>
  queryOne(
    `INSERT INTO shopping_lists (group_id, title, shopping_date, assigned_to, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [groupId, title, date, assignedTo ?? null, note ?? null, createdBy],
    db,
  );

export const updateList = (id, { title, date, assignedTo, note, status }, db) =>
  query(
    `UPDATE shopping_lists SET title = COALESCE($2, title), shopping_date = COALESCE($3, shopping_date),
       assigned_to = COALESCE($4, assigned_to), note = COALESCE($5, note), list_status = COALESCE($6, list_status),
       updated_at = now()
     WHERE id = $1`,
    [id, title ?? null, date ?? null, assignedTo ?? null, note ?? null, status ?? null],
    db,
  );

export async function deleteList(id, db) {
  await query('DELETE FROM tasks WHERE shopping_list_item_id IN (SELECT id FROM shopping_list_items WHERE shopping_list_id = $1)', [id], db);
  await query('DELETE FROM shopping_list_items WHERE shopping_list_id = $1', [id], db);
  await query('DELETE FROM shopping_lists WHERE id = $1', [id], db);
}

export const tasksOfLists = (listIds, db) =>
  listIds.length === 0
    ? []
    : query(`${TASK_SELECT} WHERE i.shopping_list_id = ANY($1::bigint[]) ORDER BY t.id`, [listIds], db);

export const listTasks = (groupId, { listId, assignedTo, status }, db) =>
  query(
    `${TASK_SELECT} WHERE l.group_id = $1
       AND ($2::bigint IS NULL OR i.shopping_list_id = $2)
       AND ($3::bigint IS NULL OR t.assigned_to = $3)
       AND ($4::text IS NULL OR t.task_status = $4)
       AND ($2::bigint IS NOT NULL OR l.list_status = 'active')
     ORDER BY i.shopping_list_id, t.id`,
    [groupId, listId ?? null, assignedTo ?? null, status ?? null],
    db,
  );

export const findTask = (groupId, taskId, db, { lock = false } = {}) =>
  queryOne(`${TASK_SELECT} WHERE l.group_id = $1 AND t.id = $2${lock ? ' FOR UPDATE OF t, i' : ''}`, [groupId, taskId], db);

export const insertItem = ({ listId, foodId, unitId, quantity, note, addedBy }, db) =>
  queryOne(
    `INSERT INTO shopping_list_items (shopping_list_id, food_id, unit_id, quantity, note, added_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [listId, foodId, unitId, quantity, note ?? null, addedBy],
    db,
  );

export const itemExists = async (listId, foodId, exceptItemId = 0, db) =>
  Boolean(await queryOne('SELECT 1 FROM shopping_list_items WHERE shopping_list_id = $1 AND food_id = $2 AND id <> $3', [listId, foodId, exceptItemId], db));

export const insertTask = ({ itemId, assignedBy, assignedTo }, db) =>
  queryOne('INSERT INTO tasks (shopping_list_item_id, assigned_by, assigned_to) VALUES ($1, $2, $3) RETURNING id', [itemId, assignedBy, assignedTo], db);

export const updateItem = (itemId, { foodId, unitId, quantity, purchasedBase }, db) =>
  query(
    `UPDATE shopping_list_items SET food_id = COALESCE($2, food_id), unit_id = COALESCE($3, unit_id),
       quantity = COALESCE($4, quantity), purchased_quantity_base = COALESCE($5, purchased_quantity_base), updated_at = now()
     WHERE id = $1`,
    [itemId, foodId ?? null, unitId ?? null, quantity ?? null, purchasedBase ?? null],
    db,
  );

export const updateTask = (taskId, { status, assignedTo, note }, db) =>
  query(
    `UPDATE tasks SET task_status = COALESCE($2, task_status),
       completed_at = CASE WHEN $2 = 'done' THEN COALESCE(completed_at, now()) WHEN $2 IS NULL THEN completed_at ELSE NULL END,
       assigned_to = COALESCE($3, assigned_to), note = COALESCE($4, note), updated_at = now()
     WHERE id = $1`,
    [taskId, status ?? null, assignedTo ?? null, note ?? null],
    db,
  );

export async function deleteTask(taskId, itemId, db) {
  await query('DELETE FROM tasks WHERE id = $1', [taskId], db);
  const left = await queryOne('SELECT 1 FROM tasks WHERE shopping_list_item_id = $1', [itemId], db);
  if (!left) await query('DELETE FROM shopping_list_items WHERE id = $1', [itemId], db);
}

/** Thành viên đang hoạt động của nhóm, tìm theo id, username hoặc email. */
export const findMember = (groupId, login, db) =>
  queryOne(
    `SELECT u.* FROM users u JOIN group_members m ON m.user_id = u.id AND m.left_at IS NULL
     WHERE m.group_id = $1 AND (u.id::text = $2 OR lower(u.username) = lower($2) OR lower(u.email) = lower($2) OR lower(u.full_name) = lower($2))
     ORDER BY (u.id::text = $2) DESC, (lower(u.username) = lower($2)) DESC NULLS LAST LIMIT 1`,
    [groupId, String(login)],
    db,
  );
