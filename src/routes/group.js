import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireGroup, requireLeader } from '../middlewares/groupGuard.js';
import { validate } from '../middlewares/validate.js';
import * as s from '../models/user.schema.js';
import * as c from '../controllers/group.controller.js';

// Nhóm 3 (Nhóm gia đình) · BE1 (Long) · T04.2
export const groupRouter = Router();

groupRouter.post('/user/group', requireAuth, validate(s.createGroup), c.createGroup);
groupRouter.post('/user/group/add', requireAuth, requireGroup, requireLeader, validate(s.memberRef), c.addMember);
groupRouter.delete('/user/group', requireAuth, requireGroup, requireLeader, validate(s.memberRef, 'input'), c.removeMember);
groupRouter.get('/user/group', requireAuth, requireGroup, c.getMembers);
