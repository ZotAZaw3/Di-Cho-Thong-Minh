import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireGroup } from '../middlewares/groupGuard.js';
import { validate } from '../middlewares/validate.js';
import * as s from '../models/fridge.schema.js';
import * as c from '../controllers/fridge.controller.js';

// Nhóm 7 (Tủ lạnh) · BE2 (Đức) · T04.3
export const fridgeRouter = Router();
const member = [requireAuth, requireGroup];

fridgeRouter.post('/fridge', member, validate(s.createItem), c.createItem);
fridgeRouter.put('/fridge', member, validate(s.updateItem), c.updateItem);
fridgeRouter.delete('/fridge', member, validate(s.deleteItem, 'input'), c.deleteItem);
fridgeRouter.get('/fridge', member, validate(s.listQuery, 'query'), c.listItems);
fridgeRouter.get('/fridge/:foodName', member, validate(s.foodNameParam, 'params'), c.getByFoodName);
