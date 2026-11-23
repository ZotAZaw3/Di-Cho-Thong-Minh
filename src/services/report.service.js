import { query } from '../config/db.js';
import { today } from '../repositories/fridge.repository.js';
import { ApiError } from '../utils/response.js';

// API mở rộng #55 · Thống kê mua sắm và tiêu thụ trong khoảng [from, to] (theo múi giờ nhóm),
// tính từ inventory_logs và tasks.

export async function getReport(group, { from, to }) {
  const end = to ?? (await today(group.timeZone));
  const start = from ?? `${end.slice(0, 8)}01`;
  if (start > end) throw new ApiError('BAD_REQUEST', { message: '"from" phải trước hoặc bằng "to"' });
  const params = [group.id, start, end, group.timeZone];
  // Lần "đã mua" bị bỏ đánh dấu sau đó (có log undo:task:<id> mới hơn) không tính: mua lại sẽ có log mới,
  // tính cả hai thì số lượng và chi phí bị gấp đôi.
  const range = `l.group_id = $1 AND (l.occurred_at AT TIME ZONE $4)::date BETWEEN $2 AND $3
    AND NOT (l.event_type = 'purchase' AND l.idempotency_key LIKE 'purchase:task:%' AND EXISTS (
      SELECT 1 FROM inventory_logs u WHERE u.group_id = l.group_id AND u.event_type = 'adjust_out' AND u.id > l.id
        AND u.idempotency_key LIKE 'undo:task:' || split_part(l.idempotency_key, ':', 3) || ':%'))`;

  const [byFood, totals, tasks] = await Promise.all([
    query(
      `SELECT f.id AS food_id, f.name AS food_name, u.name AS unit_name,
         sum(l.quantity_base) FILTER (WHERE l.event_type = 'purchase') AS purchased,
         sum(l.quantity_base) FILTER (WHERE l.event_type = 'add') AS added,
         sum(l.quantity_base) FILTER (WHERE l.event_type = 'consume') AS consumed,
         sum(l.quantity_base) FILTER (WHERE l.event_type = 'discard') AS discarded,
         sum(l.total_cost) AS cost
       FROM inventory_logs l JOIN foods f ON f.id = l.food_id JOIN units u ON u.id = f.base_unit_id
       WHERE ${range}
       GROUP BY f.id, f.name, u.name ORDER BY f.name`,
      params,
    ),
    query(
      `SELECT l.event_type, count(*)::int AS events, sum(l.total_cost) AS cost
       FROM inventory_logs l WHERE ${range} GROUP BY l.event_type`,
      params,
    ),
    query(
      `SELECT count(*) FILTER (WHERE t.task_status = 'done' AND (t.completed_at AT TIME ZONE $4)::date BETWEEN $2 AND $3)::int AS done,
              count(*) FILTER (WHERE t.task_status IN ('todo', 'in_progress'))::int AS open
       FROM tasks t JOIN shopping_list_items i ON i.id = t.shopping_list_item_id
       JOIN shopping_lists s ON s.id = i.shopping_list_id WHERE s.group_id = $1`,
      params,
    ),
  ]);

  const count = (type) => totals.find((t) => t.event_type === type)?.events ?? 0;
  return {
    from: start,
    to: end,
    summary: {
      purchaseEvents: count('purchase'),
      addEvents: count('add'),
      consumeEvents: count('consume'),
      discardEvents: count('discard'),
      totalCost: totals.find((t) => t.event_type === 'purchase')?.cost ?? 0,
      tasksDone: tasks[0].done,
      tasksOpen: tasks[0].open,
    },
    foods: byFood.map((r) => ({
      foodId: r.food_id,
      foodName: r.food_name,
      unitName: r.unit_name,
      purchased: r.purchased ?? 0,
      added: r.added ?? 0,
      consumed: r.consumed ?? 0,
      discarded: r.discarded ?? 0,
      cost: r.cost ?? 0,
    })),
  };
}
