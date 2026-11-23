// Dữ liệu mẫu (T03.2): category, unit, ~30 thực phẩm chung kèm quy đổi đơn vị, vài công thức chung.
//
//   npm run db:seed            danh mục chung (chạy lại nhiều lần không bị trùng)
//   npm run db:seed -- --demo  thêm tài khoản demo + nhóm + dữ liệu tủ lạnh/mua sắm (chỉ AUTH_DRIVER=local)
//
// Tài khoản demo (mật khẩu 123456): admin@dicho.local (admin), demo@dicho.local (trưởng nhóm), minh@dicho.local (thành viên).
import { fileURLToPath } from 'node:url';

const UNITS = [
  ['kg', 'kg'], ['g', 'g'], ['l', 'lít'], ['ml', 'ml'], ['qua', 'quả'], ['bo', 'bó'], ['hop', 'hộp'],
  ['goi', 'gói'], ['chai', 'chai'], ['mieng', 'miếng'], ['cai', 'cái'],
];

const CATEGORIES = ['Rau củ', 'Trái cây', 'Thịt', 'Hải sản', 'Trứng & sữa', 'Đồ khô', 'Gia vị', 'Đồ uống', 'Khác'];

const KG = [['g', 0.001]];
const L = [['ml', 0.001]];
// [tên, category, đơn vị gốc (code), các đơn vị quy đổi [code, hệ số sang đơn vị gốc]]
const FOODS = [
  ['Thịt lợn', 'Thịt', 'kg', KG], ['Thịt bò', 'Thịt', 'kg', KG], ['Thịt gà', 'Thịt', 'kg', KG],
  ['Cá hồi', 'Hải sản', 'kg', KG], ['Tôm', 'Hải sản', 'kg', KG], ['Mực', 'Hải sản', 'kg', KG],
  ['Trứng gà', 'Trứng & sữa', 'qua', [['hop', 10]]], ['Trứng vịt', 'Trứng & sữa', 'qua', []],
  ['Sữa tươi', 'Trứng & sữa', 'l', [...L, ['hop', 0.18]]], ['Sữa chua', 'Trứng & sữa', 'hop', []],
  ['Phô mai', 'Trứng & sữa', 'g', [['kg', 1000]]],
  ['Cà chua', 'Rau củ', 'kg', KG], ['Cà rốt', 'Rau củ', 'kg', KG], ['Khoai tây', 'Rau củ', 'kg', KG],
  ['Hành lá', 'Rau củ', 'bo', []], ['Rau muống', 'Rau củ', 'bo', []], ['Cải thảo', 'Rau củ', 'kg', KG],
  ['Bắp cải', 'Rau củ', 'kg', KG], ['Dưa chuột', 'Rau củ', 'kg', KG], ['Hành tây', 'Rau củ', 'kg', KG],
  ['Tỏi', 'Gia vị', 'g', [['kg', 1000]]],
  ['Chuối', 'Trái cây', 'kg', KG], ['Táo', 'Trái cây', 'kg', KG], ['Cam', 'Trái cây', 'kg', KG],
  ['Gạo', 'Đồ khô', 'kg', KG], ['Mì gói', 'Đồ khô', 'goi', []], ['Đậu phụ', 'Khác', 'mieng', []],
  ['Nước mắm', 'Gia vị', 'chai', []], ['Dầu ăn', 'Gia vị', 'l', L], ['Đường', 'Gia vị', 'kg', KG],
  ['Muối', 'Gia vị', 'kg', KG], ['Nước cam', 'Đồ uống', 'l', L],
];

// [tên, mô tả, phút chuẩn bị, phút nấu, nguyên liệu [tên, số lượng, đơn vị code, tùy chọn?], các bước]
const RECIPES = [
  ['Trứng chiên cà chua', 'Món nhanh cho bữa sáng', 5, 10,
    [['Trứng gà', 3, 'qua'], ['Cà chua', 0.2, 'kg'], ['Hành lá', 1, 'bo', true]],
    ['Đập trứng, đánh đều với chút nước mắm.', 'Xào cà chua cho mềm.', 'Đổ trứng vào, đảo nhẹ đến khi chín.']],
  ['Canh rau muống tỏi', 'Canh thanh mát', 5, 10,
    [['Rau muống', 1, 'bo'], ['Tỏi', 10, 'g']],
    ['Nhặt và rửa rau muống.', 'Phi thơm tỏi, thêm nước, đun sôi.', 'Cho rau vào, nêm vừa ăn.']],
  ['Thịt bò xào hành tây', 'Món mặn cho bữa tối', 10, 10,
    [['Thịt bò', 0.3, 'kg'], ['Hành tây', 0.2, 'kg'], ['Tỏi', 10, 'g']],
    ['Thái bò mỏng, ướp tỏi và dầu ăn.', 'Xào bò lửa lớn rồi để riêng.', 'Xào hành tây, cho bò vào đảo nhanh.']],
  ['Cá hồi áp chảo', 'Giàu đạm, ít dầu mỡ', 5, 15,
    [['Cá hồi', 0.3, 'kg'], ['Tỏi', 10, 'g'], ['Dầu ăn', 0.02, 'l', true]],
    ['Thấm khô cá, ướp muối tiêu.', 'Áp chảo mặt da trước 4 phút.', 'Lật mặt, thêm tỏi, áp thêm 3 phút.']],
  ['Canh cà chua trứng', 'Canh chua nhẹ', 5, 10,
    [['Cà chua', 0.2, 'kg'], ['Trứng gà', 2, 'qua'], ['Hành lá', 1, 'bo', true]],
    ['Xào cà chua với chút dầu.', 'Thêm nước, đun sôi.', 'Đổ trứng đã đánh vào, khuấy nhẹ, rắc hành.']],
];

export async function seedCatalog(db, log = console.log) {
  for (const [code, name] of UNITS) {
    await db.query('INSERT INTO units (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING', [code, name]);
  }
  for (const name of CATEGORIES) {
    await db.query(
      'INSERT INTO categories (name) SELECT $1::varchar WHERE NOT EXISTS (SELECT 1 FROM categories WHERE lower(name) = lower($1::varchar) AND is_active)',
      [name],
    );
  }
  const unitId = async (code) => (await db.query('SELECT id FROM units WHERE code = $1', [code])).rows[0].id;
  for (const [name, category, base, extra] of FOODS) {
    const cat = (await db.query('SELECT id FROM categories WHERE lower(name) = lower($1) AND is_active', [category])).rows[0].id;
    const baseId = await unitId(base);
    await db.query(
      `INSERT INTO foods (name, category_id, base_unit_id)
       SELECT $1::varchar, $2::bigint, $3::bigint WHERE NOT EXISTS (SELECT 1 FROM foods WHERE group_id IS NULL AND lower(name) = lower($1::varchar) AND is_active)`,
      [name, cat, baseId],
    );
    const foodId = (await db.query('SELECT id FROM foods WHERE group_id IS NULL AND lower(name) = lower($1) AND is_active', [name])).rows[0].id;
    for (const [code, factor] of [[base, 1], ...extra]) {
      await db.query('INSERT INTO food_units (food_id, unit_id, factor_to_base) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [
        foodId, await unitId(code), factor,
      ]);
    }
  }

  // Công thức chung cần người tạo: dùng tài khoản hệ thống (không đăng nhập được).
  await db.query(
    `INSERT INTO users (full_name, email, system_role) SELECT 'Hệ thống', 'system@dicho.local', 'admin'
     WHERE NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = 'system@dicho.local')`,
  );
  const systemId = (await db.query("SELECT id FROM users WHERE lower(email) = 'system@dicho.local'")).rows[0].id;
  for (const [title, description, prep, cook, ingredients, steps] of RECIPES) {
    const exists = await db.query('SELECT 1 FROM recipes WHERE group_id IS NULL AND title = $1', [title]);
    if (exists.rowCount) continue;
    const html = `<ol>${steps.map((s) => `<li>${s}</li>`).join('')}</ol>`;
    const { id } = (
      await db.query(
        `INSERT INTO recipes (group_id, created_by, title, description, steps, base_servings, prep_minutes, cook_minutes)
         VALUES (NULL, $1, $2, $3, $4, 2, $5, $6) RETURNING id`,
        [systemId, title, description, html, prep, cook],
      )
    ).rows[0];
    for (const [foodName, quantity, code, optional] of ingredients) {
      const food = (await db.query('SELECT id FROM foods WHERE group_id IS NULL AND name = $1', [foodName])).rows[0];
      await db.query(
        'INSERT INTO recipe_ingredients (recipe_id, food_id, unit_id, quantity, is_optional) VALUES ($1, $2, $3, $4, $5)',
        [id, food.id, await unitId(code), quantity, Boolean(optional)],
      );
    }
  }
  log(`seed: ${UNITS.length} đơn vị, ${CATEGORIES.length} category, ${FOODS.length} thực phẩm, ${RECIPES.length} công thức`);
}

/** Tài khoản + nhóm + dữ liệu demo. Chỉ chạy được với AUTH_DRIVER=local. */
export async function seedDemo(log = console.log) {
  const { localAuth } = await import('../src/services/gateways/authLocal.js');
  const { query, queryOne } = await import('../src/config/db.js');
  const PASSWORD = '123456';

  async function account(email, fullName, username, role = 'user') {
    let user = await queryOne('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
    if (user) return user;
    const { authUserId } = await localAuth.signUp({ email, password: PASSWORD });
    await query('UPDATE auth_local_accounts SET email_confirmed_at = now(), verify_code = NULL WHERE auth_user_id = $1', [authUserId]);
    user = await queryOne(
      'INSERT INTO users (full_name, email, username, system_role, auth_user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [fullName, email, username, role, authUserId],
    );
    return user;
  }

  await account('admin@dicho.local', 'Quản trị viên', 'admin', 'admin');
  const demo = await account('demo@dicho.local', 'Long Demo', 'demo');
  const minh = await account('minh@dicho.local', 'Minh Anh', 'minhanh');

  const existingGroup = await queryOne('SELECT group_id FROM group_members WHERE user_id = $1 AND left_at IS NULL', [demo.id]);
  if (existingGroup) {
    log('demo: đã có dữ liệu, bỏ qua');
    return;
  }
  const group = await queryOne("INSERT INTO family_groups (name, created_by) VALUES ('Gia đình Demo', $1) RETURNING id", [demo.id]);
  await query("INSERT INTO group_members (group_id, user_id, group_role) VALUES ($1, $2, 'leader'), ($1, $3, 'member')", [group.id, demo.id, minh.id]);

  const food = async (name) => queryOne('SELECT id, base_unit_id FROM foods WHERE group_id IS NULL AND name = $1', [name]);
  // [thực phẩm, số lượng (đơn vị gốc), hạn dùng sau n ngày, nơi để]
  const stock = [
    ['Thịt bò', 0.5, 2, 'fridge'], ['Trứng gà', 10, 12, 'fridge'], ['Cà chua', 0.6, 1, 'fridge'],
    ['Sữa tươi', 1, 5, 'fridge'], ['Tôm', 0.4, 30, 'freezer'], ['Gạo', 5, 180, 'pantry'], ['Hành tây', 0.3, -1, 'pantry'],
  ];
  for (const [name, qty, days, location] of stock) {
    const f = await food(name);
    const item = await queryOne(
      `INSERT INTO fridge_items (group_id, food_id, quantity_base, expires_on, storage_location)
       VALUES ($1, $2, $3, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + $4::int, $5) RETURNING id`,
      [group.id, f.id, qty, days, location],
    );
    await query(
      `INSERT INTO inventory_logs (group_id, fridge_item_id, food_id, actor_id, event_type, quantity_base, idempotency_key)
       VALUES ($1, $2, $3, $4, 'add', $5, $6)`,
      [group.id, item.id, f.id, demo.id, qty, `seed:${item.id}`],
    );
  }

  const list = await queryOne(
    `INSERT INTO shopping_lists (group_id, title, shopping_date, assigned_to, created_by)
     VALUES ($1, 'Đi chợ cuối tuần', (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, $2, $3) RETURNING id`,
    [group.id, minh.id, demo.id],
  );
  for (const [name, qty] of [['Rau muống', 2], ['Tỏi', 100], ['Cá hồi', 0.3]]) {
    const f = await food(name);
    const item = await queryOne(
      'INSERT INTO shopping_list_items (shopping_list_id, food_id, unit_id, quantity, added_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [list.id, f.id, f.base_unit_id, qty, demo.id],
    );
    await query('INSERT INTO tasks (shopping_list_item_id, assigned_by, assigned_to) VALUES ($1, $2, $3)', [item.id, demo.id, minh.id]);
  }

  const plan = await queryOne(
    `INSERT INTO meal_plans (group_id, plan_date, meal_type, created_by)
     VALUES ($1, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, 'dinner', $2) RETURNING id`,
    [group.id, demo.id],
  );
  const recipe = await queryOne("SELECT id FROM recipes WHERE group_id IS NULL AND title = 'Thịt bò xào hành tây'");
  await query('INSERT INTO meal_plan_items (meal_plan_id, group_id, recipe_id, planned_servings) VALUES ($1, $2, $3, 2)', [plan.id, group.id, recipe.id]);

  log('demo: admin@dicho.local, demo@dicho.local, minh@dicho.local (mật khẩu 123456)');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { getPool, withTransaction, closePool } = await import('../src/config/db.js');
  const { env } = await import('../src/config/env.js');
  try {
    getPool();
    await withTransaction((db) => seedCatalog(db));
    if (process.argv.includes('--demo')) {
      if (env.AUTH_DRIVER !== 'local') throw new Error('--demo chỉ dùng được khi AUTH_DRIVER=local');
      await seedDemo();
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
