import express, { Router } from 'express';
import swaggerUiDist from 'swagger-ui-dist';
import { send } from '../utils/response.js';
import { env } from '../config/env.js';
import { buildOpenApi } from '../docs/openapi.js';
import { userRouter } from './user.js';
import { groupRouter } from './group.js';
import { adminRouter } from './admin.js';
import { shoppingRouter } from './shopping.js';
import { foodRouter } from './food.js';
import { fridgeRouter } from './fridge.js';
import { mealRouter } from './meal.js';
import { recipeRouter } from './recipe.js';
import { reportRouter } from './report.js';
import { notificationRouter } from './notification.js';

// Mỗi file = một nhóm API trong tài liệu; mỗi người chỉ sửa file nhóm mình phụ trách.
export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => send(res, 'OK', { status: 'ok' }));

// Tài liệu API: Swagger UI tại /it4788/docs, file OpenAPI tại /it4788/openapi.json (Postman import được).
// Giao diện lấy từ gói swagger-ui-dist, không cần CDN, chạy được với CSP mặc định của helmet.
let spec;
apiRouter.get('/openapi.json', (_req, res) => res.json((spec ??= buildOpenApi(apiRouter, env.API_PREFIX))));
apiRouter.use('/docs/assets', express.static(swaggerUiDist.getAbsoluteFSPath(), { index: false, maxAge: '1d' }));
apiRouter.get('/docs/init.js', (_req, res) =>
  res
    .type('js')
    .send(`SwaggerUIBundle({ url: '${env.API_PREFIX}/openapi.json', dom_id: '#ui', persistAuthorization: true, docExpansion: 'none', filter: true });`),
);
apiRouter.get('/docs', (_req, res) =>
  res.type('html').send(`<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Đi chợ tiện lợi API</title><link rel="stylesheet" href="${env.API_PREFIX}/docs/assets/swagger-ui.css"></head>
<body><div id="ui"></div>
<script src="${env.API_PREFIX}/docs/assets/swagger-ui-bundle.js"></script>
<script src="${env.API_PREFIX}/docs/init.js"></script>
</body></html>`),
);

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
apiRouter.use(notificationRouter);
