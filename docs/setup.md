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

1. Build vào thư mục mặc định `.next` (thư mục này đã được git bỏ qua; build vào thư mục khác sẽ làm Next sửa `web/tsconfig.json`):
   ```bash
   SITE_URL=http://127.0.0.1:3300 npx next build
   ```
2. Chép file tĩnh cạnh server (server standalone chỉ phục vụ file tĩnh khi chúng nằm cạnh nó):
   ```bash
   mkdir -p .next/standalone/.next/static && cp -r .next/static/. .next/standalone/.next/static
   ```
3. Chạy server:
   ```bash
   PORT=3300 HOSTNAME=127.0.0.1 CONTENT_SOURCE=mock SITE_URL=http://127.0.0.1:3300 node .next/standalone/server.js
   ```
   Mở `http://127.0.0.1:3300/vi`. Dừng bằng Ctrl+C.

`SITE_URL` phải đặt ở cả bước build (cấu hình ảnh) và bước chạy (canonical, sitemap).

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

## Chạy API ở local
API nằm trong thư mục `api/` (Spring Boot 4, Java 21, Postgres 16). Cần Docker và JDK 21; JDK 21 phải là JDK đang dùng (`JAVA_HOME` trỏ tới JDK 21, kiểm tra bằng `java -version`).

1. Chạy Postgres local (cổng 5433, DB và user `nepnha`, mật khẩu mặc định `nepnha-local` chỉ dùng cho local):
   ```bash
   docker compose -f infra/compose.dev.yml up -d
   ```
   Cổng chỉ mở cho chính máy này (`127.0.0.1`). Nếu DB local đã được tạo trước khi cấu trúc bảng đổi (file `V1__schema.sql` được sửa tại chỗ vì chưa có môi trường nào chạy thật), hãy xoá DB local một lần: `docker compose -f infra/compose.dev.yml down -v`, rồi chạy lại lệnh `up -d` ở trên.
2. Chạy API với profile `dev`. Đặt tài khoản admin đầu tiên và thư mục chứa ảnh tải lên bằng biến môi trường (xem bảng bên dưới):
   ```bash
   cd api
   export BOOTSTRAP_ADMIN_EMAIL=admin@example.com
   export BOOTSTRAP_ADMIN_PASSWORD='<mật khẩu tạm>'
   export MEDIA_DIR=./data/media
   ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
   ```
   Cổng 8080 đang bị chiếm thì thêm `-Dspring-boot.run.arguments=--server.port=8081` và đổi cổng trong các lệnh `curl` bên dưới.
3. Kiểm tra: mở `http://localhost:8080/api/actuator/health`, kết quả phải có `"status":"UP"`.

Chạy test (cần Docker, Testcontainers tự bật Postgres): `cd api && ./mvnw -B verify`.

Biến môi trường (mẫu ở `api/.env.example`). Không ghi mật khẩu thật vào repo.

| Biến | Ý nghĩa |
| --- | --- |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Kết nối Postgres. Profile `dev` đã có mặc định cho local. |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | Admin đầu tiên. API chỉ tạo tài khoản này khi bảng `app_user` còn trống. Mật khẩu tạm này **bắt buộc đổi ở lần đăng nhập đầu**; chưa đổi thì mọi đường dẫn `/api/admin/**` trả 403. |
| `MEDIA_DIR` | Thư mục chứa ảnh tải lên (mặc định `./data/media`). |
| `WEB_BASE_URL`, `REVALIDATE_SECRET` | Địa chỉ web và khoá chung với web. Sau khi nội dung đổi, API gọi web để làm mới trang. Để trống ở local khi chưa chạy web: API bỏ qua các lệnh gọi này. |

Dữ liệu mẫu: profile `dev` tự tạo nội dung có chữ `[MẪU]` khi khởi động: 1 sản phẩm, 3 mốc hành trình, 2 bài báo, 2 bài viết đã đăng và 3 cài đặt (liên hệ, mạng xã hội, thương hiệu). Mỗi phần chỉ được tạo khi còn thiếu: sản phẩm, mốc hành trình và bài báo chỉ khi chưa có cái nào; mỗi bài viết chỉ khi địa chỉ tiếng Việt của nó còn trống; mỗi cài đặt chỉ khi chưa có dòng đó. Cài đặt bạn đã sửa không bao giờ bị ghi đè.

Luôn chạy Maven từ thư mục `api/` (`cd api && ./mvnw …`), vì `api/.mvn/maven.config` dùng file settings riêng của dự án (chỉ Maven Central).

## Thử API
Các lệnh dưới đây đã chạy thật trên Windows (Git Bash) với API ở `http://localhost:8080`. Chúng cũng chạy được trong shell Linux. Mọi đường dẫn nằm dưới `/api`.

Cách dùng cookie và CSRF:
- Dùng một file cookie (`$T/jar.txt`) cho mọi lệnh: `-c "$T/jar.txt" -b "$T/jar.txt"`. File này chứa một phiên đăng nhập admin còn hiệu lực 30 ngày, nên nó nằm trong thư mục tạm `$T` (không nằm trong thư mục làm việc) và bị xoá ở bước cuối.
- Mỗi lệnh ghi (POST, PUT, DELETE) cần header `X-XSRF-TOKEN` lấy từ `GET /api/auth/csrf`.
- Token CSRF đổi sau khi đăng nhập, đăng xuất và đổi mật khẩu. Hãy lấy lại token sau các bước đó.
- Cookie CSRF có `Path=/api`, nên trong trình duyệt hãy đọc token từ JSON của `/api/auth/csrf`, không đọc từ `document.cookie`.

Đặt sẵn hai biến và một hàm lấy token (nhập một lần cho mỗi cửa sổ terminal). `T` là thư mục tạm chứa mọi file của các lệnh dưới đây:
```bash
B=http://localhost:8080/api
T=$(mktemp -d)
csrf() { curl -s -c "$T/jar.txt" -b "$T/jar.txt" "$B/auth/csrf" | python -c "import sys,json;print(json.load(sys.stdin)['token'])"; }
```
Nếu máy không có `python`, đọc token bằng `jq -r .token` thay cho phần `python -c ...`.

1. Kiểm tra sống: kết quả có `"status":"UP"`.
   ```bash
   curl -s "$B/actuator/health"
   ```
2. Trang chủ công khai (tiếng Việt): trả về JSON có dữ liệu `[MẪU]`.
   ```bash
   curl -s "$B/public/vi/home"
   ```
3. Đăng nhập bằng admin đầu tiên. Ghi nội dung vào file để không phải xử lý dấu nháy trong shell:
   ```bash
   printf '{"email":"admin@example.com","password":"%s"}' '<mật khẩu tạm>' > "$T/login.json"
   curl -s -c "$T/jar.txt" -b "$T/jar.txt" -H "X-XSRF-TOKEN: $(csrf)" -H 'Content-Type: application/json' --data @"$T/login.json" "$B/auth/login"
   ```
   Kết quả có `"mustChangePassword":true`. Lúc này `curl -s -b "$T/jar.txt" "$B/admin/timeline"` trả 403 với nội dung "Bạn cần đổi mật khẩu trước."
4. Đổi mật khẩu (trả 204, mật khẩu mới ít nhất 12 ký tự):
   ```bash
   printf '{"currentPassword":"%s","newPassword":"%s"}' '<mật khẩu tạm>' '<mật khẩu mới>' > "$T/pw.json"
   curl -s -i -c "$T/jar.txt" -b "$T/jar.txt" -H "X-XSRF-TOKEN: $(csrf)" -H 'Content-Type: application/json' --data @"$T/pw.json" "$B/auth/password"
   curl -s -c "$T/jar.txt" -b "$T/jar.txt" "$B/auth/me"
   ```
   Lệnh `me` phải cho `"mustChangePassword":false`. Hai file `login.json` và `pw.json` có mật khẩu; chúng nằm trong `$T` và bị xoá ở bước cuối.
5. Tạo một mốc hành trình (trả 201). Tiếng Anh là tuỳ chọn; thiếu thì trang tiếng Anh dùng chữ tiếng Việt:
   ```bash
   cat > "$T/tl.json" <<'EOF'
   {"year":2024,"title":{"vi":"[MẪU] Mốc mới từ curl","en":"[SAMPLE] New event from curl"},"description":{"vi":"[MẪU] Thử tạo mốc qua API."}}
   EOF
   curl -s -c "$T/jar.txt" -b "$T/jar.txt" -H "X-XSRF-TOKEN: $(csrf)" -H 'Content-Type: application/json; charset=utf-8' --data-binary @"$T/tl.json" "$B/admin/timeline"
   ```
6. Xem lại trang chủ: mốc mới nằm trong mục `timeline`.
   ```bash
   curl -s "$B/public/vi/home"
   ```
7. Tải một ảnh JPEG lên (trả 201). Cả `altVi` và `altEn` đều bắt buộc. Trên Windows, `curl` trong Git Bash làm hỏng chữ có dấu nếu ghi thẳng trong dòng lệnh (kết quả thành `?`), nên đọc chữ tiếng Việt từ file bằng `<tên-file`:
   ```bash
   printf '[MẪU] Ảnh thử' > "$T/alt-vi.txt"
   curl -s -c "$T/jar.txt" -b "$T/jar.txt" -H "X-XSRF-TOKEN: $(csrf)" -F file=@anh.jpg -F "altVi=<$T/alt-vi.txt" -F 'altEn=[SAMPLE] Test image' "$B/admin/media"
   ```
   Kết quả có `"url":"/media/2026/11/<uuid>.jpg"`. File nằm trong `MEDIA_DIR` ở đường dẫn `<MEDIA_DIR>/2026/11/<uuid>.jpg` (bỏ tiền tố `/media/`).
8. Trang chủ tiếng Anh: chỗ nào chưa có chữ tiếng Anh thì dùng chữ tiếng Việt (ví dụ mô tả của mốc ở bước 5).
   ```bash
   curl -s "$B/public/en/home"
   ```

9. Dọn dẹp: xoá thư mục tạm (cookie phiên, `login.json`, `pw.json` và các file khác).
   ```bash
   rm -rf "$T"
   ```

Một lệnh ghi thiếu header `X-XSRF-TOKEN` trả 403. Token chỉ được đọc từ header này; API không nhận token gửi trong phần thân form hay trên đường dẫn.

Lưu ý về ảnh: ở môi trường local, API chỉ ghi file vào `MEDIA_DIR`; đường dẫn `/media/*` chưa có ai phục vụ. Caddy sẽ phục vụ `/media/*` ở phần D, nên web local chưa hiện được ảnh đã tải lên. Đây là cách làm đã chốt: API chỉ lưu file, việc phục vụ file thuộc về máy chủ web phía trước.
