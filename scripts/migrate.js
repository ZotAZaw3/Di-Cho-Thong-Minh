// Chạy migration SQL trong db/migrations theo thứ tự tên file.
//
//   npm run db:migrate            áp các file chưa chạy
//   npm run db:migrate -- --status   chỉ liệt kê
//
// DB Supabase hiện có đã được tạo bằng SQL tay (đúng nội dung 0000_init.sql). Lần chạy đầu,
// nếu thấy bảng `users` đã tồn tại mà chưa có lịch sử migration, script tự đánh dấu
// 0000_init là đã chạy (baseline) thay vì tạo lại bảng.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../db/migrations');

export async function migrate({ connectionString, log = console.log, statusOnly = false } = {}) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    await client.query('ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY');

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
    const { rows } = await client.query('SELECT name FROM public.schema_migrations');
    const applied = new Set(rows.map((r) => r.name));

    if (applied.size === 0 && files[0]?.startsWith('0000_')) {
      const { rows: existing } = await client.query("SELECT to_regclass('public.users') AS t");
      if (existing[0].t) {
        if (!statusOnly) await client.query('INSERT INTO public.schema_migrations (name) VALUES ($1)', [files[0]]);
        applied.add(files[0]);
        log(`baseline: ${files[0]} (DB đã có schema gốc)`);
      }
    }

    const pending = files.filter((f) => !applied.has(f));
    if (statusOnly) {
      for (const f of files) log(`${applied.has(f) ? '[x]' : '[ ]'} ${f}`);
      return pending;
    }
    for (const file of pending) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO public.schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        log(`applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} lỗi: ${err.message}`, { cause: err });
      }
    }
    if (pending.length === 0) log('Không có migration mới.');
    return pending;
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Thiếu DIRECT_URL hoặc DATABASE_URL.');
    process.exit(1);
  }
  migrate({ connectionString, statusOnly: process.argv.includes('--status') }).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
