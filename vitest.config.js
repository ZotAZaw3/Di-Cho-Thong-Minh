import { defineConfig } from 'vitest/config';

// Test tích hợp chạy trên Postgres thật (TEST_DATABASE_URL, CI dùng service container).
// Không có TEST_DATABASE_URL thì chỉ chạy test không cần DB.
export default defineConfig({
  test: {
    setupFiles: ['tests/setup/env.js'],
    globalSetup: ['tests/setup/global.js'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
