import { env } from '../config/env.js';
import { scanExpiring } from '../services/notification.service.js';
import { purgeOldLogs } from '../services/log.service.js';

// Chạy hằng ngày (EXPIRY_CRON, mặc định 8:00 giờ Việt Nam): ghi thông báo cho đồ hết hạn ≤ EXPIRY_DAYS ngày
// vào outbox, sau đó dọn api_logs cũ hơn LOG_RETENTION_DAYS ngày.
export async function runExpiryReminder() {
  const created = await scanExpiring(env.EXPIRY_DAYS);
  await purgeOldLogs(env.LOG_RETENTION_DAYS);
  return created;
}
