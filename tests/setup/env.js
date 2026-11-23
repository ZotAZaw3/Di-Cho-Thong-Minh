// Biến môi trường cho mọi file test (chạy trước khi import src/).
process.env.NODE_ENV = 'test';
process.env.AUTH_DRIVER = 'local';
process.env.STORAGE_DRIVER = 'local';
process.env.PUSH_DRIVER = 'log';
process.env.ENABLE_JOBS = 'false';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX ?? '100000';
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'node_modules/.cache/test-uploads';
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
else delete process.env.DATABASE_URL;
