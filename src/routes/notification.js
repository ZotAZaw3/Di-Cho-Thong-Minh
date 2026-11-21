import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireGroup } from '../middlewares/groupGuard.js';
import { validate } from '../middlewares/validate.js';
import * as s from '../models/notification.schema.js';
import * as c from '../controllers/notification.controller.js';

// Hộp thư thông báo: app hiển thị lại các lần nhắc hết hạn (kể cả khi máy chưa đăng ký FCM).
export const notificationRouter = Router();
const member = [requireAuth, requireGroup];

notificationRouter.get('/notification', member, validate(s.listQuery, 'query'), c.list);
notificationRouter.put('/notification/read', member, validate(s.markRead, 'input'), c.markRead);
