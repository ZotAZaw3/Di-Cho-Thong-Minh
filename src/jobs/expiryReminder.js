import { scanExpiring } from '../services/notification.service.js';
import { purgeOldLogs } from '../services/log.service.js';
import { getSetting } from '../services/settings.service.js';

// Chạy hằng ngày (EXPIRY_CRON, mặc định 8:00 giờ Việt Nam): ghi thông báo cho đồ hết hạn ≤ expiry_days ngày
// vào outbox, sau đó dọn api_logs cũ hơn log_retention_days ngày. Hai số này admin sửa được
// (PUT admin/config/), mặc định lấy EXPIRY_DAYS / LOG_RETENTION_DAYS.
export async function runExpiryReminder() {
  const created = await scanExpiring(await getSetting('expiry_days'));
  await purgeOldLogs(await getSetting('log_retention_days'));
  return created;
}
