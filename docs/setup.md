# Cài đặt

## Cài đặt một máy mới (Windows)
1. Cài Git for Windows, Node 22, Claude Code (lệnh `claude`; ứng dụng Claude desktop không thêm lệnh này vào PATH), JDK 21, Docker Desktop hoặc Rancher Desktop (xem mục "Docker trên máy"), uv và Python 3 (Python 3 cần cho hai skill `state-diagram` và `call-chain`). Cài bằng `winget` được, ví dụ:
   ```bash
   winget install --id Anthropic.ClaudeCode -e
   winget install --id EclipseAdoptium.Temurin.21.JDK -e
   winget install --id astral-sh.uv -e
   winget install --id Docker.DockerDesktop -e
   ```
   - Bộ cài Temurin đặt `JAVA_HOME` cho cả máy. Nếu máy có sẵn JDK khác, kiểm tra bằng `java -version` trong một terminal mới.
   - Docker Desktop cần quyền admin (bấm Yes ở hộp thoại UAC) và WSL 2. Nếu `wsl --status` báo thiếu nhân WSL 2, chạy `wsl --update` trước. Có thể phải khởi động lại máy.
   - Nếu dùng ứng dụng Claude trên Windows (bản desktop), đặt thêm biến sau, để Python mà `uv` tải về không nằm trong `AppData` (ứng dụng ảo hóa thư mục này, làm hỏng liên kết của `uv` và MCP `nanobanana` không chạy được):
     ```bat
     setx UV_PYTHON_INSTALL_DIR "%USERPROFILE%\.local\share\uv\python"
     ```
   - Biến môi trường mới chỉ có hiệu lực sau khi mở lại terminal; với ứng dụng Claude desktop thì phải thoát hẳn ứng dụng rồi mở lại.
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
   Ứng dụng Claude desktop không hỏi cài plugin. Khi đó cài bằng dòng lệnh, trong thư mục repo (marketplace được thêm tự động từ `.claude/settings.json`; nếu chưa có, thêm bằng `claude plugin marketplace add <owner/repo>`):
   ```bash
   claude plugin install antislop@anti-slop --scope project
   claude plugin install taste-skill@taste-skill --scope project
   claude plugin install gsap-skills@gsap-skills --scope project
   claude plugin install frontend-design@claude-plugins-official --scope project
   claude plugin install playwright@claude-plugins-official --scope project
   claude plugin install claude-seo@agricidaniel-claude-seo --scope project
   claude plugin install andrej-karpathy-skills@karpathy-skills --scope project
   ```
   Lệnh cài viết lại định dạng của `.claude/settings.json` (nội dung không đổi): trả file về bằng `git restore .claude/settings.json`. Kiểm tra bằng `claude plugin list`, rồi mở session mới.
   Lần đầu mở session, MCP `shadcn` và `next-devtools` có thể báo quá thời gian vì `npx` đang tải gói; mở session mới là được.
6. Recraft cần đăng nhập một lần, trong terminal (ứng dụng Claude desktop không có lệnh `/mcp`). Trong thư mục repo chạy `claude`; lần đầu nó hỏi có dùng các MCP server trong `.mcp.json` không — chọn dùng tất cả. Sau đó gõ `/mcp`, chọn `recraft`, rồi chọn Authenticate và đăng nhập trên trình duyệt. Nếu terminal báo không tìm thấy `claude` ngay sau khi cài, mở một cửa sổ PowerShell mới.
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
2. Chép file tĩnh và thư mục `public/` cạnh server (server standalone chỉ phục vụ file tĩnh khi chúng nằm cạnh nó; thiếu `public/` thì các hình câu chuyện `/story/*.svg` báo lỗi 404):
   ```bash
   mkdir -p .next/standalone/.next/static && cp -r .next/static/. .next/standalone/.next/static
   cp -r public .next/standalone/public
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
npx lighthouse@13.6.0 http://127.0.0.1:3300/vi --form-factor=mobile --only-categories=performance,accessibility,best-practices,seo --output=json --output-path="$HOME/lh-vi.json" --chrome-flags="--headless=new"
```
Báo cáo được ghi vào thư mục home, ngoài repo, nên không bị commit nhầm. Làm tương tự cho `/en` (ghi ra `"$HOME/lh-en.json"`). Cần Chrome trên máy. Nếu không tìm thấy, đặt `CHROME_PATH` trỏ tới Chromium của Playwright (trong thư mục `ms-playwright` của cache Playwright). Không commit file báo cáo.

Kết quả đo ngày 2026-11-04, máy công ty, Lighthouse 13.6.0, mobile, dữ liệu mẫu, bản build production. Mỗi trang đo 2 lần; bảng ghi từng lần (lần 1 / lần 2). Mục tiêu: mỗi điểm từ 90 trở lên, LCP dưới 2,5 giây.

| Trang | Performance | Accessibility | SEO | LCP |
|---|---|---|---|---|
| `/vi` | 94 / 95 | 100 / 100 | 100 / 100 | 1,1 s / 1,0 s |
| `/en` | 97 / 100 | 100 / 100 | 100 / 100 | 0,9 s / 0,9 s |

Cả hai trang đạt mục tiêu. Điểm Performance bị trừ chủ yếu do Total Blocking Time (80 đến 270 ms). Khi API thật có ảnh sản phẩm, cần đo lại.

Kết quả đo sau B4 (hiệu ứng GSAP, mascot thật), ngày 2026-11-04, máy công ty, Lighthouse 13.6.0, mobile, dữ liệu mẫu, bản build production. Mỗi trang đo 2 lần (lần 1 / lần 2).

| Trang | Performance | Accessibility | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| `/vi` | 98 / 86 | 100 / 100 | 100 / 100 | 1,1 s / 1,1 s | 0 / 0 | 180 ms / 560 ms |
| `/en` | 91 / 95 | 100 / 100 | 100 / 100 | 1,1 s / 1,1 s | 0 / 0 | 370 ms / 260 ms |

LCP và CLS đạt mục tiêu ở cả 4 lần đo. Một lần đo của `/vi` (lần 2) có Performance 86, dưới mục tiêu 90, vì TBT lên 560 ms; lần 1 của cùng trang đạt 98. TBT dao động nhiều giữa các lần đo trên máy này. Nên đo lại khi có ảnh thật.

## Cloud session
Sẽ điền sau khi kiểm tra trên claude.ai/code.

Lưu ý: `scripts/cloud-setup.sh` có thể in `java=unknown` khi máy có java nhưng script không đọc được số phiên bản.

## Docker trên máy (Docker Desktop hoặc Rancher Desktop)
Lệnh `docker` có thể đến từ Docker Desktop hoặc Rancher Desktop; máy nào có cái nào thì dùng cái đó. Postgres local, test của API (Testcontainers) và kiểm thử đầu-cuối đầy đủ đều cần nó.

1. Cài một trong hai, một lần mỗi máy.
   - Rancher Desktop: trong Preferences, chọn Container Engine là `dockerd (moby)`. Không cần bật Kubernetes cho dự án này.
   - Docker Desktop: dùng cài đặt mặc định (WSL 2). Lần đầu mở, chấp nhận điều khoản; không cần đăng nhập.
2. Trước khi chạy Postgres hoặc test, kiểm tra:
   ```bash
   docker info
   ```
3. Nếu lệnh trên báo lỗi không kết nối được, bật ứng dụng (hoặc mở nó từ menu Start), rồi chờ đến khi `docker info` chạy được (thường dưới 3 phút). Docker Desktop:
   ```bash
   docker desktop start
   ```
   Rancher Desktop:
   ```bash
   rdctl start
   ```
   Nếu `rdctl` không có trong PATH, dùng đường dẫn đầy đủ `"C:\Program Files\Rancher Desktop\resources\resources\win32\bin\rdctl.exe"`.

   Nếu `docker` chưa có trong PATH ngay sau khi cài Docker Desktop, mở lại terminal, hoặc dùng `"C:\Program Files\Docker\Docker\resources\bin\docker.exe"`.

Agent tự bật Docker Desktop hoặc Rancher Desktop theo cách trên khi cần. Nếu máy chưa cài cái nào, agent dừng lại và nhờ bạn cài; agent không tự cài.

Không có `psql` trên máy thì vẫn chạy câu SQL được qua container Postgres đang chạy:
```bash
docker compose -f infra/compose.dev.yml exec postgres psql -U nepnha -d nepnha -c "select 1"
```

## Chạy API ở local
API nằm trong thư mục `api/` (Spring Boot 4, Java 21, Postgres 16). Cần Docker (xem mục "Docker trên máy") và JDK 21; JDK 21 phải là JDK đang dùng (`JAVA_HOME` trỏ tới JDK 21, kiểm tra bằng `java -version`).

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
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | Admin đầu tiên. API chỉ tạo tài khoản này khi bảng `app_user` còn trống. Tài khoản này có vai trò **Chủ** (quản lý tài khoản của cả nhà); tài khoản thêm sau là **Người nhà** cho đến khi Chủ đổi vai trò. Mật khẩu tạm này **bắt buộc đổi ở lần đăng nhập đầu**; chưa đổi thì mọi đường dẫn `/api/admin/**` trả 403. |
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

Lưu ý về ảnh: API chỉ ghi file vào `MEDIA_DIR`, không phục vụ đường dẫn `/media/*`. Ở môi trường local, web phục vụ `/media/*` từ thư mục `MEDIA_DEV_DIR` (xem bước 3 của phần "Chạy trang quản trị ở local" bên dưới), nên web local hiện được ảnh đã tải lên khi `MEDIA_DEV_DIR` trùng `MEDIA_DIR`. Ở production, Caddy sẽ phục vụ `/media/*` (phần D). Đây là cách làm đã chốt: API chỉ lưu file, việc phục vụ file thuộc về máy chủ web phía trước.

## Chạy trang quản trị ở local
Trang quản trị nằm ở `/admin` của web và gọi API qua đường dẫn `/api/...` cùng gốc. Cần Docker, JDK 21 và Node 22.

1. Chạy Postgres local:
   ```bash
   docker compose -f infra/compose.dev.yml up -d
   ```
2. Chạy API với profile `dev`, có `MEDIA_DIR` (thư mục chứa ảnh tải lên) và admin đầu tiên. Làm trong `api/`:
   ```bash
   export BOOTSTRAP_ADMIN_EMAIL=admin@example.com
   export BOOTSTRAP_ADMIN_PASSWORD='<mật khẩu tạm>'
   export MEDIA_DIR=./data/media
   ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
   ```
3. Trong `web/`, đặt hai biến rồi chạy web với API thật. Cả hai có trong `web/.env.example`; có thể chép vào `web/.env.local`.
   - `API_PROXY_ORIGIN=http://localhost:8080`: Next chuyển `/api/*` sang API. Biến này được đọc lúc build, nên đổi giá trị thì chạy lại `npm run dev:api`.
   - `MEDIA_DEV_DIR=../api/data/media`: web phục vụ ảnh đã tải lên ở `/media` (chỉ ngoài production). Đường dẫn này phải trùng `MEDIA_DIR` của API.
   ```bash
   npm run dev:api
   ```
4. Mở `http://localhost:3000/admin` và đăng nhập bằng admin đầu tiên.
5. Lần đầu bạn phải đổi mật khẩu. Chưa đổi thì mọi màn hình khác đều không dùng được.

Cổng 8080 hoặc 3000 đang bị chiếm thì đổi cổng của API (đặt `SERVER_PORT=...` trước khi chạy, hoặc thêm `-Dspring-boot.run.arguments=--server.port=...`) và đổi `API_PROXY_ORIGIN` cho khớp.

## Chạy kiểm thử đầu-cuối của trang quản trị
Bộ test này chạy với hệ thống thật: Postgres, API và web đều khởi động mới. Cần Docker, JDK 21 (`JAVA_HOME` trỏ tới JDK 21) và Node 22. Lần đầu trên máy: `npx playwright install chromium` (trong `web/`). Sau đó:
```bash
cd web
npm run test:fullstack
```
Lệnh `run.mjs` làm lần lượt:
1. Chạy một container Postgres tạm trên cổng rảnh.
2. Build API (`./mvnw -DskipTests package`) và chạy file jar với profile mặc định.
3. Build web vào thư mục riêng `.next-e2e-fullstack` (không đụng tới `.next` của `npm run dev`) và chạy bản standalone.
4. Chạy Playwright: đăng nhập lần đầu, đổi mật khẩu, thêm mốc, tạo và đăng bài, tải ảnh, khôi phục từ Lịch sử, đăng nhập lại khi phiên hết hạn, kiểm tra màn hình 375 px và kiểm tra axe.
5. Dừng web và API, xóa container và các thư mục tạm, kể cả khi test lỗi.

Các cổng và mật khẩu được sinh lúc chạy, không ghi ra file. Mất khoảng 3 phút (đến 8 phút khi máy bận), phần lớn là hai lần build. Mỗi lần chạy, báo cáo HTML được ghi vào `web/playwright-report`. Khi test lỗi, mở báo cáo bằng `npx playwright show-report` (chạy trong `web/`). Trên GitHub, workflow `fullstack` chạy bộ test này cho mỗi pull request đổi `api/` hoặc `web/`.
