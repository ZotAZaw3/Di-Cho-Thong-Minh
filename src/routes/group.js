import { Router } from 'express';
import { notImplemented } from '../utils/notImplemented.js';

// Nhóm 3 (Nhóm gia đình) · BE1 (Long) · T04.2
export const groupRouter = Router();

groupRouter.post('/user/group', notImplemented('Create group'));
groupRouter.post('/user/group/add', notImplemented('Add member'));
groupRouter.delete('/user/group', notImplemented('Delete member'));
groupRouter.get('/user/group', notImplemented('Get group members'));
