import { readFile } from 'node:fs/promises';
import { env } from '../../config/env.js';

/**
 * Gửi một thông báo tới nhiều token của cùng một người.
 * Trả về { successCount, invalidTokens, error } :
 *   invalidTokens: token FCM báo không còn hợp lệ (xóa khỏi device_tokens),
 *   error: lỗi tạm thời (mạng, FCM 5xx) → worker thử lại sau.
 */

// PUSH_DRIVER=log: không gửi thật, chỉ in ra console (dev/test).
export const logPush = {
  async sendToTokens(tokens, message) {
    if (env.NODE_ENV !== 'test') console.log(`[push:log] ${tokens.length} thiết bị · ${message.title} · ${message.body}`);
    return { successCount: tokens.length, invalidTokens: [], error: null };
  },
};

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

let messaging;
async function getMessaging() {
  if (!messaging) {
    const { initializeApp, cert } = await import('firebase-admin/app');
    const { getMessaging: gm } = await import('firebase-admin/messaging');
    const account = JSON.parse(await readFile(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
    messaging = gm(initializeApp({ credential: cert(account) }, 'dicho'));
  }
  return messaging;
}

// PUSH_DRIVER=fcm: FCM HTTP v1 qua firebase-admin.
export const fcmPush = {
  async sendToTokens(tokens, message) {
    try {
      const res = await (await getMessaging()).sendEachForMulticast({
        tokens,
        notification: { title: message.title, body: message.body },
        data: Object.fromEntries(Object.entries(message.data ?? {}).map(([k, v]) => [k, String(v)])),
        android: { priority: 'high' },
      });
      const invalidTokens = [];
      let transient = null;
      res.responses.forEach((r, i) => {
        if (r.success) return;
        if (INVALID_TOKEN_CODES.has(r.error?.code)) invalidTokens.push(tokens[i]);
        else transient = r.error;
      });
      const error = res.successCount === 0 && transient ? transient : null;
      return { successCount: res.successCount, invalidTokens, error };
    } catch (error) {
      return { successCount: 0, invalidTokens: [], error };
    }
  },
};
