import { send } from '../utils/response.js';
import * as catalog from '../services/catalog.service.js';

// Nhóm 6.
export const createFood = async (req, res) => send(res, 'CREATED', await catalog.createFood(req.user, req.group, req.valid, req.file, req));
export const updateFood = async (req, res) => send(res, 'OK', await catalog.updateFood(req.group, req.valid, req.file, req));
export const deleteFood = async (req, res) => send(res, 'OK', await catalog.deleteFood(req.group, req.valid));
export const listFoods = async (req, res) => send(res, 'OK', await catalog.getFoodCatalog(req.group, req.valid));
export const listUnits = async (_req, res) => send(res, 'OK', await catalog.listUnits());
export const listCategories = async (_req, res) => send(res, 'OK', await catalog.listCategories());
