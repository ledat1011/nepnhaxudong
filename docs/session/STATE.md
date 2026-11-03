# Trạng thái dự án Nếp Nhà

Cập nhật: 2026-11-04 — máy công ty

## Giai đoạn hiện tại
Phần B1 (API và cơ sở dữ liệu) đã viết xong code, chờ review cả nhánh, PR và merge.

## Đã xong
- Spec thiết kế: `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md`.
- Phần C (nền tảng làm việc) đã merge vào `main`.
- Phần B1 trên nhánh `feat/phan-b1-api`: 11 task đã review, 492 test, API đã chạy thật ở local và đã thử bằng `curl` (xem "Thử API" trong `docs/setup.md`).

## Đang làm
- Phần B1: review cả nhánh, rồi mở PR và merge vào `main` (chủ dự án đã đồng ý).
- Phần B2 (web công khai) chạy song song ở phiên khác, nhánh `feat/phan-b2-web`, thư mục worktree `D:\workspaces\nepnhaxudong-phan-b2`. B2 merge sau B1.
- Phần A (logo) chờ chủ dự án duyệt linh vật, nhánh `feat/phan-a-thuong-hieu`.

## Việc tiếp theo
1. Review cả nhánh B1, mở PR, merge vào `main`.
2. Bật bảo vệ nhánh `main` với check `tools (ubuntu-latest)` và `tools (windows-latest)`.
3. Merge B2 sau B1.
4. Viết plan B3 (trang quản trị).
5. B4 (hiệu ứng GSAP) sau khi có linh vật cuối cùng.
6. Phần D (hạ tầng), theo các ghi chú ở mục "Ghi chú cho phần D" bên dưới.
7. Kiểm tra trên máy cá nhân và cloud session theo `docs/setup.md`, rồi ghi kết quả vào `docs/setup.md` và file này.

## Vướng mắc
- Chưa đặt `GEMINI_API_KEY`.
- 4 MCP của dự án chưa được duyệt trong Claude Code.
- Chưa đăng nhập Recraft.

## Ghi chú cho phần D
Các việc này phát sinh khi làm B1 và thuộc phần triển khai (Caddy, Docker, máy chủ).

- Sau Caddy (TLS kết thúc ở Caddy): đặt `server.forward-headers-strategy: framework` (hoặc `native`) và để Caddy gửi `X-Forwarded-Proto`. Nếu không, `request.isSecure()` là false, cookie `XSRF-TOKEN` thiếu `Secure` và không có header HSTS.
- Giới hạn tốc độ `POST /api/auth/login` ở Caddy: mỗi lần thử tốn khoảng 16 MiB và CPU cho Argon2, và email không tồn tại không bị khoá.
- Giới hạn tốc độ `/api/admin/*` ở Caddy (multipart được ghi ra đĩa trước khi kiểm tra đăng nhập khi thiếu header CSRF).
- Cookie CSRF có `Path=/api` (context path). Trang quản trị Next.js phải đọc token từ JSON của `GET /api/auth/csrf`, không đọc từ `document.cookie`.
- Mọi endpoint quản trị phải nằm dưới `/api/admin/**`, vì bước chặn "phải đổi mật khẩu" chỉ áp dụng cho tiền tố này.
- Giới hạn kích thước body ở Caddy: `request_body { max_size 16MB }` cho `/api/*`. Tomcat reset kết nối khi body vượt `max-swallow-size` 20MB. Phản hồi 413 của Caddy là văn bản thường, nên giao diện quản trị hiện "Ảnh quá lớn. Tối đa 15 MB." với mọi lỗi 413 và kiểm tra `file.size` trước.
- JVM: đặt `-Xmx` có chủ đích (ít nhất 768 MB), thêm `-XX:+ExitOnOutOfMemoryError` và chính sách tự khởi động lại của container. Giới hạn bộ nhớ container phải chừa chỗ cho bộ đệm native của libjpeg.
- `MEDIA_DIR` là một volume bền, gắn chế độ chỉ đọc vào Caddy và sao lưu cùng DB. `/tmp` phải ghi được (Tomcat lưu các phần multipart ở đó).
- Phục vụ `/media/*` với `Content-Type` theo đuôi file, `X-Content-Type-Options: nosniff` và cache dài, bất biến (tên file là UUID).
- Sau khi đóng gói, thử một lần tải ảnh WebP lên bản `java -jar` (kiểm tra plugin TwelveMonkeys có được đăng ký).
- Sự kiện làm mới trang (revalidate) chỉ nằm trong bộ nhớ: nếu mất một sự kiện thì trang cũ còn đến lần sửa sau (web dùng `force-cache` với tag, không có thời gian dự phòng). Cách bổ sung sau này: nút "làm mới trang web" trong trang quản trị (trang chủ và các bài viết), hoặc đặt thời gian `revalidate` dài ở phía web.
- Sửa chữ thay thế hoặc xoá ảnh chỉ làm mới trang chủ; các trang bài viết có ảnh đó chưa được làm mới.
- Trước khi lên production, chạy thử một lệnh revalidate thật từ API sang Next.js (`next start`).
- Ảnh tải lên chưa hiện ở web local vì chưa ai phục vụ `/media/*`; Caddy làm việc này (có thể dùng cả cho compose local).

## Quyết định gần nhất
- `docs/decisions/0005-spring-boot-4.md`
