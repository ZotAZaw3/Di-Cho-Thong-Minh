import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ORIGINAL_APIS, EXTENSION_APIS } from './apiList.js';

const app = createApp();
const PREFIX = '/it4788';

describe('Danh sách API', () => {
  it('có đủ 49 API gốc', () => {
    expect(ORIGINAL_APIS).toHaveLength(49);
  });

  // Route tồn tại khi không rơi vào notFound. API đã làm có thể trả 400/401/404 nghiệp vụ,
  // nên chỉ kiểm tra mã ROUTE_NOT_FOUND chứ không kiểm tra HTTP status.
  it.each([...ORIGINAL_APIS, ...EXTENSION_APIS])('API #%i %s %s đã có route', async (_stt, method, path) => {
    const res = await request(app)[method.toLowerCase()](encodeURI(PREFIX + path));
    expect(res.body.code).not.toBe('ROUTE_NOT_FOUND');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('data');
  });
});

describe('Các path dễ nhầm trỏ đúng handler', () => {
  it.each([
    ['GET', '/user/group/', 'Get group members'],
    ['GET', '/user/', 'Get user'],
    ['GET', '/fridge/Thịt bò/', 'Specific item'],
    ['GET', '/recipe/suggest/', 'Gợi ý món từ tủ lạnh'],
    ['GET', '/recipe/?foodId=1', 'Get recipes by food id'],
    ['PUT', '/shopping/task/done/', 'Đánh dấu task đã mua'],
  ])('%s %s → %s', async (method, path, api) => {
    const res = await request(app)[method.toLowerCase()](encodeURI(PREFIX + path));
    expect(res.body.data).toEqual({ api });
  });
});
