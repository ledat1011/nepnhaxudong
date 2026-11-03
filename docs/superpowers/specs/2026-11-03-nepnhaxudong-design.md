# Nếp Nhà — Thiết kế website giới thiệu gạo nếp cái hoa vàng

- **Ngày:** 2026-11-03
- **Trạng thái:** đã duyệt từng phần trong buổi brainstorming, chờ duyệt bản viết
- **Tên kỹ thuật:** `nepnhaxudong` (repo, project, package Java `vn.nepnhaxudong`, tên miền dự kiến `nepnhaxudong.vn`)
- **Thương hiệu hiển thị:** **Nếp Nhà**

## 0. Mục tiêu và phạm vi

### Mục tiêu
Website giới thiệu sản phẩm gạo nếp cái hoa vàng do gia đình làm ở Hải Dương (xứ Đông). Khách xem sản phẩm, câu chuyện, hành trình phát triển, các bài báo, rồi liên hệ qua điện thoại / Zalo / Messenger. Người trong gia đình tự cập nhật nội dung qua trang admin trên điện thoại.

### Trong phạm vi (giai đoạn này)
- Bộ nhận diện: logo (3 bản), bảng màu, font.
- Website công khai song ngữ Việt + Anh (`/vi`, `/en`) có hiệu ứng khi cuộn.
- Trang admin cho vài người trong gia đình, cùng quyền.
- API Java + Postgres, chạy bằng docker compose trên một VPS.
- Repo GitHub cá nhân có trạng thái session dùng chung cho máy công ty, máy cá nhân và Claude cloud session.

### Ngoài phạm vi (để sau, nhưng thiết kế không chặn)
- Đặt hàng online (mức B), giỏ hàng + thanh toán VNPay/MoMo + kho (mức C).
- Form liên hệ, thống kê truy cập (sẽ dùng Umami tự cài nếu cần), nút dịch tự động sang EN bằng AI.
- Kubernetes (image đã chạy trong container, chuyển sang k3s sau được).

### Tiêu chí thành công
1. Lighthouse mobile ≥ 90 cho Performance, Accessibility, SEO trên trang chủ `/vi` và `/en`.
2. LCP < 2,5 giây trên mạng 4G mô phỏng.
3. Một người nhà thêm được một mốc timeline có ảnh từ điện thoại trong dưới 3 phút, không cần hướng dẫn trực tiếp.
4. Nội dung sửa trong admin hiện trên trang công khai trong dưới 30 giây.
5. Mở session trên bất kỳ máy nào (2 máy Windows + cloud) thì agent tự đọc được `docs/session/STATE.md` mà không cần người dùng kể lại.
6. Đã khôi phục thử thành công một bản backup.
7. Chi phí vận hành ≤ 300 nghìn đồng / tháng (chưa tính tên miền).

## 1. Các quyết định chính

| Chủ đề | Quyết định | Lý do ngắn |
|---|---|---|
| Mục đích | Chỉ giới thiệu, liên hệ qua điện thoại / Zalo / Messenger | Bắt đầu nhỏ; đặt hàng để sau |
| Công nghệ | Next.js (FE) + Spring Boot 3 / Java 21 (API) + Postgres 16, docker compose trên 1 VPS | Chủ dự án quen Java; mở rộng sang bán hàng sau dễ; chi phí thấp |
| Tổ chức code | Một repo; Next.js chứa cả web công khai và admin | Một FE duy nhất, ít thứ phải chạy |
| Ngôn ngữ | Việt + Anh ngay từ đầu | Khách Việt kiều / nước ngoài |
| Admin | Vài người nhà, cùng quyền, mỗi người một tài khoản | Không cần phân quyền |
| Sản phẩm | Một loại: gạo nếp cái hoa vàng | Dữ liệu vẫn để dạng danh sách |
| Bài báo | Hai mục: "Báo chí nói về Nếp Nhà" (link ngoài) + "Câu chuyện Nếp Nhà" (blog tự viết) | Không chép nguyên bài / ảnh của báo |
| Tên | Giữ "Nếp Nhà" dù `nepnha.vn`, `nepnha.com.vn`, `nepnha.com` đã có người đăng ký và có hộ kinh doanh "Nếp Nhà" ở Gia Lâm, Hà Nội | Quyết định của chủ dự án |
| Tên miền | `nepnhaxudong.vn`, đăng ký sau khi web xong | Chủ dự án tự đăng ký (cần CCCD) |
| Hiệu ứng | GSAP + ScrollTrigger | Gắn chuyển động vào vị trí cuộn, miễn phí |
| Tài khoản Claude | Tài khoản công ty trên cả 2 máy và cloud | Quyết định của chủ dự án |

## 2. Thương hiệu

### 2.1 Bảng màu

| Tên | Mã | Dùng cho |
|---|---|---|
| Nâu đất | `#4A2C1A` | Chữ, viền logo |
| Nâu áo | `#8B5A2B` | Màu chính: nút, tiêu đề phụ |
| Vàng lúa | `#D9A13B` | Điểm nhấn (bông lúa, đường kẻ, icon). Không dùng làm màu chữ trên nền sáng |
| Vàng rơm | `#F2E2B6` | Nền khối nổi bật |
| Trắng gạo | `#FBF7EE` | Nền trang |
| Hồng má | `#E59A84` | Chỉ trong mascot |
| Xanh mạ | `#6E8B3D` | Tùy chọn, rất ít (lá lúa) |

Mọi cặp chữ / nền dùng trên web phải đạt WCAG AA (4,5:1 cho chữ thường).

### 2.2 Font (Google Fonts, có dấu tiếng Việt)
- **Pacifico**: chữ "Nếp Nhà" trong logo và tiêu đề lớn của từng khối. Chỉ có một độ đậm; không dùng cho chữ nhỏ.
- **Quicksand** (400, 500, 700): tiêu đề nhỏ, menu, nút, nội dung.

### 2.3 Logo
- **Hình:** người phụ nữ nửa người, mặt tròn, má hồng, cười hiền, đội nón lá, mặc áo cánh nâu, ôm bó bông lúa nếp vàng cong qua vai. Phong cách hoạt hình phẳng, viền nâu đất, giống phong cách ảnh tham khảo `C:\Users\lvdat\Documents\logo\logo-ba-noi-dau-bep-cam-dia-trong-cho-nha-hang-banh-va-logo-am-thuc-tu-lam_513640-1319.avif` (của Freepik, chỉ tham khảo phong cách, không sao chép).
- **Ba bản:**
  1. Đầy đủ: mascot + "Nếp Nhà" + dòng nhỏ "Xứ Đông · Gạo nếp cái hoa vàng". Header, bao bì.
  2. Biểu tượng: đầu đội nón lá. Favicon, avatar Zalo / Facebook. Phải rõ ở 32px.
  3. Một màu (nâu đất): con dấu bao bì, in đen trắng.
- **SVG tách lớp** (mỗi nhóm là `<g id>` có `transform-origin` riêng):

  | Nhóm | Điểm xoay | Hiệu ứng |
  |---|---|---|
  | `head` (đầu + nón) | cổ | nghiêng ±3° theo tốc độ cuộn |
  | `rice` (bó lúa) | bàn tay | lắc ±6°, các bông lệch nhịp |
  | `body` | — | đứng yên |
  | `eyes` (tùy chọn) | — | chớp mắt định kỳ |

- **Quy trình:** Nano Banana (Gemini, qua `nanobanana-mcp-server`) vẽ 4–6 ý tưởng → chủ dự án chọn → Recraft (remote MCP) chuyển sang SVG → Claude dọn SVG và gom lớp → kiểm tra bản biểu tượng ở 32px. Ngân sách < 10 USD.
- **Nhãn hiệu:** tra cơ sở dữ liệu Cục SHTT (WIPO Publish, nhóm 30) trước khi in bao bì.

## 3. Website công khai

### 3.1 Đường dẫn
- `/` → chuyển sang `/vi` hoặc `/en` theo `Accept-Language`, mặc định `/vi`.
- Blog: `/vi/cau-chuyen/<slug>`, `/en/stories/<slug>`.
- Nội dung chưa có bản EN: trang `/en` hiện bản VI cho mục đó.

### 3.2 Trang chủ (từ trên xuống)
1. **Header** dính trên cùng: biểu tượng logo + "Nếp Nhà", menu nhảy tới khối, đổi VI/EN, nút Zalo. Mobile: menu ☰.
2. **Hero:** mascot SVG có hiệu ứng, tên, tagline, nút "Liên hệ qua Zalo" và "Xem hành trình". Nền minh họa cánh đồng.
3. **Sản phẩm:** bộ ảnh (ảnh lớn + ảnh nhỏ, lightbox), 3 đặc điểm có icon (tròn mẩy, dẻo, thơm), quy cách đóng gói, gợi ý món. Giá bật / tắt được trong admin.
4. **Hành trình:** timeline dọc; khi cuộn, một cây lúa mọc dài dần dọc timeline, từng mốc hiện lên kèm ảnh.
5. **Báo chí nói về Nếp Nhà:** thẻ gồm tên báo, tiêu đề, ngày, ảnh của gia đình; mở bài gốc trong tab mới.
6. **Câu chuyện Nếp Nhà:** 3 bài mới nhất + "Xem tất cả".
7. **Liên hệ:** điện thoại (`tel:`), Zalo (`https://zalo.me/<số>`), Messenger, địa chỉ + Google Maps, giờ liên hệ. Không có form.
8. **Footer:** logo, liên hệ, mạng xã hội, bản quyền.

### 3.3 Hiệu ứng
- GSAP + ScrollTrigger. Mascot phản ứng theo tốc độ cuộn rồi dừng nhẹ; cây lúa timeline mọc theo tiến độ cuộn; các khối trượt nhẹ lên khi vào màn hình.
- Chỉ animate `transform` và `opacity`.
- `prefers-reduced-motion: reduce` → tắt mọi chuyển động, mascot đứng yên.

### 3.4 Kỹ thuật
- Next.js App Router, TypeScript. Trang công khai tạo tĩnh; API gọi `POST /api/revalidate` (có secret) của Next.js khi nội dung đổi → `revalidateTag` theo loại nội dung.
- `next/image`, định dạng AVIF / WebP, `sizes` theo bố cục.
- SEO: metadata theo ngôn ngữ, `hreflang`, OpenGraph image, JSON-LD (`Product`, `LocalBusiness`), `sitemap.xml`, `robots.txt`.
- UI: Tailwind CSS + shadcn/ui (component cho admin), token màu từ mục 2.1.

## 4. Admin và API

### 4.1 Admin (`/admin`, trong app Next.js)
Mobile-first, thanh menu dưới cùng.

| Màn hình | Chức năng |
|---|---|
| Tổng quan | Lối tắt + thay đổi gần đây |
| Sản phẩm | Tên, mô tả, đặc điểm (VI/EN), quy cách đóng gói, bật/tắt giá, chọn ảnh |
| Hành trình | Thêm / sửa mốc (năm, tiêu đề, mô tả, ảnh), kéo thả sắp xếp |
| Báo chí | Dán link → tự điền tiêu đề + ngày từ thẻ meta của trang báo, sửa được |
| Câu chuyện | Trình soạn thảo Tiptap, VI/EN, Nháp / Đã đăng, xem trước |
| Ảnh | Tải ảnh từ điện thoại; bắt buộc mô tả VI + EN |
| Liên hệ & cài đặt | Điện thoại, Zalo, Messenger, địa chỉ, bản đồ, giờ, mạng xã hội |
| Tài khoản | Thêm người nhà, khóa, đặt lại mật khẩu |
| Lịch sử | Ai sửa gì, lúc nào; khôi phục bản trước |

Mục nào thiếu bản EN được đánh dấu "thiếu EN".

### 4.2 Đăng nhập và bảo mật
- Không có tự đăng ký. Admin đầu tiên tạo khi khởi động lần đầu từ biến môi trường `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`; tài khoản mới phải đổi mật khẩu ở lần đăng nhập đầu.
- Spring Security; mật khẩu Argon2; session (Spring Session JDBC) trong cookie `HttpOnly`, `Secure`, `SameSite=Lax`, nhớ đăng nhập 30 ngày; CSRF token.
- Sai mật khẩu 5 lần → khóa tài khoản đó 15 phút.
- TOTP tùy chọn cho từng người.
- Caddy chia đường cùng một tên miền: `/api/*` → API, `/media/*` → ổ đĩa, còn lại → Next.js (không cần CORS).

### 4.3 API (Spring Boot 3, Java 21, Maven)
- Package theo chức năng: `auth`, `product`, `timeline`, `press`, `story`, `media`, `site`, `audit`, `publish`.
- Công khai (chỉ đọc): `GET /api/public/{lang}/home` (toàn bộ dữ liệu trang chủ trong một lần gọi), `GET /api/public/{lang}/stories`, `GET /api/public/{lang}/stories/{slug}`.
- Admin: CRUD dưới `/api/admin/...` cho từng loại nội dung, tài khoản, ảnh, cài đặt; `GET /api/admin/audit`, `POST /api/admin/audit/{id}/restore`.
- Mỗi lần ghi: lưu bản ghi `audit_log` (trước / sau) trong cùng transaction, sau khi commit thì gọi revalidate của Next.js. Revalidate lỗi → ghi log WARN và thử lại 3 lần; nội dung vẫn đã được lưu.
- Lỗi trả về dạng `application/problem+json`, thông báo VI cho admin.

### 4.4 Dữ liệu (Postgres 16, Flyway)
- Mỗi loại nội dung: bảng chính + bảng `*_translation` (`entity_id`, `lang`, các trường chữ). Ràng buộc `UNIQUE(entity_id, lang)`.
- Bảng: `app_user`, `product` (+ `product_translation`, `product_media`), `packaging` (`weight_grams`, `price_vnd` có thể null, `sort_order`), `timeline_event` (+ translation), `press_mention` (+ translation), `story` (+ translation có `slug`, `status`), `media` (`path`, `width`, `height`, `mime`, `alt_vi`, `alt_en`), `site_setting`, `audit_log` (`user_id`, `entity_type`, `entity_id`, `action`, `before_json`, `after_json`, `created_at`), các bảng của Spring Session.

### 4.5 Ảnh
- Lưu ở `/data/media` trên VPS, Caddy phục vụ `/media/*`, có trong backup.
- Nhận JPEG / PNG / WebP, tối đa 15 MB; thu nhỏ cạnh dài tối đa 2560px; xóa toàn bộ EXIF (gồm GPS).
- Ảnh HEIC từ iPhone: Safari thường tự chuyển sang JPEG khi tải lên; nếu vẫn nhận HEIC thì trả lỗi rõ ràng (kiểm tra lại khi làm).

### 4.6 Kiểm thử
- API: JUnit 5 + Testcontainers (Postgres thật); test cho đăng nhập, khóa tài khoản, CRUD, audit + khôi phục, revalidate.
- Web: Vitest cho component; Playwright cho luồng chính: xem trang chủ VI/EN, đăng nhập admin, sửa nội dung rồi thấy trang công khai đổi, `prefers-reduced-motion`.
- CI chạy toàn bộ test trên mỗi PR.

## 5. Hạ tầng

### 5.1 Máy chủ
- VPS 2 vCPU / 4 GB RAM / 40–60 GB SSD, Ubuntu 24.04 LTS. Nghiêng về nhà cung cấp ở Việt Nam (trả VND, hỗ trợ tiếng Việt); chọn cụ thể khi triển khai phần D.
- Cloudflare (free) trước VPS: DNS, cache, chống tấn công, ẩn IP. SSL mode "Full (strict)".

### 5.2 Container (docker compose)
`caddy` (HTTPS tự động, chia đường), `web` (Next.js standalone), `api` (Spring Boot), `postgres` (chỉ mạng nội bộ). Flyway chạy khi API khởi động. Log docker xoay vòng (`max-size`, `max-file`).

Local: compose riêng chỉ chạy Postgres; Next.js và Spring Boot chạy chế độ dev.

### 5.3 Deploy
GitHub Actions khi push `main`: test → build image → `docker save | ssh … docker load` → `docker compose up -d` → health check (`/api/actuator/health`, trang `/vi`) → lỗi thì tự quay lại tag trước.

Trước khi có tên miền: dùng `<ip>.sslip.io` (HTTPS thật). Khi có `nepnhaxudong.vn`: trỏ NS về Cloudflare, đổi host trong `Caddyfile`.

### 5.4 Backup
- Mỗi đêm: `pg_dump` + thư mục ảnh → restic (mã hóa) → Cloudflare R2.
- Giữ 7 bản ngày + 4 bản tuần.
- Script khôi phục; chạy thử khôi phục hằng tháng.

### 5.5 Log và cảnh báo
- Grafana Cloud free + Grafana Alloy trên VPS → Loki.
- Kiểm tra website mỗi 5 phút (Grafana Synthetic Monitoring hoặc UptimeRobot). Cảnh báo qua email / Telegram khi web chết hoặc backup lỗi.

### 5.6 Bảo mật VPS
SSH chỉ bằng key, tắt đăng nhập mật khẩu và root; ufw mở 22/80/443; fail2ban; unattended-upgrades. Secret trong `.env` trên VPS và GitHub Secrets; repo chỉ có `.env.example`.

### 5.7 Chi phí ước tính
VPS ~150–250 nghìn đồng / tháng; Cloudflare, R2, Grafana Cloud, UptimeRobot: 0; tên miền `.vn` ~500–800 nghìn đồng / năm.

## 6. Repo, session dùng chung và agent

### 6.1 Cấu trúc repo
```
nepnhaxudong/
├── CLAUDE.md
├── .claude/settings.json       quyền, hook, enabledPlugins, extraKnownMarketplaces
├── .claude/skills/             skill chung đã lọc
├── .mcp.json                   shadcn, playwright, next-devtools, nanobanana, recraft (không có key)
├── docs/session/STATE.md       trạng thái hiện tại
├── docs/session/log/           YYYY-MM-DD-<máy>-<chủ đề>.md
├── docs/decisions/             NNNN-<tên>.md
├── docs/superpowers/specs|plans/
├── web/   api/   infra/
```
GitHub repo cá nhân, private. `main` được bảo vệ; nhánh `feat/<tên-ngắn>`; PR + CI xanh mới merge.

### 6.2 Trạng thái xuyên máy
- `STATE.md` gồm: giai đoạn hiện tại, việc đã xong, việc đang làm, việc tiếp theo, vướng mắc, link quyết định gần nhất.
- Hook `SessionStart` in `STATE.md` vào context (lệnh chạy được trên Git Bash Windows và Linux).
- Hook `Stop` nhắc cập nhật `STATE.md` nếu có file đổi mà `STATE.md` chưa đổi.
- Quy tắc trong `CLAUDE.md`: đầu session `git pull`; cuối session cập nhật `STATE.md` + viết log + commit + push. Hai máy không làm cùng một nhánh cùng lúc.
- Spec và plan được commit vào repo (khác quy tắc của các repo luz).

### 6.3 Quy tắc và skill mang từ máy công ty
- `CLAUDE.md` chứa quy tắc làm việc: trả lời tiếng Việt; tiếng Anh đơn giản, không thành ngữ; đánh giá độc lập; đường dẫn file đầy đủ; không thêm dòng Co-Authored-By; không `reset --hard` / `checkout -f` / `clean` khi có thay đổi chưa commit; không ghi secret vào repo.
- Plugin bật qua `settings.json`: superpowers, frontend-design, playwright, claude-seo.
- Skill chung chép vào `.claude/skills/` sau khi lọc. Ứng viên: `excalidraw-diagram`, `state-diagram`, `explain-root-cause`. Không mang: mọi skill gắn với luz (Jira, Bitbucket, vault OneAPI, tenant, deploy-luz, hotfix, secret công ty).
- Lọc: quét mỗi skill tìm `luz`, `klara`, `axonactive`, `oneapi`, `tenant`, URL nội bộ, `D:\workspaces\luz`, key / token. Có → viết lại bản chung hoặc bỏ. Chủ dự án duyệt danh sách cuối trước khi commit.

### 6.4 Cloud session
- Kết nối repo trên claude.ai/code; môi trường cài JDK 21, Node 22, pnpm.
- Nếu cloud không có Docker: cloud chạy unit test; test Testcontainers chạy ở local và GitHub Actions.
- Key Gemini / Recraft đặt trong biến môi trường của từng máy và môi trường cloud.

## 7. Thứ tự triển khai

Mỗi phần có implementation plan riêng.

1. **C — Nền tảng làm việc:** repo, `CLAUDE.md`, `STATE.md`, hook, skill đã lọc, `.mcp.json`; kiểm tra trên máy công ty, máy cá nhân, cloud.
2. **A — Thương hiệu:** ý tưởng logo → SVG tách lớp → 3 bản logo → token màu + font.
3. **B — Website:** API + DB → trang công khai → admin → hiệu ứng → kiểm thử.
4. **D — Hạ tầng:** VPS, compose, deploy, backup, log, cảnh báo; tên miền làm cuối.

## 8. Rủi ro và việc cần xác nhận

| Mục | Rủi ro / việc cần làm | Khi nào |
|---|---|---|
| Tên "Nếp Nhà" | Trùng hộ kinh doanh ở Hà Nội; tên miền ngắn đã mất; có thể đã có nhãn hiệu | Tra Cục SHTT trước khi in bao bì |
| Tên miền `nepnhaxudong.vn` | Không có bản ghi DNS ngày 2026-11-03, chưa xác nhận bằng whois | Trước khi mua |
| Tài khoản Claude công ty | Dự án cá nhân nằm trong tổ chức công ty, có thể trái quy định nội bộ | Chủ dự án tự xác nhận |
| Docker trong cloud session | Có thể không có → không chạy được Testcontainers ở cloud | Phần C |
| Ảnh HEIC | Có thể bị gửi lên dạng HEIC | Phần B |
| Nội dung từ gia đình | Cần: ảnh sản phẩm, quy cách đóng gói, giá (nếu hiện), các mốc hành trình, link bài báo, thông tin liên hệ | Trước phần B (trang công khai) |
| Danh tính git | Git global trên máy công ty là email công ty | Đặt `user.email` cá nhân trong repo trước khi push lần đầu |
