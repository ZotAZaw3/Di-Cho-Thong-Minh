import { query } from '../config/db.js';
import { env } from '../config/env.js';

// Ghi api_logs sau khi đã trả response (không làm chậm API). Phục vụ API Get logs.
export function requestLog(req, res, next) {
  if (!env.DATABASE_URL || req.path === '/health' || req.path.startsWith('/uploads/')) return next();
  const started = process.hrtime.bigint();
  const json = res.json.bind(res);
  res.json = (body) => {
    res.locals.responseCode = body?.code;
    return json(body);
  };
  res.on('finish', () => {
    const duration = Number((process.hrtime.bigint() - started) / 1_000_000n);
    query(
      `INSERT INTO api_logs (user_id, method, path, status, code, duration_ms, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user?.id ?? null,
        req.method,
        req.originalUrl.split('?')[0].slice(0, 500),
        res.statusCode,
        res.locals.responseCode ? String(res.locals.responseCode).slice(0, 20) : null,
        duration,
        req.ip?.slice(0, 64) ?? null,
      ],
    ).catch((err) => {
      if (env.NODE_ENV !== 'test') console.error('Không ghi được api_logs:', err.message);
    });
  });
  next();
}
