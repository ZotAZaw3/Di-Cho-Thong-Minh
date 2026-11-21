import { send } from '../utils/response.js';
import * as meal from '../services/meal.service.js';

// Nhóm 9.
export const createPlan = async (req, res) => send(res, 'CREATED', await meal.createPlan(req.user, req.group, req.valid));
export const updatePlan = async (req, res) => send(res, 'OK', await meal.updatePlan(req.user, req.group, req.valid));
export const deletePlan = async (req, res) => send(res, 'OK', await meal.deletePlan(req.group, req.valid));
export const getByDate = async (req, res) => send(res, 'OK', await meal.getByDate(req.group, req.valid));
export const cookPlan = async (req, res) => send(res, 'OK', await meal.cookPlan(req.user, req.group, req.valid));
