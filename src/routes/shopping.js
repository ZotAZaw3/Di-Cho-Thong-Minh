import { Router } from 'express';
import { notImplemented } from '../utils/notImplemented.js';

// Nhóm 8 (Mua sắm) · BE1 (Long) · T06.1, T07.1
export const shoppingRouter = Router();

shoppingRouter.post('/shopping', notImplemented('Create shopping list'));
shoppingRouter.put('/shopping', notImplemented('Update shopping list'));
shoppingRouter.delete('/shopping', notImplemented('Delete shopping list'));

shoppingRouter.post('/shopping/task', notImplemented('Create tasks'));
shoppingRouter.get('/shopping/task', notImplemented('Get list of task'));
shoppingRouter.delete('/shopping/task', notImplemented('Delete task'));
shoppingRouter.put('/shopping/task', notImplemented('Update task'));

// Mở rộng (đề xuất, chưa chốt) · API #51, #52 · T08.1
shoppingRouter.get('/shopping', notImplemented('Lấy các shopping list của nhóm'));
shoppingRouter.put('/shopping/task/done', notImplemented('Đánh dấu task đã mua'));
