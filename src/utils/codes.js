// Bảng mã response: { code, message, data }.
//
// Mã lấy theo bảng mã trong file mô tả API của môn ("20261 - Mo ta API chu de bai tap lon IT4788").
// Mỗi API trong tài liệu có dải mã riêng: mã thành công riêng (00047 Login, 00287 Create tasks...) và mã lỗi
// riêng cho từng trường hợp (00281 Create tasks = "không phải trưởng nhóm"...). Vì vậy có hai bảng:
//
//   CODES      mã chung theo tên (OK, NOT_FOUND...): dùng khi API không có mã riêng cho trường hợp đó,
//              gồm các API ngoài tài liệu (#50–66) và lỗi chung (thiếu token, quá nhiều yêu cầu...).
//   API_CODES  mã riêng của từng API theo tài liệu, tra theo route.
//
// Service vẫn chỉ ném tên (throw new ApiError('NOT_FOUND', { reason: 'food' })); send() chọn mã theo route:
//   API_CODES[route]['NOT_FOUND:food'] → API_CODES[route]['NOT_FOUND'] (khi không có reason) → CODES.NOT_FOUND.
// Lỗi kiểm tra dữ liệu (validate) có reason là tên trường, hoặc 'missing' khi thiếu trường bắt buộc,
// hoặc 'need' khi API sửa không có trường nào để sửa.
//
// Dải 009xx là mã riêng của nhóm cho trường hợp tài liệu không có mã (tài liệu dùng tới khoảng 00378).
// Không viết mã trực tiếp trong controller; luôn dùng tên.
export const CODES = Object.freeze({
  OK: { code: '00000', status: 200, message: 'Thành công' },
  CREATED: { code: '00000', status: 201, message: 'Tạo thành công' },

  // Chung, theo tài liệu
  NO_TOKEN: { code: '00006', status: 401, message: 'Truy cập bị từ chối. Không có token được cung cấp' },
  INTERNAL_ERROR: { code: '00008', status: 500, message: 'Đã xảy ra lỗi máy chủ nội bộ, vui lòng thử lại' },
  SESSION_EXPIRED: { code: '00011', status: 401, message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' },
  UNAUTHORIZED: { code: '00012', status: 401, message: 'Token không hợp lệ' },
  FORBIDDEN: { code: '00017', status: 403, message: 'Bạn không có quyền thực hiện thao tác này' },
  ADMIN_ONLY: { code: '00019', status: 403, message: 'Truy cập bị từ chối. Chỉ quản trị viên được dùng chức năng này' },
  RATE_LIMITED: { code: '00024', status: 429, message: 'Gửi yêu cầu quá nhiều, vui lòng thử lại sau' },

  // Mã của một API trong tài liệu, dùng chung cho API khác cùng ý nghĩa
  EMAIL_EXISTS: { code: '00032', status: 409, message: 'Email đã được đăng ký' },
  EMAIL_NOT_CONFIRMED: { code: '00044', status: 403, message: 'Email chưa được xác minh' },
  INVALID_CREDENTIALS: { code: '00045', status: 401, message: 'Email hoặc mật khẩu không đúng' },
  INVALID_CODE: { code: '00054', status: 400, message: 'Mã xác minh không đúng hoặc đã hết hạn' },
  WRONG_PASSWORD: { code: '00072', status: 400, message: 'Mật khẩu cũ không đúng' },
  USERNAME_EXISTS: { code: '00084', status: 409, message: 'Tên đăng nhập đã tồn tại' },
  ALREADY_IN_GROUP: { code: '00093', status: 409, message: 'Người dùng đã ở trong một nhóm' },
  NO_GROUP: { code: '00096', status: 403, message: 'Bạn chưa thuộc nhóm gia đình nào' },

  // Mã riêng của nhóm (tài liệu không có)
  BAD_REQUEST: { code: '00900', status: 400, message: 'Dữ liệu gửi lên không hợp lệ' },
  ACCOUNT_BLOCKED: { code: '00903', status: 403, message: 'Tài khoản đã bị khóa' },
  NOT_FOUND: { code: '00904', status: 404, message: 'Không tìm thấy dữ liệu' },
  ROUTE_NOT_FOUND: { code: '00905', status: 404, message: 'Không tìm thấy API' },
  CONFLICT: { code: '00909', status: 409, message: 'Dữ liệu đã tồn tại hoặc không ở trạng thái phù hợp' },
  IN_USE: { code: '00910', status: 409, message: 'Dữ liệu đang được sử dụng, không thể xóa' },
});

// Mã riêng của 49 API trong tài liệu, theo route (METHOD + path như khai báo trong src/routes).
// Giá trị là mã, hoặc [mã, message] (message mặc định khi controller/service không ghi đè).
// OK áp dụng cho cả CREATED. Thứ tự giống sheet "Theo dõi API".
export const API_CODES = Object.freeze({
  // #1 Login
  'POST /user/login': {
    OK: ['00047', 'Đăng nhập thành công'],
    'BAD_REQUEST:missing': '00038',
    'BAD_REQUEST:email': '00039',
    'BAD_REQUEST:password': '00040',
    EMAIL_NOT_CONFIRMED: '00044',
    INVALID_CREDENTIALS: '00045',
  },
  // #2 Register
  'POST /user': {
    OK: ['00035', 'Đăng ký thành công'],
    'BAD_REQUEST:missing': '00025',
    'BAD_REQUEST:email': '00026',
    'BAD_REQUEST:password': '00027',
    'BAD_REQUEST:name': '00028',
    EMAIL_EXISTS: '00032',
  },
  // #3 Logout
  'POST /user/logout': { OK: ['00050', 'Đăng xuất thành công'] },
  // #4 Refresh token
  'POST /user/refresh-token': {
    OK: ['00065', 'Làm mới token thành công'],
    'BAD_REQUEST:missing': '00059',
    'BAD_REQUEST:refreshToken': '00059',
    SESSION_EXPIRED: '00062',
    UNAUTHORIZED: '00063',
  },
  // #5 Send verification code
  'POST /user/send-verification-code': {
    OK: ['00048', 'Đã gửi mã xác minh đến email'],
    'BAD_REQUEST:missing': '00005',
    'BAD_REQUEST:email': '00005',
  },
  // #6 Verify email
  'POST /user/verify-email': {
    OK: ['00058', 'Xác minh email thành công'],
    'BAD_REQUEST:missing': '00053',
    'BAD_REQUEST:code': '00054',
    INVALID_CODE: '00054',
    'INVALID_CODE:token': '00055',
  },
  // #7 Change password
  'POST /user/change-password': {
    OK: ['00076', 'Đổi mật khẩu thành công'],
    'BAD_REQUEST:missing': '00069',
    'BAD_REQUEST:oldPassword': '00069',
    'BAD_REQUEST:newPassword': '00069',
    WRONG_PASSWORD: '00072',
    'BAD_REQUEST:same': '00073',
  },
  // #8 Edit user
  'PUT /user': {
    OK: ['00086', 'Cập nhật thông tin thành công'],
    'BAD_REQUEST:name': '00077',
    'BAD_REQUEST:language': '00079',
    'BAD_REQUEST:username': '00081',
    USERNAME_EXISTS: '00084',
  },
  // #9 Create group
  'POST /user/group': { OK: ['00095', 'Tạo nhóm thành công'], ALREADY_IN_GROUP: '00093' },
  // #10 Add member
  'POST /user/group/add': {
    OK: ['00102', 'Thêm thành viên thành công'],
    ALREADY_IN_GROUP: '00099',
    NOT_FOUND: '00099',
    'BAD_REQUEST:missing': '00100',
    'BAD_REQUEST:username': '00100',
    FORBIDDEN: '00101',
  },
  // #11 Delete member
  'DELETE /user/group': {
    OK: ['00106', 'Xóa thành viên thành công'],
    NOT_FOUND: '00103',
    FORBIDDEN: '00104',
    'BAD_REQUEST:missing': '00107',
    'BAD_REQUEST:username': '00107',
  },
  // #12 Get group members
  'GET /user/group': { OK: ['00098', 'Lấy thông tin nhóm thành công'], NO_GROUP: '00096' },
  // #13 Get user, #14 Delete user
  'GET /user': { OK: ['00089', 'Lấy thông tin người dùng thành công'] },
  'DELETE /user': { OK: ['00092', 'Xóa tài khoản thành công'] },

  // #15–18 Category (admin)
  'POST /admin/category': {
    OK: ['00135', 'Tạo category thành công'],
    'BAD_REQUEST:missing': '00131',
    'BAD_REQUEST:name': '00131',
    CONFLICT: '00132',
  },
  'GET /admin/category': { OK: ['00129', 'Lấy danh sách category thành công'] },
  'PUT /admin/category': {
    OK: ['00141', 'Sửa category thành công'],
    'BAD_REQUEST:missing': '00136',
    'BAD_REQUEST:oldName': '00136',
    'BAD_REQUEST:newName': '00136',
    'BAD_REQUEST:same': '00137',
    NOT_FOUND: '00138',
    'NOT_FOUND:category': '00138',
    CONFLICT: '00138',
  },
  'DELETE /admin/category': {
    OK: ['00146', 'Xóa category thành công'],
    'BAD_REQUEST:missing': '00142',
    'BAD_REQUEST:name': '00142',
    NOT_FOUND: '00143',
    'NOT_FOUND:category': '00143',
  },
  // #19–22 Unit (admin)
  'POST /admin/unit': {
    OK: ['00116', 'Tạo đơn vị thành công'],
    'BAD_REQUEST:missing': '00112',
    'BAD_REQUEST:name': '00112',
    CONFLICT: '00113',
  },
  'GET /admin/unit': { OK: ['00110', 'Lấy danh sách đơn vị thành công'] },
  'PUT /admin/unit': {
    OK: ['00122', 'Sửa đơn vị thành công'],
    'BAD_REQUEST:missing': '00117',
    'BAD_REQUEST:oldName': '00117',
    'BAD_REQUEST:newName': '00117',
    'BAD_REQUEST:same': '00118',
    NOT_FOUND: '00119',
    'NOT_FOUND:unit': '00119',
    CONFLICT: '00113',
  },
  'DELETE /admin/unit': {
    OK: ['00128', 'Xóa đơn vị thành công'],
    'BAD_REQUEST:missing': '00123',
    'BAD_REQUEST:name': '00123',
    NOT_FOUND: '00125',
    'NOT_FOUND:unit': '00125',
  },
  // #23 System logs
  'GET /admin/logs': { OK: ['00109', 'Lấy nhật ký hệ thống thành công'] },

  // #24 Create food
  'POST /food': {
    OK: ['00160', 'Tạo thực phẩm thành công'],
    'BAD_REQUEST:missing': '00147',
    'BAD_REQUEST:name': '00148',
    'BAD_REQUEST:missing:categoryName': '00149',
    'BAD_REQUEST:categoryName': '00149',
    'BAD_REQUEST:missing:unitName': '00150',
    'BAD_REQUEST:unitName': '00150',
    CONFLICT: '00151',
    'NOT_FOUND:unit': '00153',
    'NOT_FOUND:category': '00155',
    NO_GROUP: '00156',
  },
  // #25 Update food
  'PUT /food': {
    OK: ['00178', 'Sửa thực phẩm thành công'],
    'BAD_REQUEST:missing': '00161',
    'BAD_REQUEST:name': '00162',
    'BAD_REQUEST:need': '00163',
    'BAD_REQUEST:newCategory': '00164',
    'BAD_REQUEST:newUnit': '00165',
    'BAD_REQUEST:newName': '00166',
    NOT_FOUND: '00167',
    FORBIDDEN: '00167',
    'NOT_FOUND:unit': '00169',
    'NOT_FOUND:category': '00171',
    CONFLICT: '00173',
  },
  // #26 Delete food
  'DELETE /food': {
    OK: ['00184', 'Xóa thực phẩm thành công'],
    'BAD_REQUEST:missing': '00179',
    'BAD_REQUEST:name': '00179',
    NOT_FOUND: '00180',
    FORBIDDEN: '00181',
  },
  // #27 Get foods, #28 units, #29 categories
  'GET /food': { OK: ['00188', 'Lấy danh sách thực phẩm thành công'], NO_GROUP: '00185' },
  'GET /food/unit': { OK: ['00110', 'Lấy danh sách đơn vị thành công'] },
  'GET /food/category': { OK: ['00129', 'Lấy danh sách category thành công'] },

  // #30 Create fridge item
  'POST /fridge': {
    OK: ['00202', 'Thêm vào tủ lạnh thành công'],
    'BAD_REQUEST:foodName': '00190',
    'BAD_REQUEST:quantity': '00192',
    'BAD_REQUEST:note': '00193',
    'NOT_FOUND:food': '00194',
    NO_GROUP: '00196',
  },
  // #31 Update fridge item
  'PUT /fridge': {
    OK: ['00216', 'Cập nhật món trong tủ lạnh thành công'],
    'BAD_REQUEST:missing': '00203',
    'BAD_REQUEST:itemId': '00204',
    'BAD_REQUEST:need': '00204',
    'BAD_REQUEST:newQuantity': '00206',
    'BAD_REQUEST:newNote': '00207',
    'BAD_REQUEST:newFoodName': '00207',
    NO_GROUP: '00210',
    NOT_FOUND: '00213',
    'NOT_FOUND:food': '00214',
  },
  // #32 Delete fridge item
  'DELETE /fridge': {
    OK: ['00224', 'Xóa món trong tủ lạnh thành công'],
    'BAD_REQUEST:missing': '00217',
    'BAD_REQUEST:foodName': '00217',
    'NOT_FOUND:food': '00218',
    NOT_FOUND: '00221',
  },
  // #33 Get fridge items, #34 Get specific item
  'GET /fridge': { OK: ['00228', 'Lấy danh sách đồ trong tủ lạnh thành công'], NO_GROUP: '00225' },
  'GET /fridge/:foodName': {
    OK: ['00237', 'Lấy món trong tủ lạnh thành công'],
    'BAD_REQUEST:missing': '00229',
    'BAD_REQUEST:foodName': '00229',
    'NOT_FOUND:food': '00230',
    NOT_FOUND: '00234',
  },

  // #35 Create shopping list
  'POST /shopping': {
    OK: ['00249', 'Tạo danh sách mua sắm thành công'],
    'BAD_REQUEST:missing': '00238',
    'BAD_REQUEST:missing:name': '00239',
    'BAD_REQUEST:name': '00239',
    'BAD_REQUEST:note': '00241',
    'BAD_REQUEST:date': '00242',
    'NOT_FOUND:assignee': '00245',
    'FORBIDDEN:assign': '00246',
  },
  // #36 Update shopping list
  'PUT /shopping': {
    OK: ['00266', 'Cập nhật danh sách mua sắm thành công'],
    'BAD_REQUEST:missing': '00250',
    'BAD_REQUEST:listId': '00251',
    'BAD_REQUEST:need': '00252',
    'BAD_REQUEST:newName': '00253',
    'BAD_REQUEST:newAssignToUsername': '00254',
    'BAD_REQUEST:newNote': '00255',
    'BAD_REQUEST:newDate': '00256',
    NOT_FOUND: '00260',
    FORBIDDEN: '00261',
    'NOT_FOUND:assignee': '00262',
    'FORBIDDEN:assign': '00263',
  },
  // #37 Delete shopping list
  'DELETE /shopping': {
    OK: ['00275', 'Xóa danh sách mua sắm thành công'],
    'BAD_REQUEST:missing': '00267',
    'BAD_REQUEST:listId': '00268',
    NOT_FOUND: '00272',
    FORBIDDEN: '00273',
  },
  // #38 Create tasks
  'POST /shopping/task': {
    OK: ['00287', 'Thêm nhiệm vụ thành công'],
    'BAD_REQUEST:missing': '00276',
    'BAD_REQUEST:missing:listId': '00277',
    'BAD_REQUEST:listId': '00277',
    'BAD_REQUEST:missing:tasks': '00278',
    'BAD_REQUEST:tasks': '00279',
    NOT_FOUND: '00283',
    FORBIDDEN: '00284',
    'FORBIDDEN:assign': '00284',
    'NOT_FOUND:food': '00285',
    CONFLICT: '00285',
  },
  // #39 Get tasks
  'GET /shopping/task': { OK: ['00292', 'Lấy danh sách nhiệm vụ thành công'], NO_GROUP: '00288' },
  // #40 Delete task
  'DELETE /shopping/task': {
    OK: ['00299', 'Xóa nhiệm vụ thành công'],
    'BAD_REQUEST:missing': '00293',
    'BAD_REQUEST:taskId': '00294',
    NOT_FOUND: '00296',
    FORBIDDEN: '00297',
  },
  // #41 Update task
  'PUT /shopping/task': {
    OK: ['00312', 'Cập nhật nhiệm vụ thành công'],
    'BAD_REQUEST:missing': '00300',
    'BAD_REQUEST:taskId': '00301',
    'BAD_REQUEST:need': '00302',
    'BAD_REQUEST:newFoodName': '00303',
    'BAD_REQUEST:newQuantity': '00304',
    NOT_FOUND: '00306',
    FORBIDDEN: '00307',
    'FORBIDDEN:assign': '00307',
    'NOT_FOUND:food': '00308',
    CONFLICT: '00309',
  },

  // #42 Create meal plan
  'POST /meal': {
    OK: ['00322', 'Thêm kế hoạch bữa ăn thành công'],
    'BAD_REQUEST:missing': '00313',
    'BAD_REQUEST:foodName': '00314',
    'BAD_REQUEST:date': '00315',
    'BAD_REQUEST:mealType': '00316',
    'NOT_FOUND:food': '00317',
  },
  // #43 Delete meal plan
  'DELETE /meal': {
    OK: ['00330', 'Xóa kế hoạch bữa ăn thành công'],
    'BAD_REQUEST:missing': '00323',
    'BAD_REQUEST:planId': '00324',
    NOT_FOUND: '00325',
  },
  // #44 Update meal plan
  'PUT /meal': {
    OK: ['00344', 'Cập nhật kế hoạch bữa ăn thành công'],
    'BAD_REQUEST:missing': '00331',
    'BAD_REQUEST:missing:planId': '00332',
    'BAD_REQUEST:planId': '00332',
    'BAD_REQUEST:need': '00333',
    'BAD_REQUEST:newFoodName': '00334',
    'BAD_REQUEST:newDate': '00335',
    'BAD_REQUEST:newMealType': '00336',
    NOT_FOUND: '00337',
    'NOT_FOUND:food': '00341',
  },
  // #45 Get meal plans by date
  'GET /meal': { OK: ['00348', 'Lấy kế hoạch bữa ăn thành công'], NO_GROUP: '00345' },

  // #46 Create recipe
  'POST /recipe': {
    OK: ['00357', 'Thêm công thức thành công'],
    'BAD_REQUEST:missing': '00349',
    'BAD_REQUEST:foodName': '00350',
    'BAD_REQUEST:name': '00351',
    'BAD_REQUEST:description': '00352',
    'BAD_REQUEST:htmlContent': '00353',
    'NOT_FOUND:food': '00354',
  },
  // #47 Update recipe
  'PUT /recipe': {
    OK: ['00370', 'Cập nhật công thức thành công'],
    'BAD_REQUEST:missing': '00358',
    'BAD_REQUEST:missing:recipeId': '00359',
    'BAD_REQUEST:recipeId': '00359',
    'BAD_REQUEST:need': '00360',
    'BAD_REQUEST:newFoodName': '00361',
    'BAD_REQUEST:newDescription': '00362',
    'BAD_REQUEST:newHtmlContent': '00363',
    'BAD_REQUEST:newName': '00364',
    NOT_FOUND: '00365',
    'NOT_FOUND:food': '00367',
  },
  // #48 Delete recipe
  'DELETE /recipe': {
    OK: ['00376', 'Xóa công thức thành công'],
    'BAD_REQUEST:missing': '00371',
    'BAD_REQUEST:recipeId': '00372',
    NOT_FOUND: '00373',
  },
  // #49 Get recipes by food
  'GET /recipe': { OK: ['00378', 'Lấy danh sách công thức thành công'] },
});

/**
 * Chọn mã (và message mặc định) cho một response.
 * @param {string | null} route 'METHOD /path' (req.method + req.route.path), null khi không khớp route nào
 * @param {keyof typeof CODES} key
 * @param {string[]} [reasons] thử lần lượt; '*' = mã của key không kèm reason. Không truyền thì dùng mã của key.
 * @returns {{ code: string, message: string }}
 */
export function resolveCode(route, key, reasons = []) {
  const entry = CODES[key];
  const profile = route ? API_CODES[route] : null;
  if (profile) {
    const base = key === 'CREATED' ? 'OK' : key;
    const names = reasons.length ? reasons.map((r) => (r === '*' ? base : `${base}:${r}`)) : [base];
    const hit = names.map((n) => profile[n]).find(Boolean);
    if (Array.isArray(hit)) return { code: hit[0], message: hit[1] };
    if (hit) return { code: hit, message: entry.message };
  }
  return { code: entry.code, message: entry.message };
}
