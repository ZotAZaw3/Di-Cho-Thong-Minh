import { dispatchDue } from '../services/notification.service.js';

// Chạy mỗi phút (DISPATCH_CRON): gửi các thông báo đến hạn trong outbox.
export const runNotificationDispatcher = () => dispatchDue(50);
