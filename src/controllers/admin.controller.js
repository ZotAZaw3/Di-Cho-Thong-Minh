import { send } from '../utils/response.js';
import * as catalog from '../services/catalog.service.js';
import * as logService from '../services/log.service.js';

// Nhóm 4 (Category), 5 (Unit, Get logs).
export const createCategory = async (req, res) => send(res, 'CREATED', await catalog.createCategory(req.valid));
export const listCategories = async (_req, res) => send(res, 'OK', await catalog.listCategories());
export const renameCategory = async (req, res) => send(res, 'OK', await catalog.renameCategory(req.valid));
export const deleteCategory = async (req, res) => send(res, 'OK', await catalog.deleteCategory(req.valid));

export const createUnit = async (req, res) => send(res, 'CREATED', await catalog.createUnit(req.valid));
export const listUnits = async (_req, res) => send(res, 'OK', await catalog.listUnits());
export const renameUnit = async (req, res) => send(res, 'OK', await catalog.renameUnit(req.valid));
export const deleteUnit = async (req, res) => send(res, 'OK', await catalog.deleteUnit(req.valid));

export const getLogs = async (req, res) => send(res, 'OK', await logService.getLogs(req.valid));
