import { z } from 'zod';
import { id, bool, pagination, withAliases } from './common.js';

// Hộp thư thông báo (nhắc hết hạn) trong app.
export const listQuery = z.object({ unread: bool.optional(), ...pagination });

const idList = z.preprocess((v) => {
  if (v === undefined || v === null || v === '') return undefined;
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [v];
}, z.array(id).max(500).optional());

export const markRead = withAliases({ ids: ['notificationIds', 'id', 'notificationId'] }, { ids: idList });
