import { send } from '../utils/response.js';
import * as catalog from '../services/catalog.service.js';
import * as logService from '../services/log.service.js';
import * as settings from '../services/settings.service.js';

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

// Danh mục thực phẩm chung + cấu hình hệ thống (đề bài: admin quản lý tên món đồ, cấu hình).
export const listFoods = async (req, res) => send(res, 'OK', await catalog.adminListFoods(req.valid));
export const createFood = async (req, res) => send(res, 'CREATED', await catalog.adminCreateFood(req.user, req.valid, req.file, req));
export const updateFood = async (req, res) => send(res, 'OK', await catalog.adminUpdateFood(req.valid, req.file, req));
export const deleteFood = async (req, res) => send(res, 'OK', await catalog.adminDeleteFood(req.valid));

export const getConfig = async (_req, res) => send(res, 'OK', await settings.listSettings());
export const updateConfig = async (req, res) => send(res, 'OK', await settings.updateSettings(req.user, req.body));
