import { z } from 'zod';
import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/response.js';

// Cấu hình hệ thống do admin quản lý (đề bài: "các thông tin cấu hình hệ thống khác").
// Bảng app_settings chỉ lưu khóa đã được admin sửa; khóa chưa có dòng dùng giá trị mặc định ở đây.

const int = (min, max) => z.coerce.number({ error: 'phải là số' }).int('phải là số nguyên').min(min).max(max);

export const SETTINGS = {
  expiry_days: { schema: int(0, 30), fallback: () => env.EXPIRY_DAYS, description: 'Nhắc đồ sắp hết hạn trước bao nhiêu ngày' },
  log_retention_days: { schema: int(1, 365), fallback: () => env.LOG_RETENTION_DAYS, description: 'Giữ log API bao nhiêu ngày' },
  suggest_limit: { schema: int(1, 50), fallback: () => 10, description: 'Số món gợi ý mặc định (recipe/suggest)' },
};

const camel = (key) => key.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());
const KEY_BY_NAME = Object.fromEntries(Object.keys(SETTINGS).flatMap((k) => [[k, k], [camel(k), k]]));

async function stored() {
  const rows = await query('SELECT key, value, updated_at, updated_by FROM app_settings');
  return new Map(rows.map((r) => [r.key, r]));
}

/** Giá trị đang dùng của một khóa. */
export async function getSetting(key) {
  const def = SETTINGS[key];
  const [row] = await query('SELECT value FROM app_settings WHERE key = $1', [key]);
  const parsed = row ? def.schema.safeParse(row.value) : null;
  return parsed?.success ? parsed.data : def.fallback();
}

export async function listSettings() {
  const rows = await stored();
  return Object.entries(SETTINGS).map(([key, def]) => {
    const row = rows.get(key);
    return {
      key,
      name: camel(key),
      value: row ? row.value : def.fallback(),
      defaultValue: def.fallback(),
      isDefault: !row,
      description: def.description,
      updatedAt: row?.updated_at ?? null,
    };
  });
}

/**
 * Nhận { expiryDays: 5 } / { expiry_days: 5 } hoặc { key, value }. value null = về mặc định.
 */
export async function updateSettings(admin, body) {
  const input = body && typeof body === 'object' && 'key' in body ? { [body.key]: body.value } : (body ?? {});
  const entries = Object.entries(input);
  if (entries.length === 0) throw new ApiError('BAD_REQUEST', { message: 'Không có cấu hình nào để cập nhật' });
  const changes = [];
  const errors = [];
  for (const [name, value] of entries) {
    const key = KEY_BY_NAME[name];
    if (!key) {
      errors.push({ field: name, message: 'không có cấu hình này' });
      continue;
    }
    if (value === null) {
      changes.push([key, null]);
      continue;
    }
    const parsed = SETTINGS[key].schema.safeParse(value);
    if (parsed.success) changes.push([key, parsed.data]);
    else errors.push({ field: name, message: parsed.error.issues[0].message });
  }
  if (errors.length) throw new ApiError('BAD_REQUEST', { message: `${errors[0].field}: ${errors[0].message}`, data: { errors } });
  for (const [key, value] of changes) {
    if (value === null) await query('DELETE FROM app_settings WHERE key = $1', [key]);
    else {
      await query(
        `INSERT INTO app_settings (key, value, description, updated_by) VALUES ($1, $2::jsonb, $3, $4)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [key, JSON.stringify(value), SETTINGS[key].description, admin.id],
      );
    }
  }
  return listSettings();
}
