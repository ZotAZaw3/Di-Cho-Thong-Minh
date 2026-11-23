import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireGroup } from '../middlewares/groupGuard.js';
import { validate } from '../middlewares/validate.js';
import * as s from '../models/recipe.schema.js';
import * as c from '../controllers/recipe.controller.js';

// Mở rộng · API #55 · BE2 (Đức) · T08.2
export const reportRouter = Router();

reportRouter.get('/report', requireAuth, requireGroup, validate(s.reportQuery, 'query'), c.getReport);
