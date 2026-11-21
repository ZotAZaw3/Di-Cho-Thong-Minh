import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ORIGINAL_APIS, EXTENSION_APIS, SRS_APIS } from './apiList.js';
import { apiRouter } from '../src/routes/index.js';
import { EXAMPLES, collectRoutes } from '../src/docs/openapi.js';
import { API_CODES, CODES, resolveCode } from '../src/utils/codes.js';

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

describe('Bảng mã theo tài liệu môn học', () => {
  const routes = new Set(collectRoutes(apiRouter).map((r) => `${r.method} ${r.path}`));
  const routeOf = ([, method, path]) => {
    const clean = path.split('?')[0].replace(/\/$/, '');
    return `${method} ${clean.startsWith('/fridge/') ? '/fridge/:foodName' : clean || '/'}`;
  };

  it('mỗi route trong API_CODES có thật, mỗi API gốc có mã thành công riêng', () => {
    for (const key of Object.keys(API_CODES)) expect(routes.has(key), key).toBe(true);
    for (const api of ORIGINAL_APIS) expect(API_CODES[routeOf(api)]?.OK, routeOf(api)).toBeDefined();
  });

  it('mã đúng định dạng 5 chữ số; mã riêng nằm trong dải của tài liệu, mã riêng của nhóm ở 009xx', () => {
    for (const [key, e] of Object.entries(CODES)) expect(e.code, key).toMatch(/^\d{5}$/);
    for (const [route, profile] of Object.entries(API_CODES)) {
      for (const v of Object.values(profile)) {
        const code = Array.isArray(v) ? v[0] : v;
        expect(Number(code), `${route} ${code}`).toBeGreaterThan(0);
        expect(Number(code), `${route} ${code}`).toBeLessThan(380);
      }
    }
  });

  it('chọn mã theo route và reason; không khớp thì dùng mã chung', () => {
    expect(resolveCode('POST /shopping/task', 'CREATED')).toEqual({ code: '00287', message: 'Thêm nhiệm vụ thành công' });
    expect(resolveCode('POST /shopping/task', 'FORBIDDEN').code).toBe('00284');
    expect(resolveCode('POST /shopping/task', 'BAD_REQUEST', ['tasks', 'missing']).code).toBe('00279');
    expect(resolveCode('POST /shopping/task', 'BAD_REQUEST', ['missing:tasks', 'missing', 'tasks']).code).toBe('00278');
    expect(resolveCode('POST /food', 'NOT_FOUND', ['unit']).code).toBe('00153');
    expect(resolveCode('POST /meal', 'NOT_FOUND', ['recipe']).code).toBe(CODES.NOT_FOUND.code);
    expect(resolveCode('GET /recipe/suggest', 'OK').code).toBe('00000');
    expect(resolveCode(null, 'ROUTE_NOT_FOUND').code).toBe('00905');
  });
});

describe('Các path dễ nhầm trỏ đúng handler', () => {
  // Không có token: mọi route cần đăng nhập trả 00006; route công khai kiểm tra body trước (mã thiếu trường của API đó).
  it.each([
    ['GET', '/user/group/', '00006'],
    ['GET', '/user/', '00006'],
    ['GET', '/fridge/Thịt bò/', '00006'],
    ['GET', '/recipe/suggest/', '00006'],
    ['PUT', '/shopping/task/done/', '00006'],
    ['GET', '/recipe/favorite/', '00006'],
    ['POST', '/shopping/copy/', '00006'],
    ['GET', '/notification/', '00006'],
    ['POST', '/user/', '00025'],
    ['POST', '/user/login/', '00038'],
    ['POST', '/user/refresh-token/', '00059'],
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
