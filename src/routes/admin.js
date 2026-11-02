import { Router } from 'express';
import { notImplemented } from '../utils/notImplemented.js';

// Nhóm 4 (Category), nhóm 5 (Unit + Get logs) · BE1 (Long) · T05.1
export const adminRouter = Router();

adminRouter.post('/admin/category', notImplemented('Create a category'));
adminRouter.get('/admin/category', notImplemented('Get all categories'));
adminRouter.put('/admin/category', notImplemented('Edit category by name'));
adminRouter.delete('/admin/category', notImplemented('Delete category by name'));

adminRouter.post('/admin/unit', notImplemented('Create a unit'));
adminRouter.get('/admin/unit', notImplemented('Get all units'));
adminRouter.put('/admin/unit', notImplemented('Edit unit by name'));
adminRouter.delete('/admin/unit', notImplemented('Delete unit by name'));
adminRouter.get('/admin/logs', notImplemented('Get logs'));

// Mở rộng (đề xuất, chưa chốt) · API #53 · T08.1
adminRouter.get('/admin/user', notImplemented('Admin: danh sách tài khoản'));
adminRouter.put('/admin/user', notImplemented('Admin: khóa tài khoản'));
