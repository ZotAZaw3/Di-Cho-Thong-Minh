import { Router } from 'express';
import { notImplemented } from '../utils/notImplemented.js';

// Nhóm 7 (Tủ lạnh) · BE2 (Đức) · T04.3
export const fridgeRouter = Router();

fridgeRouter.post('/fridge', notImplemented('Create fridge item'));
fridgeRouter.put('/fridge', notImplemented('Update fridge item'));
fridgeRouter.delete('/fridge', notImplemented('Delete fridge item'));
fridgeRouter.get('/fridge', notImplemented('Get all fridge items'));
fridgeRouter.get('/fridge/:foodName', notImplemented('Specific item'));
