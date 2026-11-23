import { withTransaction } from '../config/db.js';
import { auth, storage } from './gateways/index.js';
import * as users from '../repositories/user.repository.js';
import * as groups from '../repositories/group.repository.js';
import { presentUser } from '../models/presenters.js';
import { ApiError } from '../utils/response.js';

// Nhóm 2 (Tài khoản) + Get/Delete user + API mở rộng #50 (FCM token), #53 (admin quản lý tài khoản).

export async function getProfile(user) {
  return presentUser(user, await groups.findActiveMembership(user.id));
}

export async function editProfile(user, { name, username, language }, file, req) {
  if (username && username.toLowerCase() !== user.username?.toLowerCase() && (await users.isUsernameTaken(username, user.id))) {
    throw new ApiError('USERNAME_EXISTS');
  }
  const avatarUrl = file ? await storage().upload('avatars', file, req) : undefined;
  const updated = await users.updateUser(user.id, { fullName: name, username, language, avatarUrl });
  return presentUser(updated, await groups.findActiveMembership(user.id));
}

/**
 * Rời nhóm đang ở. Trưởng nhóm rời đi thì thành viên vào sớm nhất lên làm trưởng nhóm; không còn ai thì
 * nhóm được lưu trữ. Việc chưa xong của người rời đi chuyển cho trưởng nhóm.
 * @returns {Promise<void>}
 */
export async function leaveCurrentGroup(userId, db) {
  const membership = await groups.findActiveMembership(userId, db);
  if (!membership) return;
  await groups.markLeft(membership.id, userId, db);
  let leaderId = membership.role === 'leader' ? undefined : await groups.findLeaderId(membership.id, db);
  if (membership.role === 'leader') {
    const next = (await groups.listMembers(membership.id, db))[0];
    if (next) {
      await groups.setRole(membership.id, next.id, 'leader', db);
      leaderId = next.id;
    } else {
      await groups.archiveGroup(membership.id, db);
    }
  }
  if (leaderId) await groups.reassignOpenWork(membership.id, userId, leaderId, db);
}

export async function deleteAccount(user) {
  await withTransaction(async (db) => {
    await leaveCurrentGroup(user.id, db);
    await users.deleteDeviceTokensOfUser(user.id, db);
    await users.anonymizeUser(user.id, db);
  });
  if (user.auth_user_id) await auth().deleteUser(user.auth_user_id);
  return null;
}

export async function registerDevice(user, { token, platform }) {
  const row = await users.upsertDeviceToken(user.id, token, platform ?? 'android');
  return { id: row.id, token: row.token, platform: row.platform };
}

export async function adminListUsers({ q, status, page, limit }) {
  const rows = await users.listUsers({ q, status, limit, offset: (page - 1) * limit });
  return { total: rows[0]?.total ?? 0, page, limit, users: rows.map((u) => presentUser(u)) };
}

export async function adminSetStatus(admin, { userId, email, status }) {
  const target = userId ? await users.findUserById(userId) : await users.findUserByEmail(email);
  if (!target) throw new ApiError('NOT_FOUND', { message: 'Không tìm thấy người dùng' });
  if (target.id === admin.id) throw new ApiError('FORBIDDEN', { message: 'Không thể tự khóa tài khoản của mình' });
  const updated = await users.setAccountStatus(target.id, status);
  if (status === 'blocked' && target.auth_user_id) {
    // Thu hồi phiên local ngay; với Supabase, middleware chặn theo account_status ở mỗi request.
    await withTransaction((db) =>
      db.query('UPDATE auth_local_accounts SET token_version = token_version + 1 WHERE auth_user_id = $1', [target.auth_user_id]),
    );
  }
  return presentUser(updated);
}
