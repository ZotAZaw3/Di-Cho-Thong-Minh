import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { adminOnly } from '../middlewares/adminOnly.js';
import { validate } from '../middlewares/validate.js';
import * as s from '../models/catalog.schema.js';
import * as u from '../models/user.schema.js';
import * as c from '../controllers/admin.controller.js';
import * as uc from '../controllers/user.controller.js';

// Nhóm 4 (Category), nhóm 5 (Unit + Get logs) · BE1 (Long) · T05.1
export const adminRouter = Router();
const admin = [requireAuth, adminOnly];

adminRouter.post('/admin/category', admin, validate(s.named), c.createCategory);
adminRouter.get('/admin/category', admin, c.listCategories);
adminRouter.put('/admin/category', admin, validate(s.rename), c.renameCategory);
adminRouter.delete('/admin/category', admin, validate(s.byName, 'input'), c.deleteCategory);

adminRouter.post('/admin/unit', admin, validate(s.named), c.createUnit);
adminRouter.get('/admin/unit', admin, c.listUnits);
adminRouter.put('/admin/unit', admin, validate(s.rename), c.renameUnit);
adminRouter.delete('/admin/unit', admin, validate(s.byName, 'input'), c.deleteUnit);
adminRouter.get('/admin/logs', admin, validate(s.logsQuery, 'query'), c.getLogs);

// Mở rộng · API #53 · T08.1
adminRouter.get('/admin/user', admin, validate(u.adminListUsers, 'query'), uc.adminListUsers);
adminRouter.put('/admin/user', admin, validate(u.adminSetStatus), uc.adminSetStatus);
