# Cài đặt

## Cài đặt một máy mới (Windows)
1. Cài Git for Windows, Node 22, uv và Python 3 (Python 3 cần cho hai skill `state-diagram` và `call-chain`).
2. Lấy code:
   ```bash
   git clone https://github.com/ledat1011/nepnhaxudong.git
   ```
   Sau khi phần C được merge, nhánh mặc định `main` đã có đủ nội dung; chỉ cần `git clone`, không cần chuyển nhánh.
3. Đặt git identity cho repo (chạy trong thư mục repo):
   ```bash
   git config user.name "ledat1011"
   git config user.email "75622784+ledat1011@users.noreply.github.com"
   ```
4. Đặt biến môi trường người dùng cho key Gemini (không ghi key vào repo):
   ```bat
   setx GEMINI_API_KEY "<key>"
   ```
   Mở lại terminal để biến có hiệu lực.
5. Mở Claude Code trong thư mục repo và chấp nhận cài các plugin được đề nghị. Lần đầu mở repo, Claude Code cũng hỏi có duyệt các MCP server của dự án trong `.mcp.json` không — hãy duyệt.
6. Recraft cần đăng nhập một lần: trong Claude Code chạy `/mcp`, chọn `recraft`, rồi chọn Authenticate.
7. Kiểm tra: hỏi "Giai đoạn hiện tại là gì?". Agent phải trả lời đúng theo `docs/session/STATE.md` mà không cần bạn kể lại.

## Gói cài thêm cho các skill dùng chung
Các skill nằm trong `.claude/skills/`. Chỉ cài khi cần dùng skill đó (`node_modules/` đã được git bỏ qua).

- `excalidraw-diagram` (vẽ sơ đồ, xuất PNG; GIF khi cần). Cần một trình duyệt Edge, Chrome hoặc Chromium và mạng để tải Excalidraw. Gói npm chỉ cần cho GIF:
  ```bash
  cd .claude/skills/excalidraw-diagram && npm ci
  ```
  Chạy thử: `node --test tests/*.test.js` trong thư mục đó (79 test).
- `visual-deck` (slide PowerPoint ít chữ). Cài gói toàn cục một lần mỗi máy:
  ```bash
  npm install -g pptxgenjs react-icons react react-dom sharp
  ```
  Bước kiểm tra hình ảnh dùng WPS Office, chỉ chạy được trên máy Windows có cài WPS.
- `state-diagram` và `call-chain` cần Python 3 (không cần gói thêm). `state-diagram` xuất PNG bằng Edge, Chrome hoặc Chromium.

## Chạy web ở local
Cần Node 22. Web nằm trong thư mục `web/`.

1. Cài gói:
   ```bash
   cd web && npm ci
   ```
2. Chạy với dữ liệu mẫu (không cần API):
   ```bash
   npm run dev
   ```
   Mở `http://localhost:3000/vi`.
3. Chạy với API thật: chép `web/.env.example` thành `web/.env.local`, chạy API theo mục "Chạy API ở local", rồi chạy:
   ```bash
   npm run dev:api
   ```
   `REVALIDATE_SECRET` trong `.env.local` phải giống `REVALIDATE_SECRET` của API.

### Chạy kiểm thử đầu-cuối (Playwright)
Lần đầu trên máy: `npx playwright install chromium` (trong `web/`). Sau đó:
```bash
npm run test:e2e
```
Lệnh này build web hai lần (mỗi lần vào một thư mục riêng `.next-e2e-mock` và `.next-e2e-api`, để cache không lẫn nhau), rồi chạy ba server: API giả (cổng 4010), web dùng dữ liệu mẫu (3100) và web dùng API giả (3200). Ba cổng này phải rảnh. Nếu đã build rồi và chỉ sửa test, chạy `npx playwright test` để bỏ qua bước build. Khi test lỗi, xem báo cáo bằng `npx playwright show-report`.

### Chạy bản production với dữ liệu mẫu
Dùng khi cần xem web đúng như khi chạy thật (ví dụ để đo Lighthouse). `next start` không chạy được vì cấu hình có `output: "standalone"`, nên chạy server standalone. Làm trong `web/`, dùng Git Bash hoặc Linux. Cổng 3300 phải rảnh.

1. Build vào thư mục riêng `.next-lighthouse` (thư mục này đã được git bỏ qua):
   ```bash
   NEXT_DIST_DIR=.next-lighthouse SITE_URL=http://127.0.0.1:3300 npx next build
   ```
2. Chép file tĩnh cạnh server (server standalone chỉ phục vụ file tĩnh khi chúng nằm cạnh nó):
   ```bash
   mkdir -p .next-lighthouse/standalone/.next-lighthouse/static && cp -r .next-lighthouse/static/. .next-lighthouse/standalone/.next-lighthouse/static
   ```
3. Chạy server:
   ```bash
   PORT=3300 HOSTNAME=127.0.0.1 CONTENT_SOURCE=mock SITE_URL=http://127.0.0.1:3300 node .next-lighthouse/standalone/server.js
   ```
   Mở `http://127.0.0.1:3300/vi`. Dừng bằng Ctrl+C.

`SITE_URL` phải đặt ở cả bước build (cấu hình ảnh) và bước chạy (canonical, sitemap). Sau khi build, Next có thể sửa `web/tsconfig.json` (thêm thư mục build vào `include`); không commit thay đổi này.

### Đo Lighthouse (mobile)
Khi server ở mục trên đang chạy, mở một terminal khác trong `web/`:
```bash
npx lighthouse@13.6.0 http://127.0.0.1:3300/vi --form-factor=mobile --only-categories=performance,accessibility,seo --output=json --output-path="$HOME/lh-vi.json" --chrome-flags="--headless=new"
```
Báo cáo được ghi vào thư mục home, ngoài repo, nên không bị commit nhầm. Làm tương tự cho `/en` (ghi ra `"$HOME/lh-en.json"`). Cần Chrome trên máy. Nếu không tìm thấy, đặt `CHROME_PATH` trỏ tới Chromium của Playwright (trong thư mục `ms-playwright` của cache Playwright). Không commit file báo cáo.

Kết quả đo ngày 2026-11-04, máy công ty, Lighthouse 13.6.0, mobile, dữ liệu mẫu, bản build production. Mỗi trang đo 2 lần; bảng ghi từng lần (lần 1 / lần 2). Mục tiêu: mỗi điểm từ 90 trở lên, LCP dưới 2,5 giây.

| Trang | Performance | Accessibility | SEO | LCP |
|---|---|---|---|---|
| `/vi` | 94 / 95 | 100 / 100 | 100 / 100 | 1,1 s / 1,0 s |
| `/en` | 97 / 100 | 100 / 100 | 100 / 100 | 0,9 s / 0,9 s |

Cả hai trang đạt mục tiêu. Điểm Performance bị trừ chủ yếu do Total Blocking Time (80 đến 270 ms). Khi API thật có ảnh sản phẩm, cần đo lại.

## Cloud session
Sẽ điền sau khi kiểm tra trên claude.ai/code.

Lưu ý: `scripts/cloud-setup.sh` có thể in `java=unknown` khi máy có java nhưng script không đọc được số phiên bản.
