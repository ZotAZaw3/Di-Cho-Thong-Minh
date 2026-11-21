import { send } from '../utils/response.js';
import * as groupService from '../services/group.service.js';

// Nhóm 3.
export const createGroup = async (req, res) => send(res, 'CREATED', await groupService.createGroup(req.user, req.valid));
export const addMember = async (req, res) => send(res, 'OK', await groupService.addMember(req.group, req.valid));
export const removeMember = async (req, res) => send(res, 'OK', await groupService.removeMember(req.user, req.group, req.valid));
export const getMembers = async (req, res) => send(res, 'OK', await groupService.getMembers(req.group));
