import pg from 'pg';
import { env } from './env.js';

// Kiểu trả về cho tiện dùng trong JSON:
// bigint (id) → number, numeric (số lượng) → number, date → chuỗi 'YYYY-MM-DD'.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number(v));
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

let pool;

export function getPool() {
  if (!pool) {
    if (!env.DATABASE_URL) throw new Error('Thiếu DATABASE_URL');
    pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: env.DB_POOL_MAX });
    pool.on('error', (err) => console.error('Lỗi kết nối Postgres:', err.message));
  }
  return pool;
}

/**
 * Chạy một câu SQL. `db` là pool hoặc client của transaction đang mở.
 * @returns {Promise<any[]>} các dòng kết quả
 */
export async function query(text, params = [], db = getPool()) {
  const { rows } = await db.query(text, params);
  return rows;
}

export async function queryOne(text, params = [], db = getPool()) {
  const rows = await query(text, params, db);
  return rows[0] ?? null;
}

/** Chạy fn(client) trong một transaction; lỗi thì rollback. */
export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) {
    const p = pool;
    pool = undefined;
    await p.end();
  }
}
