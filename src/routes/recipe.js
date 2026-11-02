import { Router } from 'express';
import { notImplemented } from '../utils/notImplemented.js';

// Nhóm 10 (Công thức) · BE2 (Đức) · T07.2
export const recipeRouter = Router();

// Mở rộng (đề xuất, chưa chốt) · API #54 · T08.2. Đặt trước để không bị route khác nuốt.
recipeRouter.get('/recipe/suggest', notImplemented('Gợi ý món từ tủ lạnh'));

recipeRouter.post('/recipe', notImplemented('Create recipe'));
recipeRouter.put('/recipe', notImplemented('Update recipe'));
recipeRouter.delete('/recipe', notImplemented('Delete recipe'));
recipeRouter.get('/recipe', notImplemented('Get recipes by food id'));
