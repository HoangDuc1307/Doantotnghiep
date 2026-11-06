# Tiến độ đồ án

## Phiên làm việc 2026-11-02 — tách cấu trúc frontend và backend

### Đã sửa

- Backend: tách pool PostgreSQL vào `src/db`, xác thực thành `services` và `middleware`, xử lý HTTP thành `controllers`; `routes` chỉ còn khai báo endpoint. API hiện có được giữ nguyên.
- Frontend: chuyển API client vào `src/app/core/services`; tách giao diện và xử lý theo `features/auth`, `features/dashboard` và `features/inventory`. `AppComponent` chỉ còn quản lý phiên, điều hướng và phản hồi chung.
- Xóa các file cũ đã được thay thế: `backend/src/auth.js`, `backend/src/db.js` và `frontend/src/app/inventory.service.ts`.

### Đã kiểm tra

- `node --check` thành công với 9 file JavaScript trong `backend/src`.
- `npm.cmd run build -- --configuration development` trong `frontend`: thành công.
- Rà soát import: không còn tham chiếu tới các file backend/frontend cũ; endpoint và API client giữ nguyên đường dẫn hiện có.
- API smoke test với PostgreSQL thật: health, đăng ký, đăng nhập, kiểm tra quyền truy cập, validation và CRUD thực phẩm đều thành công. Tài khoản cùng dữ liệu tạm đã được xóa sau kiểm tra.
- Frontend dev server: `/`, `/inventory`, `sw.js` và `manifest.webmanifest` đều trả HTTP 200 với nội dung mong đợi.

### Chưa kiểm thử

- Chưa kiểm tra thao tác click/form trong trình duyệt do môi trường không có Playwright, Puppeteer hoặc browser automation.

## Phiên làm việc 2026-11-02 — thống nhất công nghệ frontend

### Đã sửa

- `AGENTS.md`: đổi công nghệ frontend định hướng từ React PWA sang Angular PWA, khớp với mã nguồn và README hiện có.

### Đã kiểm tra

- Đối chiếu `frontend/package.json`, README và mã nguồn frontend: dự án hiện dùng Angular 22.

### Chưa kiểm thử

- Không chạy build hay ứng dụng vì phiên này chỉ thay đổi tài liệu định hướng.

## Phiên làm việc 2026-10-26 — sửa luồng thêm thực phẩm

### Đã sửa

- `frontend/src/app/app.component.ts`: thêm đóng hộp thoại bằng Escape; không cho mở/đóng form trong khi yêu cầu lưu đang chạy.
- `frontend/src/app/app.component.ts`: gọi `ChangeDetectorRef.markForCheck()` sau phản hồi API để trạng thái đăng nhập, tải kho và lưu thực phẩm cập nhật ngay trên giao diện.
- `frontend/src/app/app.component.html`: dùng cùng luồng đóng an toàn cho nút đóng và click nền; khai báo trạng thái đang lưu cho hộp thoại.
- Form thêm/sửa tạo động không tự focus trường dù có thuộc tính `autofocus`; đã chuyển sang focus tên thực phẩm sau khi hộp thoại render để người dùng có thể gõ ngay.
- `frontend/src/app/app.component.html`: số lượng dùng ô nhập văn bản với bàn phím số thập phân; đơn vị cho phép gõ tự do hoặc chọn gợi ý. Khi focus hai trường này, nội dung mặc định được chọn để gõ đè dễ hơn.
- `frontend/src/app/app.component.ts` và `app.component.html`: focus rõ input khi chạm/click vào form; chuyển dấu phẩy thập phân sang dấu chấm trước khi gửi API.
- `frontend/src/styles.css`: giới hạn chiều cao hộp nhập theo chiều cao màn hình, cho phép cuộn nội dung bên trong và chặn cuộn tràn trên màn hình nhỏ; nút bị khóa hiển thị trạng thái chờ.
- `frontend/public/sw.js`: tăng phiên bản cache shell để PWA lấy shell mới sau cập nhật.

### Đã kiểm tra

- `npm.cmd run build -- --configuration development` trong `frontend`: thành công.
- Frontend `http://localhost:4200`: HTTP 200, trang có tham chiếu app bundle.
- API `http://localhost:4000/api/health`: `status: ok`, database `connected`.
- Chromium headless: đăng ký qua giao diện, mở form, thêm, sửa và xóa thực phẩm đều thành công; tài khoản và dữ liệu kiểm thử đã được dọn khỏi database.
- Chromium viewport 360 × 640: hộp thoại cao 460 px, có thể cuộn; phím Escape đóng hộp thoại.
- Kiểm tra chuột và bàn phím thật qua Chromium: tên, số lượng `4,5` và đơn vị `kg` nhập được; lưu thành công; Tab tới được trường hạn sử dụng.
- `http://localhost:4200/sw.js`: HTTP 200, nội dung dùng cache shell v2.
- Build sau khi thêm xử lý lỗi form: thành công.
- Chromium kiểm tra hợp lệ: lưu được tên, số lượng thập phân `0,5`, đơn vị tự nhập và bỏ trống hạn sử dụng.
- Chromium kiểm tra không hợp lệ: thiếu tên/số lượng/đơn vị, số âm, ký tự không phải số, quá 2 chữ số thập phân, vượt mức 99.999.999. Các trường lỗi có viền và thông báo tiếng Việt; form không đóng và không gửi dữ liệu.
- Chromium mô phỏng API trả HTTP 400: thông báo lỗi từ server hiển thị trong form, form giữ nguyên.
- Đã dọn toàn bộ tài khoản và dữ liệu tạm dùng cho kiểm tra khỏi PostgreSQL.

### Tiếp tục lần sau

- Kiểm tra thêm trực tiếp trên điện thoại/trình duyệt người dùng nếu còn khác biệt do kích thước bàn phím ảo hoặc layout.

## Phiên làm việc 2026-10-26 — đường dẫn điều hướng

### Đã sửa

- `frontend/src/app/app.component.html`: bỏ liên kết `#`; logo và Tổng quan trỏ `/`, Kho thực phẩm trỏ `/inventory`. Tab đang chọn và breadcrumb cập nhật theo URL.
- `frontend/src/app/app.component.ts`: điều hướng bằng History API, cuộn tới đúng nội dung và đồng bộ khi dùng Back/Forward; `href` thật vẫn hỗ trợ mở trong tab mới.

### Đã kiểm tra

- Angular development build: thành công.
- `http://localhost:4200/inventory`: trả HTTP 200 khi mở trực tiếp.
- Chromium: mở trực tiếp `/inventory`, logo về `/`, tab active và breadcrumb khớp; Back/Forward khôi phục đúng URL và tab active.
- Không còn `href` nào dùng `#` trong giao diện.

## Đã triển khai

## Phiên làm việc 2026-10-26 — tách nội dung hai tab

### Đã sửa

- `frontend/src/app/app.component.html`: Tổng quan chỉ hiển thị lời chào, số thực phẩm trong kho, số món cần dùng sớm và trạng thái tính năng dự kiến. Kho thực phẩm chỉ hiển thị tìm kiếm và danh sách CRUD.
- `frontend/src/styles.css`: thêm thẻ thống kê có liên kết tới kho; giữ responsive theo breakpoint hiện tại.

### Đã kiểm tra

- Angular development build: thành công.
- Chromium xác nhận `/` chỉ có nội dung tổng quan, còn `/inventory` chỉ có nội dung kho; điều hướng cập nhật đúng tab đang chọn.
- Tài khoản kiểm thử đã được xóa khỏi database.

## Đã triển khai

- Đăng ký, đăng nhập, lấy tài khoản hiện tại; mật khẩu được băm bằng scrypt.
- Bearer token có hạn 7 ngày; API kho yêu cầu xác thực và giới hạn dữ liệu theo chủ sở hữu.
- CRUD thực phẩm; giao diện Angular dùng tài khoản thật và không hiển thị số liệu món ăn/năng lượng minh họa.
- Đã kết nối quản trị tới PostgreSQL 18.6 tại `localhost:5433` bằng tài khoản `postgres`.
- Đã tạo database `pantry_pwa` trên PostgreSQL 18 và chạy `backend/schema.sql`; hai bảng `users` và `inventory_items` đã được xác nhận tồn tại.
- `backend/.env` đã trỏ tới PostgreSQL 18. Không ghi mật khẩu vào tài liệu.

## Kiểm tra

- `node --check` các file backend: thành công.
- `npm.cmd run build -- --configuration development`: thành công.
- Truy vấn PostgreSQL xác nhận server `18.6`, database `pantry_pwa`, user `postgres` và các bảng cần thiết.
- Dependency backend đã cài được sau khi bật network access; API Express hiện chạy và `/api/health` báo database connected.
- Đăng ký/CRUD qua giao diện người dùng chưa được kiểm thử thủ công.
- Build frontend production chưa hoàn tất vì Angular không tải được Google Fonts trong môi trường này.

## Chẩn đoán giao diện ngày 2026-10-26

- Xác nhận frontend tại `localhost:4200` trả HTTP 200 và tải được `main.js`/`polyfills.js`.
- API `/api/health` báo database kết nối; CORS preflight từ `localhost:4200` trả 204.
- `/api/auth/register` trả lỗi validation 400 với payload rỗng và `/api/auth/me` trả 401 khi thiếu token, đều có CORS header đúng.
- Thêm request logger backend chỉ ghi method, path, status và thời gian; không ghi body/mật khẩu.
- Thêm thông báo lỗi chung cố định ở giao diện; các lỗi đăng nhập, tải kho, CRUD, khôi phục phiên và lỗi JavaScript chưa xử lý được hiển thị cho người dùng.
- Build Angular development sau thay đổi thông báo lỗi: thành công.
- Chưa tái hiện được trạng thái treo trong trình duyệt thật. Nếu sau khi backend tự khởi động lại log vẫn không hiện khi thao tác, cần kiểm tra console/network của tab đang mở.

## Cần làm tiếp

1. Khởi động lại backend để nạp request logger mới.
2. Kiểm thử đăng ký/đăng nhập và CRUD qua giao diện trên trình duyệt.

## Chưa triển khai

Quên mật khẩu, quét QR, nhập giọng nói, tra cứu thực phẩm, dữ liệu dinh dưỡng và gợi ý món ăn/cách nấu.
