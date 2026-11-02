import { z } from 'zod';

// Đọc và kiểm tra biến môi trường một lần khi khởi động.
// Biến nào chưa dùng tới (Supabase, Firebase) để optional; khi module cần nó thì đổi sang bắt buộc.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('/it4788'),
  // 1 khi chạy sau Nginx để rate limit lấy đúng IP người dùng.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),

  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Biến môi trường không hợp lệ:', z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
