import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { hasDb, call, newFamily } from '../helpers.js';
import { query } from '../../src/config/db.js';
import { setGateways } from '../../src/services/gateways/index.js';
import { logPush } from '../../src/services/gateways/push.js';
import { scanExpiring, dispatchDue } from '../../src/services/notification.service.js';

const statusOf = async (userId) =>
  (await query('SELECT status, attempts, type FROM notifications WHERE user_id = $1 ORDER BY id', [userId]));

describe.skipIf(!hasDb)('Nhắc hết hạn · outbox + worker gửi FCM', () => {
  let sent;
  let behaviour;
  beforeEach(async () => {
    await query("UPDATE notifications SET status = 'CANCELLED' WHERE status IN ('PENDING', 'RETRY_WAIT')");
    sent = [];
    behaviour = (tokens) => ({ successCount: tokens.length, invalidTokens: [], error: null });
    setGateways({ push: { sendToTokens: async (tokens, msg) => (sent.push({ tokens, msg }), behaviour(tokens)) } });
  });
  afterAll(() => setGateways({ push: logPush }));

  it('ghi thông báo cho mọi thành viên, chạy lại không trùng, gửi tới token của từng người', async () => {
    const { leader, members: [m1] } = await newFamily(1);
    await call('put', '/user/device/', leader.token).send({ token: `tok-${leader.id}` });
    await call('post', '/fridge/', leader.token).send({ foodName: 'Thịt bò', quantity: 0.5, useWithin: 2 });
    await call('post', '/fridge/', leader.token).send({ foodName: 'Gạo', quantity: 5, useWithin: 100 });

    expect(await scanExpiring(3)).toBeGreaterThanOrEqual(2);
    expect(await scanExpiring(3)).toBe(0);

    await dispatchDue(500);
    expect(await statusOf(leader.id)).toEqual([{ status: 'FCM_ACCEPTED', attempts: 0, type: 'EXPIRY_SOON' }]);
    // Thành viên chưa đăng ký thiết bị → CANCELLED.
    expect((await statusOf(m1.id))[0].status).toBe('CANCELLED');
    const mine = sent.find((s) => s.tokens.includes(`tok-${leader.id}`));
    expect(mine.msg).toMatchObject({ title: 'Sắp hết hạn: Thịt bò', body: expect.stringContaining('hết hạn sau 2 ngày') });
  });

  it('món đã quá hạn hôm qua được nhắc EXPIRED', async () => {
    const { leader } = await newFamily();
    await call('put', '/user/device/', leader.token).send({ token: `tok-exp-${leader.id}` });
    await call('post', '/fridge/', leader.token).send({ foodName: 'Cá hồi', quantity: 0.3, useWithin: -1 });
    await scanExpiring(3);
    await dispatchDue(500);
    expect(await statusOf(leader.id)).toEqual([{ status: 'FCM_ACCEPTED', attempts: 0, type: 'EXPIRED' }]);
  });

  it('lỗi tạm thời: RETRY_WAIT, FAILED sau 3 lần', async () => {
    const { leader } = await newFamily();
    await call('put', '/user/device/', leader.token).send({ token: `tok-r-${leader.id}` });
    await call('post', '/fridge/', leader.token).send({ foodName: 'Tôm', quantity: 0.3, useWithin: 0 });
    await scanExpiring(3);
    behaviour = () => ({ successCount: 0, invalidTokens: [], error: new Error('FCM 503') });
    for (let i = 0; i < 3; i += 1) {
      await dispatchDue(500);
      await query('UPDATE notifications SET next_attempt_at = now() WHERE user_id = $1', [leader.id]);
    }
    expect(await statusOf(leader.id)).toEqual([{ status: 'FAILED', attempts: 3, type: 'EXPIRY_SOON' }]);
  });

  it('token không còn hợp lệ bị xóa; món đã dùng hết thì hủy thông báo', async () => {
    const { leader } = await newFamily();
    await call('put', '/user/device/', leader.token).send({ token: `tok-bad-${leader.id}` });
    const item = (await call('post', '/fridge/', leader.token).send({ foodName: 'Mực', quantity: 0.3, useWithin: 1 })).body.data;
    await call('post', '/fridge/', leader.token).send({ foodName: 'Cà rốt', quantity: 0.3, useWithin: 1 });
    await scanExpiring(3);
    await call('delete', '/fridge/', leader.token).send({ itemId: item.id });
    behaviour = (tokens) => ({ successCount: 0, invalidTokens: tokens, error: null });
    await dispatchDue(500);
    const rows = await statusOf(leader.id);
    expect(rows.map((r) => r.status).sort()).toEqual(['CANCELLED', 'CANCELLED']);
    expect(await query('SELECT 1 FROM device_tokens WHERE user_id = $1', [leader.id])).toHaveLength(0);
  });
});
