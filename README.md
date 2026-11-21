# Đi chợ tiện lợi – Backend

API server cho app "Đi chợ tiện lợi" (IT4788, nhóm 4): Node.js 22 + Express 5, PostgreSQL (Supabase), Supabase Auth, FCM.
Mọi API nằm dưới `/it4788` và trả về `{ code, message, data }`. Danh sách API, body và mã response: [docs/api.md](docs/api.md).

Tài liệu tương tác (Swagger UI, gọi thử được): chạy server rồi mở `http://localhost:3000/it4788/docs`.
Postman: import [docs/postman_collection.json](docs/postman_collection.json) (biến `baseUrl`; chạy "#1 Đăng nhập" trước,
token tự lưu) hoặc import thẳng `http://localhost:3000/it4788/openapi.json`. Hai file trong `docs/` sinh từ code bằng
`npm run docs:export` (thêm URL server thật làm tham số khi deploy), nên luôn khớp với route và schema.

Thư mục [`app/`](app/) là app Flutter lấy từ nhánh `fe-tien` trên GitLab, đã trỏ sẵn về backend này.

## Chạy local (không cần Supabase)

Cần Node 22 và một Postgres (cài sẵn, hoặc `docker compose --profile local up -d db`).

```bash
nvm use                  # Node 22
npm install
cp .env.example .env     # điền DATABASE_URL, ví dụ postgresql://postgres:postgres@localhost:5432/dicho
npm run db:setup         # tạo bảng + dữ liệu mẫu + tài khoản demo
npm run dev              # http://localhost:3000/it4788, tự reload khi sửa code
```

Tài khoản demo (mật khẩu `123456`): `demo@dicho.local` (trưởng nhóm "Gia đình Demo", đã có đồ trong tủ, danh sách đi chợ,
bữa ăn), `minh@dicho.local` (thành viên), `admin@dicho.local` (admin).

Ở chế độ `AUTH_DRIVER=local`, mã xác minh email được in ra log của server thay vì gửi mail.
Từ emulator Android gọi `http://10.0.2.2:3000/it4788/`.

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Chạy server, tự reload |
| `npm run db:migrate` | Áp migration mới (`-- --status` để xem) |
| `npm run db:seed` | Seed danh mục chung (`-- --demo` thêm tài khoản demo) |
| `npm test` | Test (vitest + supertest). Có `TEST_DATABASE_URL` thì chạy cả test tích hợp trên Postgres thật |
| `npm run lint` | ESLint |
| `npm run docs:export` | Ghi lại `docs/openapi.json` + `docs/postman_collection.json` |
| `docker compose up -d --build` | Chạy bằng Docker như trên VPS |

Chạy test tích hợp: tạo DB tên có chữ `test` (script xóa sạch schema của DB đó), rồi
`TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dicho_test npm test`.

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
- Repo nộp bài trên GitLab (`nhom-4/da-nen-tang`) chỉ nhận bản đã chốt: gắn tag trên `main` rồi đưa vào thư mục `server/` của GitLab khi trưởng nhóm backend đồng ý.
- Không commit `.env`, service role key, file service account Firebase.
