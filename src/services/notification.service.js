import { query, queryOne } from '../config/db.js';
import { push } from './gateways/index.js';

// Nhắc đồ sắp hết hạn theo mô hình outbox (báo cáo tuần 2):
//   1. scanExpiring() ghi vào bảng notifications, UNIQUE(fridge_item_id, user_id, type, notify_date)
//      nên chạy lại trong ngày không tạo trùng.
//   2. dispatchDue() lấy các dòng đến hạn bằng FOR UPDATE SKIP LOCKED (hai worker không lấy trùng),
//      gửi FCM, thử lại có giãn cách, FAILED sau 3 lần; món đã hết / không còn token → CANCELLED.

const MAX_ATTEMPTS = 3;
const LEASE_MINUTES = 5;

/**
 * @param {number} days nhắc khi còn ≤ days ngày; món đã quá hạn được nhắc một lần vào hôm sau ngày hết hạn.
 * @returns {Promise<number>} số thông báo mới
 */
export async function scanExpiring(days = 3) {
  const rows = await query(
    `INSERT INTO notifications (user_id, group_id, fridge_item_id, type, notify_date, title, body)
     SELECT m.user_id, i.group_id, i.id, k.type, d.today,
       CASE k.type WHEN 'EXPIRED' THEN 'Đã hết hạn: ' ELSE 'Sắp hết hạn: ' END || f.name,
       f.name || ' (' || trim_scale(i.quantity_base)::text || ' ' || u.name || ') ' ||
       CASE WHEN k.type = 'EXPIRED' THEN 'đã hết hạn ngày ' || to_char(i.expires_on, 'DD/MM')
            WHEN i.expires_on = d.today THEN 'hết hạn hôm nay'
            ELSE 'hết hạn sau ' || (i.expires_on - d.today) || ' ngày (' || to_char(i.expires_on, 'DD/MM') || ')' END
     FROM fridge_items i
     JOIN family_groups g ON g.id = i.group_id AND g.archived_at IS NULL
     CROSS JOIN LATERAL (SELECT (now() AT TIME ZONE g.time_zone)::date AS today) d
     CROSS JOIN LATERAL (SELECT CASE WHEN i.expires_on < d.today THEN 'EXPIRED' ELSE 'EXPIRY_SOON' END AS type) k
     JOIN group_members m ON m.group_id = i.group_id AND m.left_at IS NULL
     JOIN foods f ON f.id = i.food_id
     JOIN units u ON u.id = f.base_unit_id
     WHERE i.quantity_base > 0 AND i.expires_on IS NOT NULL
       AND i.expires_on BETWEEN d.today - 1 AND d.today + $1::int
     ON CONFLICT ON CONSTRAINT notifications_dedup_key DO NOTHING
     RETURNING id`,
    [days],
  );
  return rows.length;
}

/** Lấy tối đa `batch` thông báo đến hạn và giữ chỗ LEASE_MINUTES phút (worker chết thì dòng tự quay lại). */
function claimDue(batch) {
  return query(
    `UPDATE notifications SET next_attempt_at = now() + make_interval(mins => $2), updated_at = now()
     WHERE id IN (
       SELECT id FROM notifications
       WHERE status IN ('PENDING', 'RETRY_WAIT') AND next_attempt_at <= now()
       ORDER BY next_attempt_at LIMIT $1
       FOR UPDATE SKIP LOCKED)
     RETURNING *`,
    [batch, LEASE_MINUTES],
  );
}

const finish = (id, status, error = null) =>
  query(
    `UPDATE notifications SET status = $2::varchar, last_error = $3, sent_at = CASE WHEN $2::varchar = 'FCM_ACCEPTED' THEN now() ELSE sent_at END,
       updated_at = now() WHERE id = $1`,
    [id, status, error],
  );

async function retryLater(n, error) {
  const attempts = n.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await query(`UPDATE notifications SET status = 'FAILED', attempts = $2, last_error = $3, updated_at = now() WHERE id = $1`, [n.id, attempts, error]);
    return 'FAILED';
  }
  // Giãn cách 1, 5 phút...
  await query(
    `UPDATE notifications SET status = 'RETRY_WAIT', attempts = $2, last_error = $3,
       next_attempt_at = now() + make_interval(mins => $4), updated_at = now() WHERE id = $1`,
    [n.id, attempts, error, 5 ** (attempts - 1)],
  );
  return 'RETRY_WAIT';
}

async function sendOne(n) {
  const still = await queryOne(
    `SELECT 1 FROM fridge_items i JOIN group_members m ON m.group_id = i.group_id AND m.user_id = $2 AND m.left_at IS NULL
     WHERE i.id = $1 AND i.quantity_base > 0`,
    [n.fridge_item_id, n.user_id],
  );
  if (!still) {
    await finish(n.id, 'CANCELLED', 'Món đã dùng hết hoặc người nhận đã rời nhóm');
    return 'CANCELLED';
  }
  const tokens = (await query('SELECT token FROM device_tokens WHERE user_id = $1', [n.user_id])).map((r) => r.token);
  if (tokens.length === 0) {
    await finish(n.id, 'CANCELLED', 'Người nhận chưa đăng ký thiết bị');
    return 'CANCELLED';
  }
  const result = await push().sendToTokens(tokens, {
    title: n.title,
    body: n.body,
    data: { type: n.type, fridgeItemId: n.fridge_item_id, notificationId: n.id },
  });
  if (result.invalidTokens.length) await query('DELETE FROM device_tokens WHERE token = ANY($1::text[])', [result.invalidTokens]);
  if (result.successCount > 0) {
    await finish(n.id, 'FCM_ACCEPTED');
    return 'FCM_ACCEPTED';
  }
  if (result.error) return retryLater(n, String(result.error.message ?? result.error).slice(0, 500));
  await finish(n.id, 'CANCELLED', 'Mọi token của người nhận đều không còn hợp lệ');
  return 'CANCELLED';
}

/** @returns {Promise<Record<string, number>>} số thông báo theo trạng thái sau lần chạy */
export async function dispatchDue(batch = 50) {
  const stats = {};
  const due = await claimDue(batch);
  for (const n of due) {
    let status;
    try {
      status = await sendOne(n);
    } catch (err) {
      status = await retryLater(n, String(err.message ?? err).slice(0, 500));
    }
    stats[status] = (stats[status] ?? 0) + 1;
  }
  return stats;
}
