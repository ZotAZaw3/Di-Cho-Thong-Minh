import { createApp } from './app.js';
import { env } from './config/env.js';
import { closePool } from './config/db.js';
import { startJobs } from './jobs/index.js';

if (!env.DATABASE_URL) {
  console.error('Thiếu DATABASE_URL: copy .env.example thành .env rồi điền chuỗi kết nối Postgres (xem README, "Chạy local").');
  process.exit(1);
}

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`API chạy tại http://localhost:${env.PORT}${env.API_PREFIX} (auth: ${env.AUTH_DRIVER}, storage: ${env.STORAGE_DRIVER}, push: ${env.PUSH_DRIVER})`);
});

// Nhắc hết hạn + gửi thông báo chạy cùng container (T05.2).
const jobs = env.ENABLE_JOBS && env.DATABASE_URL ? startJobs() : [];

function shutdown(signal) {
  console.log(`Nhận ${signal}, đang tắt server...`);
  jobs.forEach((j) => j.stop());
  server.close(() => closePool().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
