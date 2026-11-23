import { z } from 'zod';
import { text, optText, id, quantity, date, bool, storageLocation, withAliases, needOne } from './common.js';

// Nhóm 8 + API mở rộng #51, #52.
const login = z.union([z.string().trim().max(254), z.number()]).optional();

export const createList = withAliases(
  { name: ['title', 'listName'], assignToUsername: ['assignedTo', 'assignee', 'assignTo'], date: ['shoppingDate'] },
  { name: text(160), assignToUsername: login, date: date.optional(), note: optText(1000) },
);

export const updateList = needOne(
  withAliases(
    { newName: ['name', 'title', 'newTitle'], newAssignToUsername: ['newAssignedTo', 'assignedTo', 'assignToUsername'], newDate: ['date'], newNote: ['note'] },
    {
      listId: id,
      newName: optText(160),
      newAssignToUsername: login,
      newDate: date.optional(),
      newNote: optText(1000),
      status: z.enum(['active', 'archived']).optional(),
    },
  ),
  ['newName', 'newAssignToUsername', 'newDate', 'newNote', 'status'],
);

export const listRef = withAliases({ listId: ['id'] }, { listId: id });

export const copyList = withAliases(
  { listId: ['id', 'sourceListId'], newName: ['name', 'title'], assignToUsername: ['assignedTo', 'assignee'], date: ['shoppingDate', 'newDate'] },
  { listId: id, newName: optText(160), date: date.optional(), assignToUsername: login },
);

const taskInput = withAliases(
  { foodName: ['name'], unit: ['unitName'], assignToUsername: ['assignedTo'] },
  { foodId: id.optional(), foodName: optText(160), quantity, unit: optText(60), note: optText(500), assignToUsername: login },
).refine((v) => v.foodId || v.foodName, { message: 'cần foodName', path: ['foodName'] });

export const createTasks = z.object({
  listId: id,
  tasks: z.array(taskInput, { error: 'phải là mảng' }).min(1, 'cần ít nhất một mặt hàng').max(100),
});

export const taskRef = withAliases({ taskId: ['id'] }, { taskId: id });

export const updateTask = needOne(
  withAliases(
    { taskId: ['id'], newQuantity: ['quantity'], newFoodName: ['foodName'], newUnit: ['unit', 'unitName'], isDone: ['done', 'completed'] },
    {
      taskId: id,
      newFoodName: optText(160),
      newQuantity: quantity.optional(),
      newUnit: optText(60),
      newAssignToUsername: login,
      newNote: optText(500),
      isDone: bool.optional(),
    },
  ),
  ['newFoodName', 'newQuantity', 'newUnit', 'newAssignToUsername', 'newNote', 'isDone'],
);

export const taskDone = withAliases(
  { taskId: ['id'], done: ['isDone', 'completed'], storageLocation: ['location'] },
  {
    taskId: id,
    done: bool.default(true),
    expiryDate: date.optional(),
    storageLocation: storageLocation.optional(),
    totalCost: z.coerce.number().min(0).optional(),
  },
);

export const listQuery = z.object({
  status: z.enum(['active', 'archived']).optional(),
  date: date.optional(),
  mine: bool.optional(),
});

export const taskQuery = z.object({
  listId: id.optional(),
  mine: bool.optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
});
