# Cài đặt

## Cài đặt một máy mới (Windows)
1. Cài Git for Windows, Node 22 và uv.
2. Lấy code:
   ```bash
   git clone https://github.com/ledat1011/nepnhaxudong.git
   ```
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
5. Mở Claude Code trong thư mục repo và chấp nhận cài các plugin được đề nghị.
6. Kiểm tra: hỏi "Giai đoạn hiện tại là gì?". Agent phải trả lời đúng theo `docs/session/STATE.md` mà không cần bạn kể lại.

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
