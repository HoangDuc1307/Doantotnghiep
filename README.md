# Bếp Nhà — nền tảng quản lý kho thực phẩm

Đây là bước khởi tạo MVP cho đồ án: giao diện Angular responsive, API Node.js/Express và PostgreSQL. Hiện tại phạm vi gồm xác thực tài khoản, hồ sơ mục tiêu năng lượng hằng ngày và xem, thêm, sửa, xóa thực phẩm với tên, số lượng, đơn vị và hạn sử dụng tùy chọn. QR, giọng nói, tra cứu sản phẩm, dữ liệu dinh dưỡng và gợi ý thực đơn chưa được triển khai.

Service worker lưu vỏ giao diện đã tải để có thể mở lại giao diện cơ bản khi mất mạng. Các thao tác kho vẫn cần backend và PostgreSQL hoạt động; đồng bộ hoặc chỉnh sửa dữ liệu offline chưa có.

## Yêu cầu môi trường

- Node.js 24.15 trở lên và npm (yêu cầu của Angular 22).
- PostgreSQL đang chạy và có database, ví dụ `pantry_pwa` (cấu hình phát triển hiện tại dùng PostgreSQL 18 ở cổng `5433`).

## Khởi tạo cơ sở dữ liệu

Chạy `backend/schema.sql` trong database, ví dụ bằng pgAdmin hoặc `psql`. Script tạo bảng tài khoản và thêm `user_id` vào bảng thực phẩm. Nếu database đã có dữ liệu từ bản trước, những thực phẩm cũ chưa thuộc tài khoản nào sẽ không xuất hiện trong kho người dùng; dữ liệu đó vẫn được giữ nguyên trong database.

## Chạy API

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Sửa `DATABASE_URL` và `AUTH_SECRET` trong `backend/.env` (đặt secret ngẫu nhiên dài ít nhất 32 ký tự; không chia sẻ hoặc đưa vào Git), sau đó chạy:

```powershell
npm run dev
```

API mặc định ở `http://localhost:4000`. Kiểm tra kết nối tại `http://localhost:4000/api/health`.

## Chạy giao diện

Mở terminal thứ hai:

```powershell
cd frontend
npm install
npm start
```

Angular CLI phục vụ giao diện tại `http://localhost:4200`. API mặc định dùng cùng hostname với giao diện trên cổng `4000`: mở `http://localhost:4200` sẽ gọi `http://localhost:4000/api`, còn mở qua IP LAN sẽ gọi IP đó ở cổng `4000`.

Để thử trên điện thoại cùng Wi-Fi, thêm origin frontend vào `FRONTEND_ORIGINS` trong `backend/.env`, phân tách bằng dấu phẩy, ví dụ `http://localhost:4200,http://192.168.31.181:4200`. Địa chỉ IP LAN có thể đổi sau khi kết nối lại mạng; cần cập nhật biến này và bảo đảm Windows Firewall cho phép cổng `4000`.

Đăng ký và đăng nhập dùng tài khoản PostgreSQL; mật khẩu được băm ở backend. Phiên đăng nhập dùng bearer token có hạn 7 ngày, được lưu trong localStorage. Mỗi tài khoản chỉ truy cập được thực phẩm của mình. Sau khi đăng ký, người dùng có thể thiết lập mục tiêu calo hằng ngày; chiều cao và cân nặng là tùy chọn, có thể cập nhật lại. Chức năng quên mật khẩu, quét mã, nhập giọng nói và gợi ý món ăn chưa triển khai.

## API hiện có

- `POST /api/auth/register`: tạo tài khoản.
- `POST /api/auth/login`: đăng nhập và nhận bearer token.
- `GET /api/auth/me`: lấy thông tin tài khoản đang đăng nhập.
- `PATCH /api/auth/profile`: lưu chiều cao, cân nặng tùy chọn và mục tiêu calo hằng ngày của tài khoản đang đăng nhập.
- `GET /api/inventory`: lấy thực phẩm của tài khoản, xếp theo hạn sử dụng gần nhất.
- `POST /api/inventory`: thêm thực phẩm của tài khoản.
- `PATCH /api/inventory/:id`: cập nhật thực phẩm thuộc tài khoản.
- `DELETE /api/inventory/:id`: xóa thực phẩm thuộc tài khoản.

Các API `/api/inventory` yêu cầu header `Authorization: Bearer <token>`. Các trường thực phẩm bắt buộc là `name`, `quantity` (không âm), `unit`; `expiry_date` có thể để trống.
