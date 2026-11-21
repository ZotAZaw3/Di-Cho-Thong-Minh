# Đi chợ thông minh (Smart Grocery)

Frontend Flutter/Dart cho đồ án IT4788. Ứng dụng dùng Provider, Dio và
`flutter_secure_storage`; access token được lưu cục bộ an toàn và tự gắn vào
header `Authorization: Bearer ...` cho các request cần đăng nhập.

## Chạy ứng dụng

Web preview đã được cấu hình. Có thể dùng **Xem thử không cần đăng nhập** hoặc
**Đăng ký** để khám phá các màn hình bằng dữ liệu mẫu mà không cần backend.

Đăng nhập thật cần backend trong thư mục gốc của repo này (xem `../README.md`).
Chạy backend ở chế độ local rồi đăng nhập bằng tài khoản demo `demo@dicho.local` /
`123456`:

```bash
# ở thư mục gốc repo
npm install && cp .env.example .env   # điền DATABASE_URL
npm run db:setup && npm run dev       # http://localhost:3000/it4788

# ở thư mục app/
flutter pub get
flutter run                                                     # Android Emulator: mặc định http://10.0.2.2:3000/it4788
flutter run -d edge --dart-define=API_BASE_URL=http://localhost:3000/it4788
```

Trên thiết bị thật, thay `localhost` bằng IP máy chạy backend (cùng Wi-Fi) hoặc
URL HTTPS của VPS. Để tạo cấu hình native lần đầu, chạy
`flutter create --project-name smart_grocery --platforms android,ios .` rồi cài
Android SDK nếu phát triển trên Android.

## API được gọi

- `POST /user/login/`, sau đó `GET /user/`
- `GET /food/` và `GET /fridge/`; thêm thực phẩm qua `POST /fridge/`
- `GET /shopping/`, tạo danh sách qua `POST /shopping/` và thêm món qua
  `POST /shopping/task/`
- `GET /meal/`, cập nhật qua `PUT /meal/`
- `GET /recipe/`, xóa qua `DELETE /recipe/`

Các request đều xử lý envelope `{ "code", "message", "data" }`; backend trả `00000`
khi thành công (riêng Create tasks trả `00287`). Mã `00279`, `00281` và `00284` được chuyển thành thông báo phù hợp
trên giao diện.

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
