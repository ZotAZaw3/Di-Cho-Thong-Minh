# Đi chợ tiện lợi – Backend

API server cho app "Đi chợ tiện lợi" (IT4788, nhóm 4): Node.js 22 + Express 5, PostgreSQL (Supabase), Supabase Auth, FCM.
Mọi API nằm dưới `/it4788` và trả về `{ code, message, data }`. Danh sách API, body và mã response: [docs/api.md](docs/api.md).

Tài liệu tương tác (Swagger UI, gọi thử được): chạy server rồi mở `http://localhost:3000/it4788/docs`.
Postman: import [docs/postman_collection.json](docs/postman_collection.json) (biến `baseUrl`; chạy "#1 Đăng nhập" trước,
token tự lưu) hoặc import thẳng `http://localhost:3000/it4788/openapi.json`. Hai file trong `docs/` sinh từ code bằng
`npm run docs:export` (thêm URL server thật làm tham số khi deploy), nên luôn khớp với route và schema.

Thư mục [`app/`](app/) là app Flutter lấy từ nhánh `fe-tien` trên GitLab, đã trỏ sẵn về backend này.
Cách chạy cả hai trên máy: mục [Chạy local](#chạy-local).

## Chạy local

Chạy cả backend lẫn app trên một máy, không cần Supabase hay Firebase: dữ liệu nằm trong Postgres trên máy, đăng nhập
dùng `AUTH_DRIVER=local`, ảnh lưu vào thư mục `uploads/`, thông báo chỉ in ra log. Lệnh dưới đây chạy được trên
Windows (PowerShell), macOS và Linux; chỗ nào khác nhau có ghi rõ.

### 1. Cài công cụ

| Công cụ | Bản | Ghi chú |
| --- | --- | --- |
| Git | bất kỳ | |
| Node.js | 22 | <https://nodejs.org> (bản LTS 22) hoặc `nvm install 22`. Kiểm tra: `node -v` ra `v22...` |
| PostgreSQL | 16 (14 trở lên đều được) | Chọn **một** trong hai: cài bản Windows/macOS từ <https://www.postgresql.org/download/> (nhớ mật khẩu user `postgres`), hoặc chạy bằng Docker Desktop (bước 3) |
| Flutter | 3.19 trở lên | Chỉ cần khi chạy app. `flutter doctor` để kiểm tra |

### 2. Lấy code và cài thư viện backend

```bash
git clone https://github.com/ZotAZaw3/Di-Cho-Thong-Minh.git
cd Di-Cho-Thong-Minh
npm install
```

### 3. Tạo database

Cách A, dùng Docker (không phải cài Postgres):

```bash
docker compose --profile local up -d db     # Postgres 16, user postgres / mật khẩu postgres, đã có sẵn DB "dicho"
```

Cách B, Postgres cài trên máy: tạo DB tên `dicho` bằng pgAdmin, hoặc

```bash
psql -U postgres -c "CREATE DATABASE dicho"
```

### 4. Tạo file `.env`

```bash
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
```

Mở `.env`, điền đúng một dòng (đổi `postgres:postgres` thành `postgres:<mật khẩu của bạn>` nếu dùng cách B):

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dicho
```

Các dòng khác để nguyên. Không commit file `.env`.

### 5. Tạo bảng, dữ liệu mẫu và chạy server

```bash
npm run db:setup     # tạo bảng + danh mục thực phẩm, đơn vị, công thức + 3 tài khoản demo
npm run dev          # chạy server, tự reload khi sửa code
```

Thấy `API chạy tại http://localhost:3000/it4788` là xong. Kiểm tra:

- <http://localhost:3000/it4788/health> trả `{"code":"00000",...}`.
- <http://localhost:3000/it4788/docs>: Swagger UI, gọi thử mọi API. Chạy `#1 Đăng nhập` với tài khoản demo, copy
  `accessToken` vào nút **Authorize**.
- Postman: import `docs/postman_collection.json`, chạy `#1 Đăng nhập` trước, token tự lưu.

Tài khoản demo (mật khẩu `123456`):

| Email | Vai trò |
| --- | --- |
| `demo@dicho.local` | Trưởng nhóm "Gia đình Demo", đã có đồ trong tủ lạnh, danh sách đi chợ, bữa ăn |
| `minh@dicho.local` | Thành viên cùng nhóm |
| `admin@dicho.local` | Quản trị viên (API `admin/`) |

Đăng ký tài khoản mới: mã xác minh 6 số được in ra cửa sổ chạy server (`[auth:local] Mã xác minh cho ...`), không gửi
mail. Muốn bỏ bước xác minh thì đặt `LOCAL_AUTO_CONFIRM=true` trong `.env`.

### 6. Chạy app Flutter

Mở terminal thứ hai ở thư mục gốc của repo, để server ở bước 5 vẫn chạy:

```bash
cd app
flutter pub get
```

Repo chưa có thư mục `android/`, `ios/`. Lần đầu chạy trên Android thì tạo bằng
`flutter create --project-name smart_grocery --platforms android .` (chỉ thêm file mới, không đụng code trong `lib/`).

| Chạy trên | Lệnh | App gọi tới |
| --- | --- | --- |
| Chrome / Edge | `flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000/it4788` | máy đang chạy |
| Android Emulator | `flutter run` | `http://10.0.2.2:3000/it4788` (mặc định, 10.0.2.2 là máy chủ của emulator) |
| Điện thoại thật (cùng Wi-Fi) | `flutter run --dart-define=API_BASE_URL=http://<IP máy tính>:3000/it4788` | IP LAN của máy chạy server (`ipconfig` / `ifconfig`) |

Đăng nhập bằng `demo@dicho.local` / `123456`.

### Lỗi hay gặp

| Hiện tượng | Cách sửa |
| --- | --- |
| `Thiếu DATABASE_URL` khi chạy server | Chưa có file `.env` hoặc chưa điền `DATABASE_URL` (bước 4) |
| `password authentication failed for user "postgres"` | Mật khẩu trong `DATABASE_URL` sai |
| `database "dicho" does not exist` | Chưa tạo DB (bước 3) |
| `ECONNREFUSED 127.0.0.1:5432` | Postgres chưa chạy: mở service PostgreSQL, hoặc `docker compose --profile local up -d db` |
| `EADDRINUSE :3000` | Cổng 3000 đang bị dùng: đặt `PORT=3001` trong `.env` (và đổi URL của app theo) |
| App báo "Không thể kết nối máy chủ" | Server chưa chạy, hoặc sai `API_BASE_URL` (emulator phải dùng `10.0.2.2`, điện thoại phải dùng IP LAN và tường lửa Windows cho phép Node.js) |
| Android chặn HTTP (cleartext) | Thêm `android:usesCleartextTraffic="true"` vào thẻ `<application>` trong `android/app/src/main/AndroidManifest.xml` |
| Muốn làm lại dữ liệu từ đầu | Xóa và tạo lại DB `dicho`, rồi `npm run db:setup` |

### Lệnh khác

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Chạy server, tự reload |
| `npm start` | Chạy server không reload |
| `npm run db:migrate` | Áp migration mới (`npm run db:migrate -- --status` để xem) |
| `npm run db:seed` | Seed danh mục chung (`-- --demo` thêm tài khoản demo) |
| `npm test` | Test (vitest + supertest). Có `TEST_DATABASE_URL` thì chạy cả test tích hợp trên Postgres thật |
| `npm run lint` | ESLint |
| `npm run docs:export` | Ghi lại `docs/openapi.json` + `docs/postman_collection.json` |

Chạy test tích hợp: tạo DB tên có chữ `test` (script xóa sạch schema của DB đó), rồi đặt
`TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dicho_test` và chạy `npm test`.

## Chạy thật với Supabase

Đặt trong `.env`:

```bash
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...supabase.co:5432/postgres
AUTH_DRIVER=supabase
SUPABASE_URL=...  SUPABASE_ANON_KEY=...  SUPABASE_SERVICE_ROLE_KEY=...
STORAGE_DRIVER=supabase        # tạo bucket public "images" trên Dashboard
PUSH_DRIVER=fcm
FIREBASE_SERVICE_ACCOUNT_PATH=/run/secrets/firebase.json
```

Rồi `npm run db:migrate`. DB Supabase hiện có đã chứa schema gốc (17 bảng): lần đầu script tự đánh dấu
`0000_init.sql` là đã chạy và chỉ áp các migration sau.

Cấu hình Supabase Auth trên Dashboard: SMTP riêng (Gmail App Password), mẫu email "Confirm signup" dùng `{{ .Token }}`
để gửi mã 6 số (xem `docs/architecture.md` trên GitLab).

## Cấu trúc

```text
db/migrations/        # SQL, chạy theo thứ tự tên file (scripts/migrate.js)
scripts/              # migrate.js, seed.js
src/
├── app.js            # tạo Express app, gắn router dưới /it4788
├── server.js         # listen + khởi động jobs
├── config/           # env.js (kiểm tra biến môi trường), db.js (pg pool, transaction)
├── routes/           # mỗi file = một nhóm API trong tài liệu
├── middlewares/      # auth, groupGuard, adminOnly, validate, upload, rateLimit (00024), requestLog, errorHandler
├── controllers/      # đọc req, gọi service, trả response
├── services/         # nghiệp vụ; gateways/ = Supabase Auth / local auth, Storage, FCM
├── repositories/     # câu SQL, không chứa nghiệp vụ
├── models/           # schema zod cho body/query, presenters (DB → JSON)
├── jobs/             # expiryReminder (cron hằng ngày), notificationDispatcher (mỗi phút)
└── utils/            # codes.js (bảng mã response), response.js (send, ApiError)
tests/                # app/routes (không cần DB) + integration/ (Postgres thật)
app/                  # app Flutter (nhánh fe-tien)
```

Một request đi qua: rate limit → requestLog → auth → groupGuard / adminOnly → validate → controller → service → repository.
Mọi lỗi, kể cả lỗi ràng buộc của Postgres, đều về `errorHandler` để luôn trả đúng format.

| File route | Nhóm API | Phụ trách |
| --- | --- | --- |
| `user.js` | 1 Xác thực, 2 Tài khoản, Get/Delete user, #50 FCM token | BE1 |
| `group.js` | 3 Nhóm | BE1 |
| `admin.js` | 4 Category, 5 Unit + Get logs, #53 quản lý tài khoản | BE1 |
| `shopping.js` | 8 Mua sắm, #51, #52 | BE1 |
| `food.js` | 6 Thực phẩm | BE2 |
| `fridge.js` | 7 Tủ lạnh | BE2 |
| `meal.js` | 9 Bữa ăn | BE2 |
| `recipe.js`, `report.js` | 10 Công thức, #54 gợi ý món, #55 thống kê, #56–58 công thức yêu thích | BE2 |
| `notification.js` | #63, #64 hộp thư thông báo nhắc hết hạn | BE1 |

API #56–66 bổ sung các chức năng đề bài yêu cầu mà 49 API gốc chưa có (dùng lại danh sách, nấu từ tủ lạnh, rời nhóm /
chuyển trưởng nhóm, admin quản lý thực phẩm chung và cấu hình hệ thống). Chi tiết trong [docs/api.md](docs/api.md).

### Trả response và lỗi

- Thành công: `send(res, 'OK', data)`.
- Lỗi nghiệp vụ: trong service `throw new ApiError('TEN_MA', { message })`; `errorHandler` chuyển thành response đúng format.
- Mã response chỉ khai báo trong `src/utils/codes.js`, theo bảng mã của file mô tả API môn học (mỗi API một dải mã riêng, tra theo route).

### Đổi schema

Thêm file `db/migrations/NNNN_ten.sql` (số tiếp theo), chạy `npm run db:migrate`. Không sửa migration đã chạy trên DB chung.

## Quy trình làm việc

- Nhánh: `feat/<mã task>-<tên ngắn>`, ví dụ `feat/T04.2-group-api`. Không push thẳng vào `main`; merge qua PR.
- Commit theo Conventional Commits: `feat(group): add member`, `fix(auth): ...`.
- CI (lint + test với Postgres) chạy cho mọi PR.
- Repo nộp bài trên GitLab (`nhom-4/da-nen-tang`) chỉ nhận bản đã chốt: backend nằm trong thư mục `server/`, app Flutter ở thư mục gốc (nhánh `be-long`, dựng trên `fe-tien`). Chỉ đưa lên khi trưởng nhóm backend đồng ý.
- Không commit `.env`, service role key, file service account Firebase.
