# Đi chợ thông minh (Smart Grocery)

Frontend Flutter/Dart cho đồ án IT4788. Ứng dụng dùng Provider, Dio và
`flutter_secure_storage`; access token được lưu cục bộ an toàn và tự gắn vào
header `Authorization: Bearer ...` cho các request cần đăng nhập.

## Chạy ứng dụng

Có thể dùng **Xem thử không cần đăng nhập** để xem các màn hình bằng dữ liệu mẫu mà không cần backend.

Đăng nhập thật cần backend chạy trên máy: làm theo mục "Chạy local" trong [README của backend](../README.md#chạy-local)
(cài Postgres, `npm run db:setup`, `npm run dev`), rồi ở thư mục này:

```bash
flutter pub get
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000/it4788   # web
flutter run                                                                      # Android Emulator: http://10.0.2.2:3000/it4788
```

Tài khoản demo: `demo@dicho.local` / `123456`. Điện thoại thật: thay `localhost` bằng IP LAN của máy chạy backend.
Lần đầu chạy Android: `flutter create --project-name smart_grocery --platforms android .` để tạo thư mục `android/`.

## API được gọi

- `POST /user/login/`, sau đó `GET /user/`
- `GET /food/` và `GET /fridge/`; thêm thực phẩm qua `POST /fridge/`
- `GET /shopping/`, tạo danh sách qua `POST /shopping/` và thêm món qua
  `POST /shopping/task/`
- `GET /meal/`, cập nhật qua `PUT /meal/`
- `GET /recipe/`, xóa qua `DELETE /recipe/`

Các request đều xử lý envelope `{ "code", "message", "data" }`. Mỗi API có mã thành công riêng theo tài liệu
môn học (vd. `00047` đăng nhập, `00287` thêm task), nên app coi HTTP 2xx là thành công. `00006`/`00011`/`00012`
(thiếu token, token hết hạn, token sai) là phiên không hợp lệ; các mã lỗi khác hiển thị message của server.

## Giả định payload cần đối chiếu với backend

Backend (thư mục gốc repo) đã nhận các key dưới đây như bí danh của tên trường trong tài liệu API; danh sách đầy đủ ở
[`../docs/api.md`](../docs/api.md).

Đề bài chỉ cung cấp payload chi tiết cho `POST /shopping/task/`. Các payload
đăng nhập, thêm thực phẩm, tạo danh sách, cập nhật bữa ăn và xóa công thức hiện
dùng các key phổ biến như `email`, `password`, `foodId`, `foodName`, `quantity`,
`unit`, `expiryDate`, `storageLocation`, `name`, `assignedTo`, `mealName`,
`date`, `mealType` và `recipeId`. Các màn hình tải dữ liệu dùng thêm `GET /fridge/`,
`GET /shopping/`, `GET /meal/`, `GET /recipe/` để hiển thị danh sách; cần xác
nhận các route và tên field với backend trước khi tích hợp cuối.

Phản hồi danh sách có thể là mảng trực tiếp hoặc object chứa `items`, `results`,
`foods`, `lists`, `meals`, `recipes` tương ứng. Khi nhận API contract chính
thức, cập nhật mapping trong `lib/features/grocery/data/` và các payload trong
`grocery_repository.dart`.
