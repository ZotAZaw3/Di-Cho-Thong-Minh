import { z } from 'zod';

// Đọc và kiểm tra biến môi trường một lần khi khởi động.
const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    API_PREFIX: z.string().default('/it4788'),
    // 1 khi chạy sau Nginx để rate limit lấy đúng IP người dùng.
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    // Múi giờ dùng để tính "hôm nay" (hạn dùng, nhắc hết hạn) khi nhóm chưa có time_zone.
    APP_TIME_ZONE: z.string().default('Asia/Ho_Chi_Minh'),

    // Postgres (Supabase: pooler 6543 cho app, direct 5432 cho migration).
    DATABASE_URL: z.string().optional(),
    DIRECT_URL: z.string().optional(),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),

    // supabase: dùng Supabase Auth (bản chạy thật).
    // local: tự lưu mật khẩu (scrypt) + JWT, để chạy dev/test/demo không cần Supabase.
    AUTH_DRIVER: z.enum(['supabase', 'local']).default('local'),
    JWT_SECRET: z.string().min(16).optional(),
    ACCESS_TOKEN_TTL: z.coerce.number().int().positive().default(3600),
    REFRESH_TOKEN_TTL: z.coerce.number().int().positive().default(30 * 24 * 3600),
    // local: in mã xác minh ra log thay vì gửi mail.
    LOCAL_AUTO_CONFIRM: bool.default('false'),

    SUPABASE_URL: z.string().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    // Lưu ảnh: supabase (bucket public) hoặc local (thư mục UPLOAD_DIR, phục vụ tại /it4788/uploads).
    STORAGE_DRIVER: z.enum(['supabase', 'local']).default('local'),
    SUPABASE_STORAGE_BUCKET: z.string().default('images'),
    UPLOAD_DIR: z.string().default('uploads'),
    PUBLIC_BASE_URL: z.string().optional(),

    // Gửi thông báo: fcm (firebase-admin) hoặc log (chỉ in ra console).
    PUSH_DRIVER: z.enum(['fcm', 'log']).default('log'),
    FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),

    // Job nhắc hết hạn + worker gửi thông báo.
    ENABLE_JOBS: bool.default('true'),
    EXPIRY_CRON: z.string().default('0 8 * * *'),
    DISPATCH_CRON: z.string().default('* * * * *'),
    EXPIRY_DAYS: z.coerce.number().int().min(0).default(3),
    LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV === 'production' && v.AUTH_DRIVER === 'local' && !v.JWT_SECRET) {
      ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'Bắt buộc khi AUTH_DRIVER=local ở production' });
    }
    for (const [driver, keys] of [
      [v.AUTH_DRIVER, ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']],
      [v.STORAGE_DRIVER, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']],
    ]) {
      if (driver !== 'supabase') continue;
      for (const key of keys) {
        if (!v[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'Bắt buộc khi dùng driver supabase' });
      }
    }
    if (v.PUSH_DRIVER === 'fcm' && !v.FIREBASE_SERVICE_ACCOUNT_PATH) {
      ctx.addIssue({ code: 'custom', path: ['FIREBASE_SERVICE_ACCOUNT_PATH'], message: 'Bắt buộc khi PUSH_DRIVER=fcm' });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Biến môi trường không hợp lệ:', z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;

// Secret mặc định chỉ dùng cho dev/test; production bắt buộc đặt JWT_SECRET (kiểm tra ở trên).
export const jwtSecret = env.JWT_SECRET ?? 'dev-only-secret-change-me-please';
