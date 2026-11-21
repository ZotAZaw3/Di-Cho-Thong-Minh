import { send } from '../utils/response.js';
import * as shopping from '../services/shopping.service.js';

// Nhóm 8 + API mở rộng #51, #52.
export const createList = async (req, res) => send(res, 'CREATED', await shopping.createList(req.user, req.group, req.valid));
export const updateList = async (req, res) => send(res, 'OK', await shopping.updateList(req.user, req.group, req.valid));
export const deleteList = async (req, res) => send(res, 'OK', await shopping.deleteList(req.user, req.group, req.valid));
export const getLists = async (req, res) => send(res, 'OK', await shopping.getLists(req.user, req.group, req.valid));

export const createTasks = async (req, res) => send(res, 'TASKS_CREATED', await shopping.createTasks(req.user, req.group, req.valid));
export const getTasks = async (req, res) => send(res, 'OK', await shopping.getTasks(req.user, req.group, req.valid));
export const deleteTask = async (req, res) => send(res, 'OK', await shopping.deleteTask(req.user, req.group, req.valid));
export const updateTask = async (req, res) => send(res, 'OK', await shopping.updateTask(req.user, req.group, req.valid));
export const setTaskDone = async (req, res) => send(res, 'OK', await shopping.setTaskDone(req.user, req.group, req.valid));
