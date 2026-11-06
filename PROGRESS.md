# Tiến độ đồ án

## Tổng quan dự án

- Đề tài: PWA quản lý thực phẩm và đề xuất thực đơn cá nhân hóa theo nhu cầu năng lượng.
- MVP hiện tại là ứng dụng Angular 22 ở `frontend` và API Node.js/Express với PostgreSQL ở `backend`. Theo mã nguồn và kiểm thử ngày 2026-11-04, phạm vi thực tế là xác thực tài khoản, hồ sơ mục tiêu năng lượng và quản lý kho thực phẩm; chưa suy diễn các chức năng khác từ định hướng đề tài.
- Nguồn xác minh trạng thái ưu tiên là mã nguồn, cấu hình và kết quả kiểm thử có ngày ghi rõ. `README.md` mô tả cách chạy và `PROGRESS.md` ghi lịch sử, quyết định và bàn giao; tài liệu không thay thế mã nguồn hay kiểm thử hiện thời.

### Quy tắc cập nhật cho Team Lead

- Sau mỗi phiên làm việc đáng kể, Team Lead đọc `AGENTS.md`, `README.md`, mã nguồn liên quan và cập nhật tệp này. Trước khi kết luận một chức năng đã hoàn thành, phải kiểm tra mã nguồn thực tế và ghi rõ bằng chứng.
- Cập nhật phần tổng hợp ở các mục đầu, sau đó thêm một bản ghi mới vào **Nhật ký phiên làm việc**; không sửa hoặc xóa bằng chứng lịch sử. Nếu cần sửa nhận định cũ, giữ nhận định đó và nêu phần được thay thế cùng lý do.
- Mỗi kết quả kiểm thử phải ghi ngày, lệnh/cách kiểm tra, kết quả và phạm vi. Kết quả cũ phải mang nhãn **Lịch sử**, không được coi là xác nhận cho môi trường hiện tại.
- Phân loại rõ: **đã triển khai** (có mã nguồn), **đang thực hiện** (công việc đang mở), **ưu tiên tiếp theo** (chưa làm) và **chưa xác minh** (thiếu môi trường hoặc bằng chứng). Không ghi khóa bí mật, mật khẩu hay dữ liệu cá nhân vào tệp này.

## Đã triển khai

Trạng thái dưới đây được đối chiếu với mã nguồn ngày 2026-11-04; chưa phải xác nhận runtime của máy hiện tại.

- Backend Express có health check `GET /api/health`, request logger không ghi body, CORS theo whitelist `FRONTEND_ORIGINS` (tương thích `FRONTEND_ORIGIN` cũ) và JSON body giới hạn 32 KB.
- Xác thực tài khoản: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`; mật khẩu được băm bằng `scrypt`, token bearer HMAC có hạn 7 ngày.
- Hồ sơ mục tiêu: `PATCH /api/auth/profile` lưu mục tiêu calo hằng ngày bắt buộc, cùng chiều cao/cân nặng tùy chọn của chính tài khoản đang đăng nhập. Backend kiểm tra dữ liệu, schema lưu các cột nullable có giới hạn hợp lệ và `GET /api/auth/me` trả lại hồ sơ.
- Kho thực phẩm theo chủ sở hữu: `GET`, `POST`, `PATCH`, `DELETE /api/inventory`; middleware yêu cầu bearer token và truy vấn luôn lọc `user_id`. Dữ liệu được kiểm tra tên, số lượng không âm, đơn vị và ngày hết hạn.
- Schema PostgreSQL có bảng `users`, `inventory_items`, khóa ngoại `user_id` với `ON DELETE CASCADE` và các chỉ mục theo người dùng/hạn sử dụng.
- Frontend Angular tách `core/services`, `features/auth`, `features/dashboard`, `features/inventory`; `AppComponent` quản lý phiên, điều hướng `/` và `/inventory`, cùng phản hồi lỗi chung.
- Giao diện có đăng ký/đăng nhập, khôi phục phiên từ token trong `localStorage`, đăng xuất, tìm kiếm kho, thêm/sửa/xóa, kiểm tra form và hiển thị trạng thái hạn sử dụng. Hộp thoại kho hỗ trợ Escape, khóa thao tác khi đang lưu và focus trường tên khi mở.
- Kho thực phẩm có thêm sắp xếp theo món mới thêm hoặc tên A–Z, nhập lại một món đã có với số lượng mặc định 1 và không sao chép hạn dùng, cùng hộp cập nhật nhanh số lượng. Thông báo thao tác thành công/lỗi được phân biệt cho trình đọc màn hình.
- Sau đăng ký, giao diện mở thiết lập hồ sơ mục tiêu; người dùng có thể bỏ qua. Khi chưa có mục tiêu calo, Tổng quan nhắc một lần mỗi 24 giờ theo tài khoản trên trình duyệt đó. Mục tiêu đã lưu hiển thị ở Tổng quan và có thể cập nhật; chiều cao/cân nặng không chặn người dùng.
- PWA có `manifest.webmanifest` và service worker cache vỏ giao diện đã tải. Chỉnh sửa hay đồng bộ dữ liệu kho khi offline chưa có.
- Chưa có mã nguồn cho: quên/đặt lại mật khẩu (giao diện chỉ báo chưa triển khai), QR, nhập giọng nói, tra cứu sản phẩm, dữ liệu dinh dưỡng có cấu trúc, tính năng lượng tiêu thụ thực tế và đề xuất thực đơn. Mục tiêu calo hiện chỉ được lưu, chưa dùng để sinh thực đơn hoặc đưa ra khuyến nghị sức khỏe.

### Quyết định kỹ thuật còn hiệu lực

- Frontend được thống nhất là Angular PWA, không phải React; mã nguồn và `frontend/package.json` hiện dùng Angular 22.
- API client frontend nằm tại `frontend/src/app/core/services/inventory.service.ts`; backend đã tách pool, services, middleware, controllers và routes. Các file cũ `backend/src/auth.js`, `backend/src/db.js` và `frontend/src/app/inventory.service.ts` đã bị thay thế trong phiên 2026-11-02.
- Số liệu môi trường PostgreSQL 18.6, database `pantry_pwa`, cổng `5433` và tài khoản quản trị `postgres` chỉ là cấu hình phát triển đã ghi nhận trong lịch sử, chưa được kiểm tra lại trong phiên này. Mật khẩu không được lưu trong tài liệu.

## Đang thực hiện

- Không có chức năng nào đang thực hiện dở được ghi nhận sau phiên này.

## Ưu tiên tiếp theo

1. Kiểm thử lại trên điện thoại thật luồng đăng ký → bỏ qua/lưu hồ sơ → cập nhật mục tiêu, nhất là bàn phím ảo và hộp thoại nhỏ. Browser automation ở viewport 360 × 640 đã xác nhận luồng chính, nhưng không thay thế thiết bị thật.
2. Mở rộng kiểm thử tự động từ validation hồ sơ sang API xác thực, hồ sơ và CRUD kho.
3. Khi có chức năng thực đơn, chỉ yêu cầu mục tiêu calo tại điểm người dùng mở chức năng đó; không chặn quản lý kho.
4. Khi bắt đầu chức năng QR hoặc thực đơn, kiểm chứng nguồn dữ liệu sản phẩm/dinh dưỡng và khả năng truy cập trước khi thiết kế tích hợp; không dùng số liệu AI tự tạo làm nguồn tính năng lượng.

## Vấn đề tồn đọng

- Kiểm thử tự động hiện chỉ bao phủ validation đầu vào hồ sơ (`backend/src/controllers/profile.validation.test.js`); xác thực, API profile và CRUD kho chưa có bộ test tự động đầy đủ.
- Đã kiểm thử giao diện hồ sơ qua browser automation ở viewport 360 × 640 ngày 2026-11-04; chưa kiểm thử trên điện thoại thật. Nhắc “Nhắc tôi sau” hiện dùng `localStorage` theo tài khoản và trình duyệt, nên không đồng bộ giữa các thiết bị.
- Build production Angular từng không hoàn tất ngày 2026-10-26 vì môi trường không tải được Google Fonts; chưa có bằng chứng kiểm tra lại sau đó.
- Việc kiểm thử trực tiếp trên điện thoại người dùng vẫn còn mở. `agent-browser` đã khả dụng và đã được dùng để kiểm thử trình duyệt trong phiên 2026-11-04.
- Các mục lịch sử 2026-10-26 nói về thay đổi trực tiếp trong `app.component.*` là đúng tại thời điểm đó, nhưng không còn là vị trí mã hiện tại sau refactor 2026-11-02; chức năng tương ứng hiện thuộc các feature component.

## Kết quả kiểm thử

### Sửa CORS khi chạy qua IP LAN — 2026-11-05

- Regression test mới xác nhận whitelist chấp nhận `http://localhost:4200`, `http://192.168.31.181:4200` và request không có Origin, đồng thời từ chối origin không cấu hình; backend test 4/4 thành công. Frontend development build thành công.
- Chạy backend kiểm chứng tạm thời ở cổng 4010 với cấu hình `.env` mới: `GET /api/health` trả HTTP 200; header `Access-Control-Allow-Origin` lần lượt đúng cho `http://localhost:4200` và `http://192.168.31.181:4200`, trống với `http://example.test:4200`. Server tạm đã dừng.
- Frontend nay suy ra API từ hostname của URL đang mở, nên `localhost:4200` gọi `localhost:4000/api`, còn IP LAN gọi IP đó ở cổng 4000. Cần khởi động lại backend đang chạy ở cổng 4000 để nhận cấu hình mới; IP LAN có thể đổi và phải cập nhật `backend/.env`.

### Kiểm thử hoàn thiện kho cơ bản — 2026-11-05

- `npm.cmd run build -- --configuration development` trong `frontend` thành công sau thay đổi; `npm.cmd test` trong `backend` thành công 2/2 test validation hồ sơ; `node --check` cho backend liên quan thành công. Bộ test tự động hiện chưa bao phủ component Angular mới, nên không coi các lệnh này là xác minh UI.
- Runtime tại `http://localhost:4200` với API health HTTP 200, `{"status":"ok","database":"connected"}`. Browser automation bằng `agent-browser` đăng nhập tài khoản QA riêng và xác minh accessibility snapshot sau từng thao tác.
- Xác nhận thành công: control sắp xếp mặc định `Mới thêm` đưa món tạo sau lên trước; `Tên A–Z` đổi đúng thứ tự; tìm kiếm tiếp tục lọc đúng; nút số lượng mở hộp cập nhật nhanh; input không hợp lệ `abc` hiển thị validation; giá trị `3,5` lưu thành `3.50`; `Nhập lại món này` giữ tên/đơn vị, đặt số lượng 1 và để trống hạn dùng; thông báo thành công dùng role `status`. Ảnh viewport 360 × 640 lưu tạm tại `C:\Users\duc12\AppData\Local\Temp\pantry-basic-20261104\mobile-inventory.png`.
- Backend request log xác nhận trong cùng phiên: `POST /api/inventory` 201, `PATCH /api/inventory/:id` 200, hai `DELETE /api/inventory/:id` 204, `GET /api/inventory` 200. Hai thực phẩm QA đã được xóa, kho tài khoản QA trở lại 0 món; console browser không có lỗi.

### Kiểm thử runtime bằng browser automation — 2026-11-04

- Đã đọc hướng dẫn `agent-browser` và `dogfood`; `agent-browser` v0.41.2 khả dụng qua `agent-browser.cmd`. PowerShell chặn wrapper `.ps1` bởi execution policy, và công cụ cần quyền ghi socket profile ngoài sandbox; đây là giới hạn môi trường kiểm thử, không phải lỗi ứng dụng.
- Xác nhận runtime: API `GET http://localhost:4000/api/health` trả HTTP 200 và `{"status":"ok","database":"connected"}`; Angular phục vụ tại `http://localhost:4200`. Cấu hình khởi động đối chiếu từ `backend/package.json` là `npm run dev`, từ `frontend/package.json` là `npm start`.
- Accessibility snapshot ở trang đăng nhập xác nhận chính xác các control: Email, Mật khẩu, Hiện, Ghi nhớ đăng nhập, Quên mật khẩu?, Đăng nhập và Đăng ký. Đăng ký tài khoản QA riêng thành công, mở thiết lập hồ sơ; lưu mục tiêu 2.100 kcal, chiều cao 170 cm, cân nặng 65 kg thành công và Tổng quan hiển thị lại `2,100 kcal mỗi ngày`.
- QA xác thực/điều hướng độc lập xác nhận: đăng ký → bỏ qua hồ sơ → Tổng quan → `/inventory` → `/`, đăng xuất rồi đăng nhập lại thành công. Backend log ghi `POST /register` 201, `POST /login` 200; đăng nhập sai trả 401 cùng thông báo UI phù hợp. “Quên mật khẩu?” thông báo chưa triển khai, đúng phạm vi MVP.
- QA kho thực phẩm xác nhận bằng UI và snapshot sau từng thao tác: trạng thái trống; validation thiếu tên; thêm một thực phẩm QA; tìm kiếm; sửa tên, số lượng từ 1 lên 2,5 và đơn vị sang kg; xác nhận xóa; xóa thành công và Tổng quan trở lại 0 thực phẩm. Không thấy lỗi console trong các luồng đã kiểm tra.
- Ghi nhận môi trường: mở frontend tại `http://127.0.0.1:4200` làm đăng ký báo không kết nối được do origin này không khớp `FRONTEND_ORIGIN=http://localhost:4200`; ảnh lỗi tạm ở `C:\Users\duc12\AppData\Local\Temp\pantry-qa-20261104\registration-error.png`. Mở tại `http://localhost:4200` theo cấu hình thì đăng ký và các luồng trên thành công; không ghi đây là lỗi sản phẩm trong cấu hình chuẩn.
- Dữ liệu thực phẩm QA đã được xóa qua giao diện. Các tài khoản QA riêng vẫn còn vì API/UI không có chức năng xóa tài khoản; không có dữ liệu thực phẩm QA còn lại trong tài khoản đã kiểm tra. Chưa kiểm thử QR, giọng nói, tra cứu sản phẩm, thực đơn vì chưa triển khai.

### Hiện tại — 2026-11-04

- Rà soát tĩnh mã nguồn, `package.json`, schema, route/controller/service và component Angular: xác nhận các chức năng ghi trong **Đã triển khai** và xác nhận không thấy mã nguồn QR, giọng nói, tra cứu sản phẩm, dinh dưỡng hay thực đơn.
- `npm.cmd test` trong `backend`: 2/2 test `readProfile` thành công, gồm trường hợp hợp lệ và mục tiêu calo không hợp lệ.
- `node --check` thành công với toàn bộ tệp JavaScript trong `backend/src`.
- `npm.cmd run build -- --configuration development` trong `frontend`: thành công.
- Đã chạy `backend/schema.sql` trên PostgreSQL phát triển: cột hồ sơ và ràng buộc được thêm an toàn; đối tượng cũ được bỏ qua đúng dự kiến.
- API smoke test trên backend tạm tại cổng 4010: health, đăng ký tài khoản tạm, `PATCH /api/auth/profile` và `GET /api/auth/me` đều thành công. Tài khoản tạm cùng dữ liệu liên quan đã được xóa; server test đã dừng.
- Lưu ý lịch sử: trước khi triển khai hồ sơ trong cùng ngày, chỉ có rà soát tài liệu/mã nguồn và không chạy runtime. Kết quả hiện tại ở các dòng trên thay thế nhận định đó cho phiên này.

### Lịch sử — 2026-11-02

- `node --check` thành công với 9 tệp JavaScript trong `backend/src`; `npm.cmd run build -- --configuration development` trong `frontend` thành công.
- Rà soát import xác nhận không còn tham chiếu đến các file backend/frontend cũ sau refactor; endpoint và API client giữ đường dẫn.
- API smoke test với PostgreSQL thật: health, đăng ký, đăng nhập, kiểm tra quyền truy cập, validation và CRUD thực phẩm thành công; tài khoản và dữ liệu tạm đã được xóa sau kiểm tra.
- Frontend dev server: `/`, `/inventory`, `sw.js` và `manifest.webmanifest` trả HTTP 200 với nội dung mong đợi.
- Không kiểm tra click/form bằng browser automation do phiên đó không có Playwright, Puppeteer hoặc công cụ tương đương.
- Đối chiếu `frontend/package.json`, README và mã nguồn xác nhận dự án dùng Angular 22; phiên thống nhất công nghệ không chạy build hay ứng dụng.

### Lịch sử — 2026-10-26

- Development build Angular thành công ở các phiên tách nội dung tab, điều hướng và sửa form; `http://localhost:4200` và `/inventory` từng trả HTTP 200.
- Chromium xác nhận điều hướng `/` và `/inventory`, tab/breadcrumb, Back/Forward, liên kết không dùng `#`, và hai trang hiển thị đúng nội dung; tài khoản kiểm thử đã được xóa.
- Chromium headless xác nhận đăng ký qua giao diện và CRUD thực phẩm; test ở viewport 360 × 640 xác nhận hộp thoại cao 460 px, cuộn được và Escape đóng hộp thoại.
- Kiểm tra bàn phím/chuột qua Chromium: nhập được tên, số lượng `4,5`, đơn vị `kg`, Tab đến hạn sử dụng và lưu được. Các ca hợp lệ gồm số lượng `0,5`, đơn vị tự nhập, hạn sử dụng trống; các ca không hợp lệ gồm thiếu trường bắt buộc, số âm, ký tự không phải số, quá 2 chữ số thập phân và vượt `99.999.999` đều bị chặn, giữ form và hiện lỗi tiếng Việt.
- Mô phỏng API trả HTTP 400: lỗi server hiển thị trong form và dữ liệu form được giữ lại. Service worker tại `/sw.js` từng trả HTTP 200 với cache shell v2.
- API health từng báo database connected; CORS preflight từ `localhost:4200` trả 204; đăng ký với payload rỗng trả 400 và `/api/auth/me` thiếu token trả 401, đều có CORS header đúng.
- Truy vấn PostgreSQL từng xác nhận server 18.6, database `pantry_pwa`, user `postgres` và bảng cần thiết; dependencies backend đã cài và API Express từng chạy.
- Build production frontend chưa hoàn tất vì Angular không tải được Google Fonts trong môi trường khi đó. Trạng thái treo từng chưa tái hiện được trong trình duyệt thật.

## Nhật ký phiên làm việc

### 2026-11-05 — sửa kết nối frontend qua IP LAN

- Thêm `backend/src/cors.config.js` cùng regression test, sửa `backend/src/server.js` dùng whitelist CORS, đổi cấu hình phát triển sang `FRONTEND_ORIGINS`, và cập nhật frontend để gọi API theo hostname hiện tại. `README.md` mô tả cách dùng cùng Wi-Fi và lưu ý Firewall/IP động.
- Không dùng CORS wildcard, không đổi API contract, schema hoặc dependency. Kiểm thử thực tế header CORS bằng server tạm cổng 4010; server tạm đã dừng.

### 2026-11-05 — hoàn thiện thao tác kho cơ bản

- Theo phạm vi đã chốt, bổ sung sắp xếp kho theo món mới thêm/tên A–Z, nhập lại món có sẵn và cập nhật số lượng nhanh; không thêm tính năng QR, giọng nói, Gemini, vị trí lưu trữ, lọc/cảnh báo hạn dùng hoặc thay đổi schema.
- Sửa `frontend/src/app/core/services/inventory.service.ts` để nhận `created_at` API đã trả; `frontend/src/app/features/inventory/inventory.component.ts` và `.html` cho ba thao tác kho; `frontend/src/app/app.component.*` cùng `frontend/src/styles.css` để hiển thị phản hồi thành công/lỗi có semantics accessibility và bố cục điện thoại. Không thêm dependency.
- Đã build, chạy test/backend syntax check và kiểm thử browser thực tế bằng dữ liệu QA tách biệt; dữ liệu thực phẩm QA đã dọn qua UI. Chi tiết bằng chứng ở **Kiểm thử hoàn thiện kho cơ bản**.

### 2026-11-04 — kiểm thử giao diện runtime bằng agent-browser

- Team Lead đọc `AGENTS.md`, `README.md`, `PROGRESS.md`, hướng dẫn Skills `agent-browser`/`dogfood`, và đối chiếu lệnh chạy trong hai `package.json`; không sửa mã nguồn hay database schema.
- Kiểm thử hai luồng browser độc lập bằng tài khoản QA riêng trên `http://localhost:4200`: xác thực, hồ sơ mục tiêu, điều hướng và CRUD kho. Mọi kết luận runtime trong mục **Kiểm thử runtime bằng browser automation** đều có snapshot UI sau thao tác; không suy diễn từ build hoặc đọc mã nguồn.
- Đã tạo ảnh lỗi cho trường hợp origin `127.0.0.1` lệch CORS và xác minh lại cùng luồng ở origin `localhost` chuẩn. Đã xóa thực phẩm QA qua UI; chưa xóa được tài khoản QA do không có endpoint/chức năng tương ứng.

### 2026-11-04 — hồ sơ mục tiêu năng lượng và nhắc thiết lập

- Thêm các cột nullable `height_cm`, `weight_kg`, `daily_calorie_target` cùng ràng buộc phạm vi vào `backend/schema.sql`; đã áp dụng trên PostgreSQL phát triển mà không sửa dữ liệu kho.
- Thêm `PATCH /api/auth/profile`, validation có test native Node, và bổ sung dữ liệu hồ sơ vào phản hồi đăng ký/đăng nhập/lấy tài khoản.
- Thêm `ProfileComponent`, luồng thiết lập sau đăng ký, banner nhắc tối đa một lần mỗi 24 giờ theo tài khoản/trình duyệt, và khả năng xem/cập nhật mục tiêu từ Tổng quan. Không triển khai đề xuất thực đơn hoặc tính calo.
- Sửa `README.md` mô tả phạm vi và endpoint; đã chạy test backend, kiểm tra cú pháp, build Angular và API smoke test thành công.

### 2026-11-04 — chuẩn hóa hệ thống quản lý tiến độ

- Đọc `AGENTS.md`, `README.md`, `PROGRESS.md` và rà soát cấu trúc/mã nguồn thực tế. Không có thư mục `.codegraph`, nên không có chỉ mục CodeGraph để dùng.
- Sao lưu nguyên trạng `PROGRESS.md` thành `PROGRESS.backup.md`; SHA-256 hai tệp giống nhau trước khi chuẩn hóa: `A7604F9AB6EED5D0DCA543119E264E85CBAA934EBCFE0839287496C5D45915FF`.
- Chuẩn hóa các mục tiến độ, gom kết quả kiểm thử trùng lặp theo ngày và tách rõ trạng thái hiện tại với lịch sử. Không xóa quyết định kỹ thuật hoặc kết quả kiểm thử quan trọng.

### 2026-11-02 — tách cấu trúc frontend và backend

- Tách backend thành `db`, `services`, `middleware`, `controllers`, `routes`; giữ nguyên API. Tách frontend thành `core/services` và ba feature `auth`, `dashboard`, `inventory`; `AppComponent` chỉ quản lý phiên, điều hướng và phản hồi chung.
- Xóa các file cũ được thay thế: `backend/src/auth.js`, `backend/src/db.js`, `frontend/src/app/inventory.service.ts`.

### 2026-11-02 — thống nhất công nghệ frontend

- Cập nhật `AGENTS.md` từ định hướng React PWA sang Angular PWA để khớp mã nguồn và README.

### 2026-10-26 — trải nghiệm kho, điều hướng và chẩn đoán

- Cải thiện form thêm/sửa: Escape, chống đóng/mở khi đang lưu, `markForCheck`, focus sau render, nhập thập phân bằng dấu phẩy, đơn vị tự do/gợi ý, xử lý lỗi, hộp thoại cuộn trên màn hình nhỏ và cache shell mới.
- Đưa điều hướng về URL thật `/` và `/inventory` bằng History API, hỗ trợ Back/Forward và tab mới; tách nội dung Tổng quan với Kho thực phẩm.
- Bổ sung request logger chỉ ghi method/path/status/thời gian và phản hồi lỗi chung cho lỗi đăng nhập, tải kho, CRUD, khôi phục phiên và lỗi JavaScript chưa xử lý.

### 2026-11-06 — khởi tạo repository GitHub

- Khởi tạo Git tại thư mục gốc và đẩy commit đầu tiên `eb57127` lên nhánh `main` của `https://github.com/HoangDuc1307/Doantotnghiep`.
- Commit gồm mã nguồn `backend`, `frontend`, tài liệu báo cáo và tài liệu dự án. `.gitignore` đã loại cache Angular, dependencies, `.env`, log và các tệp sinh tự động/cấu hình cục bộ của công cụ phát triển.
- Đã kiểm tra trước khi commit: repository đích chưa có nhánh, danh sách tệp staged không gồm các thư mục bị ignore, và không thấy mẫu secret phổ biến. Chưa chạy lại build hay test trong phiên chỉ khởi tạo repository này.

## Bàn giao phiên tiếp theo

- Team Lead chủ động cập nhật `PROGRESS.md` sau mỗi phiên đáng kể theo quy tắc ở **Tổng quan dự án**, không cần chờ nhắc lại.
- Trước khi thay đổi chức năng, kiểm tra vị trí mã hiện tại trong `frontend/src/app/features/*`, `frontend/src/app/core/services` và `backend/src/*`; không dựa vào đường dẫn cũ trong nhật ký.
- Khi chạy lại runtime, ghi ngày, cấu hình đã dùng (không kèm secret), lệnh/các bước, kết quả, dữ liệu test đã dọn hay chưa, và cập nhật các mục ưu tiên/vấn đề tồn đọng tương ứng.
