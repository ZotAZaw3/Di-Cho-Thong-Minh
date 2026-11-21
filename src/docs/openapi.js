import { z } from 'zod';
import { CODES } from '../utils/codes.js';

// Tài liệu OpenAPI 3.1 sinh từ chính các route và schema zod đang chạy, nên không lệch với code.
// Xem tại GET /it4788/docs (Swagger UI) hoặc tải GET /it4788/openapi.json (import thẳng vào Postman).
// `npm run docs:export` ghi ra docs/openapi.json và docs/postman_collection.json.

// [số thứ tự theo sheet "Theo dõi API", nhóm, mô tả]. 50–55: API mở rộng; 56–66: bổ sung theo đề bài.
const CATALOG = {
  'GET /health': [0, '0. Hệ thống', 'Kiểm tra server'],
  'POST /user/login': [1, '1. Xác thực', 'Đăng nhập'],
  'POST /user': [2, '1. Xác thực', 'Đăng ký (gửi mã xác minh email)'],
  'POST /user/logout': [3, '1. Xác thực', 'Đăng xuất'],
  'POST /user/refresh-token': [4, '1. Xác thực', 'Làm mới access token'],
  'POST /user/send-verification-code': [5, '1. Xác thực', 'Gửi lại mã xác minh'],
  'POST /user/verify-email': [6, '1. Xác thực', 'Xác minh email bằng mã 6 số'],
  'POST /user/change-password': [7, '2. Tài khoản', 'Đổi mật khẩu'],
  'PUT /user': [8, '2. Tài khoản', 'Sửa thông tin cá nhân (form-data, ảnh ở trường image)'],
  'POST /user/group': [9, '3. Nhóm gia đình', 'Tạo nhóm (người tạo là trưởng nhóm)'],
  'POST /user/group/add': [10, '3. Nhóm gia đình', 'Thêm thành viên'],
  'DELETE /user/group': [11, '3. Nhóm gia đình', 'Xóa thành viên'],
  'GET /user/group': [12, '3. Nhóm gia đình', 'Xem nhóm và thành viên'],
  'GET /user': [13, '2. Tài khoản', 'Thông tin người dùng hiện tại'],
  'DELETE /user': [14, '2. Tài khoản', 'Xóa tài khoản'],
  'POST /admin/category': [15, '4, 5. Admin', 'Tạo category'],
  'GET /admin/category': [16, '4, 5. Admin', 'Danh sách category'],
  'PUT /admin/category': [17, '4, 5. Admin', 'Đổi tên category'],
  'DELETE /admin/category': [18, '4, 5. Admin', 'Xóa category'],
  'POST /admin/unit': [19, '4, 5. Admin', 'Tạo đơn vị'],
  'GET /admin/unit': [20, '4, 5. Admin', 'Danh sách đơn vị'],
  'PUT /admin/unit': [21, '4, 5. Admin', 'Đổi tên đơn vị'],
  'DELETE /admin/unit': [22, '4, 5. Admin', 'Xóa đơn vị'],
  'GET /admin/logs': [23, '4, 5. Admin', 'Xem log hệ thống'],
  'POST /food': [24, '6. Thực phẩm', 'Tạo thực phẩm riêng của nhóm'],
  'PUT /food': [25, '6. Thực phẩm', 'Sửa thực phẩm của nhóm'],
  'DELETE /food': [26, '6. Thực phẩm', 'Xóa thực phẩm của nhóm'],
  'GET /food': [27, '6. Thực phẩm', 'Danh mục thực phẩm (tìm không dấu, lọc category)'],
  'GET /food/unit': [28, '6. Thực phẩm', 'Danh sách đơn vị'],
  'GET /food/category': [29, '6. Thực phẩm', 'Danh sách category'],
  'POST /fridge': [30, '7. Tủ lạnh', 'Thêm đồ vào tủ (header Idempotency-Key chống thêm trùng)'],
  'PUT /fridge': [31, '7. Tủ lạnh', 'Sửa đồ trong tủ'],
  'DELETE /fridge': [32, '7. Tủ lạnh', 'Bỏ đồ khỏi tủ'],
  'GET /fridge': [33, '7. Tủ lạnh', 'Danh sách đồ trong tủ, hạn gần nhất trước'],
  'GET /fridge/:foodName': [34, '7. Tủ lạnh', 'Đồ trong tủ theo tên thực phẩm'],
  'POST /shopping': [35, '8. Mua sắm', 'Tạo danh sách mua sắm'],
  'PUT /shopping': [36, '8. Mua sắm', 'Sửa danh sách (trưởng nhóm / người tạo)'],
  'DELETE /shopping': [37, '8. Mua sắm', 'Xóa danh sách (trưởng nhóm / người tạo)'],
  'POST /shopping/task': [38, '8. Mua sắm', 'Thêm mặt hàng (mã 00287; trùng món thì không thêm món nào)'],
  'GET /shopping/task': [39, '8. Mua sắm', 'Danh sách mặt hàng'],
  'DELETE /shopping/task': [40, '8. Mua sắm', 'Xóa mặt hàng'],
  'PUT /shopping/task': [41, '8. Mua sắm', 'Sửa mặt hàng'],
  'POST /meal': [42, '9. Bữa ăn', 'Thêm món vào bữa'],
  'DELETE /meal': [43, '9. Bữa ăn', 'Xóa món khỏi bữa'],
  'PUT /meal': [44, '9. Bữa ăn', 'Sửa món (không có planId thì tạo mới)'],
  'GET /meal': [45, '9. Bữa ăn', 'Xem theo ngày hoặc tuần (from/to, tối đa 62 ngày)'],
  'POST /recipe': [46, '10. Công thức', 'Tạo công thức'],
  'PUT /recipe': [47, '10. Công thức', 'Sửa công thức'],
  'DELETE /recipe': [48, '10. Công thức', 'Xóa công thức'],
  'GET /recipe': [49, '10. Công thức', 'Danh sách công thức (lọc foodId, q, favorite)'],
  'PUT /user/device': [50, '2. Tài khoản', 'Đăng ký FCM token của thiết bị'],
  'GET /shopping': [51, '8. Mua sắm', 'Các danh sách mua sắm kèm mặt hàng'],
  'PUT /shopping/task/done': [52, '8. Mua sắm', 'Đánh dấu đã mua → cộng vào tủ lạnh (done=false để hoàn tác)'],
  'GET /admin/user': [53, '4, 5. Admin', 'Danh sách tài khoản'],
  'PUT /admin/user': [53, '4, 5. Admin', 'Khóa / mở khóa tài khoản'],
  'GET /recipe/suggest': [54, '10. Công thức', 'Gợi ý món từ đồ trong tủ'],
  'GET /report': [55, '11. Thống kê', 'Thống kê mua sắm và tiêu thụ'],
  'POST /recipe/favorite': [56, '10. Công thức', 'Thêm công thức yêu thích'],
  'DELETE /recipe/favorite': [57, '10. Công thức', 'Bỏ công thức yêu thích'],
  'GET /recipe/favorite': [58, '10. Công thức', 'Công thức yêu thích của tôi'],
  'POST /shopping/copy': [59, '8. Mua sắm', 'Sao chép danh sách cũ để dùng lại'],
  'POST /meal/cook': [60, '9. Bữa ăn', 'Nấu xong: trừ nguyên liệu khỏi tủ lạnh'],
  'POST /user/group/leave': [61, '3. Nhóm gia đình', 'Rời nhóm'],
  'PUT /user/group/leader': [62, '3. Nhóm gia đình', 'Chuyển quyền trưởng nhóm'],
  'GET /notification': [63, '12. Thông báo', 'Hộp thư thông báo nhắc hết hạn'],
  'PUT /notification/read': [64, '12. Thông báo', 'Đánh dấu đã đọc (bỏ trống ids = tất cả)'],
  'GET /admin/food': [65, '4, 5. Admin', 'Danh mục thực phẩm chung'],
  'POST /admin/food': [65, '4, 5. Admin', 'Thêm thực phẩm chung'],
  'PUT /admin/food': [65, '4, 5. Admin', 'Sửa thực phẩm chung'],
  'DELETE /admin/food': [65, '4, 5. Admin', 'Xóa thực phẩm chung'],
  'GET /admin/config': [66, '4, 5. Admin', 'Xem cấu hình hệ thống'],
  'PUT /admin/config': [66, '4, 5. Admin', 'Sửa cấu hình: { expiryDays: 5 } hoặc { key, value }'],
};

// Body mẫu (Swagger "Try it out" và Postman), theo dữ liệu seed + tài khoản demo.
export const EXAMPLES = {
  'POST /user/login': { email: 'demo@dicho.local', password: '123456' },
  'POST /user': { email: 'ban@example.com', password: '123456', name: 'Nguyễn Văn A', username: 'nguyenvana' },
  'POST /user/refresh-token': { refreshToken: '{{refreshToken}}' },
  'POST /user/send-verification-code': { email: 'ban@example.com' },
  'POST /user/verify-email': { email: 'ban@example.com', code: '123456' },
  'POST /user/change-password': { oldPassword: '123456', newPassword: '1234567' },
  'POST /user/group': { name: 'Gia đình tôi' },
  'POST /user/group/add': { username: 'minh@dicho.local' },
  'PUT /user/group/leader': { username: 'minh@dicho.local' },
  'PUT /user/device': { token: 'fcm-token-cua-may', platform: 'android' },
  'POST /admin/category': { name: 'Đồ đông lạnh', description: 'Thực phẩm cấp đông' },
  'PUT /admin/category': { oldName: 'Đồ đông lạnh', newName: 'Đông lạnh' },
  'POST /admin/unit': { name: 'thùng' },
  'PUT /admin/user': { email: 'minh@dicho.local', status: 'blocked' },
  'POST /admin/food': { name: 'Nấm hương', categoryName: 'Rau củ', unitName: 'kg', units: [{ unitName: 'g', factor: 0.001 }] },
  'PUT /admin/config': { expiryDays: 3 },
  'POST /food': { name: 'Bánh bao', foodCategoryName: 'Khác', unitName: 'cái', units: [{ unitName: 'gói', factor: 6 }] },
  'PUT /food': { name: 'Bánh bao', newName: 'Bánh bao chay' },
  'POST /fridge': { foodName: 'Trứng gà', quantity: 1, unit: 'hộp', useWithin: 7, storageLocation: 'Tủ lạnh' },
  'PUT /fridge': { itemId: 1, newQuantity: 5, newUseWithin: 3 },
  'POST /shopping': { name: 'Đi chợ cuối tuần', assignToUsername: 'minh@dicho.local', date: '2026-12-05' },
  'PUT /shopping': { listId: 1, newName: 'Đi chợ thứ bảy', status: 'active' },
  'POST /shopping/copy': { listId: 1, date: '2026-12-12' },
  'POST /shopping/task': { listId: 1, tasks: [{ foodName: 'Cà chua', quantity: 0.5, unit: 'kg' }, { foodName: 'Trứng gà', quantity: 1, unit: 'hộp' }] },
  'PUT /shopping/task': { taskId: 1, newQuantity: 2 },
  'PUT /shopping/task/done': { taskId: 1, done: true, expiryDate: '2026-12-10', storageLocation: 'Tủ lạnh', totalCost: 35000 },
  'POST /meal': { recipeId: 1, timestamp: '2026-12-05', name: 'tối', servings: 4 },
  'PUT /meal': { planId: 1, newName: 'trưa' },
  'POST /meal/cook': { planId: 1 },
  'POST /recipe': {
    name: 'Trứng hấp',
    htmlContent: '<ol><li>Đánh trứng</li><li>Hấp 10 phút</li></ol>',
    servings: 2,
    ingredients: [{ foodName: 'Trứng gà', quantity: 3, unit: 'quả' }],
  },
  'PUT /recipe': { recipeId: 1, newName: 'Trứng hấp thịt' },
  'POST /recipe/favorite': { recipeId: 1 },
  'PUT /notification/read': { ids: [] },
};

const AUTH_NOTE = {
  requireAuth: 'Cần đăng nhập.',
  requireGroup: 'Phải đang ở một nhóm gia đình.',
  requireLeader: 'Chỉ trưởng nhóm.',
  adminOnly: 'Chỉ admin (00019).',
};

const toSchema = (schema, io = 'input') => {
  const json = z.toJSONSchema(schema, { io, unrepresentable: 'any' });
  delete json.$schema;
  return json;
};

/** Duyệt các route của apiRouter → [{ method, path, middlewares }]. */
export function collectRoutes(router, prefix = '') {
  const out = [];
  for (const layer of router.stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) {
        out.push({ method: method.toUpperCase(), path: prefix + layer.route.path, handlers: layer.route.stack.map((l) => l.handle) });
      }
    } else if (layer.handle?.stack) {
      out.push(...collectRoutes(layer.handle, prefix));
    }
  }
  return out;
}

const envelope = (data = {}) => ({
  type: 'object',
  required: ['code', 'message', 'data'],
  properties: { code: { type: 'string', example: '00000' }, message: { type: 'string' }, data },
});

function operation({ method, path, handlers }) {
  const [no, tag, summary] = CATALOG[`${method} ${path}`] ?? [null, 'Khác', path];
  const names = handlers.map((h) => h.name);
  const op = {
    tags: [tag],
    summary: no !== null ? `#${no} ${summary}` : summary,
    operationId: `${method.toLowerCase()}${path.replace(/[/:-](\w)/g, (_m, c) => c.toUpperCase())}`,
    responses: {
      200: { description: 'Thành công (code 00000) hoặc lỗi nghiệp vụ, xem bảng mã', content: { 'application/json': { schema: envelope() } } },
    },
  };
  const notes = names.map((n) => AUTH_NOTE[n]).filter(Boolean);
  if (names.includes('requireAuth') || names.includes('readBearer')) op.security = [{ bearer: [] }];
  else op.security = [];
  if (notes.length) op.description = notes.join(' ');

  const params = [];
  for (const m of path.matchAll(/:(\w+)/g)) params.push({ name: m[1], in: 'path', required: true, schema: { type: 'string' } });
  const upload = names.includes('multerMiddleware');
  for (const h of handlers.filter((x) => x.schema)) {
    const json = toSchema(h.schema);
    const asQuery = h.source === 'query' || h.source === 'params' || (h.source === 'input' && method !== 'PUT' && method !== 'POST');
    if (h.source === 'params') continue;
    if (asQuery) {
      for (const [name, prop] of Object.entries(json.properties ?? {})) {
        params.push({ name, in: 'query', required: (json.required ?? []).includes(name), schema: prop });
      }
      if (h.source === 'input') op.description = `${op.description ?? ''} Tham số gửi trong query hoặc body.`.trim();
    } else {
      const sample = EXAMPLES[`${method} ${path}`];
      const content = { 'application/json': { schema: json, ...(sample ? { example: sample } : {}) } };
      if (upload) {
        content['multipart/form-data'] = {
          schema: { ...json, properties: { ...json.properties, image: { type: 'string', format: 'binary' } } },
        };
      }
      op.requestBody = { required: true, content };
    }
  }
  if (params.length) op.parameters = params;
  return op;
}

/** @param {import('express').Router} apiRouter @param {string} prefix vd. '/it4788' */
export function buildOpenApi(apiRouter, prefix) {
  const paths = {};
  for (const route of collectRoutes(apiRouter)) {
    if (route.path === '/openapi.json' || route.path.startsWith('/docs')) continue;
    const key = route.path.replace(/:(\w+)/g, '{$1}') + '/';
    paths[key] ??= {};
    paths[key][route.method.toLowerCase()] = operation(route);
  }
  const codeRows = Object.entries(CODES)
    .map(([key, c]) => `| \`${c.code}\` | ${c.status} | ${key} | ${c.message} | ${c.source} |`)
    .join('\n');
  return {
    openapi: '3.1.0',
    info: {
      title: 'Đi chợ tiện lợi API (IT4788, nhóm 4)',
      version: '1.0.0',
      description: [
        'Mọi API trả về `{ code, message, data }`. API #1–49 theo tài liệu môn học, #50–55 mở rộng (sheet), #56–66 bổ sung theo đề bài.',
        'Body nhận tên trường theo tài liệu; tên app nhánh fe-tien dùng cũng được nhận (xem docs/api.md).',
        '',
        '| code | HTTP | Tên | Message | Nguồn |',
        '| --- | --- | --- | --- | --- |',
        codeRows,
      ].join('\n'),
    },
    servers: [{ url: prefix, description: 'Server hiện tại' }],
    tags: [...new Set(Object.values(paths).flatMap((m) => Object.values(m).flatMap((o) => o.tags)))]
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .map((name) => ({ name })),
    components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    paths,
  };
}

/** OpenAPI → Postman collection v2.1: biến {{baseUrl}}, {{accessToken}}; login tự lưu token. */
export function toPostman(spec, baseUrl) {
  const folders = new Map();
  const example = (schema) => {
    if (!schema || typeof schema !== 'object') return null;
    if (schema.example !== undefined) return schema.example;
    if (schema.default !== undefined) return schema.default;
    if (schema.enum) return schema.enum[0];
    if (schema.anyOf) return example(schema.anyOf[0]);
    switch (schema.type) {
      case 'object':
        return Object.fromEntries(
          Object.entries(schema.properties ?? {})
            .filter(([k]) => (schema.required ?? []).includes(k))
            .map(([k, v]) => [k, example(v)]),
        );
      case 'array':
        return [example(schema.items)];
      case 'integer':
      case 'number':
        return 1;
      case 'boolean':
        return true;
      case 'string':
        return schema.pattern?.includes('\\d{4}') ? '2026-12-01' : '';
      default:
        return null;
    }
  };
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      const query = (op.parameters ?? []).filter((p) => p.in === 'query');
      const urlPath = path.replace(/\{(\w+)\}/g, ':$1').replace(/^\//, '');
      const item = {
        name: op.summary,
        request: {
          method: method.toUpperCase(),
          header: [{ key: 'Content-Type', value: 'application/json' }],
          url: {
            raw: `{{baseUrl}}/${urlPath}`,
            host: ['{{baseUrl}}'],
            path: urlPath.split('/').filter(Boolean).concat(urlPath.endsWith('/') ? [''] : []),
            query: query.map((p) => ({ key: p.name, value: String(example(p.schema) ?? ''), disabled: !p.required })),
            variable: (op.parameters ?? []).filter((p) => p.in === 'path').map((p) => ({ key: p.name, value: '' })),
          },
          description: op.description,
          auth: op.security?.length ? undefined : { type: 'noauth' },
        },
        event: [
          {
            listen: 'test',
            script: {
              type: 'text/javascript',
              exec: [
                "pm.test('Trả về đúng format { code, message, data }', () => {",
                '  const body = pm.response.json();',
                "  pm.expect(body).to.have.keys(['code', 'message', 'data']);",
                '});',
                ...(op.operationId === 'postUserLogin'
                  ? [
                      'const data = pm.response.json().data;',
                      "if (data && data.accessToken) { pm.collectionVariables.set('accessToken', data.accessToken); pm.collectionVariables.set('refreshToken', data.refreshToken); }",
                    ]
                  : []),
              ],
            },
          },
        ],
      };
      const json = op.requestBody?.content['application/json'];
      if (json) item.request.body = { mode: 'raw', raw: JSON.stringify(json.example ?? example(json.schema), null, 2) };
      const tag = op.tags[0];
      if (!folders.has(tag)) folders.set(tag, []);
      folders.get(tag).push(item);
    }
  }
  const order = (name) => (Number.isNaN(parseInt(name, 10)) ? 99 : parseInt(name, 10));
  return {
    info: {
      name: spec.info.title,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      description: 'Sinh tự động từ code (npm run docs:export). Chạy "Đăng nhập" trước: token được lưu vào biến accessToken.',
    },
    auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }] },
    variable: [
      { key: 'baseUrl', value: baseUrl },
      { key: 'accessToken', value: '' },
      { key: 'refreshToken', value: '' },
    ],
    item: [...folders.entries()]
      .sort(([a], [b]) => order(a) - order(b))
      .map(([name, items]) => ({ name, item: items.sort((a, b) => parseInt(a.name.slice(1), 10) - parseInt(b.name.slice(1), 10)) })),
  };
}
