# Trạng thái dự án Nếp Nhà

Cập nhật: 2026-11-05 — máy `C:\Users\Admin\Desktop` (chạy thử web)

## Giai đoạn hiện tại
`main` (`addcdd3`) đã có đủ phần B: API (B1), web công khai (B2), trang quản trị (B3, PR #11), hiệu ứng GSAP (B4), logo và mascot (phần A), popup Zalo và thanh đang tải (PR #12), 10 việc cải tiến trang quản trị (quyết định `0008` và `0010`, PR #14, #15, #17, #18, #20) và cảnh minh họa (PR #21). Không còn nhánh nào chờ merge. Việc tiếp theo: rà trang công khai bằng các skill giao diện, các việc sau của cảnh minh họa, rồi phần D (hạ tầng).

## Đã xong
- Spec thiết kế: `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md`.
- Phần C (nền tảng làm việc) đã merge vào `main` (PR #1).
- Phần B1 (API và cơ sở dữ liệu) đã merge vào `main` (PR #3): 11 task đã review, 492 test, API đã chạy thật ở local và đã thử bằng `curl` (xem "Thử API" trong `docs/setup.md`).
- Phần B2 (web công khai) đã merge vào `main` (PR #4): plan `docs/superpowers/plans/2026-11-04-phan-b2-web-cong-khai.md`, cả 11 task xong và đã sửa theo review cuối của cả nhánh: web `vi` + `en`, blog, SEO, route revalidate, test đơn vị và test đầu-cuối.
- Phần B3 (trang quản trị) đã merge vào `main` (PR #11): 9 màn hình (Tổng quan, Sản phẩm, Hành trình, Báo chí, Câu chuyện, Ảnh, Liên hệ & cài đặt, Tài khoản, Lịch sử), đã review từng task và review cuối cả nhánh. Form có thay đổi chưa lưu thì hỏi trước khi rời trang, kể cả khi bấm nút quay lại của trình duyệt. Có bộ test đầu-cuối với API thật (`npm run test:fullstack`) và workflow CI `fullstack`. Cách chạy ở local và cách chạy test nằm trong `docs/setup.md`. Review lại vòng sửa cuối tìm ra 2 lỗi nút Back (bấm Back khi đang lưu; sau khi tải lại trang) và 3 lỗi nhỏ; đã sửa (`90dcb0b`), 808 unit test và 26 test đầu-cuối qua. Còn một lần thử tay trên điện thoại Android thật: Back, "Ở lại", Back lần nữa phải hỏi lại.
- Các skill giao diện đã merge vào `main` (PR #6): anti-slop, taste-skill, gsap-skills dạng plugin trong `.claude/settings.json`, và `web-interface-guidelines` trong `.claude/skills/` (quyết định `0006`).
- Phần A (logo, mascot, icon) đã merge vào `main` (PR #5).
- Đã chạy bản production của web với dữ liệu mẫu và đo Lighthouse mobile: cả `/vi` và `/en` đều từ 94 điểm trở lên ở cả ba mục, LCP từ 0,9 đến 1,1 giây. Bảng điểm và lệnh chạy lại nằm trong `docs/setup.md`.
- Phần B4 (hiệu ứng GSAP) đã merge vào `main` (PR #8), 5 task đã review và đã sửa theo review cuối của cả nhánh: mascot, logo và favicon thật; GSAP 3.15.0 tải muộn, tắt khi "giảm chuyển động"; các khối trượt vào; đầu và bó lúa nghiêng theo tốc độ cuộn; cây lúa mọc dọc hành trình. Đo Lighthouse sau B4 nằm trong `docs/setup.md`. Đã chạy Delivery Gate của antislop trên trang công khai và sửa các mục FAIL (vùng bấm 44 px, dòng chữ "đang tải", con trỏ và trạng thái khi bấm, trang 404 có header và footer, ảnh bìa câu chuyện tải trước, icon đặc điểm theo đúng thứ tự).
- Kết quả xem bằng mắt sau B4. Chromium có cửa sổ không mở được trên máy, nên đã xem bằng Chromium không cửa sổ (headless), cùng bộ máy vẽ:
  - Đầu và bó lúa xoay đúng tâm, không có mảnh nào bị tách ra. Góc lớn nhất đo được khi cuộn nhanh: đầu 2,7°, bó lúa 4,2°.
  - Mascot nằm gọn trong hero. Logo ở header rõ ở cỡ 36 px.
  - Chưa xem favicon thật trên tab trình duyệt. Chỉ mới mở file `/icon.svg`: file này hiện đúng.
- Rà soát prompt các file hướng dẫn Claude (nhánh `hacka/workspace-prompt-audit-1ff3bc`): báo cáo `docs/session/prompt-audit-2026-11-04.md`. Đã sửa 5 lỗi trong skill `call-chain` và `visual-deck`; 4 mục chỉ ghi nhận (6–9 trong báo cáo) chờ chủ dự án quyết định.
- Review trang quản trị B3 về độ dễ dùng: báo cáo `docs/reviews/2026-11-04-admin-ux.md` (PR #9). 5 việc ưu tiên (quyết định `0008`) đã làm và merge: lỗi hiện dưới ô, hỏi lại trước khi mất dữ liệu, bảng kiểm tra trước khi đăng, tự lưu bài viết (PR #15); hộp tải ảnh cho điện thoại và Tổng quan thành danh sách việc cần làm (PR #14).
- Popup Zalo có mã QR (máy tính) và tấm trượt (điện thoại), thanh đang tải, khung xương cho danh sách câu chuyện (PR #12).
- Rà lại trang quản trị bằng các skill giao diện: báo cáo `docs/reviews/2026-11-05-ui-admin.md` (PR #16). 5 việc tiếp theo (quyết định `0010`) đã làm và merge: chạm an toàn và dễ tìm đường (PR #17); sản phẩm "Hiện trên web", mặc định ẩn, migration `V3` (PR #18); vai trò "Chủ" / "Người nhà" và trợ giúp xác thực 2 lớp khi mất điện thoại, migration `V4` (PR #20).
- Hướng bố cục cho trang chủ: taste-skill `draw.mjs` được dùng để chọn bố cục, giữ màu và font (quyết định `0009`, PR #13). Chủ dự án chọn hướng "Một họa tiết" với họa tiết hạt gạo nếp: `docs/design/2026-11-04-huong-bo-cuc-one-motif.md`. Chưa làm.
- Luật làm việc mới trong `CLAUDE.md`: tự mở PR và tự merge khi CI đạt (PR #15); chỉ chạy test liên quan khi làm, chạy đủ một lần sau khi gộp nhánh (PR #19).
- Cảnh minh hoạ đã merge vào `main` (PR #21; spec `docs/superpowers/specs/2026-11-04-canh-minh-hoa-design.md`, plan `docs/superpowers/plans/2026-11-04-canh-minh-hoa.md`). Có: nền Hero trải hết bề ngang, mờ dần về mép trái, vòng lặp 60 giây và nút tạm dừng tròn; hình túi hút chân không là ảnh đầu tiên của bộ ảnh, kèm 3 chú thích; khối "Từ hạt lúa tới người dùng" dạng con đường dọc uốn với 8 cảnh (tải SVG khi gần tới, chuyển động riêng mỗi cảnh, hạt gạo đi theo cuộn, nền cảnh mờ dần ra hai bên) và 6 tư thế người. Còn làm sau khi merge, bằng PR riêng: đo Lighthouse `/vi`, `/en` (Chromium không chạy được từ công cụ dòng lệnh của agent) và ghi vào `docs/setup.md`; Delivery Gate, `inspect.mjs` ở 375 px và 1280 px, review `web-interface-guidelines`; review cả nhánh; bản cuối 6 tư thế người bằng Nano Banana trả phí trên nhánh riêng, trước khi lên web thật. Góp ý của chủ dự án: `docs/session/log/2026-11-04-may-cong-ty-canh-minh-hoa.md`.

## Đang làm
- Không có nhánh nào đang làm. Bản xem thử local: web http://localhost:3011 và API cổng 8090, chạy `main` mới nhất trên database `nepnha_b3` (đã chạy migration V3, V4; tài khoản admin là "Chủ"). Hai server chạy trong cửa sổ PowerShell thu nhỏ; script ở thư mục scratchpad của session, không nằm trong repo.
- Máy `C:\Users\Admin\Desktop\nepnhaxudong` (2026-11-05): web chạy với dữ liệu mẫu ở http://localhost:3000 (`npm run dev`, cấu hình `web-mock` trong `.claude/launch.json`). Node trên máy là 24 (tài liệu ghi 22); web vẫn chạy được. Đã cài thêm (2026-11-05): 7 plugin của dự án (`--scope project`), `uv` 0.13.7, JDK 21 (Temurin 21.0.13, `JAVA_HOME` trỏ tới nó), Docker Desktop 29.9.2 (WSL 2). Phải thoát hẳn ứng dụng Claude rồi mở lại thì session mới thấy các biến môi trường mới. Chưa chạy thử API và trang quản trị trên máy này.

## Việc tiếp theo
1. Rà trang công khai bằng các skill giao diện (taste-skill, Delivery Gate của antislop, `web-interface-guidelines`) trên `main` hiện tại, gộp với báo cáo trang quản trị thành một danh sách đề xuất cho chủ dự án. Làm ở máy (cần plugin và trình duyệt).
2. Việc sau của cảnh minh họa (PR riêng): Lighthouse `/vi`, `/en`; Delivery Gate; `inspect.mjs` 375 px và 1280 px; review `web-interface-guidelines`; review cả nhánh; bản cuối 6 tư thế người bằng Nano Banana trả phí.
3. Làm lại bố cục trang chủ theo hướng "Một họa tiết" (hạt gạo nếp): spec ngắn, plan, rồi làm (`docs/design/2026-11-04-huong-bo-cuc-one-motif.md`).
4. Ba việc admin tiếp theo theo báo cáo `docs/reviews/2026-11-05-ui-admin.md`: màn hình rộng (4.10), Lịch sử đọc được (4.13), Hành trình tự xếp theo năm (T7).
5. Chủ dự án tự thử trên điện thoại thật: nút Back trên Android ("Ở lại" rồi Back lần nữa phải hỏi lại); quét mã QR Zalo; tải nhiều ảnh từ iPhone và Android; đăng nhập bằng một tài khoản "Người nhà" để thấy không có Tài khoản và Lịch sử tài khoản. Xác nhận màu Vàng lúa của thanh đang tải.
6. Chủ dự án đọc và xác nhận các dòng "(đề xuất, chờ chủ dự án xác nhận)" trong spec: mục 2.2, 3.0, 3.3, 4.1.
7. Bật bảo vệ nhánh `main` (chưa xác nhận là đã bật). Nếu muốn GitHub tự merge khi CI đạt: bật "Allow auto-merge" trong Settings của repo.
8. Phần D (hạ tầng), theo các ghi chú ở mục "Ghi chú cho phần D" bên dưới. Phần này chỉ cần code và CI, có thể làm bằng một cloud session riêng.
9. Khi có ảnh thật: xem bộ ảnh sản phẩm và lightbox với ảnh thật, đo lại Lighthouse.
10. Dọn ở máy (chủ dự án tự xóa, công cụ không xóa được vì đường dẫn quá dài hoặc bị khóa): `D:\workspaces\nepnhaxudong-b4`, `D:\workspaces\nepnhaxudong-phan-b2`, và các thư mục còn sót trong `D:\workspaces\nepnhaxudong\.claude\worktrees\`. Thư mục `D:\workspaces\nepnhaxudong-b3` đang chạy bản xem thử, xóa sau khi tắt server. Tài khoản thử `ra-soat@example.test` (đã khóa) còn trong `nepnha_b3`.

## Vướng mắc
- Chưa đặt `GEMINI_API_KEY`.
- 4 MCP của dự án chưa được duyệt trong Claude Code.
- Chưa đăng nhập Recraft.
- Máy `C:\Users\Admin\Desktop\nepnhaxudong`: MCP của dự án đã chạy trong ứng dụng Claude desktop, kể cả `nanobanana`; `recraft` còn chờ đăng nhập (chạy `claude` trong PowerShell mới, rồi `/mcp`).

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
- Ở local, web phục vụ ảnh tải lên từ `MEDIA_DEV_DIR` (chỉ ngoài production). Ở production, Caddy phục vụ `/media/*`.

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
- `docs/decisions/0010-viec-tiep-theo-admin.md`, `0009-taste-bo-cuc.md`, `0008-uu-tien-sua-admin.md`
