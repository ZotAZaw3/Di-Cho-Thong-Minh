import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireGroup } from '../middlewares/groupGuard.js';
import { validate } from '../middlewares/validate.js';
import { uploadImage } from '../middlewares/upload.js';
import * as s from '../models/catalog.schema.js';
import * as c from '../controllers/food.controller.js';

// Nhóm 6 (Thực phẩm) · BE2 (Đức) · T03.3
export const foodRouter = Router();
const member = [requireAuth, requireGroup];

foodRouter.post('/food', member, uploadImage, validate(s.createFood), c.createFood);
foodRouter.put('/food', member, uploadImage, validate(s.updateFood), c.updateFood);
foodRouter.delete('/food', member, validate(s.deleteFood, 'input'), c.deleteFood);
foodRouter.get('/food', member, c.listFoods);
foodRouter.get('/food/unit', requireAuth, c.listUnits);
foodRouter.get('/food/category', requireAuth, c.listCategories);
