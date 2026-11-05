# Trạng thái dự án Nếp Nhà

Cập nhật: 2026-11-04 — máy công ty

## Giai đoạn hiện tại
`main` đã có API (B1, PR #3), web công khai (B2, PR #4) và logo, mascot (phần A, PR #5). Hiệu ứng GSAP (B4) đã xong trên nhánh `feat/phan-b4-gsap`, đã push, đang chờ PR. Trang quản trị (B3) làm song song trên nhánh `feat/phan-b3-admin`.

## Đã xong
- Spec thiết kế: `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md`.
- Phần C (nền tảng làm việc) đã merge vào `main` (PR #1).
- Phần B1 (API và cơ sở dữ liệu) đã merge vào `main` (PR #3): 11 task đã review, 492 test, API đã chạy thật ở local và đã thử bằng `curl` (xem "Thử API" trong `docs/setup.md`).
- Phần B2 (web công khai) đã merge vào `main` (PR #4): plan `docs/superpowers/plans/2026-11-04-phan-b2-web-cong-khai.md`, cả 11 task xong và đã sửa theo review cuối của cả nhánh: web `vi` + `en`, blog, SEO, route revalidate, test đơn vị và test đầu-cuối.
- Phần A (logo, mascot, icon) đã merge vào `main` (PR #5).
- Đã chạy bản production của web với dữ liệu mẫu và đo Lighthouse mobile: cả `/vi` và `/en` đều từ 94 điểm trở lên ở cả ba mục, LCP từ 0,9 đến 1,1 giây. Bảng điểm và lệnh chạy lại nằm trong `docs/setup.md`.
- Phần B4 (hiệu ứng GSAP) xong trên nhánh `feat/phan-b4-gsap`, 5 task đã review và đã sửa theo review cuối của cả nhánh: mascot, logo và favicon thật; GSAP 3.15.0 tải muộn, tắt khi "giảm chuyển động"; các khối trượt vào; đầu và bó lúa nghiêng theo tốc độ cuộn; cây lúa mọc dọc hành trình. Đo Lighthouse sau B4 nằm trong `docs/setup.md`. Đã chạy Delivery Gate của antislop trên trang công khai và sửa các mục FAIL (vùng bấm 44 px, dòng chữ "đang tải", con trỏ và trạng thái khi bấm, trang 404 có header và footer, ảnh bìa câu chuyện tải trước, icon đặc điểm theo đúng thứ tự).
- Kết quả xem bằng mắt sau B4. Chromium có cửa sổ không mở được trên máy, nên đã xem bằng Chromium không cửa sổ (headless), cùng bộ máy vẽ:
  - Đầu và bó lúa xoay đúng tâm, không có mảnh nào bị tách ra. Góc lớn nhất đo được khi cuộn nhanh: đầu 2,7°, bó lúa 4,2°.
  - Mascot nằm gọn trong hero. Logo ở header rõ ở cỡ 36 px.
  - Chưa xem favicon thật trên tab trình duyệt. Chỉ mới mở file `/icon.svg`: file này hiện đúng.
- Rà soát prompt các file hướng dẫn Claude (nhánh `hacka/workspace-prompt-audit-1ff3bc`): báo cáo `docs/session/prompt-audit-2026-11-04.md`. Đã sửa 5 lỗi trong skill `call-chain` và `visual-deck`; 4 mục chỉ ghi nhận (6–9 trong báo cáo) chờ chủ dự án quyết định.

## Đang làm
- Cảnh minh hoạ (nền Hero, hình túi gạo, khối "Từ hạt lúa tới người dùng" 8 cảnh): spec `docs/superpowers/specs/2026-11-04-canh-minh-hoa-design.md` và plan `docs/superpowers/plans/2026-11-04-canh-minh-hoa.md` đã duyệt; đang làm theo plan (subagent-driven) trên nhánh `feat/canh-minh-hoa`. Ngày 2026-11-05 đã xong Task 1–11 và Task 7 (6 tư thế người, đã duyệt biểu cảm); nền mỗi cảnh đã kéo rộng ra hai bên và mờ dần (chờ chủ dự án duyệt). Còn: Task 12 (kiểm tra cuối), review cả nhánh, PR. Góp ý của chủ dự án: `docs/session/log/2026-11-04-may-cong-ty-canh-minh-hoa.md`.
- Phần B4: nhánh `feat/phan-b4-gsap` đã push. Chủ dự án đồng ý mở PR; chủ dự án quyết định merge. Các dòng "(đề xuất, chờ chủ dự án xác nhận)" trong spec (mục 2.2, 3.0, 3.3) chờ chủ dự án đọc và xác nhận.

## Việc tiếp theo
1. Bật bảo vệ nhánh `main` với check `tools (ubuntu-latest)` và `tools (windows-latest)` (chưa xác nhận là đã bật).
2. Viết plan B3 (trang quản trị).
3. B4: chủ dự án xem nhánh `feat/phan-b4-gsap`, rồi quyết định push, PR và merge. Ghi chú cho người merge sau cùng giữa B3 và B4: trước khi mở PR, merge `origin/main` vào nhánh của mình, rồi chạy `npm install` trong `web/` để tạo lại `web/package-lock.json` (cả B3 và B4 đều thêm thư viện, nên file này sẽ xung đột).
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

Các việc phát sinh khi làm B4 (hiệu ứng):
- Khi khách mở thẳng một đường dẫn có `#neo` (ví dụ `/vi#bao-chi`), chuyển động chỉ bắt đầu sau khi trang cuộn xong tới đó, có thể chậm tới 2,5 giây.
- Khi khách đang cuộn lúc chuyển động khởi động, chuyển động đợi trang dừng cuộn rồi mới bắt đầu (tối đa 2,5 giây), để không cắt ngang lần cuộn đó.
- Khi phần Hành trình đã nằm trong màn hình lúc trang mở, thân cây lúa giữ nguyên dạng đã mọc đủ (không co lại rồi mọc theo cuộn).
- Một lần đo `/vi` có Performance 86 do TBT cao (560 ms); các lần khác từ 91 trở lên. Nếu cần, xem lại chi phí tải GSAP khi đo lần sau.
- Mascot của hero là SVG chi tiết nhúng thẳng vào HTML. Trang `/vi` dựng sẵn nặng 297.757 byte (73.988 byte sau gzip). Phần mascot có mặt hai lần, mỗi lần khoảng 89,7 KB: một lần trong HTML và một lần trong dữ liệu RSC gửi kèm, vì `Mascot` là server component dùng `dangerouslySetInnerHTML`.
- Việc sau này: bỏ bản mascot thứ hai trong dữ liệu RSC. Nếu LCP hoặc TBT xấu đi, cân nhắc dùng `brand/logo/mascot-logo.svg`.

## Quyết định gần nhất
- `docs/decisions/0005-spring-boot-4.md`
