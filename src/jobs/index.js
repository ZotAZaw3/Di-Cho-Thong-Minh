import cron from 'node-cron';
import { env } from '../config/env.js';
import { runExpiryReminder } from './expiryReminder.js';
import { runNotificationDispatcher } from './notificationDispatcher.js';

// Hẹn giờ các job trong cùng container với API (một service `api`, xem docker-compose.yml).
// Mỗi job không chạy chồng lên lần trước.
function schedule(name, expression, fn) {
  let running = false;
  return cron.schedule(
    expression,
    async () => {
      if (running) return;
      running = true;
      try {
        const result = await fn();
        if (result && (typeof result === 'number' ? result > 0 : Object.keys(result).length > 0)) {
          console.log(`[job:${name}]`, result);
        }
      } catch (err) {
        console.error(`[job:${name}] lỗi:`, err.message);
      } finally {
        running = false;
      }
    },
    { timezone: env.APP_TIME_ZONE, name },
  );
}

export function startJobs() {
  return [
    schedule('expiryReminder', env.EXPIRY_CRON, runExpiryReminder),
    schedule('notificationDispatcher', env.DISPATCH_CRON, runNotificationDispatcher),
  ];
}
