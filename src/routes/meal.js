import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireGroup } from '../middlewares/groupGuard.js';
import { validate } from '../middlewares/validate.js';
import * as s from '../models/meal.schema.js';
import * as c from '../controllers/meal.controller.js';

// Nhóm 9 (Bữa ăn) · BE2 (Đức) · T06.2
export const mealRouter = Router();
const member = [requireAuth, requireGroup];

mealRouter.post('/meal', member, validate(s.createPlan), c.createPlan);
mealRouter.delete('/meal', member, validate(s.planRef, 'input'), c.deletePlan);
mealRouter.put('/meal', member, validate(s.updatePlan), c.updatePlan);
mealRouter.get('/meal', member, validate(s.byDate, 'query'), c.getByDate);
mealRouter.post('/meal/cook', member, validate(s.cook), c.cookPlan);
