import { query } from '../config/db.js';

// API #23 Get logs (admin): đọc api_logs, mới nhất trước.
export async function getLogs({ page, limit, userId, method, status, from, to }) {
  const rows = await query(
    `SELECT l.*, u.email, count(*) OVER () AS total
     FROM api_logs l LEFT JOIN users u ON u.id = l.user_id
     WHERE ($1::bigint IS NULL OR l.user_id = $1)
       AND ($2::text IS NULL OR l.method = upper($2))
       AND ($3::int IS NULL OR l.status = $3)
       AND ($4::date IS NULL OR l.created_at >= $4::date)
       AND ($5::date IS NULL OR l.created_at < $5::date + 1)
     ORDER BY l.id DESC LIMIT $6 OFFSET $7`,
    [userId ?? null, method ?? null, status ?? null, from ?? null, to ?? null, limit, (page - 1) * limit],
  );
  return {
    total: rows[0]?.total ?? 0,
    page,
    limit,
    logs: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      email: r.email,
      method: r.method,
      path: r.path,
      status: r.status,
      code: r.code,
      durationMs: r.duration_ms,
      ip: r.ip,
      createdAt: r.created_at,
    })),
  };
}

export const purgeOldLogs = (days) => query('DELETE FROM api_logs WHERE created_at < now() - make_interval(days => $1)', [days]);
