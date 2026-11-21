import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ORIGINAL_APIS, EXTENSION_APIS, SRS_APIS } from './apiList.js';
import { apiRouter } from '../src/routes/index.js';
import { EXAMPLES, collectRoutes } from '../src/docs/openapi.js';

const app = createApp();
const PREFIX = '/it4788';

describe('Danh sách API', () => {
  it('có đủ 49 API gốc', () => {
    expect(ORIGINAL_APIS).toHaveLength(49);
  });

  // Route tồn tại khi không rơi vào notFound. API đã làm có thể trả 400/401/404 nghiệp vụ,
  // nên chỉ kiểm tra mã ROUTE_NOT_FOUND chứ không kiểm tra HTTP status.
  it.each([...ORIGINAL_APIS, ...EXTENSION_APIS, ...SRS_APIS])('API #%i %s %s đã có route', async (_stt, method, path) => {
    const res = await request(app)[method.toLowerCase()](encodeURI(PREFIX + path));
    expect(res.body.code).not.toBe('ROUTE_NOT_FOUND');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('data');
  });
});

describe('Các path dễ nhầm trỏ đúng handler', () => {
  // Không có token: mọi route cần đăng nhập trả 00281; route công khai kiểm tra body trước (00279).
  it.each([
    ['GET', '/user/group/', '00281'],
    ['GET', '/user/', '00281'],
    ['GET', '/fridge/Thịt bò/', '00281'],
    ['GET', '/recipe/suggest/', '00281'],
    ['PUT', '/shopping/task/done/', '00281'],
    ['GET', '/recipe/favorite/', '00281'],
    ['POST', '/shopping/copy/', '00281'],
    ['GET', '/notification/', '00281'],
    ['POST', '/user/', '00279'],
    ['POST', '/user/login/', '00279'],
    ['POST', '/user/refresh-token/', '00279'],
  ])('%s %s → %s', async (method, path, code) => {
    const res = await request(app)[method.toLowerCase()](encodeURI(PREFIX + path)).send({});
    expect(res.body.code).toBe(code);
  });
});

describe('Tài liệu API (Swagger / Postman)', () => {
  it('openapi.json có đủ mọi API trong danh sách, kèm schema body', async () => {
    const res = await request(app).get(`${PREFIX}/openapi.json`);
    expect(res.body.openapi).toBe('3.1.0');
    for (const [, method, path] of [...ORIGINAL_APIS, ...EXTENSION_APIS, ...SRS_APIS]) {
      const key = path.split('?')[0].replace(/\/fridge\/[^/]+\/$/, '/fridge/{foodName}/');
      expect(res.body.paths[key]?.[method.toLowerCase()], `${method} ${key}`).toBeDefined();
    }
    const login = res.body.paths['/user/login/'].post;
    expect(login.security).toEqual([]);
    expect(login.requestBody.content['application/json'].schema.required).toEqual(expect.arrayContaining(['email', 'password']));
    expect(res.body.paths['/shopping/task/'].post.security).toEqual([{ bearer: [] }]);
  });

  it('trang Swagger UI mở được, không cần CDN', async () => {
    const res = await request(app).get(`${PREFIX}/docs`);
    expect(res.status).toBe(200);
    expect(res.text).toContain(`${PREFIX}/docs/assets/swagger-ui-bundle.js`);
    expect((await request(app).get(`${PREFIX}/docs/init.js`)).text).toContain('SwaggerUIBundle');
    expect((await request(app).get(`${PREFIX}/docs/assets/swagger-ui.css`)).status).toBe(200);
  });

  it('body mẫu trong tài liệu đều qua được validate của API đó', () => {
    const routes = collectRoutes(apiRouter);
    for (const [key, sample] of Object.entries(EXAMPLES)) {
      const [method, path] = key.split(' ');
      const route = routes.find((r) => r.method === method && r.path === path);
      expect(route, key).toBeDefined();
      for (const h of route.handlers.filter((x) => x.schema)) {
        const result = h.schema.safeParse(sample);
        expect(result.success, `${key}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
      }
    }
  });
});
