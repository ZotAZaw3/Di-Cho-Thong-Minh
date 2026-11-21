import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireGroup } from '../middlewares/groupGuard.js';
import { validate } from '../middlewares/validate.js';
import * as s from '../models/shopping.schema.js';
import * as c from '../controllers/shopping.controller.js';

// Nhóm 8 (Mua sắm) · BE1 (Long) · T06.1, T07.1
export const shoppingRouter = Router();
const member = [requireAuth, requireGroup];

shoppingRouter.post('/shopping', member, validate(s.createList), c.createList);
shoppingRouter.put('/shopping', member, validate(s.updateList), c.updateList);
shoppingRouter.delete('/shopping', member, validate(s.listRef, 'input'), c.deleteList);

shoppingRouter.post('/shopping/task', member, validate(s.createTasks), c.createTasks);
shoppingRouter.get('/shopping/task', member, validate(s.taskQuery, 'query'), c.getTasks);
shoppingRouter.delete('/shopping/task', member, validate(s.taskRef, 'input'), c.deleteTask);
shoppingRouter.put('/shopping/task', member, validate(s.updateTask), c.updateTask);

// Mở rộng · API #51, #52 · T08.1, T09.1
shoppingRouter.get('/shopping', member, validate(s.listQuery, 'query'), c.getLists);
shoppingRouter.put('/shopping/task/done', member, validate(s.taskDone), c.setTaskDone);
