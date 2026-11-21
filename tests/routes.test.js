import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ORIGINAL_APIS, EXTENSION_APIS, SRS_APIS } from './apiList.js';

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
