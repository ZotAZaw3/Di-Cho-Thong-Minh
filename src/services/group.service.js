import { withTransaction } from '../config/db.js';
import * as groups from '../repositories/group.repository.js';
import * as users from '../repositories/user.repository.js';
import { presentMember } from '../models/presenters.js';
import { ApiError } from '../utils/response.js';

// Nhóm 3 · Nhóm gia đình. Mỗi người ở tối đa một nhóm; người tạo là trưởng nhóm.

async function groupView(groupId, db) {
  const group = await groups.findGroupById(groupId, db);
  const members = await groups.listMembers(groupId, db);
  return { group, members: members.map(presentMember) };
}

export async function createGroup(user, { name }) {
  return withTransaction(async (db) => {
    if (await groups.findActiveMembership(user.id, db)) {
      throw new ApiError('ALREADY_IN_GROUP', { message: 'Bạn đã ở trong một nhóm, hãy rời nhóm trước khi tạo nhóm mới' });
    }
    const group = await groups.insertGroup(name ?? `Gia đình ${user.full_name}`, user.id, db);
    await groups.upsertMember(group.id, user.id, 'leader', db);
    return groupView(group.id, db);
  });
}

export async function addMember(group, { username }) {
  return withTransaction(async (db) => {
    const target = await users.findUserByLogin(username, db);
    if (!target) throw new ApiError('NOT_FOUND', { message: `Không tìm thấy người dùng "${username}"` });
    const current = await groups.findActiveMembership(target.id, db);
    if (current) {
      const message = current.id === group.id ? 'Người này đã ở trong nhóm' : 'Người này đang ở nhóm khác';
      throw new ApiError('ALREADY_IN_GROUP', { message });
    }
    await groups.upsertMember(group.id, target.id, 'member', db);
    return groupView(group.id, db);
  });
}

export async function removeMember(user, group, { username }) {
  return withTransaction(async (db) => {
    const target = await users.findUserByLogin(username, db);
    if (!target) throw new ApiError('NOT_FOUND', { message: `Không tìm thấy người dùng "${username}"` });
    if (target.id === user.id) throw new ApiError('FORBIDDEN', { message: 'Trưởng nhóm không thể tự xóa mình khỏi nhóm' });
    const removed = await groups.markLeft(group.id, target.id, db);
    if (!removed) throw new ApiError('NOT_FOUND', { message: 'Người này không ở trong nhóm' });
    return groupView(group.id, db);
  });
}

export const getMembers = (group) => groupView(group.id);
