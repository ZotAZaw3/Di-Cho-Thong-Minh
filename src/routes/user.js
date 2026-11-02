import { Router } from 'express';
import { notImplemented } from '../utils/notImplemented.js';

// Nhóm 1 (Xác thực), nhóm 2 (Tài khoản), Get/Delete user · BE1 (Long)
export const userRouter = Router();

// Nhóm 1 · T03.1
userRouter.post('/user/login', notImplemented('Login'));
userRouter.post('/user', notImplemented('Register'));
userRouter.post('/user/logout', notImplemented('Logout'));
userRouter.post('/user/refresh-token', notImplemented('Refresh token'));
userRouter.post('/user/send-verification-code', notImplemented('Send verification code'));
userRouter.post('/user/verify-email', notImplemented('Verify email'));

// Nhóm 2 + Get/Delete user · T04.1
userRouter.post('/user/change-password', notImplemented('Change password'));
userRouter.put('/user', notImplemented('Edit user'));
userRouter.get('/user', notImplemented('Get user'));
userRouter.delete('/user', notImplemented('Delete user'));

// Mở rộng (đề xuất, chưa chốt) · API #50 · T05.2 (BE2)
userRouter.put('/user/device', notImplemented('Cập nhật FCM token thiết bị'));
