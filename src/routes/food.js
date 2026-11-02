import { Router } from 'express';
import { notImplemented } from '../utils/notImplemented.js';

// Nhóm 6 (Thực phẩm) · BE2 (Đức) · T03.3
export const foodRouter = Router();

foodRouter.post('/food', notImplemented('Create food'));
foodRouter.put('/food', notImplemented('Update food'));
foodRouter.delete('/food', notImplemented('Delete food'));
foodRouter.get('/food', notImplemented('Get all foods in group'));
foodRouter.get('/food/unit', notImplemented('Get units'));
foodRouter.get('/food/category', notImplemented('Get categories'));
