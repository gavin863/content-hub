# Content Hub

Web app nội bộ để marketing team soạn content, gửi duyệt, và tự động đăng lên
Facebook Page + WordPress sau khi được duyệt. Hỗ trợ nhiều brand (Nimbus,
Talentforce, ...) với phân quyền theo brand.

## Kiến trúc

- **Backend**: Node.js + Express + PostgreSQL (thư mục `backend/`)
- **Frontend**: React + Vite + Tailwind (thư mục `frontend/`)
- **Database**: PostgreSQL — dùng Supabase/Railway/Render đều được, chỉ cần 1 connection string
- **Auth**: JWT tự viết (không phụ thuộc bên thứ 3), mật khẩu hash bằng bcrypt
- **Lịch đăng bài**: cron job trong backend chạy mỗi phút, tự publish các bài đã duyệt + đến giờ

### Luồng duyệt bài (workflow)

```
draft → pending_review → approved → (published ngay hoặc scheduled → published tự động)
                       ↘ changes_requested → (writer sửa) → pending_review
```

Nếu publish lỗi (token hết hạn, API Facebook/WordPress trả lỗi...) bài sẽ
chuyển sang `failed` kèm log lỗi, approver có thể bấm "Thử đăng lại".

### Phân quyền theo brand

Mỗi user có 1 role riêng cho từng brand:
- **writer**: soạn nháp, gửi duyệt
- **approver**: duyệt, yêu cầu sửa, publish
- **admin**: approver + quản lý kênh đăng (Facebook/WordPress) và thành viên

Tài khoản đầu tiên đăng ký trong hệ thống tự động là **super admin** (thấy và quản lý được mọi brand).

---

## 1. Chạy thử ở máy local

### Cài PostgreSQL & tạo database

```bash
createdb content_hub
psql content_hub < database/schema.sql
```

### Backend

```bash
cd backend
cp .env.example .env
# sửa .env: DATABASE_URL trỏ vào database vừa tạo, JWT_SECRET đặt chuỗi ngẫu nhiên
npm install
npm run dev
```

Backend chạy ở `http://localhost:4000`.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Mở `http://localhost:5173`. Đăng ký tài khoản đầu tiên (sẽ là super admin) →
vào **Cài đặt** để thêm kênh Facebook/WordPress và mời thêm người vào brand.

---

## 2. Triển khai thật (production)

Gợi ý cách rẻ và nhanh nhất để có "hosting/database riêng":

| Thành phần | Gợi ý dịch vụ | Chi phí |
|---|---|---|
| Database Postgres | [Supabase](https://supabase.com) (free tier) hoặc Railway | Free – ~$5-10/tháng |
| Backend API | [Railway](https://railway.app) hoặc [Render](https://render.com) | ~$5-7/tháng |
| Frontend | [Vercel](https://vercel.com) hoặc Netlify | Free |

### Bước 1 — Database
1. Tạo project Postgres trên Supabase (hoặc Railway).
2. Copy connection string dạng `postgres://...`.
3. Chạy `database/schema.sql` vào database đó (Supabase có SQL Editor để paste trực tiếp).

### Bước 2 — Backend
1. Push thư mục `backend/` lên 1 repo GitHub riêng (hoặc dùng chung repo, deploy từ subfolder).
2. Trên Railway/Render: "New Web Service" → connect repo → set root directory là `backend`.
3. Set biến môi trường: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (điền domain frontend sau khi deploy xong ở bước 3).
4. Start command: `npm start`.

### Bước 3 — Frontend
1. Trên Vercel: import repo, root directory là `frontend`.
2. Set biến môi trường `VITE_API_URL` = domain backend vừa deploy (vd: `https://content-hub-api.up.railway.app`).
3. Deploy. Vercel tự build bằng `npm run build`.
4. Quay lại backend, cập nhật `CORS_ORIGIN` = domain Vercel vừa có, redeploy backend.

Xong — bạn có 1 app thật, có domain riêng, database riêng, chạy 24/7 và tự publish theo lịch.

---

## 3. Kết nối Facebook Page

Cần 1 **Page Access Token dài hạn** (long-lived) cho từng Fanpage muốn đăng bài tự động.

1. Vào [Facebook for Developers](https://developers.facebook.com) → tạo 1 App loại "Business".
2. Trong App, thêm sản phẩm **Facebook Login** và **Pages API**.
3. Dùng [Graph API Explorer](https://developers.facebook.com/tools/explorer/) → chọn App vừa tạo → chọn quyền (permissions):
   `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`.
4. Lấy **User Access Token** ngắn hạn → đổi sang **long-lived User Token** (gọi endpoint
   `/oauth/access_token` với `grant_type=fb_exchange_token`).
5. Dùng long-lived user token gọi `GET /me/accounts` để lấy **Page Access Token** — token này của Page thì không hết hạn (miễn là user không đổi mật khẩu / gỡ app).
6. Lấy `Page ID` (trong phần About của Fanpage) + Page Access Token → nhập vào **Cài đặt → Thêm kênh → Facebook** trong app.

Lưu ý: nếu app Facebook chưa qua **App Review**, bạn chỉ đăng được lên các Page mà tài khoản admin của App đó quản lý (đủ dùng nội bộ). Muốn đăng hộ Page của khách hàng thì cần App Review cho các permission trên.

---

## 4. Kết nối WordPress

Dùng **Application Password** — không cần cài plugin, có sẵn từ WordPress 5.6+.

1. Đăng nhập WordPress Admin → **Users → Profile** (của tài khoản sẽ dùng để đăng bài).
2. Cuộn xuống **Application Passwords** → đặt tên (vd "Content Hub") → **Add New Application Password**.
3. WordPress hiện ra 1 chuỗi password — copy lại (chỉ hiện 1 lần).
4. Vào **Cài đặt → Thêm kênh → WordPress** trong app, nhập:
   - Site URL: `https://tenmiencuaban.com`
   - Username: username WordPress đó
   - Application Password: chuỗi vừa copy
5. Nếu site dùng hosting chặn REST API hoặc có plugin bảo mật (Wordfence...), cần whitelist đường dẫn `/wp-json/wp/v2/posts`.

---

## 5. Bảo mật trước khi dùng thật

- **Khóa endpoint đăng ký**: sau khi tạo xong tài khoản super admin đầu tiên, nên sửa
  `backend/src/routes/auth.js` để route `/register` yêu cầu đã đăng nhập + là admin
  (hiện tại nó mở để bootstrap tài khoản đầu tiên).
- **Mã hóa `config` của channels**: hiện Page Access Token / Application Password lưu
  dạng JSON thường trong cột `config`. Nếu cần thêm 1 lớp bảo mật, có thể mã hóa cột
  này bằng `pgcrypto` (`pgp_sym_encrypt`) hoặc dùng secret manager của Railway/Render.
- **HTTPS**: Railway/Render/Vercel đều tự cấp SSL, không cần làm gì thêm.
- **Backup database**: bật auto-backup trên Supabase/Railway (thường có sẵn ở gói trả phí).

---

## 6. Có thể mở rộng thêm

- Đăng nhiều ảnh/video cùng lúc (hiện chỉ hỗ trợ 1 ảnh cho Facebook)
- Thêm kênh: Zalo OA (bạn đã có sẵn code Zalo trong dự án zca-js, có thể viết thêm 1
  `zaloPublisher.js` theo đúng pattern của `facebookPublisher.js`), LinkedIn, Instagram
- Lịch nội dung dạng calendar view thay vì danh sách
- Duyệt nhiều cấp (writer → team lead → Gavin) nếu team lớn dần
- Thông báo Slack khi có bài chờ duyệt (bạn đã có Slack connector — chỉ cần gọi
  webhook trong `content.js` khi status chuyển thành `pending_review`)
