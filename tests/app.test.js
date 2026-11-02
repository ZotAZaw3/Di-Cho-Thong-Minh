import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Khung server', () => {
  it('health check trả đúng format', async () => {
    const res = await request(app).get('/it4788/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'OK', message: 'Thành công', data: { status: 'ok' } });
  });

  it('API chưa làm trả 501 kèm tên API', async () => {
    const res = await request(app).post('/it4788/user/login/');
    expect(res.status).toBe(501);
    expect(res.body).toMatchObject({ code: 'NOT_IMPLEMENTED', data: { api: 'Login' } });
  });

  it('route không tồn tại trả ROUTE_NOT_FOUND', async () => {
    const res = await request(app).get('/it4788/khong-co/');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ROUTE_NOT_FOUND');
  });

  it('route ngoài /it4788 cũng trả đúng format', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ROUTE_NOT_FOUND');
  });

  it('body JSON sai cú pháp trả BAD_REQUEST', async () => {
    const res = await request(app)
      .post('/it4788/user/login/')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });
});

describe('Giới hạn tần suất', () => {
  it('vượt giới hạn trả mã 00024', async () => {
    vi.resetModules();
    vi.stubEnv('RATE_LIMIT_MAX', '2');
    const { createApp: createLimitedApp } = await import('../src/app.js');
    const limited = createLimitedApp();
    await request(limited).get('/it4788/health');
    await request(limited).get('/it4788/health');
    const res = await request(limited).get('/it4788/health');
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('00024');
    vi.unstubAllEnvs();
  });
});
