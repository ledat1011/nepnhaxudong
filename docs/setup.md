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

## Cloud session
Sẽ điền sau khi kiểm tra trên claude.ai/code.

Lưu ý: `scripts/cloud-setup.sh` có thể in `java=unknown` khi máy có java nhưng script không đọc được số phiên bản.

## Chạy API ở local
API nằm trong thư mục `api/` (Spring Boot 4, Java 21, Postgres 16). Cần Docker và JDK 21; JDK 21 phải là JDK đang dùng (`JAVA_HOME` trỏ tới JDK 21, kiểm tra bằng `java -version`).

1. Chạy Postgres local (cổng 5433, DB và user `nepnha`, mật khẩu mặc định `nepnha-local` chỉ dùng cho local):
   ```bash
   docker compose -f infra/compose.dev.yml up -d
   ```
2. Chạy API với profile `dev`:
   ```bash
   cd api && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
   ```
3. Kiểm tra: mở `http://localhost:8080/api/actuator/health`, kết quả phải có `"status":"UP"`.

Chạy test (cần Docker, Testcontainers tự bật Postgres): `cd api && ./mvnw -B verify`.

Biến môi trường (mẫu ở `api/.env.example`): `DB_URL`, `DB_USER`, `DB_PASSWORD`. Không ghi mật khẩu thật vào repo.

Luôn chạy Maven từ thư mục `api/` (`cd api && ./mvnw …`), vì `api/.mvn/maven.config` dùng file settings riêng của dự án (chỉ Maven Central).
