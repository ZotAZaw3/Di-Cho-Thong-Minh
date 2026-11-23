import { send } from '../utils/response.js';
import * as fridge from '../services/fridge.service.js';

// Nhóm 7.
export const createItem = async (req, res) =>
  send(res, 'CREATED', await fridge.createItem(req.user, req.group, req.valid, req.get('idempotency-key')));
export const updateItem = async (req, res) => send(res, 'OK', await fridge.updateItem(req.user, req.group, req.valid));
export const deleteItem = async (req, res) => send(res, 'OK', await fridge.deleteItems(req.user, req.group, req.valid));
export const listItems = async (req, res) => send(res, 'OK', await fridge.listItems(req.group, req.valid));
export const getByFoodName = async (req, res) => send(res, 'OK', await fridge.getByFoodName(req.group, req.valid.foodName));
