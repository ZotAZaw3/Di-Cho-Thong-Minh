import { Router } from 'express';
import { requireAuth, readBearer } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { uploadImage } from '../middlewares/upload.js';
import * as s from '../models/user.schema.js';
import * as c from '../controllers/user.controller.js';

// Nhóm 1 (Xác thực), nhóm 2 (Tài khoản), Get/Delete user · BE1 (Long)
export const userRouter = Router();

// Nhóm 1 · T03.1
userRouter.post('/user/login', validate(s.login), c.login);
userRouter.post('/user', validate(s.register), c.register);
userRouter.post('/user/logout', readBearer, c.logout);
userRouter.post('/user/refresh-token', validate(s.refreshToken), c.refreshToken);
userRouter.post('/user/send-verification-code', validate(s.sendCode), c.sendVerificationCode);
userRouter.post('/user/verify-email', validate(s.verifyEmail), c.verifyEmail);

// Nhóm 2 + Get/Delete user · T04.1
userRouter.post('/user/change-password', requireAuth, validate(s.changePassword), c.changePassword);
userRouter.put('/user', requireAuth, uploadImage, validate(s.editUser), c.editUser);
userRouter.get('/user', requireAuth, c.getUser);
userRouter.delete('/user', requireAuth, c.deleteUser);

// Mở rộng · API #50 · lưu FCM token của thiết bị
userRouter.put('/user/device', requireAuth, validate(s.device), c.registerDevice);
