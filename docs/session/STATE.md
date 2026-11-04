# Trạng thái dự án Nếp Nhà

Cập nhật: 2026-11-04 — máy công ty

## Giai đoạn hiện tại
Phần B — API (B1) đã merge vào `main` (PR #3). Web công khai (B2) đã xong trên nhánh `feat/phan-b2-web`, đang mở PR để merge.

## Đã xong
- Spec thiết kế: `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md`.
- Phần C (nền tảng làm việc) đã merge vào `main` (PR #1).
- Phần B1 (API và cơ sở dữ liệu) đã merge vào `main` (PR #3): 11 task đã review, 492 test, API đã chạy thật ở local và đã thử bằng `curl` (xem "Thử API" trong `docs/setup.md`).
- Phần B2 (web công khai): plan `docs/superpowers/plans/2026-11-04-phan-b2-web-cong-khai.md`, cả 11 task xong và đã sửa theo review cuối của cả nhánh: web `vi` + `en`, blog, SEO, route revalidate, test đơn vị và test đầu-cuối.
- Đã chạy bản production của web với dữ liệu mẫu và đo Lighthouse mobile: cả `/vi` và `/en` đều từ 94 điểm trở lên ở cả ba mục, LCP từ 0,9 đến 1,1 giây. Bảng điểm và lệnh chạy lại nằm trong `docs/setup.md`.
- Rà soát prompt các file hướng dẫn Claude (nhánh `hacka/workspace-prompt-audit-1ff3bc`): báo cáo `docs/session/prompt-audit-2026-11-04.md`. Đã sửa 5 lỗi trong skill `call-chain` và `visual-deck`; 4 mục chỉ ghi nhận (6–9 trong báo cáo) chờ chủ dự án quyết định.
- Review trang quản trị B3 về độ dễ dùng (nhánh `hacka/admin-ux-review-d606fa`): báo cáo `docs/reviews/2026-11-04-admin-ux.md`, ảnh chụp trong `docs/reviews/2026-11-04-admin-ux/`. Chỉ review, chưa sửa mã.

## Đang làm
- Phần B2: mở PR, chờ CI, merge vào `main` (chủ dự án đã đồng ý).
- Phần A (logo) chờ chủ dự án duyệt linh vật, nhánh `feat/phan-a-thuong-hieu`.
- Review admin B3: chủ dự án đã duyệt 5 việc ưu tiên (`docs/decisions/0008-uu-tien-sua-admin.md`). Việc tiếp theo là sửa trên nhánh B3. Nhánh review đã mở PR #9.

## Việc tiếp theo
1. Bật bảo vệ nhánh `main` với check `tools (ubuntu-latest)` và `tools (windows-latest)` (chưa xác nhận là đã bật).
2. Viết plan B3 (trang quản trị).
3. B4 (hiệu ứng GSAP) sau khi có linh vật cuối cùng.
4. Phần D (hạ tầng), theo các ghi chú ở mục "Ghi chú cho phần D" bên dưới.
5. Khi có ảnh thật: xem bộ ảnh sản phẩm và lightbox với ảnh thật, đo lại Lighthouse.
6. Kiểm tra trên máy cá nhân và cloud session theo `docs/setup.md`, rồi ghi kết quả vào `docs/setup.md` và file này.

## Vướng mắc
- Chưa đặt `GEMINI_API_KEY`.
- 4 MCP của dự án chưa được duyệt trong Claude Code.
- Chưa đăng nhập Recraft.

## Ghi chú cho phần D
Các việc này phát sinh khi làm B1 và thuộc phần triển khai (Caddy, Docker, máy chủ).

- Sau Caddy (TLS kết thúc ở Caddy): đặt `server.forward-headers-strategy: framework` (hoặc `native`) và để Caddy gửi `X-Forwarded-Proto`. Nếu không, `request.isSecure()` là false, cookie `XSRF-TOKEN` thiếu `Secure` và không có header HSTS.
- Giới hạn tốc độ `POST /api/auth/login` ở Caddy: mỗi lần thử tốn khoảng 16 MiB và CPU cho Argon2 (chạy ngoài transaction, không giữ kết nối DB), và email không tồn tại không bị khoá.
- Giới hạn tốc độ `/api/admin/*` ở Caddy (bớt tải khi có người gửi nhiều request lạ; API đã chỉ đọc token CSRF từ header nên không đọc body multipart trước khi kiểm tra).
- Cookie CSRF có `Path=/api` (context path). Trang quản trị Next.js phải đọc token từ JSON của `GET /api/auth/csrf`, không đọc từ `document.cookie`.
- Mọi endpoint quản trị phải nằm dưới `/api/admin/**`, vì bước chặn "phải đổi mật khẩu" chỉ áp dụng cho tiền tố này.
- Giới hạn kích thước body ở Caddy: `request_body { max_size 16MB }` cho `/api/*`. Tomcat reset kết nối khi body vượt `max-swallow-size` 20MB. Phản hồi 413 của Caddy là văn bản thường, nên giao diện quản trị hiện "Ảnh quá lớn. Tối đa 15 MB." với mọi lỗi 413 và kiểm tra `file.size` trước.
- JVM: đặt `-Xmx` có chủ đích (ít nhất 768 MB), thêm `-XX:+ExitOnOutOfMemoryError` và chính sách tự khởi động lại của container. Giới hạn bộ nhớ container phải chừa chỗ cho bộ đệm native của libjpeg.
- `MEDIA_DIR` là một volume bền, gắn chế độ chỉ đọc vào Caddy và sao lưu cùng DB. `/tmp` phải ghi được (Tomcat lưu các phần multipart ở đó).
- Phục vụ `/media/*` với `Content-Type` theo đuôi file, `X-Content-Type-Options: nosniff` và cache dài, bất biến (tên file là UUID).
- Sau khi đóng gói, thử một lần tải ảnh WebP lên bản `java -jar` (kiểm tra plugin TwelveMonkeys có được đăng ký).
- Sự kiện làm mới trang (revalidate) chỉ nằm trong bộ nhớ: nếu mất một sự kiện thì trang cũ còn đến lần sửa sau (web dùng `force-cache` với tag, không có thời gian dự phòng). Cách bổ sung sau này: nút "làm mới trang web" trong trang quản trị (trang chủ và các bài viết), hoặc đặt thời gian `revalidate` dài ở phía web.
- Sửa chữ thay thế hoặc xoá ảnh chỉ làm mới trang chủ; các trang bài viết có ảnh đó chưa được làm mới.
- Trước khi lên production, chạy thử một lệnh revalidate thật từ API sang server web (bản `node .next/standalone/server.js`).
- Ảnh tải lên chưa hiện ở web local vì chưa ai phục vụ `/media/*`; Caddy làm việc này (có thể dùng cả cho compose local).

Các việc phát sinh khi làm B2 (web công khai):
- Cloudflare không được cache HTML (chỉ cache `/_next/static/*` và `/media/*`). Caddy không được cache, và phải chuyển tiếp header `rsc` và tham số `_rsc`. Các trang gửi `Cache-Control: s-maxage=31536000`, nên nếu cache ở rìa thì khách không thấy thay đổi từ admin. Trang 404 chung (đường dẫn lạ) cũng gửi header này.
- `SITE_URL` phải đặt cả lúc build (cấu hình ảnh) và lúc chạy (canonical, sitemap). Server web chạy bằng `node .next/standalone/server.js`, không phải `next start`. Server này nghe theo biến `HOSTNAME`: trong Docker phải đặt `HOSTNAME=0.0.0.0`, vì trong container biến này mặc định là ID của container.
- `POST /api/revalidate` của web chỉ gọi được trong mạng nội bộ (`WEB_BASE_URL=http://web:3000`), vì Caddy chuyển `/api/*` sang Spring. Route này nhận từ 1 đến 50 tag (`home`, `stories`, `story:<slug>`); một tag sai thì cả lần gọi bị trả 400.
- Các điểm web giả định về hợp đồng API nằm ở bảng "Khoảng trống của hợp đồng API" đầu `docs/superpowers/plans/2026-11-04-phan-b2-web-cong-khai.md`.

## Quyết định gần nhất
- `docs/decisions/0005-spring-boot-4.md`
