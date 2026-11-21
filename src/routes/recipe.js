import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireGroup } from '../middlewares/groupGuard.js';
import { validate } from '../middlewares/validate.js';
import { uploadImage } from '../middlewares/upload.js';
import * as s from '../models/recipe.schema.js';
import * as c from '../controllers/recipe.controller.js';

// Nhóm 10 (Công thức) · BE2 (Đức) · T07.2
export const recipeRouter = Router();
const member = [requireAuth, requireGroup];

// Mở rộng · API #54 · T08.2. Đặt trước để không bị route khác nuốt.
recipeRouter.get('/recipe/suggest', member, validate(s.suggestQuery, 'query'), c.suggest);

recipeRouter.post('/recipe/favorite', member, validate(s.recipeRef, 'input'), c.addFavorite);
recipeRouter.delete('/recipe/favorite', member, validate(s.recipeRef, 'input'), c.removeFavorite);
recipeRouter.get('/recipe/favorite', member, validate(s.listQuery, 'query'), c.listFavorites);

recipeRouter.post('/recipe', member, uploadImage, validate(s.createRecipe), c.createRecipe);
recipeRouter.put('/recipe', member, uploadImage, validate(s.updateRecipe), c.updateRecipe);
recipeRouter.delete('/recipe', member, validate(s.recipeRef, 'input'), c.deleteRecipe);
recipeRouter.get('/recipe', member, validate(s.listQuery, 'query'), c.listRecipes);
