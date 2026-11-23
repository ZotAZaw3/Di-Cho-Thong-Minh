import { query, queryOne } from '../config/db.js';

const ACTIVE = 'deleted_at IS NULL';

export const findUserByAuthId = (authUserId, db) =>
  queryOne(`SELECT * FROM users WHERE auth_user_id = $1 AND ${ACTIVE}`, [authUserId], db);

export const findUserById = (id, db) => queryOne(`SELECT * FROM users WHERE id = $1 AND ${ACTIVE}`, [id], db);

export const findUserByEmail = (email, db) =>
  queryOne(`SELECT * FROM users WHERE lower(email) = lower($1) AND ${ACTIVE}`, [email], db);

/** Tìm theo username, nếu không có thì theo email (app thêm thành viên bằng "username"). */
export const findUserByLogin = (login, db) =>
  queryOne(
    `SELECT * FROM users WHERE ${ACTIVE} AND (lower(username) = lower($1) OR lower(email) = lower($1))
     ORDER BY (lower(username) = lower($1)) DESC NULLS LAST LIMIT 1`,
    [login],
    db,
  );

export const isUsernameTaken = async (username, exceptId = 0, db) =>
  Boolean(await queryOne('SELECT 1 FROM users WHERE lower(username) = lower($1) AND id <> $2', [username, exceptId], db));

export const insertUser = ({ fullName, email, username, language, authUserId }, db) =>
  queryOne(
    `INSERT INTO users (full_name, email, username, language, auth_user_id)
     VALUES ($1, $2, $3, COALESCE($4, 'vi'), $5) RETURNING *`,
    [fullName, email, username ?? null, language ?? null, authUserId],
    db,
  );

export const updateUser = (id, { fullName, username, language, avatarUrl }, db) =>
  queryOne(
    `UPDATE users SET
       full_name = COALESCE($2, full_name),
       username = COALESCE($3, username),
       language = COALESCE($4, language),
       avatar_url = COALESCE($5, avatar_url),
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [id, fullName ?? null, username ?? null, language ?? null, avatarUrl ?? null],
    db,
  );

/** Xóa tài khoản: không xóa cứng (dòng users còn được tham chiếu), chỉ ẩn danh hóa. */
export const anonymizeUser = (id, db) =>
  queryOne(
    `UPDATE users SET full_name = 'Người dùng đã xóa', email = 'deleted+' || id || '@deleted.local',
       username = NULL, avatar_url = NULL, auth_user_id = NULL, account_status = 'blocked',
       deleted_at = now(), updated_at = now()
     WHERE id = $1 RETURNING *`,
    [id],
    db,
  );

export const setAccountStatus = (id, status, db) =>
  queryOne(`UPDATE users SET account_status = $2, updated_at = now() WHERE id = $1 AND ${ACTIVE} RETURNING *`, [id, status], db);

export const listUsers = ({ q, status, limit, offset }, db) =>
  query(
    `SELECT u.*, count(*) OVER () AS total FROM users u
     WHERE ${ACTIVE}
       AND ($1::text IS NULL OR u.email ILIKE '%' || $1 || '%' OR u.full_name ILIKE '%' || $1 || '%' OR u.username ILIKE '%' || $1 || '%')
       AND ($2::text IS NULL OR u.account_status = $2)
     ORDER BY u.id LIMIT $3 OFFSET $4`,
    [q ?? null, status ?? null, limit, offset],
    db,
  );

export const upsertDeviceToken = (userId, token, platform, db) =>
  queryOne(
    `INSERT INTO device_tokens (user_id, token, platform) VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, last_seen_at = now()
     RETURNING *`,
    [userId, token, platform],
    db,
  );

export const deleteDeviceTokensOfUser = (userId, db) => query('DELETE FROM device_tokens WHERE user_id = $1', [userId], db);
