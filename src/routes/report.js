import { Router } from 'express';
import { notImplemented } from '../utils/notImplemented.js';

// Mở rộng (đề xuất, chưa chốt) · API #55 · BE2 (Đức) · T08.2
export const reportRouter = Router();

reportRouter.get('/report', notImplemented('Thống kê mua sắm & tiêu thụ'));
