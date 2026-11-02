import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`API chạy tại http://localhost:${env.PORT}${env.API_PREFIX}`);
});

// Các job (nhắc hết hạn, gửi thông báo) sẽ khởi động ở đây từ T05.2.

function shutdown(signal) {
  console.log(`Nhận ${signal}, đang tắt server...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
