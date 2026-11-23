# Tài liệu API backend

Bản tương tác: `GET /it4788/docs` (Swagger UI), `GET /it4788/openapi.json`; Postman: `docs/postman_collection.json`.

Mọi API nằm dưới `/it4788`, nhận JSON (API có ảnh nhận `multipart/form-data`, ảnh ở trường `image`, tối đa 5 MB)
và trả về:

```json
{ "code": "00000", "message": "Thành công", "data": { } }
```

- **Auth**: `Bearer` = gửi header `Authorization: Bearer <accessToken>`. `Nhóm` = phải đang ở một nhóm gia đình.
  `Trưởng nhóm`, `Admin` = thêm điều kiện quyền.
- Body ghi theo tên trường của **tài liệu API môn học**. Cột "Bí danh" là tên khác server cũng nhận (app nhánh
  `fe-tien` đang dùng các tên này).
- DELETE nhận tham số trong body hoặc query string.
- Thực phẩm được gọi theo tên (`foodName`, không phân biệt hoa thường) hoặc `foodId`.
- Số lượng nhận số hoặc chuỗi (`"10"`, `"1,5"`). Ngày nhận `YYYY-MM-DD`, chuỗi ISO hoặc timestamp.
- Mọi object trả về có `id`, kèm tên trường tài liệu dùng (`listId`, `taskId`, `planId`, `recipeId`, `itemId`).
- Số thứ tự: 1–49 theo tài liệu API môn học, 50–55 là API mở rộng trong sheet, 56–66 *(đề bài)* là API thêm để
  phủ các chức năng còn thiếu trong đề bài IT4788 (công thức yêu thích, dùng lại danh sách, nấu từ tủ lạnh,
  rời nhóm, hộp thư thông báo, admin quản lý thực phẩm chung và cấu hình).

## Bảng mã response

Mã lấy theo bảng mã trong file mô tả API của môn ("20261 - Mo ta API chu de bai tap lon IT4788"). Mỗi API
trong tài liệu có mã thành công và mã lỗi riêng, ví dụ `00287` là Create tasks thành công, còn `00281` là
"không phải trưởng nhóm" của chính API đó. Khai báo trong `src/utils/codes.js` (`API_CODES` theo route);
controller và service chỉ dùng tên (`NOT_FOUND`, `FORBIDDEN`...), server tự chọn mã đúng theo API.

App kiểm tra thành công bằng HTTP status (2xx), không so mã, vì mỗi API một mã thành công.
Lỗi kiểm tra dữ liệu luôn có `data.errors: [{ field, message }]`.

### Mã chung

Dùng cho mọi API khi tài liệu không có mã riêng cho trường hợp đó, và cho API ngoài tài liệu (#50–66, thành công
là `00000`). Dải `009xx` là mã riêng của nhóm (tài liệu không có trường hợp tương ứng).

| Mã | HTTP | Tên | Ý nghĩa |
| --- | --- | --- | --- |
| `00000` | 200 | OK | Thành công |
| `00000` | 201 | CREATED | Tạo thành công |
| `00006` | 401 | NO_TOKEN | Truy cập bị từ chối. Không có token được cung cấp |
| `00008` | 500 | INTERNAL_ERROR | Đã xảy ra lỗi máy chủ nội bộ, vui lòng thử lại |
| `00011` | 401 | SESSION_EXPIRED | Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại |
| `00012` | 401 | UNAUTHORIZED | Token không hợp lệ |
| `00017` | 403 | FORBIDDEN | Bạn không có quyền thực hiện thao tác này |
| `00019` | 403 | ADMIN_ONLY | Truy cập bị từ chối. Chỉ quản trị viên được dùng chức năng này |
| `00024` | 429 | RATE_LIMITED | Gửi yêu cầu quá nhiều, vui lòng thử lại sau |
| `00032` | 409 | EMAIL_EXISTS | Email đã được đăng ký |
| `00044` | 403 | EMAIL_NOT_CONFIRMED | Email chưa được xác minh |
| `00045` | 401 | INVALID_CREDENTIALS | Email hoặc mật khẩu không đúng |
| `00054` | 400 | INVALID_CODE | Mã xác minh không đúng hoặc đã hết hạn |
| `00072` | 400 | WRONG_PASSWORD | Mật khẩu cũ không đúng |
| `00084` | 409 | USERNAME_EXISTS | Tên đăng nhập đã tồn tại |
| `00093` | 409 | ALREADY_IN_GROUP | Người dùng đã ở trong một nhóm |
| `00096` | 403 | NO_GROUP | Bạn chưa thuộc nhóm gia đình nào |
| `00900` | 400 | BAD_REQUEST | Dữ liệu gửi lên không hợp lệ |
| `00903` | 403 | ACCOUNT_BLOCKED | Tài khoản đã bị khóa |
| `00904` | 404 | NOT_FOUND | Không tìm thấy dữ liệu |
| `00905` | 404 | ROUTE_NOT_FOUND | Không tìm thấy API |
| `00909` | 409 | CONFLICT | Dữ liệu đã tồn tại hoặc không ở trạng thái phù hợp |
| `00910` | 409 | IN_USE | Dữ liệu đang được sử dụng, không thể xóa |

`00006`: thiếu token. `00011`: access token hết hạn, app gọi Refresh token rồi thử lại. `00012`: token sai
(đã đăng xuất, đổi mật khẩu...). Thực phẩm sai tên thì `data.suggestions` gợi ý tên gần giống.

### Mã riêng của 49 API trong tài liệu

| # | API | Thành công | Lỗi |
| --- | --- | --- | --- |
| 1 | `POST user/login/` | 00047 | 00038 thiếu trường; 00039 `email` sai; 00040 `password` sai; 00044 chưa xác minh email; 00045 sai email/mật khẩu |
| 2 | `POST user/` | 00035 | 00025 thiếu trường; 00026 `email` sai; 00027 `password` sai; 00028 `name` sai; 00032 email đã có |
| 3 | `POST user/logout/` | 00050 |  |
| 4 | `POST user/refresh-token/` | 00065 | 00059 thiếu trường, `refreshToken` sai; 00062 token hết hạn; 00063 token không hợp lệ |
| 5 | `POST user/send-verification-code/` | 00048 | 00005 thiếu trường, `email` sai |
| 6 | `POST user/verify-email/` | 00058 | 00053 thiếu trường; 00054 `code` sai, mã sai; 00055 token sai |
| 7 | `POST user/change-password/` | 00076 | 00069 thiếu trường, `oldPassword` sai, `newPassword` sai; 00072 mật khẩu cũ sai; 00073 trùng giá trị cũ |
| 8 | `PUT user/` | 00086 | 00077 `name` sai; 00079 `language` sai; 00081 `username` sai; 00084 username đã có |
| 9 | `POST user/group/` | 00095 | 00093 đã ở nhóm |
| 10 | `POST user/group/add/` | 00102 | 00099 đã ở nhóm, không tìm thấy; 00100 thiếu trường, `username` sai; 00101 không có quyền |
| 11 | `DELETE user/group/` | 00106 | 00103 không tìm thấy; 00104 không có quyền; 00107 thiếu trường, `username` sai |
| 12 | `GET user/group/` | 00098 | 00096 chưa vào nhóm |
| 13 | `GET user/` | 00089 |  |
| 14 | `DELETE user/` | 00092 |  |
| 15 | `POST admin/category/` | 00135 | 00131 thiếu trường, `name` sai; 00132 trùng |
| 16 | `GET admin/category/` | 00129 |  |
| 17 | `PUT admin/category/` | 00141 | 00136 thiếu trường, `oldName` sai, `newName` sai; 00137 trùng giá trị cũ; 00138 không tìm thấy, không có category, trùng |
| 18 | `DELETE admin/category/` | 00146 | 00142 thiếu trường, `name` sai; 00143 không tìm thấy, không có category |
| 19 | `POST admin/unit/` | 00116 | 00112 thiếu trường, `name` sai; 00113 trùng |
| 20 | `GET admin/unit/` | 00110 |  |
| 21 | `PUT admin/unit/` | 00122 | 00117 thiếu trường, `oldName` sai, `newName` sai; 00118 trùng giá trị cũ; 00119 không tìm thấy, không có đơn vị; 00113 trùng |
| 22 | `DELETE admin/unit/` | 00128 | 00123 thiếu trường, `name` sai; 00125 không tìm thấy, không có đơn vị |
| 23 | `GET admin/logs/` | 00109 |  |
| 24 | `POST food/` | 00160 | 00147 thiếu trường; 00148 `name` sai; 00149 thiếu `categoryName`, `categoryName` sai; 00150 thiếu `unitName`, `unitName` sai; 00151 trùng; 00153 không có đơn vị; 00155 không có category; 00156 chưa vào nhóm |
| 25 | `PUT food/` | 00178 | 00161 thiếu trường; 00162 `name` sai; 00163 không có gì để sửa; 00164 `newCategory` sai; 00165 `newUnit` sai; 00166 `newName` sai; 00167 không tìm thấy, không có quyền; 00169 không có đơn vị; 00171 không có category; 00173 trùng |
| 26 | `DELETE food/` | 00184 | 00179 thiếu trường, `name` sai; 00180 không tìm thấy; 00181 không có quyền |
| 27 | `GET food/` | 00188 | 00185 chưa vào nhóm |
| 28 | `GET food/unit/` | 00110 |  |
| 29 | `GET food/category/` | 00129 |  |
| 30 | `POST fridge/` | 00202 | 00190 `foodName` sai; 00192 `quantity` sai; 00193 `note` sai; 00194 không có thực phẩm; 00196 chưa vào nhóm |
| 31 | `PUT fridge/` | 00216 | 00203 thiếu trường; 00204 `itemId` sai, không có gì để sửa; 00206 `newQuantity` sai; 00207 `newNote` sai, `newFoodName` sai; 00210 chưa vào nhóm; 00213 không tìm thấy; 00214 không có thực phẩm |
| 32 | `DELETE fridge/` | 00224 | 00217 thiếu trường, `foodName` sai; 00218 không có thực phẩm; 00221 không tìm thấy |
| 33 | `GET fridge/` | 00228 | 00225 chưa vào nhóm |
| 34 | `GET fridge/Trứng gà/` | 00237 | 00229 thiếu trường, `foodName` sai; 00230 không có thực phẩm; 00234 không tìm thấy |
| 35 | `POST shopping/` | 00249 | 00238 thiếu trường; 00239 thiếu `name`, `name` sai; 00241 `note` sai; 00242 `date` sai; 00245 người được giao không thuộc nhóm; 00246 không được giao cho người khác |
| 36 | `PUT shopping/` | 00266 | 00250 thiếu trường; 00251 `listId` sai; 00252 không có gì để sửa; 00253 `newName` sai; 00254 `newAssignToUsername` sai; 00255 `newNote` sai; 00256 `newDate` sai; 00260 không tìm thấy; 00261 không có quyền; 00262 người được giao không thuộc nhóm; 00263 không được giao cho người khác |
| 37 | `DELETE shopping/` | 00275 | 00267 thiếu trường; 00268 `listId` sai; 00272 không tìm thấy; 00273 không có quyền |
| 38 | `POST shopping/task/` | 00287 | 00276 thiếu trường; 00277 thiếu `listId`, `listId` sai; 00278 thiếu `tasks`; 00279 `tasks` sai; 00283 không tìm thấy; 00284 không có quyền, không được giao cho người khác; 00285 không có thực phẩm, trùng |
| 39 | `GET shopping/task/` | 00292 | 00288 chưa vào nhóm |
| 40 | `DELETE shopping/task/` | 00299 | 00293 thiếu trường; 00294 `taskId` sai; 00296 không tìm thấy; 00297 không có quyền |
| 41 | `PUT shopping/task/` | 00312 | 00300 thiếu trường; 00301 `taskId` sai; 00302 không có gì để sửa; 00303 `newFoodName` sai; 00304 `newQuantity` sai; 00306 không tìm thấy; 00307 không có quyền, không được giao cho người khác; 00308 không có thực phẩm; 00309 trùng |
| 42 | `POST meal/` | 00322 | 00313 thiếu trường; 00314 `foodName` sai; 00315 `date` sai; 00316 `mealType` sai; 00317 không có thực phẩm |
| 43 | `DELETE meal/` | 00330 | 00323 thiếu trường; 00324 `planId` sai; 00325 không tìm thấy |
| 44 | `PUT meal/` | 00344 | 00331 thiếu trường; 00332 thiếu `planId`, `planId` sai; 00333 không có gì để sửa; 00334 `newFoodName` sai; 00335 `newDate` sai; 00336 `newMealType` sai; 00337 không tìm thấy; 00341 không có thực phẩm |
| 45 | `GET meal/` | 00348 | 00345 chưa vào nhóm |
| 46 | `POST recipe/` | 00357 | 00349 thiếu trường; 00350 `foodName` sai; 00351 `name` sai; 00352 `description` sai; 00353 `htmlContent` sai; 00354 không có thực phẩm |
| 47 | `PUT recipe/` | 00370 | 00358 thiếu trường; 00359 thiếu `recipeId`, `recipeId` sai; 00360 không có gì để sửa; 00361 `newFoodName` sai; 00362 `newDescription` sai; 00363 `newHtmlContent` sai; 00364 `newName` sai; 00365 không tìm thấy; 00367 không có thực phẩm |
| 48 | `DELETE recipe/` | 00376 | 00371 thiếu trường; 00372 `recipeId` sai; 00373 không tìm thấy |
| 49 | `GET recipe/` | 00378 |  |

## 1. Xác thực

| # | API | Auth | Body | Bí danh | Trả về (`data`) |
| --- | --- | --- | --- | --- | --- |
| 1 | `POST user/login/` | | `email`, `password`, `deviceId?` (FCM token) | `fcmToken` | `accessToken`, `refreshToken`, `expiresIn`, `user` |
| 2 | `POST user/` | | `email`, `password` (6–20), `name?`, `username?`, `language?`, `deviceId?` | `fullName` | `user`, `token` (dùng ở Verify email), `needVerification` |
| 3 | `POST user/logout/` | Bearer (không bắt buộc) | | | `null` |
| 4 | `POST user/refresh-token/` | | `refreshToken` | | token mới |
| 5 | `POST user/send-verification-code/` | | `email` | | `{ email }` |
| 6 | `POST user/verify-email/` | | `code` (6 số), `token` (từ Register) hoặc `email` | | `{ email, verified }` |

## 2. Tài khoản

| # | API | Auth | Body | Trả về |
| --- | --- | --- | --- | --- |
| 7 | `POST user/change-password/` | Bearer | `oldPassword`, `newPassword` | `null`; mọi token cũ hết hiệu lực |
| 8 | `PUT user/` | Bearer | form-data: `name?`, `username?`, `language?`, `image?` | `user` |
| 13 | `GET user/` | Bearer | | `user` (kèm `group`) |
| 14 | `DELETE user/` | Bearer | | `null`; trưởng nhóm rời đi thì thành viên cũ nhất lên thay |
| 50 | `PUT user/device/` *(mở rộng)* | Bearer | `token` (FCM), `platform?` (`android`/`ios`/`web`) | thiết bị |

## 3. Nhóm gia đình

| # | API | Auth | Body | Trả về |
| --- | --- | --- | --- | --- |
| 9 | `POST user/group/` | Bearer | `name?` | `{ group, members }`; người tạo là trưởng nhóm |
| 10 | `POST user/group/add/` | Trưởng nhóm | `username` (hoặc email) | `{ group, members }` |
| 11 | `DELETE user/group/` | Trưởng nhóm | `username` | `{ group, members }` |
| 12 | `GET user/group/` | Nhóm | | `{ group, members }` |
| 61 | `POST user/group/leave/` *(đề bài)* | Nhóm | | `null`; trưởng nhóm rời thì thành viên vào sớm nhất lên thay, không còn ai thì nhóm được lưu trữ |
| 62 | `PUT user/group/leader/` *(đề bài)* | Trưởng nhóm | `username` (hoặc email) của một thành viên | `{ group, members }`; người cũ thành thành viên |

Thành viên rời nhóm hoặc bị xóa: mặt hàng chưa mua và danh sách đang giao cho người đó chuyển sang trưởng nhóm.

## 4, 5. Admin

| # | API | Auth | Body / query | Trả về |
| --- | --- | --- | --- | --- |
| 15 | `POST admin/category/` | Admin | `name`, `description?` | category |
| 16 | `GET admin/category/` | Admin | | danh sách |
| 17 | `PUT admin/category/` | Admin | `oldName`, `newName` | category |
| 18 | `DELETE admin/category/` | Admin | `name` | `null` (`IN_USE` nếu còn thực phẩm) |
| 19–22 | `admin/unit/` | Admin | như category; `code?` khi tạo (tự sinh nếu bỏ trống) | unit |
| 23 | `GET admin/logs/` | Admin | `?page&limit&userId&method&status&from&to` | `{ total, logs }` |
| 53 | `GET admin/user/` *(mở rộng)* | Admin | `?q&status&page&limit` | `{ total, users }` |
| 53 | `PUT admin/user/` *(mở rộng)* | Admin | `userId` hoặc `email`, `status` (`active`/`blocked`, hoặc `block`/`unblock`) | `user` |
| 65 | `GET admin/food/` *(đề bài)* | Admin | `?q&category&scope` (`global` mặc định, `all` = cả món riêng của các nhóm) | danh sách food |
| 65 | `POST admin/food/` *(đề bài)* | Admin | như `POST food/`, tạo vào danh mục chung | food (`isGlobal: true`) |
| 65 | `PUT admin/food/` *(đề bài)* | Admin | như `PUT food/`, sửa món trong danh mục chung | food |
| 65 | `DELETE admin/food/` *(đề bài)* | Admin | `name` | `null` |
| 66 | `GET admin/config/` *(đề bài)* | Admin | | `[{ key, name, value, defaultValue, isDefault, description }]` |
| 66 | `PUT admin/config/` *(đề bài)* | Admin | `{ expiryDays: 5 }` (nhiều khóa một lần) hoặc `{ key, value }`; `null` = về mặc định | như GET |

Cấu hình hiện có: `expiry_days` (nhắc trước bao nhiêu ngày, 0–30, mặc định `EXPIRY_DAYS` = 3),
`log_retention_days` (1–365, mặc định 30), `suggest_limit` (số món gợi ý mặc định, 1–50, mặc định 10).

## 6. Thực phẩm

Danh mục chung (seed, admin quản lý qua `admin/food/`) dùng cho mọi nhóm; mỗi nhóm thêm được món riêng.
Món chung không sửa/xóa được từ app. Tìm kiếm không phân biệt dấu: `?q=thit ga` thấy "Thịt gà".

| # | API | Auth | Body | Bí danh | Trả về |
| --- | --- | --- | --- | --- | --- |
| 24 | `POST food/` | Nhóm | form-data: `name`, `foodCategoryName`, `unitName`, `units?`, `image?` | `categoryName`, `unit` | food |
| 25 | `PUT food/` | Nhóm | `name`, `newName?`, `newCategory?`, `newUnit?`, `units?`, `image?` | `newCategoryName`, `newUnitName` | food |
| 26 | `DELETE food/` | Nhóm | `name` | | `null` |
| 27 | `GET food/` | Nhóm | `?q` (tên), `?category` | | `{ foods, categories, units }` |
| 28 | `GET food/unit/` | Bearer | | | danh sách unit |
| 29 | `GET food/category/` | Bearer | | | danh sách category |

`units` (đơn vị phụ): `[{ unitName: 'gói', factor: 6 }]` nghĩa là 1 gói = 6 đơn vị gốc (form-data gửi chuỗi JSON).
Food trả về có `units: [{ unitName, factor }]` (gồm cả đơn vị gốc, `factor` 1) và `isGlobal`.

## 7. Tủ lạnh

Số lượng lưu theo đơn vị gốc của thực phẩm; gửi `unit` khác thì server quy đổi (vd. 1 `hộp` trứng = 10 `quả`).
Nơi để: `fridge`/`freezer`/`pantry` hoặc `Tủ lạnh`/`Ngăn đông`/`Tủ bếp`.

| # | API | Auth | Body | Bí danh | Trả về |
| --- | --- | --- | --- | --- | --- |
| 30 | `POST fridge/` | Nhóm | `foodName` hoặc `foodId`, `quantity`, `unit?`, `useWithin?` (số ngày) hoặc `expiryDate?`, `storageLocation?`, `note?` | `location`, `unitName` | item |
| 31 | `PUT fridge/` | Nhóm | `itemId`, `newQuantity?`, `newUnit?`, `newUseWithin?`/`newExpiryDate?`, `newNote?`, `newStorageLocation?`, `newFoodName?` | `id` | item |
| 32 | `DELETE fridge/` | Nhóm | `foodName` (mọi món của thực phẩm đó) hoặc `itemId` | | `{ deleted: [id] }` |
| 33 | `GET fridge/` | Nhóm | `?q&category&location` (`q` không phân biệt dấu) | | danh sách, hạn gần nhất trước |
| 34 | `GET fridge/:foodName/` | Nhóm | | | danh sách của thực phẩm đó |

Item: `id`, `foodId`, `foodName`, `quantity`, `unitName`, `expiryDate`, `useWithin` (còn bao nhiêu ngày),
`status` (`fresh` / `expiring` ≤ 3 ngày / `expired` / `unknown`), `storageLocation` (nhãn), `storageCode`, `note`.
Header `Idempotency-Key` trên `POST fridge/`: gửi lại cùng khóa không thêm trùng.

## 8. Mua sắm

Một "task" = một mặt hàng trong danh sách + người được giao. Thêm món mới mặc định giao cho người phụ trách danh sách.
Mọi thành viên thêm / sửa món được, nhưng chỉ trưởng nhóm hoặc người tạo danh sách giao việc cho người khác
(thành viên chỉ tự nhận việc, không thì `00284` ở Create tasks, `00307` ở Update task). Danh sách đã lưu trữ (`status: archived`) không thêm món được:
sao chép để dùng lại. Món đã mua thì không đổi món / số lượng / đơn vị (`00909`) cho tới khi bỏ đánh dấu
(gửi kèm `isDone: false` trong cùng lần `PUT shopping/task/` cũng được).

| # | API | Auth | Body / query | Bí danh | Trả về |
| --- | --- | --- | --- | --- | --- |
| 35 | `POST shopping/` | Nhóm | `name`, `assignToUsername?`, `date?`, `note?` | `title`, `assignedTo` | list |
| 36 | `PUT shopping/` | Trưởng nhóm / người tạo | `listId`, `newName?`, `newAssignToUsername?`, `newDate?`, `newNote?`, `status?` | | list |
| 37 | `DELETE shopping/` | Trưởng nhóm / người tạo | `listId` | | `{ listId }` |
| 38 | `POST shopping/task/` | Nhóm | `listId`, `tasks: [{ foodName, quantity, unit? }]` | | các task; trùng món thì không thêm món nào |
| 39 | `GET shopping/task/` | Nhóm | `?listId&mine&status` | | danh sách task |
| 40 | `DELETE shopping/task/` | Trưởng nhóm / người tạo | `taskId` | | `{ taskId }` |
| 41 | `PUT shopping/task/` | Nhóm | `taskId`, `newFoodName?`, `newQuantity?`, `newUnit?`, `newAssignToUsername?`, `isDone?` | | task |
| 51 | `GET shopping/` *(mở rộng)* | Nhóm | `?status&date&mine` | | các list kèm `tasks` |
| 52 | `PUT shopping/task/done/` *(mở rộng)* | Nhóm | `taskId`, `done?` (mặc định `true`, `false` = hoàn tác), `expiryDate?`, `storageLocation?`, `totalCost?` | | task; món được cộng vào tủ lạnh |
| 59 | `POST shopping/copy/` *(đề bài)* | Nhóm | `listId`, `newName?`, `date?`, `assignToUsername?` | `id`, `name`, `shoppingDate` | list mới (mã tạo mới), mọi món chưa mua; `skippedFoods` nếu có thực phẩm đã bị xóa |

## 9. Bữa ăn

Một mục có thể là thực phẩm (`foodName`), công thức (`recipeId`) hoặc tên món tự do (`mealName`).
Bữa: `breakfast`/`lunch`/`dinner` hoặc `sáng`/`trưa`/`tối`/`Bữa sáng`...

| # | API | Auth | Body / query | Bí danh | Trả về |
| --- | --- | --- | --- | --- | --- |
| 42 | `POST meal/` | Nhóm | `foodName?`/`recipeId?`/`mealName?`, `timestamp` (ngày), `name` (bữa) | `date`, `mealType` | plan |
| 43 | `DELETE meal/` | Nhóm | `planId` | | `{ planId }` |
| 44 | `PUT meal/` | Nhóm | `planId`, `newFoodName?`, `newRecipeId?`, `newMealName?`, `newName?` (bữa), `newTimestamp?` | | plan. Không có `planId` thì tạo mới (app hiện gọi như vậy) |
| 45 | `GET meal/` | Nhóm | `?date` (mặc định hôm nay) hoặc `?from&to` (xem theo tuần, tối đa 62 ngày) | | các plan theo bữa |
| 60 | `POST meal/cook/` *(đề bài)* | Nhóm | `planId`, `force?`, `quantity?` + `unit?` (khi món là thực phẩm) | `id`, `mealId` | `{ meal, used, missing }` |

`POST meal/cook/`: đánh dấu đã nấu và trừ nguyên liệu khỏi tủ lạnh (món hết hạn sớm dùng trước), ghi vào thống kê
tiêu thụ. Món là công thức: lượng theo khẩu phần (`servings` của plan / `servings` của công thức). Thiếu nguyên liệu
bắt buộc thì trả `00900` với `data.missing: [{ foodName, unitName, need, have }]`; gửi `force: true` để vẫn nấu với
phần đang có. Nấu lần hai: `00909`. Xóa món đã nấu chỉ hủy mục đó, lịch sử tiêu thụ giữ nguyên.

## 10. Công thức

| # | API | Auth | Body / query | Bí danh | Trả về |
| --- | --- | --- | --- | --- | --- |
| 46 | `POST recipe/` | Nhóm | `name`, `foodName?` (nguyên liệu chính), `htmlContent`, `description?`, `servings?`, `prepMinutes?`, `cookMinutes?`, `ingredients?` | `title`, `content`, `duration` | recipe |
| 47 | `PUT recipe/` | Nhóm | `recipeId`, `newName?`, `newHtmlContent?`, `newDescription?`, `newFoodName?`, `newIngredients?` | | recipe |
| 48 | `DELETE recipe/` | Nhóm | `recipeId` | | `{ recipeId }` |
| 49 | `GET recipe/` | Nhóm | `?foodId` (bỏ trống = tất cả), `?q` (không phân biệt dấu), `?favorite=true` | | danh sách, mỗi món có `isFavorite` |
| 54 | `GET recipe/suggest/` *(mở rộng)* | Nhóm | `?limit` (mặc định theo cấu hình `suggest_limit`) | | công thức xếp theo tỉ lệ nguyên liệu có sẵn, ưu tiên đồ sắp hết hạn, rồi món yêu thích |
| 55 | `GET report/` *(mở rộng)* | Nhóm | `?from&to` (mặc định đầu tháng → hôm nay) | | tổng hợp mua / thêm / dùng / bỏ theo thực phẩm |
| 56 | `POST recipe/favorite/` *(đề bài)* | Nhóm | `recipeId` | `id` | recipe (`isFavorite: true`); gọi lại không lỗi |
| 57 | `DELETE recipe/favorite/` *(đề bài)* | Nhóm | `recipeId` | `id` | `{ recipeId, isFavorite: false }` |
| 58 | `GET recipe/favorite/` *(đề bài)* | Nhóm | `?q&foodId` | | công thức yêu thích của người gọi, mới thích trước |

Thống kê: lần "đã mua" bị bỏ đánh dấu không được tính (mua lại không bị gấp đôi số lượng và chi phí).
`from` sau `to` trả `00900`.

`ingredients`: `[{ foodName, quantity, unit?, optional? }]` (form-data gửi dạng chuỗi JSON).

## Nhắc hết hạn

Job hằng ngày (8:00 giờ Việt Nam) ghi thông báo cho đồ còn ≤ 3 ngày và đồ đã hết hạn hôm qua vào bảng
`notifications` cho mọi thành viên nhóm. Worker mỗi phút gửi FCM tới các token đã đăng ký qua `PUT user/device/`,
thử lại tối đa 3 lần, xóa token không còn hợp lệ. Payload `data` của thông báo: `type`, `fridgeItemId`, `notificationId`.
Lúc gửi, server kiểm tra lại: món đã dùng hết, đã gia hạn ra ngoài khoảng nhắc, hoặc người nhận đã rời nhóm thì hủy.
Số ngày nhắc trước do admin chỉnh (`PUT admin/config/`, `expiryDays`).

| # | API | Auth | Body / query | Trả về |
| --- | --- | --- | --- | --- |
| 63 | `GET notification/` *(đề bài)* | Nhóm | `?unread=true&page&limit` | `{ total, unread, notifications: [{ id, type, title, body, fridgeItemId, foodName, expiryDate, isRead, createdAt }] }` |
| 64 | `PUT notification/read/` *(đề bài)* | Nhóm | `ids?` (mảng hoặc `"1,2"`; bỏ trống = tất cả) | `{ updated: [id] }` |

Hộp thư này hiện cả thông báo chưa gửi được qua FCM (vd. máy chưa đăng ký token), nên app luôn xem lại được.
