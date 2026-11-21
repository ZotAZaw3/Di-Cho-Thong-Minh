# Tài liệu API backend

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

## Bảng mã response

Tài liệu API gốc (bảng mã) chưa có trong project, nên phần lớn mã là **mã tạm**. Tất cả nằm ở
`src/utils/codes.js`; khi có bảng mã thật chỉ cần sửa file đó.

| Mã | HTTP | Ý nghĩa | Nguồn |
| --- | --- | --- | --- |
| `00000` | 200/201 | Thành công | tạm (app chấp nhận) |
| `00287` | 201 | Create tasks thành công | slide tuần 2 + app |
| `00279` | 400 | Dữ liệu gửi lên sai; `data.errors` liệt kê từng trường | slide tuần 2 + app |
| `00281` | 401 | Thiếu token, token sai hoặc hết hạn (app tự đăng xuất) | slide tuần 2 + app |
| `00284` | 403 | Không có quyền (không phải trưởng nhóm, người tạo...) | slide tuần 2 + app |
| `00019` | 403 | User thường gọi API admin | sheet T05.1 |
| `00044` | 403 | Đăng nhập khi email chưa xác minh | architecture.md |
| `00024` | 429 | Gửi quá nhiều request | sheet T02.5 |
| `INVALID_CREDENTIALS` | 401 | Sai email hoặc mật khẩu | tạm |
| `ACCOUNT_BLOCKED` | 403 | Tài khoản bị admin khóa | tạm |
| `EMAIL_EXISTS`, `USERNAME_EXISTS` | 409 | Trùng email / username | tạm |
| `INVALID_CODE` | 400 | Mã xác minh sai hoặc hết hạn | tạm |
| `WRONG_PASSWORD` | 400 | Mật khẩu cũ không đúng | tạm |
| `NO_GROUP` | 403 | Chưa ở nhóm nào | tạm |
| `ALREADY_IN_GROUP` | 409 | Đã ở trong một nhóm | tạm |
| `NOT_FOUND` | 404 | Không tìm thấy (thực phẩm sai tên thì `data.suggestions` gợi ý tên gần giống) | tạm |
| `CONFLICT` | 409 | Trùng (tên, món trong danh sách...) | tạm |
| `IN_USE` | 409 | Đang được dùng, không xóa được | tạm |
| `ROUTE_NOT_FOUND`, `INTERNAL_ERROR` | 404/500 | Sai đường dẫn / lỗi server | tạm |

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

## 6. Thực phẩm

Danh mục chung (seed) dùng cho mọi nhóm; mỗi nhóm thêm được món riêng. Món chung không sửa/xóa được từ app.

| # | API | Auth | Body | Bí danh | Trả về |
| --- | --- | --- | --- | --- | --- |
| 24 | `POST food/` | Nhóm | form-data: `name`, `foodCategoryName`, `unitName`, `image?` | `categoryName`, `unit` | food |
| 25 | `PUT food/` | Nhóm | `name`, `newName?`, `newCategory?`, `newUnit?`, `image?` | `newCategoryName`, `newUnitName` | food |
| 26 | `DELETE food/` | Nhóm | `name` | | `null` |
| 27 | `GET food/` | Nhóm | | | `{ foods, categories, units }` |
| 28 | `GET food/unit/` | Bearer | | | danh sách unit |
| 29 | `GET food/category/` | Bearer | | | danh sách category |

## 7. Tủ lạnh

Số lượng lưu theo đơn vị gốc của thực phẩm; gửi `unit` khác thì server quy đổi (vd. 1 `hộp` trứng = 10 `quả`).
Nơi để: `fridge`/`freezer`/`pantry` hoặc `Tủ lạnh`/`Ngăn đông`/`Tủ bếp`.

| # | API | Auth | Body | Bí danh | Trả về |
| --- | --- | --- | --- | --- | --- |
| 30 | `POST fridge/` | Nhóm | `foodName` hoặc `foodId`, `quantity`, `unit?`, `useWithin?` (số ngày) hoặc `expiryDate?`, `storageLocation?`, `note?` | `location`, `unitName` | item |
| 31 | `PUT fridge/` | Nhóm | `itemId`, `newQuantity?`, `newUnit?`, `newUseWithin?`/`newExpiryDate?`, `newNote?`, `newStorageLocation?`, `newFoodName?` | `id` | item |
| 32 | `DELETE fridge/` | Nhóm | `foodName` (mọi món của thực phẩm đó) hoặc `itemId` | | `{ deleted: [id] }` |
| 33 | `GET fridge/` | Nhóm | `?q&category&location` | | danh sách, hạn gần nhất trước |
| 34 | `GET fridge/:foodName/` | Nhóm | | | danh sách của thực phẩm đó |

Item: `id`, `foodId`, `foodName`, `quantity`, `unitName`, `expiryDate`, `useWithin` (còn bao nhiêu ngày),
`status` (`fresh` / `expiring` ≤ 3 ngày / `expired` / `unknown`), `storageLocation` (nhãn), `storageCode`, `note`.
Header `Idempotency-Key` trên `POST fridge/`: gửi lại cùng khóa không thêm trùng.

## 8. Mua sắm

Một "task" = một mặt hàng trong danh sách + người được giao. Thêm món mới mặc định giao cho người phụ trách danh sách.

| # | API | Auth | Body / query | Bí danh | Trả về |
| --- | --- | --- | --- | --- | --- |
| 35 | `POST shopping/` | Nhóm | `name`, `assignToUsername?`, `date?`, `note?` | `title`, `assignedTo` | list |
| 36 | `PUT shopping/` | Trưởng nhóm / người tạo | `listId`, `newName?`, `newAssignToUsername?`, `newDate?`, `newNote?`, `status?` | | list |
| 37 | `DELETE shopping/` | Trưởng nhóm / người tạo | `listId` | | `{ listId }` |
| 38 | `POST shopping/task/` | Nhóm | `listId`, `tasks: [{ foodName, quantity, unit? }]` | | các task (mã `00287`); trùng món thì không thêm món nào |
| 39 | `GET shopping/task/` | Nhóm | `?listId&mine&status` | | danh sách task |
| 40 | `DELETE shopping/task/` | Trưởng nhóm / người tạo | `taskId` | | `{ taskId }` |
| 41 | `PUT shopping/task/` | Nhóm | `taskId`, `newFoodName?`, `newQuantity?`, `newUnit?`, `newAssignToUsername?`, `isDone?` | | task |
| 51 | `GET shopping/` *(mở rộng)* | Nhóm | `?status&date&mine` | | các list kèm `tasks` |
| 52 | `PUT shopping/task/done/` *(mở rộng)* | Nhóm | `taskId`, `done?` (mặc định `true`, `false` = hoàn tác), `expiryDate?`, `storageLocation?`, `totalCost?` | | task; món được cộng vào tủ lạnh |

## 9. Bữa ăn

Một mục có thể là thực phẩm (`foodName`), công thức (`recipeId`) hoặc tên món tự do (`mealName`).
Bữa: `breakfast`/`lunch`/`dinner` hoặc `sáng`/`trưa`/`tối`/`Bữa sáng`...

| # | API | Auth | Body / query | Bí danh | Trả về |
| --- | --- | --- | --- | --- | --- |
| 42 | `POST meal/` | Nhóm | `foodName?`/`recipeId?`/`mealName?`, `timestamp` (ngày), `name` (bữa) | `date`, `mealType` | plan |
| 43 | `DELETE meal/` | Nhóm | `planId` | | `{ planId }` |
| 44 | `PUT meal/` | Nhóm | `planId`, `newFoodName?`, `newRecipeId?`, `newMealName?`, `newName?` (bữa), `newTimestamp?` | | plan. Không có `planId` thì tạo mới (app hiện gọi như vậy) |
| 45 | `GET meal/` | Nhóm | `?date` (mặc định hôm nay) hoặc `?from&to` | | các plan theo bữa |

## 10. Công thức

| # | API | Auth | Body / query | Bí danh | Trả về |
| --- | --- | --- | --- | --- | --- |
| 46 | `POST recipe/` | Nhóm | `name`, `foodName?` (nguyên liệu chính), `htmlContent`, `description?`, `servings?`, `prepMinutes?`, `cookMinutes?`, `ingredients?` | `title`, `content`, `duration` | recipe |
| 47 | `PUT recipe/` | Nhóm | `recipeId`, `newName?`, `newHtmlContent?`, `newDescription?`, `newFoodName?`, `newIngredients?` | | recipe |
| 48 | `DELETE recipe/` | Nhóm | `recipeId` | | `{ recipeId }` |
| 49 | `GET recipe/` | Nhóm | `?foodId` (bỏ trống = tất cả), `?q` | | danh sách |
| 54 | `GET recipe/suggest/` *(mở rộng)* | Nhóm | `?limit` | | công thức xếp theo tỉ lệ nguyên liệu có sẵn, ưu tiên đồ sắp hết hạn |
| 55 | `GET report/` *(mở rộng)* | Nhóm | `?from&to` (mặc định đầu tháng → hôm nay) | | tổng hợp mua / thêm / dùng / bỏ theo thực phẩm |

`ingredients`: `[{ foodName, quantity, unit?, optional? }]` (form-data gửi dạng chuỗi JSON).

## Nhắc hết hạn

Job hằng ngày (8:00 giờ Việt Nam) ghi thông báo cho đồ còn ≤ 3 ngày và đồ đã hết hạn hôm qua vào bảng
`notifications` cho mọi thành viên nhóm. Worker mỗi phút gửi FCM tới các token đã đăng ký qua `PUT user/device/`,
thử lại tối đa 3 lần, xóa token không còn hợp lệ. Payload `data` của thông báo: `type`, `fridgeItemId`, `notificationId`.
