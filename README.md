# Đi chợ tiện lợi – Backend

API server cho app "Đi chợ tiện lợi" (IT4788, nhóm 4): Node.js 22 + Express 5, Supabase (Postgres, Auth, Storage), FCM.
Mọi API nằm dưới `/it4788` và trả về `{ code, message, data }`.

## Chạy local

```bash
nvm use            # Node 22
npm install
cp .env.example .env
npm run dev        # http://localhost:3000/it4788, tự reload khi sửa code
```

Kiểm tra: `curl http://localhost:3000/it4788/health`.
Từ emulator Android gọi `http://10.0.2.2:3000/it4788/`.

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Chạy server, tự reload |
| `npm test` | Chạy test (vitest + supertest) |
| `npm run lint` | Kiểm tra code (ESLint) |
| `docker compose up -d --build` | Chạy bằng Docker như trên VPS |

## Cấu trúc

```text
src/
├── app.js             # tạo Express app, gắn router dưới /it4788
├── server.js          # listen + (sau này) khởi động jobs
├── config/            # env.js: đọc và kiểm tra biến môi trường
├── routes/            # mỗi file = một nhóm API trong tài liệu
├── middlewares/       # rateLimit (00024), errorHandler; sau này: auth, groupGuard, adminOnly, validate, requestLog
├── controllers/       # đọc req, gọi service, trả response
├── services/          # nghiệp vụ
├── repositories/      # truy vấn DB (Prisma), không chứa nghiệp vụ
├── models/            # schema zod cho body/query
├── jobs/              # expiryReminder (cron), notificationDispatcher (gửi FCM)
└── utils/             # codes.js (bảng mã response), response.js (send, ApiError)
```

| File route | Nhóm API | Phụ trách |
| --- | --- | --- |
| `user.js` | 1 Xác thực, 2 Tài khoản, Get/Delete user | BE1 |
| `group.js` | 3 Nhóm | BE1 |
| `admin.js` | 4 Category, 5 Unit + Get logs | BE1 |
| `shopping.js` | 8 Mua sắm | BE1 |
| `food.js` | 6 Thực phẩm | BE2 |
| `fridge.js` | 7 Tủ lạnh | BE2 |
| `meal.js` | 9 Bữa ăn | BE2 |
| `recipe.js`, `report.js` | 10 Công thức, thống kê (mở rộng) | BE2 |

Cả 49 API gốc và 6 API mở rộng đã có route. API chưa làm trả `501` với `code: "NOT_IMPLEMENTED"` và tên API trong `data`,
để app biết route tồn tại. Khi làm một API, thay `notImplemented(...)` bằng controller thật.

### Trả response và lỗi

- Thành công: `send(res, 'OK', data)`.
- Lỗi nghiệp vụ: trong service `throw new ApiError('TEN_MA')`; `errorHandler` chuyển thành response đúng format.
- Mã response chỉ khai báo trong `src/utils/codes.js`. Mục `verified: false` là mã tạm, cần thay bằng mã trong tài liệu API.

## Quy trình làm việc

- Nhánh: `feat/<mã task>-<tên ngắn>`, ví dụ `feat/T04.2-group-api`. Không push thẳng vào `main`; merge qua PR.
- Commit theo Conventional Commits: `feat(group): add member`, `fix(auth): ...`.
- CI (lint + test) chạy cho mọi PR.
- Repo nộp bài trên GitLab (`nhom-4/da-nen-tang`) chỉ nhận bản đã chốt: gắn tag trên `main` rồi đưa vào thư mục `server/` của GitLab khi trưởng nhóm backend đồng ý.
- Không commit `.env`, service role key, file service account Firebase.
