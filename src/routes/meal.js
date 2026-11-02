import { Router } from 'express';
import { notImplemented } from '../utils/notImplemented.js';

// Nhóm 9 (Bữa ăn) · BE2 (Đức) · T06.2
export const mealRouter = Router();

mealRouter.post('/meal', notImplemented('Create meal plan'));
mealRouter.delete('/meal', notImplemented('Delete plan'));
mealRouter.put('/meal', notImplemented('Update meal plan'));
mealRouter.get('/meal', notImplemented('Get meal plan by date'));
