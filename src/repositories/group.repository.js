import { query, queryOne } from '../config/db.js';

export const findActiveMembership = (userId, db) =>
  queryOne(
    `SELECT g.id, g.name, g.time_zone AS "timeZone", m.group_role AS role
     FROM group_members m JOIN family_groups g ON g.id = m.group_id
     WHERE m.user_id = $1 AND m.left_at IS NULL AND g.archived_at IS NULL`,
    [userId],
    db,
  );

export const insertGroup = (name, createdBy, db) =>
  queryOne('INSERT INTO family_groups (name, created_by) VALUES ($1, $2) RETURNING *', [name, createdBy], db);

/** Thêm (hoặc đưa lại) thành viên vào nhóm. */
export const upsertMember = (groupId, userId, role, db) =>
  queryOne(
    `INSERT INTO group_members (group_id, user_id, group_role) VALUES ($1, $2, $3)
     ON CONFLICT (group_id, user_id) DO UPDATE SET group_role = EXCLUDED.group_role, joined_at = now(), left_at = NULL
     RETURNING *`,
    [groupId, userId, role],
    db,
  );

export const markLeft = (groupId, userId, db) =>
  queryOne(
    `UPDATE group_members SET left_at = now() WHERE group_id = $1 AND user_id = $2 AND left_at IS NULL RETURNING *`,
    [groupId, userId],
    db,
  );

export const setRole = (groupId, userId, role, db) =>
  queryOne('UPDATE group_members SET group_role = $3 WHERE group_id = $1 AND user_id = $2 RETURNING *', [groupId, userId, role], db);

export const listMembers = (groupId, db) =>
  query(
    `SELECT u.id, u.full_name, u.username, u.email, u.avatar_url, m.group_role, m.joined_at
     FROM group_members m JOIN users u ON u.id = m.user_id
     WHERE m.group_id = $1 AND m.left_at IS NULL
     ORDER BY (m.group_role = 'leader') DESC, m.joined_at`,
    [groupId],
    db,
  );

export const memberIds = async (groupId, db) =>
  (await query('SELECT user_id FROM group_members WHERE group_id = $1 AND left_at IS NULL', [groupId], db)).map((r) => r.user_id);

export const findGroupById = (groupId, db) =>
  queryOne('SELECT id, name, time_zone AS "timeZone", created_at AS "createdAt" FROM family_groups WHERE id = $1', [groupId], db);

export const archiveGroup = (groupId, db) => query('UPDATE family_groups SET archived_at = now() WHERE id = $1', [groupId], db);

export const findLeaderId = async (groupId, db) =>
  (await queryOne("SELECT user_id FROM group_members WHERE group_id = $1 AND left_at IS NULL AND group_role = 'leader'", [groupId], db))?.user_id;

/** Việc chưa xong của người rời nhóm chuyển cho trưởng nhóm, để không còn mặt hàng "mồ côi". */
export async function reassignOpenWork(groupId, fromUserId, toUserId, db) {
  await query(
    `UPDATE tasks t SET assigned_to = $3, updated_at = now()
     FROM shopping_list_items i JOIN shopping_lists l ON l.id = i.shopping_list_id
     WHERE t.shopping_list_item_id = i.id AND l.group_id = $1 AND t.assigned_to = $2 AND t.task_status IN ('todo', 'in_progress')`,
    [groupId, fromUserId, toUserId],
    db,
  );
  await query(
    `UPDATE shopping_lists SET assigned_to = $3, updated_at = now() WHERE group_id = $1 AND assigned_to = $2 AND list_status = 'active'`,
    [groupId, fromUserId, toUserId],
    db,
  );
}
