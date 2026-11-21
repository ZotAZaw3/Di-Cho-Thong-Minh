import { randomUUID } from 'node:crypto';
import { withTransaction } from '../config/db.js';
import * as shopping from '../repositories/shopping.repository.js';
import * as fridge from '../repositories/fridge.repository.js';
import { resolveFood, toBaseUnit } from './catalog.service.js';
import { presentList, presentTask } from '../models/presenters.js';
import { ApiError } from '../utils/response.js';

// Nhóm 8 · Mua sắm + API mở rộng #51 (lấy các danh sách), #52 (đánh dấu đã mua → cộng vào tủ lạnh, T09.1).
// Một "task" trong tài liệu = một mặt hàng của danh sách (shopping_list_items) + người được giao (tasks).

const listNotFound = () => new ApiError('NOT_FOUND', { message: 'Không tìm thấy danh sách mua sắm' });
const taskNotFound = () => new ApiError('NOT_FOUND', { message: 'Không tìm thấy nhiệm vụ' });

function assertCanManage(user, group, list) {
  if (group.role !== 'leader' && list.created_by !== user.id) {
    throw new ApiError('FORBIDDEN', { message: 'Chỉ trưởng nhóm hoặc người tạo danh sách được thực hiện' });
  }
}

async function resolveAssignee(group, login, db) {
  if (login === undefined || login === null || login === '') return undefined;
  const member = await shopping.findMember(group.id, login, db);
  if (!member) throw new ApiError('BAD_REQUEST', { message: `"${login}" không phải thành viên của nhóm` });
  return member.id;
}

async function listView(group, listId, db) {
  const list = await shopping.findList(group.id, listId, db);
  return presentList(list, await shopping.tasksOfLists([list.id], db));
}

// ----- Danh sách -----

export async function getLists(user, group, { status, date, mine }) {
  const lists = await shopping.listLists(group.id, { status, date, assignedTo: mine ? user.id : undefined });
  const tasks = await shopping.tasksOfLists(lists.map((l) => l.id));
  return lists.map((l) => presentList(l, tasks.filter((t) => t.shopping_list_id === l.id)));
}

export async function createList(user, group, { name, assignToUsername, date, note }) {
  return withTransaction(async (db) => {
    const assignedTo = await resolveAssignee(group, assignToUsername, db);
    const day = date ?? (await fridge.today(group.timeZone, db));
    const { id } = await shopping.insertList({ groupId: group.id, title: name, date: day, assignedTo, note, createdBy: user.id }, db);
    return listView(group, id, db);
  });
}

export async function updateList(user, group, { listId, newName, newAssignToUsername, newDate, newNote, status }) {
  return withTransaction(async (db) => {
    const list = await shopping.findList(group.id, listId, db, { lock: true });
    if (!list) throw listNotFound();
    assertCanManage(user, group, list);
    const assignedTo = await resolveAssignee(group, newAssignToUsername, db);
    await shopping.updateList(list.id, { title: newName, date: newDate, assignedTo, note: newNote, status }, db);
    // Đổi người phụ trách: các mặt hàng chưa mua chuyển sang người mới.
    if (assignedTo && assignedTo !== list.assigned_to) {
      await db.query(
        `UPDATE tasks SET assigned_to = $2, updated_at = now()
         WHERE task_status IN ('todo', 'in_progress')
           AND shopping_list_item_id IN (SELECT id FROM shopping_list_items WHERE shopping_list_id = $1)`,
        [list.id, assignedTo],
      );
    }
    return listView(group, list.id, db);
  });
}

export async function deleteList(user, group, { listId }) {
  return withTransaction(async (db) => {
    const list = await shopping.findList(group.id, listId, db, { lock: true });
    if (!list) throw listNotFound();
    assertCanManage(user, group, list);
    await shopping.deleteList(list.id, db);
    return { listId: list.id };
  });
}

// ----- Nhiệm vụ (mặt hàng) -----

/** Thêm nhiều mặt hàng một lần: tất cả cùng thành công hoặc rollback toàn bộ. */
export async function createTasks(user, group, { listId, tasks }) {
  return withTransaction(async (db) => {
    const list = await shopping.findList(group.id, listId, db, { lock: true });
    if (!list) throw listNotFound();
    const seen = new Set();
    const created = [];
    for (const t of tasks) {
      const food = await resolveFood(group.id, t, db);
      if (seen.has(food.id) || (await shopping.itemExists(list.id, food.id, 0, db))) {
        throw new ApiError('CONFLICT', { message: `"${food.name}" đã có trong danh sách` });
      }
      seen.add(food.id);
      const { unitId } = await toBaseUnit(food, t.quantity, t.unit, db);
      const item = await shopping.insertItem({ listId: list.id, foodId: food.id, unitId, quantity: t.quantity, note: t.note, addedBy: user.id }, db);
      const assignedTo = (await resolveAssignee(group, t.assignToUsername, db)) ?? list.assigned_to ?? user.id;
      const task = await shopping.insertTask({ itemId: item.id, assignedBy: user.id, assignedTo }, db);
      created.push(task.id);
    }
    const rows = await shopping.listTasks(group.id, { listId: list.id }, db);
    return rows.filter((r) => created.includes(r.id)).map(presentTask);
  });
}

export async function getTasks(user, group, { listId, mine, status }) {
  if (listId && !(await shopping.findList(group.id, listId))) throw listNotFound();
  const rows = await shopping.listTasks(group.id, { listId, assignedTo: mine ? user.id : undefined, status });
  return rows.map(presentTask);
}

export async function deleteTask(user, group, { taskId }) {
  return withTransaction(async (db) => {
    const task = await shopping.findTask(group.id, taskId, db, { lock: true });
    if (!task) throw taskNotFound();
    const list = await shopping.findList(group.id, task.shopping_list_id, db);
    assertCanManage(user, group, list);
    await shopping.deleteTask(task.id, task.item_id, db);
    return { taskId: task.id };
  });
}

export async function updateTask(user, group, input) {
  const { taskId, newFoodName, newQuantity, newUnit, newAssignToUsername, newNote, isDone } = input;
  const result = await withTransaction(async (db) => {
    const task = await shopping.findTask(group.id, taskId, db, { lock: true });
    if (!task) throw taskNotFound();
    let food = { id: task.food_id, name: task.food_name, unit_name: null, base_unit_id: null };
    let foodId;
    if (newFoodName) {
      food = await resolveFood(group.id, { foodName: newFoodName }, db);
      if (food.id !== task.food_id) {
        if (await shopping.itemExists(task.shopping_list_id, food.id, task.item_id, db)) {
          throw new ApiError('CONFLICT', { message: `"${food.name}" đã có trong danh sách` });
        }
        foodId = food.id;
      }
    }
    let unitId;
    if (foodId || newUnit) {
      if (!food.unit_name) food = await resolveFood(group.id, { foodId: task.food_id }, db);
      unitId = (await toBaseUnit(food, newQuantity ?? task.quantity, newUnit ?? (foodId ? undefined : task.unit_name), db)).unitId;
    }
    await shopping.updateItem(task.item_id, { foodId, unitId, quantity: newQuantity }, db);
    const assignedTo = await resolveAssignee(group, newAssignToUsername, db);
    await shopping.updateTask(task.id, { assignedTo, note: newNote }, db);
    return task.id;
  });
  if (isDone !== undefined) return setTaskDone(user, group, { taskId: result, done: isDone });
  return presentTask(await shopping.findTask(group.id, result));
}

/**
 * Đánh dấu đã mua → cộng vào tủ lạnh trong cùng transaction (T09.1).
 * Gọi lại nhiều lần vẫn chỉ cộng một lần: task đã 'done' thì bỏ qua, và inventory_logs có
 * khóa idempotency `purchase:task:<id>`. done=false thì hoàn tác (trừ lại phần đã cộng).
 */
export async function setTaskDone(user, group, { taskId, done = true, expiryDate, storageLocation, totalCost }) {
  return withTransaction(async (db) => {
    const task = await shopping.findTask(group.id, taskId, db, { lock: true });
    if (!task) throw taskNotFound();
    const purchaseKey = `purchase:task:${task.id}`;

    if (done && task.task_status !== 'done') {
      const quantityBase = task.quantity * task.factor_to_base;
      const prior = await fridge.findLogByKey(group.id, purchaseKey, db);
      const fridgeItemId = await fridge.addToStock(
        { groupId: group.id, foodId: task.food_id, quantityBase, expiresOn: expiryDate, location: storageLocation ?? 'fridge' },
        db,
      );
      await fridge.insertLog(
        {
          groupId: group.id, fridgeItemId, foodId: task.food_id, shoppingListItemId: task.item_id, actorId: user.id,
          eventType: 'purchase', quantityBase, totalCost,
          // Mua lại sau khi hoàn tác: khóa mới để vẫn ghi được lịch sử.
          idempotencyKey: prior ? `${purchaseKey}:${randomUUID()}` : purchaseKey,
        },
        db,
      );
      await shopping.updateItem(task.item_id, { purchasedBase: quantityBase }, db);
      await shopping.updateTask(task.id, { status: 'done' }, db);
    } else if (!done && task.task_status === 'done') {
      // Hoàn tác: trừ phần đã cộng khỏi món tủ lạnh của lần mua gần nhất (không xuống dưới 0).
      const { rows } = await db.query(
        `SELECT l.fridge_item_id, l.quantity_base, i.quantity_base AS stock FROM inventory_logs l
         JOIN fridge_items i ON i.id = l.fridge_item_id
         WHERE l.group_id = $1 AND l.shopping_list_item_id = $2 AND l.event_type = 'purchase'
         ORDER BY l.id DESC LIMIT 1 FOR UPDATE OF i`,
        [group.id, task.item_id],
      );
      const last = rows[0];
      if (last) {
        const back = Math.min(last.quantity_base, last.stock);
        if (back > 0) {
          await fridge.updateItem(last.fridge_item_id, { quantityBase: last.stock - back }, db);
          await fridge.insertLog(
            { groupId: group.id, fridgeItemId: last.fridge_item_id, foodId: task.food_id, actorId: user.id, eventType: 'adjust_out', quantityBase: back, reason: 'Hoàn tác đánh dấu đã mua', idempotencyKey: `undo:task:${task.id}:${randomUUID()}` },
            db,
          );
        }
      }
      await shopping.updateItem(task.item_id, { purchasedBase: 0 }, db);
      await shopping.updateTask(task.id, { status: 'todo' }, db);
    }
    return presentTask(await shopping.findTask(group.id, task.id, db));
  });
}
