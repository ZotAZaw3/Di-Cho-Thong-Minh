import { findActiveMembership } from '../repositories/group.repository.js';
import { ApiError } from '../utils/response.js';

/** API theo nhóm: người dùng phải đang ở một nhóm → req.group { id, name, role, timeZone }. */
export async function requireGroup(req, _res, next) {
  const membership = await findActiveMembership(req.user.id);
  if (!membership) throw new ApiError('NO_GROUP');
  req.group = membership;
  next();
}

/** Chỉ trưởng nhóm (dùng sau requireGroup). */
export function requireLeader(req, _res, next) {
  if (req.group?.role !== 'leader') {
    throw new ApiError('FORBIDDEN', { message: 'Chỉ trưởng nhóm được thực hiện thao tác này' });
  }
  next();
}
