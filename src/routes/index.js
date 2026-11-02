import { Router } from 'express';
import { send } from '../utils/response.js';
import { userRouter } from './user.js';
import { groupRouter } from './group.js';
import { adminRouter } from './admin.js';
import { shoppingRouter } from './shopping.js';
import { foodRouter } from './food.js';
import { fridgeRouter } from './fridge.js';
import { mealRouter } from './meal.js';
import { recipeRouter } from './recipe.js';
import { reportRouter } from './report.js';

// Mỗi file = một nhóm API trong tài liệu; mỗi người chỉ sửa file nhóm mình phụ trách.
export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => send(res, 'OK', { status: 'ok' }));

// groupRouter đứng trước userRouter để rõ ràng; hai router không trùng path.
apiRouter.use(groupRouter);
apiRouter.use(userRouter);
apiRouter.use(adminRouter);
apiRouter.use(shoppingRouter);
apiRouter.use(foodRouter);
apiRouter.use(fridgeRouter);
apiRouter.use(mealRouter);
apiRouter.use(recipeRouter);
apiRouter.use(reportRouter);
