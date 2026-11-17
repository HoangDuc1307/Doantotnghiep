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
- Dữ liệu USDA Foundation Foods: bảng `foods`, importer có thể chạy lại an toàn và API tìm kiếm để người dùng xác nhận thực phẩm. Bản nguồn 10/2026 đã nhập 95 bản ghi có kcal/100 g; tệp nguồn cục bộ bị Git ignore.
- Gợi ý bữa ăn AI: `POST /api/meal-plans/suggestions` yêu cầu bearer token và dùng tối đa 15 thực phẩm có hạn gần nhất thuộc tài khoản. Model mặc định là `gpt-6-sol`; AI trả tối đa ba bữa theo mã bản ghi kho và gram khẩu phần ước tính, còn backend tính kcal từ dữ liệu dinh dưỡng đã lưu. Trước khi gọi AI, Dashboard tự thử ghép tối đa ba thực phẩm chưa liên kết với kết quả DLPL gần nhất; thực đơn luôn ghi rõ kcal là ước tính, không phải số đo hay tư vấn y tế.
- Chưa có mã nguồn cho: quên/đặt lại mật khẩu (giao diện chỉ báo chưa triển khai), QR, nhập giọng nói, tra cứu sản phẩm, dữ liệu dinh dưỡng có cấu trúc, tính năng lượng tiêu thụ thực tế, lưu/xem kế hoạch thực đơn hay đề xuất có năng lượng được kiểm chứng. Mục tiêu calo được gửi như ngữ cảnh cho gợi ý AI nhưng không được dùng để khẳng định thực đơn đáp ứng mục tiêu hoặc đưa ra khuyến nghị sức khỏe.

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
- Gợi ý AI chưa có dữ liệu dinh dưỡng có cấu trúc trong workspace, nên không được dùng để tính hoặc xác nhận năng lượng. Free tier MộtAPI có thể thay đổi, chậm, lỗi hoặc bị dừng mà không báo trước; backend trả lỗi có kiểm soát khi dịch vụ không khả dụng.
- USDA Foundation Foods chỉ có 95 bản ghi có trường kcal trong bản tải 10/2026; phạm vi chưa bao phủ toàn bộ thực phẩm tại Việt Nam. Thực phẩm chưa được người dùng chọn USDA, hoặc dùng đơn vị khác g/kg, không được đưa vào phép tính kcal.
- Dashboard hiện tự lưu kết quả DLPL đầu tiên cho tối đa ba thực phẩm chưa liên kết trước khi tạo gợi ý. Điều này khác với quyết định chỉ tự ghép khi tên chuẩn hóa khớp đúng duy nhất; cần sửa trước khi coi kcal ước tính là đáng tin cậy.
- Các mục lịch sử 2026-10-26 nói về thay đổi trực tiếp trong `app.component.*` là đúng tại thời điểm đó, nhưng không còn là vị trí mã hiện tại sau refactor 2026-11-02; chức năng tương ứng hiện thuộc các feature component.

## Kết quả kiểm thử

### Sửa lỗi 502 khi tạo gợi ý bữa ăn — 2026-11-13

- Nguyên nhân đã tái hiện: MộtAPI nhận request `deepseek-v4-flash` thành công nhưng model chỉ trả `reasoning_content`, còn `choices[0].message.content` rỗng. Backend từ chối đúng phản hồi rỗng này và trả HTTP 502.
- Đổi model mặc định, `.env.example` và cấu hình phát triển cục bộ sang `gpt-6-luna`; không đổi prompt, route, xác thực, dữ liệu kho hoặc schema. Một lần gọi với thực phẩm giả chỉ trong bộ nhớ trả 1 bữa hợp lệ từ `gpt-6-luna`.
- `npm.cmd test` trong `backend`: 7/7 thành công; `node --check src/services/ai.service.js` thành công. Chạy tạm `npm.cmd run dev` xác nhận health HTTP 200 với database connected; `POST /api/meal-plans/suggestions` thiếu bearer trả 401 đúng dự kiến. Server kiểm thử đã dừng để không chiếm cổng của phiên phát triển người dùng; chưa chạy luồng UI có đăng nhập lại sau sửa.

### Ép định dạng JSON cho gợi ý AI — 2026-11-13

- Bổ sung `response_format: { type: 'json_object' }` và `temperature: 0` vào request MộtAPI. Thay đổi buộc model trả JSON, giảm việc model thêm văn bản ngoài cấu trúc hoặc sinh phương án không lặp lại.
- Kiểm thử trực tiếp `generateMealSuggestion` với thực phẩm giả trong bộ nhớ trả 2 bữa hợp lệ từ `gpt-6-luna` trong 5.228 giây. Backend `node --watch` đã tự khởi động lại sau thay đổi; `npm.cmd test` đạt 7/7 và syntax check thành công.

### Giảm độ trễ gợi ý AI — 2026-11-13

- Log runtime ghi nhận một yêu cầu gợi ý thành công mất 26.175 giây. Đo lại với 15 thực phẩm giả: `gpt-6-luna` mất 28.561 giây, nên độ trễ nằm ở model chứ không phải route hay PostgreSQL.
- Chuyển model mặc định sang `gpt-6-sol`, chỉ gửi 15 món theo thứ tự hạn gần nhất, giới hạn mỗi món tối đa 5 nguyên liệu/4 bước và phản hồi tối đa 500 token. Cùng payload 15 món trả 3 bữa hợp lệ trong 11.813 giây; `npm.cmd test` backend đạt 7/7, syntax check service/controller thành công.

### Đối chiếu dinh dưỡng bán tự động — 2026-11-13

- Sau khi AI trả gợi ý chưa đủ kcal, Dashboard tự tìm tối đa ba kết quả DLPL cho từng thực phẩm. Tự lưu chỉ khi tên sau chuẩn hóa khớp đúng duy nhất; tên mơ hồ hiển thị tối đa ba lựa chọn để xác nhận một chạm hoặc cho phép tìm tên khác. Lựa chọn được lưu bằng API hiện có nên tái sử dụng ở những lần sau.
- Không tự quy đổi quả/hộp/ml sang gram. Nếu món đã liên kết dữ liệu nhưng chưa dùng g/kg, giao diện dẫn người dùng về Kho thực phẩm để sửa số lượng, rồi tạo lại gợi ý.
- `npm.cmd run build -- --configuration development` trong `frontend` thành công. Chưa kiểm thử DLPL và thao tác xác nhận bằng tài khoản thật trong trình duyệt.

### Thực đơn kcal ước tính không yêu cầu gram — 2026-11-13

- Đổi contract AI từ số lượng/đơn vị kho sang `grams` khẩu phần do AI đề xuất. Backend vẫn kiểm tra mã kho, gram dương và giới hạn 1.500 g mỗi nguyên liệu, sau đó tự tính kcal từ dữ liệu có cấu trúc. Số lượng kho nay chỉ biểu thị thực phẩm đang có, không chặn thực đơn khi người dùng nhập quả/củ/hộp.
- Dashboard tự thử ghép và lưu tối đa ba thực phẩm chưa có dữ liệu bằng kết quả DLPL gần nhất trước khi gọi AI; thất bại ghép chỉ hạ mức hoàn chỉnh kcal, không chặn gợi ý. Giao diện gọi kết quả là kcal ước tính và hiển thị gram AI đề xuất thay vì buộc người dùng tự đổi đơn vị.
- `npm.cmd test` backend đạt 7/7, syntax check backend và Angular development build thành công. Gọi trực tiếp `generateMealSuggestion` với trứng gà/su su/thịt ba chỉ cùng mục tiêu 700 kcal trả 2 món, 691 kcal ước tính, trong 9.543 giây. Chưa kiểm thử toàn bộ luồng DLPL với tài khoản thật qua trình duyệt.

### Hiệu chỉnh kcal ước tính theo mục tiêu — 2026-11-13

- Kiểm thử trình duyệt do người dùng thực hiện xác nhận luồng tự ghép DLPL → AI → tính kcal chạy được, nhưng một thực đơn 880 kcal lệch 620 kcal so với mục tiêu 1.500 kcal.
- Siết prompt: AI phải dùng `energyKcalPer100g` để chọn khẩu phần gram trong khoảng ±15% mục tiêu khi đủ dữ liệu, nhưng không được tự trả kcal; backend vẫn tự tính lại. Gọi trực tiếp với trứng gà/su su/thịt ba chỉ và mục tiêu 1.500 kcal trả 1.417 kcal, chênh 83 kcal (5,5%), trong 11.577 giây. `npm.cmd test` backend đạt 7/7.

### Định lượng khẩu phần thân thiện — 2026-11-13

- AI nay trả song song quantity/unit để hiển thị và gram nội bộ để tính kcal. Prompt ưu tiên quả/củ/bó/hộp cho trứng, rau, củ, quả và đơn vị đếm; thịt, cá, gà hiển thị g. Backend xác thực cả quantity/unit/grams nhưng chỉ dùng gram để tính kcal.
- Gọi trực tiếp với trứng gà đơn vị quả, su su đơn vị củ và thịt ba chỉ đơn vị g trả `2 quả`, `1 củ` và thịt theo g; backend tính 1.585 kcal so với mục tiêu 1.500 kcal. `npm.cmd test` backend đạt 7/7 và Angular development build thành công.

### Sửa CORS cho `127.0.0.1` — 2026-11-12

- Bổ sung `http://127.0.0.1:4200` vào `FRONTEND_ORIGINS` cục bộ và `.env.example`; vẫn giữ whitelist, không dùng wildcard.
- `npm.cmd test` trong `backend`: 5/5 thành công. Regression test CORS xác nhận `localhost`, `127.0.0.1`, IP LAN được cấu hình và request không có Origin đều được chấp nhận; origin không cấu hình vẫn bị từ chối.

### Tích hợp gợi ý bữa ăn AI — 2026-11-12

- Thêm cấu hình MộtAPI chỉ ở backend qua `MOTAPIS_API_KEY`, `MOTAPIS_BASE_URL` và `MOTAPIS_MODEL`; khóa không nằm trong frontend, README hay `PROGRESS.md`. Dùng native `fetch` của Node 24 và không thêm dependency.
- `npm.cmd test` trong `backend`: 5/5 thành công, gồm test mới xác nhận prompt coi kho là dữ liệu và cấm khẳng định kcal/dinh dưỡng chưa kiểm chứng. `node --check` cho server, route, controller và service AI thành công. Frontend development build thành công.
- Service backend gọi `gpt-6-luna` qua MộtAPI với dữ liệu thử tối thiểu và nhận được gợi ý hợp lệ. Endpoint `/api/meal-plans/suggestions` không có bearer token trả HTTP 401. Không tạo hoặc thay đổi dữ liệu PostgreSQL để kiểm thử endpoint có xác thực.
- Chưa kiểm thử UI bằng browser automation: `agent-browser` không thể tự khởi chạy Chrome do Windows Application Control chặn tệp Chrome của công cụ. Không coi development build là xác minh tương tác nút hay hiển thị gợi ý.

### Dữ liệu USDA và thực đơn có kcal kiểm chứng — 2026-11-12

- Tải Foundation Foods JSON 10/2026 từ USDA FoodData Central, áp dụng schema không phá hủy và nhập 95 bản ghi có năng lượng kcal/100 g. Kiểm tra đếm trực tiếp PostgreSQL xác nhận 95 bản ghi.
- Thêm API tìm USDA, lựa chọn xác nhận ở form kho, liên kết `inventory_items.food_id`, và chỉ nhận g/kg cho tính toán. AI buộc trả JSON có foodId/gram; server từ chối mã không tồn tại, lượng âm hoặc vượt kho rồi tự tính kcal từ dữ liệu USDA.
- Gọi thử `gpt-6-luna` bằng dữ liệu USDA riêng: nhận 2 món, backend tính 2.741 kcal so với mục tiêu 3.161 kcal, chênh 420 kcal. `npm.cmd test` backend đạt 6/6; Angular development build thành công. Browser automation vẫn bị Windows Application Control chặn.

### Gợi ý từ kho không yêu cầu liên kết USDA — 2026-11-12

- Bỏ điều kiện chặn gợi ý khi thực phẩm chưa chọn USDA hoặc không dùng g/kg. AI nhận toàn bộ kho và backend vẫn kiểm tra số lượng/đơn vị không vượt dữ liệu người dùng.
- Khi một phương án có nguyên liệu thiếu đối chiếu USDA hoặc không quy đổi được sang gam, `totalKcal` và độ chênh trả về `null`, giao diện nêu rõ các món khiến kcal chưa kiểm chứng. Khi toàn bộ nguyên liệu đủ dữ liệu, backend vẫn tính kcal như trước.
- Kiểm thử trực tiếp với trứng/cà chua đơn vị quả chưa liên kết USDA: AI trả 3 món, không có tổng kcal và liệt kê đúng hai món chưa kiểm chứng. Backend test 6/6 và Angular development build thành công.

### Sửa hiển thị gợi ý AI sau HTTP 200 — 2026-11-12

- Nguyên nhân: Dashboard cập nhật kết quả Promise nhưng thiếu `ChangeDetectorRef.markForCheck()`, trong khi các component bất đồng bộ khác của dự án đã dùng cơ chế này.
- Thêm đánh dấu render khi bắt đầu/kết thúc yêu cầu và sửa chú thích kcal để khớp luồng USDA tùy chọn. Angular development build thành công; browser automation chưa khả dụng do Windows Application Control chặn Chrome của công cụ.

### Tối ưu tốc độ và giao diện gợi ý — 2026-11-12

- Đo trực tiếp cùng dữ liệu kiểm thử: `deepseek-v4-flash` trả thực đơn hợp lệ trong 4.733 giây, thay cho lần gọi `gpt-6-luna` khoảng 19,5 giây. Đặt Flash làm mặc định, giới hạn tối đa ba bữa và 700 output token.
- Thay văn bản thô bằng thẻ bữa ăn có tên món, nguyên liệu/số lượng và danh sách bước nấu. Backend test 6/6 và Angular development build thành công; chưa kiểm thử click trực tiếp do hạn chế browser automation.

### Dời đối chiếu USDA sang sau gợi ý — 2026-11-12

- Bỏ picker USDA khỏi form thêm/sửa kho, nên luồng nhập thực phẩm trở lại chỉ có tên, lượng, đơn vị và hạn dùng. Chỉnh sửa số lượng vẫn giữ liên kết USDA đã có.
- Khi kcal chưa kiểm chứng, Dashboard tự tìm tối đa ba dữ liệu Việt Nam cho từng món AI dùng. Chỉ khi tên chuẩn hóa khớp chính xác duy nhất hệ thống mới tự lưu đối chiếu; các trường hợp còn lại yêu cầu người dùng xác nhận một chạm và lưu lựa chọn cho những lần sau. Món đã có dữ liệu nhưng dùng đơn vị khác g/kg được nhắc đổi đơn vị trước khi tạo lại gợi ý để tính kcal.
- Backend test 6/6 và Angular development build thành công. Chưa kiểm thử click trực tiếp do Windows Application Control chặn browser automation.

### Tích hợp dữ liệu dinh dưỡng Việt Nam — 2026-11-13

- Thay luồng tra cứu USDA bằng DLPL API: dữ liệu thuộc Bảng thành phần thực phẩm Việt Nam của Viện Dinh dưỡng Quốc gia, tìm theo tên tiếng Việt và trả kcal/100 g.
- Không tải hàng loạt do gói Free giới hạn 5 trang/truy vấn; backend chỉ lấy lại và lưu cục bộ bản ghi người dùng chọn, nên không tin kcal do trình duyệt gửi lên. Schema `foods` có thêm `source_id` để lưu nhiều nguồn mà vẫn giữ các liên kết cũ.
- Đã gọi DLPL thành công, áp dụng migration PostgreSQL và kiểm thử tìm/lưu một bản ghi đã xác minh. Backend test 7/7 và Angular development build thành công. Cần chạy lại backend đang mở để nhận biến `DLPL_API_KEY` và mã mới.

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

### 2026-11-09 — rà soát tài liệu và mã nguồn

- Đối chiếu `AGENTS.md`, `README.md`, `PROGRESS.md`, báo cáo DOCX trong `docs` và mã nguồn hiện tại. Xác nhận phạm vi đang có: xác thực bearer HMAC, hồ sơ gồm chiều cao/cân nặng tùy chọn và mục tiêu kcal do người dùng nhập, CRUD kho theo chủ sở hữu, PWA chỉ cache giao diện. QR, giọng nói, tra cứu sản phẩm, dữ liệu dinh dưỡng tích hợp, AI và thực đơn chưa có mã nguồn/route/schema tương ứng.
- Báo cáo DOCX là tài liệu phân tích–thiết kế chưa hoàn tất: mục lục có Chương 3 và kết luận nhưng nội dung dừng ở phần thiết kế CSDL; cần hoàn thiện các phần xây dựng, kiểm thử, kết luận và ma trận phân biệt **đã triển khai** với **thiết kế mở rộng** trước khi dùng làm báo cáo kết quả. Các mô tả `nutrition_profiles`, `foods`, `recipes`, `meal_plans` là thiết kế; mã hiện lưu ba trường hồ sơ ngay trong `users`.
- Báo cáo nêu bộ USDA đã chuẩn hóa nhưng tệp CSV/JSON không có trong workspace; liên kết là tài sản ngoài repo. Cần bổ sung tài sản và bằng chứng tái lập, hoặc ghi rõ điều này trước khi khẳng định dữ liệu sẵn sàng tích hợp.
- Kiểm tra ngày 2026-11-09: `npm.cmd test` trong `backend` đạt 4/4; `npm.cmd run build -- --configuration development` trong `frontend` thành công. Không chạy browser/PWA runtime trong phiên này. Kiểm tra Git không thực hiện được vì thư mục `.git` thuộc tài khoản Windows khác và Git báo `dubious ownership`; không thay đổi cấu hình Git.

### 2026-11-12 — tích hợp gợi ý bữa ăn qua MộtAPI

- Bổ sung service, controller và route backend cho `POST /api/meal-plans/suggestions`; endpoint xác thực người dùng, đọc kho thuộc sở hữu của họ và mục tiêu năng lượng đã lưu. MộtAPI chỉ nhận tên, lượng, đơn vị và hạn sử dụng của tối đa 50 thực phẩm; không gửi email, token hay định danh người dùng.
- Thêm nút tạo gợi ý ở Dashboard cùng trạng thái chờ/lỗi và ghi chú rõ kết quả không phải tính toán dinh dưỡng. Không thêm schema, nguồn USDA, QR, giọng nói, lưu kế hoạch thực đơn hay tự trừ kho.
- Cập nhật `.env.example` và README cho cấu hình MộtAPI. Giá trị khóa thật chỉ ở `backend/.env` đã bị Git ignore; không ghi lại giá trị trong tài liệu.

### 2026-11-12 — sửa CORS khi mở frontend bằng `127.0.0.1`

- Sửa lỗi trình duyệt có thể gửi `POST /api/auth/login` thành công nhưng chặn phản hồi khi frontend mở tại `http://127.0.0.1:4200`: thêm origin này vào whitelist cục bộ và cấu hình mẫu.
- Mở rộng regression test; không thay đổi cơ chế CORS, contract API hoặc dependency.

### 2026-11-12 — dữ liệu USDA và thực đơn tính kcal tại backend

- Bổ sung bảng `foods`, importer Foundation Foods, API tìm kiếm và trường liên kết tùy chọn trong kho. Người dùng phải chọn kết quả USDA; không tự ghép tên thực phẩm.
- Đổi gợi ý AI sang dữ liệu có cấu trúc gồm món, nguyên liệu theo `foodId`/gram và bước nấu. Backend kiểm tra tổng gram không vượt kho, sau đó tính kcal từ `energy_kcal_per_100g` của USDA, không dùng kcal do AI tạo.
- Không thêm công thức/lưu thực đơn, quy đổi hộp–quả–ml hoặc dữ liệu thực phẩm Việt Nam. Các tệp USDA lớn bị Git ignore và có hướng dẫn tải/nhập lại trong README.

### 2026-11-12 — cho phép gợi ý từ toàn bộ kho

- Theo phản hồi nghiệp vụ, USDA là dữ liệu đối chiếu chứ không phải điều kiện bắt buộc để AI dùng một món trong kho. Sửa controller, service và Dashboard theo hai trạng thái kcal: đã kiểm chứng hoặc chưa đủ dữ liệu.
- Không tự quy đổi hay suy đoán kcal cho thực phẩm chưa đối chiếu; nhờ đó luồng gợi ý không bị trả HTTP 400 chỉ vì người dùng nhập theo quả/hộp/ml.

### 2026-11-12 — sửa Dashboard không render gợi ý đã nhận

- Sửa component Dashboard gọi `markForCheck()` sau yêu cầu gợi ý bất đồng bộ. Backend từng trả HTTP 200 nhưng UI không hiện món/cách nấu do thay đổi trạng thái không kích hoạt render.

### 2026-11-12 — tối ưu tốc độ và trình bày thực đơn

- Chuyển model mặc định MộtAPI sang `deepseek-v4-flash` sau phép đo trực tiếp, giảm giới hạn phản hồi và giữ timeout bảo vệ. Không thêm model fallback hoặc dependency.
- Giao diện Dashboard hiện trình bày bữa ăn, nguyên liệu và các bước nấu bằng card thay vì chuỗi văn bản nguyên khối.

### 2026-11-12 — giảm thao tác nhập kho cho đối chiếu kcal

- Theo quyết định UX, dời tra cứu/chọn USDA từ form kho sang phần theo dõi tùy chọn sau khi AI trả thực đơn. Không bắt người dùng nhập thêm trước khi có gợi ý.
- Không tự ghép dữ liệu USDA; lựa chọn vẫn do người dùng xác nhận để bảo toàn tính đúng đắn của kcal.

### 2026-11-13 — sửa lỗi 502 từ model gợi ý bữa ăn

- Xác minh trực tiếp MộtAPI, API key và endpoint vẫn hoạt động; lỗi xuất phát từ `deepseek-v4-flash` chỉ trả phần suy luận trong giới hạn phản hồi, không có nội dung JSON mà ứng dụng yêu cầu.
- Đổi default và cấu hình phát triển sang `gpt-6-luna`, là model đã trả phương án đúng cấu trúc với cùng payload thử. Không thêm dependency hoặc fallback tự động; backend đã được chạy tạm bằng `npm.cmd run dev` để xác nhận health/database rồi dừng, nhường cổng cho phiên phát triển người dùng.

### 2026-11-13 — ổn định định dạng phản hồi AI

- MộtAPI hỗ trợ response JSON kiểu OpenAI; thêm yêu cầu JSON object và temperature bằng 0 cho lời gọi gợi ý. Kiểm tra trực tiếp xác nhận phản hồi hợp lệ trong khoảng 5 giây thay vì chỉ đổi model hoặc nới timeout.

### 2026-11-13 — giảm thời gian tạo gợi ý AI

- Sau log runtime 26 giây, so sánh cùng payload cho thấy `gpt-6-sol` nhanh hơn `gpt-6-luna` (11.813 giây so với 28.561 giây). Đổi cấu hình cục bộ, default, mẫu cấu hình và README sang `gpt-6-sol`.
- Giảm ngữ cảnh được gửi AI từ tối đa 50 xuống 15 thực phẩm có hạn gần nhất, đồng thời giới hạn cấu trúc món/bước để giữ kết quả hữu ích nhưng nhanh hơn. Không thêm fallback, dependency hoặc thay đổi schema.

### 2026-11-13 — đối chiếu dinh dưỡng tự động có xác nhận

- Thay danh sách nút đối chiếu thủ công bằng tìm kiếm tự động sau gợi ý. Chỉ auto-select với một kết quả có tên chuẩn hóa giống hệt tên kho; mọi kết quả gần đúng vẫn cần người dùng chọn để tránh gán nhầm kcal.
- Không thay API contract hay schema; dùng lại `GET /api/foods`, `POST /api/foods/:sourceId/select` và `PATCH /api/inventory/:id`. Angular development build thành công, còn kiểm thử trình duyệt với dữ liệu DLPL thật là công việc mở.

### 2026-11-13 — chuyển gợi ý sang kcal ước tính

- Theo quyết định UX, người dùng không cần đổi quả/củ/hộp sang gram. AI trả khẩu phần gram ước tính cho thực đơn; backend dùng gram đó cùng dữ liệu dinh dưỡng để tính kcal, luôn gắn nghĩa “ước tính”.
- Dashboard tự thử ghép ba thực phẩm mới đầu tiên với DLPL trước khi gọi AI và lưu liên kết, nhằm giảm thao tác ở các lần sau. Không thêm schema, dependency hoặc tự tạo giá trị kcal.

### 2026-11-13 — siết khẩu phần AI theo mục tiêu kcal

- Prompt gợi ý nay yêu cầu model dùng năng lượng/100 g trong dữ liệu input để chọn gram trong ngưỡng ±15% mục tiêu. Kiểm thử direct service đạt 1.417/1.500 kcal với dữ liệu thử; backend tiếp tục là nguồn tính kcal cuối cùng.

### 2026-11-13 — hiển thị khẩu phần theo đơn vị tự nhiên

- Giữ gram là dữ liệu nội bộ, còn giao diện hiển thị quả/củ/bó/hộp cho thực phẩm theo đơn vị đếm và g cho thịt, cá, gà. Không thay schema hay buộc người dùng đổi đơn vị kho.

### 2026-11-14 — rà soát nguyên tắc Ponytail

- Rà soát tĩnh toàn bộ backend/frontend theo nguyên tắc thay đổi tối thiểu, tái sử dụng, không thêm dependency và kiểm thử trọng tâm; không thay đổi mã nguồn ứng dụng.
- Kiến trúc chính gọn và phù hợp: Express tách route/controller/service, Angular dùng service chung, không có dependency rõ ràng là dư thừa. Test backend ngày này đạt 7/7 và Angular development build thành công.
- Phát hiện cần xử lý: `DashboardComponent.autoMapFoodsForEstimate()` tự chọn kết quả DLPL đầu tiên và lưu liên kết, trái với quy tắc xác nhận/khớp tên chính xác; `styles.css` còn các selector của giao diện dinh dưỡng cũ không có template sử dụng. Đây là nợ kỹ thuật nhỏ, nhưng mục tự ghép là rủi ro đúng đắn dữ liệu cần ưu tiên hơn.

### 2026-11-14 — áp dụng Ponytail cho đối chiếu dinh dưỡng

- Sửa tự ghép DLPL: chỉ lưu khi chính xác một kết quả có tên trùng khớp sau chuẩn hóa Unicode và chữ thường; kết quả gần đúng hay mơ hồ không làm thay đổi kho. Xóa CSS không còn template sử dụng, không thêm dependency, API hay schema.
- Bổ sung quy tắc Ponytail bắt buộc vào `AGENTS.md`: xác định phạm vi trước khi viết, chọn thay đổi nhỏ nhất hoàn chỉnh, ưu tiên xóa/tái sử dụng và kiểm tra đúng phạm vi cho mọi mã mới hoặc mã bổ sung.
- Xác minh sau sửa: `npm.cmd test` trong backend đạt 7/7; `npm.cmd run build -- --configuration development` trong frontend thành công. CSS bundle giảm từ 37,96 KB còn 31,98 KB; assert mục tiêu xác nhận chỉ một tên trùng khớp mới đủ điều kiện tự ghép. Browser automation không chạy được vì Windows Application Control chặn Chrome của `agent-browser`; chưa kiểm thử với dữ liệu DLPL thật.

### 2026-11-17 — đối chiếu báo cáo với mã nguồn hiện tại

- Đọc `AGENTS.md`, `README.md`, `PROGRESS.md`, báo cáo chính trong `docs` và đối chiếu tĩnh schema, route/controller/service backend, giao diện Angular cùng cấu hình PWA. Báo cáo có nội dung đến hết Chương 2 và Tài liệu tham khảo; Chương 3, Kết luận và Hướng phát triển chỉ hiện trong mục lục, chưa có nội dung thực tế.
- Mã hiện có xác thực bearer HMAC, hồ sơ mục tiêu do người dùng nhập, CRUD kho theo chủ sở hữu, PWA cache shell, nguồn dinh dưỡng DLPL/`foods` và gợi ý AI với kcal **ước tính** do backend tính từ gram AI trả về. QR, giọng nói, BMR/TDEE, hàng đợi/offline CRUD, recipes và lưu/xem meal plan chưa có mã nguồn tương ứng.
- Cần đồng bộ báo cáo trước khi dùng làm báo cáo kết quả: Bảng API ghi `GET /api/foods/lookup` nhưng route thực tế là `GET /api/foods?q=`; phần dữ liệu khẳng định bộ CSV/JSON V1 và công thức nhưng các tệp này không có trong workspace. Importer USDA có mã nguồn, song dữ liệu đầu vào không có trong workspace; luồng chạy hiện tại lấy dữ liệu Việt Nam qua DLPL. Đề xuất AI cũng chưa so lượng nguyên liệu AI gợi ý với `quantity` trong kho hoặc lưu kế hoạch, nên chỉ nên trình bày đúng là gợi ý ước tính.
- Xác minh ngày 2026-11-17: `npm.cmd test` tại `backend` đạt 7/7; `npm.cmd run build -- --configuration development` tại `frontend` thành công. Chưa chạy browser, PostgreSQL, DLPL hay MộtAPI trong phiên này.

### 2026-11-17 — rà soát chi tiết thiết kế dữ liệu dinh dưỡng

- Đối chiếu riêng mục 2.4.3, bảng 2.10–2.17 của báo cáo với `backend/schema.sql` và validation hiện tại. `users`/`inventory_items` cơ bản khớp, nhưng bảng `users` trong báo cáo cần bổ sung ba cột đang dùng là `height_cm`, `weight_kg`, `daily_calorie_target`; `nutrition_profiles` chỉ là thiết kế mở rộng, chưa tồn tại.
- Bảng `foods` trong báo cáo chưa phản ánh schema thực tế: mã nguồn dùng `description`, `energy_kcal_per_100g` bắt buộc, `fdc_id`, `source_id`, `source_version`, `created_at`; chưa có `base_quantity`, `base_unit`, `retrieved_at`, protein/lipid/carbohydrate hoặc năng lượng nullable như thiết kế. Importer USDA cũng chỉ nhập kcal. Vì vậy không thể trình bày ứng dụng đang dùng đầy đủ dữ liệu đa chất hay tự quy đổi đơn vị.
- `recipes`, `recipe_ingredients`, `meal_plans`, `meal_plan_items` và giao dịch lưu thực đơn vẫn hoàn toàn là thiết kế. Luồng gợi ý thực tế không truy vấn `inventory_items.quantity`, chỉ dùng danh sách tên/đơn vị và kcal/100 g; chưa kiểm soát tổng lượng AI gợi ý so với tồn kho. Bộ CSV/JSON dinh dưỡng và công thức mà báo cáo nêu không có trong workspace để tái lập.

### 2026-11-17 — hiện thực phần dữ liệu và thực đơn theo báo cáo

- Mở rộng `backend/schema.sql` theo các bảng thiết kế: `nutrition_profiles`, `recipes`, `recipe_ingredients`, `meal_plans`, `meal_plan_items`; bổ sung metadata cơ sở tính, nguồn/truy xuất và bốn chỉ tiêu dinh dưỡng có thể để trống vào `foods`. Hồ sơ hiện đồng bộ tương thích với ba cột cũ trong `users`, đồng thời lưu tuổi, tham số giới tính và hệ số vận động tùy chọn. Mục tiêu vẫn là do người dùng nhập; không tự tính BMR/TDEE khi chưa có chính sách hệ số được xác định.
- Đổi contract AI theo ràng buộc báo cáo: không nhận `grams` do AI tự tạo; AI chỉ được đề xuất `quantity` theo đúng đơn vị kho. Backend bỏ lượng bằng 0, cộng lượng trên toàn bộ món, từ chối vượt kho và chỉ tính kcal khi mọi thực phẩm đã ánh xạ và dùng g/kg. Đơn vị quả/hộp/ml hoặc dữ liệu chưa ánh xạ trả trạng thái thiếu căn cứ, không quy đổi giả định.
- Thêm `GET/POST /api/meal-plans` và `GET /api/meal-plans/:id`. Lưu thực đơn kiểm tra lại kho thuộc chủ sở hữu, dữ liệu năng lượng và lượng dùng trong transaction; sau đó lưu công thức, nguyên liệu, snapshot kcal và kế hoạch. Lưu không tự trừ kho. Dashboard có thể lưu gợi ý đủ dữ liệu và xem danh sách kế hoạch đã lưu.
- Cập nhật importer USDA để giữ năng lượng, protein, lipid và carbohydrate khi nguồn có dữ liệu; cập nhật README theo API và giới hạn mới. Không đưa dữ liệu dinh dưỡng giả vào workspace.
- Xác minh ngày 2026-11-17: `npm.cmd test` tại `backend` đạt 9/9; `node --check` đạt cho controller/service/importer đã sửa; `npm.cmd run build -- --configuration development` tại `frontend` thành công. Chưa chạy `schema.sql` trên PostgreSQL, E2E trình duyệt, DLPL hoặc MộtAPI thật.

### 2026-11-17 — khởi động môi trường cục bộ sau cập nhật schema

- Đã áp dụng `backend/schema.sql` lên PostgreSQL cục bộ bằng `psql -v ON_ERROR_STOP=1 -f backend/schema.sql`; không có lỗi trả về. Khởi động `npm.cmd run dev` tại backend và `npm.cmd start` tại frontend.
- Kiểm tra `GET http://localhost:4000/api/health` trả `{"status":"ok","database":"connected"}`. Mở `http://localhost:4200` bằng phiên trình duyệt tách biệt; màn hình đăng nhập hiển thị bình thường. Chưa đăng ký tài khoản QA hay kiểm thử luồng thực đơn có xác thực/DLPL/MộtAPI.

### 2026-11-17 — nhập bộ tham chiếu dinh dưỡng V1 từ docs

- Xác định `docs/PWA_Nutrition_Reference_V1_28.csv` là bộ 28 hồ sơ phù hợp; hai CSV SMILING khác gồm một file rỗng và một file QA riêng cho canxi nên không dùng để import.
- Thêm importer `backend/scripts/import-pwa-nutrition-reference.js` và lệnh `npm run import:nutrition-reference`; parser kiểm header, số dòng, cơ sở 100 g, giá trị không âm, mã duy nhất và metadata nguồn. Import lưu kcal, protein, lipid, carbohydrate nullable, mã/phiên bản nguồn, URL, locator, SHA-256, cờ chất lượng và thời điểm truy xuất.
- API `/api/foods?q=` ưu tiên hồ sơ tham chiếu nội bộ đã nhập, fallback DLPL khi không có kết quả. Form kho thêm tra cứu và bước người dùng xác nhận liên kết dữ liệu; đổi tên sẽ bỏ liên kết cũ.
- Đã áp dụng `backend/schema.sql` vào database phát triển đúng theo `DATABASE_URL`, rồi import thành công. Xác minh SQL: 28 hồ sơ; 28 đủ protein/lipid/carbohydrate; 28 có URL, locator và SHA-256; có 3 nguồn.
- Xác minh ngày 2026-11-17: backend `npm.cmd test` đạt 10/10; Angular development build thành công. Chưa kiểm thử luồng tra cứu/chọn qua browser có tài khoản.

### 2026-11-17 — cải thiện độ ổn định và thời gian phản hồi AI

- Không có quyền fine-tune model từ key MộtAPI hiện tại; cải thiện phần request của ứng dụng: prompt ngắn hơn, chỉ yêu cầu món đơn giản từ kho, xem mục tiêu kcal là tham khảo và yêu cầu đúng đơn vị/lượng kho.
- Giảm giới hạn phản hồi 500 xuống 350 token, timeout 45 xuống 25 giây; retry tối đa một lần sau lỗi 429/5xx. Lỗi timeout, JSON không hợp lệ và dịch vụ lỗi tiếp tục được chuyển thành thông báo có kiểm soát.
- Xác minh `npm.cmd test` tại backend đạt 10/10. Chưa đo độ trễ với MộtAPI thật sau thay đổi; không thể bảo đảm nhà cung cấp luôn sẵn sàng hoặc không lỗi.

## Bàn giao phiên tiếp theo

- Team Lead chủ động cập nhật `PROGRESS.md` sau mỗi phiên đáng kể theo quy tắc ở **Tổng quan dự án**, không cần chờ nhắc lại.
- Trước khi thay đổi chức năng, kiểm tra vị trí mã hiện tại trong `frontend/src/app/features/*`, `frontend/src/app/core/services` và `backend/src/*`; không dựa vào đường dẫn cũ trong nhật ký.
- Khi chạy lại runtime, ghi ngày, cấu hình đã dùng (không kèm secret), lệnh/các bước, kết quả, dữ liệu test đã dọn hay chưa, và cập nhật các mục ưu tiên/vấn đề tồn đọng tương ứng.
