import { send } from '../utils/response.js';
import * as recipe from '../services/recipe.service.js';
import * as report from '../services/report.service.js';

// Nhóm 10 + API mở rộng #54, #55.
export const createRecipe = async (req, res) => send(res, 'CREATED', await recipe.createRecipe(req.user, req.group, req.valid, req.file, req));
export const updateRecipe = async (req, res) => send(res, 'OK', await recipe.updateRecipe(req.group, req.valid, req.file, req));
export const deleteRecipe = async (req, res) => send(res, 'OK', await recipe.deleteRecipe(req.group, req.valid));
export const listRecipes = async (req, res) => send(res, 'OK', await recipe.listRecipes(req.user, req.group, req.valid));
export const suggest = async (req, res) => send(res, 'OK', await recipe.suggest(req.user, req.group, req.valid));
export const getReport = async (req, res) => send(res, 'OK', await report.getReport(req.group, req.valid));
export const addFavorite = async (req, res) => send(res, 'OK', await recipe.addFavorite(req.user, req.group, req.valid));
export const removeFavorite = async (req, res) => send(res, 'OK', await recipe.removeFavorite(req.user, req.group, req.valid));
export const listFavorites = async (req, res) => send(res, 'OK', await recipe.listRecipes(req.user, req.group, { ...req.valid, favorite: true }));
