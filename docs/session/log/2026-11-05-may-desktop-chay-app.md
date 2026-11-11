# 2026-11-05 — máy `C:\Users\Admin\Desktop` — chạy app ở local

## Phản hồi
- Chủ dự án yêu cầu chạy app trên máy này → chạy web với dữ liệu mẫu, vì máy thiếu Docker và JDK 21 cho API.
- Email git `ledat1011` trong cấu hình chung của máy: chủ dự án cho là đúng. Agent giữ ý kiến: repo cần email `75622784+ledat1011@users.noreply.github.com` theo `CLAUDE.md`; chỉ đặt email này trong `.git/config` của repo, không đổi cấu hình chung.
- Chủ dự án muốn xem web trên điện thoại qua link internet tạm → dùng Cloudflare quick tunnel tới bản production chạy dữ liệu mẫu ở cổng 3300.
- Chủ dự án yêu cầu cài đủ plugin, MCP và công cụ còn thiếu trên máy này, trong một session riêng. Yêu cầu này thay cho luật "không tự cài plugin" trong `CLAUDE.md`, chỉ cho lần cài này.

- Chủ dự án thấy mascot hiện tại có nét chung chung, giống hình AI tạo, không giống vẽ tay → làm lại mascot trong một session riêng. Session đó hỏi ý tưởng của chủ dự án trước, dùng Nano Banana (đã kết nối).

- Chủ dự án muốn viết prompt Nano Banana cùng agent trong session này, để gọi một lần cho đỡ tốn tiền → phiên mascot chờ prompt, chưa gọi Nano Banana.

## Quyết định
- Mascot mới theo kiểu tranh Đông Hồ (khắc gỗ). Giữ nhân vật cô gái đội nón lá ôm bó lúa.
- Test (2026-11-06): giữ nguyên bộ test hiện có, kể cả unit test của giao diện trang công khai. Không rà lại để bỏ test.

## Còn mở
- (không còn việc mở của session này; phần D đã merge qua PR #31 và #33, bản xem thử Vercel thay cho tunnel)

## Đã làm
- `npm ci` trong `web/`; tạo `.claude/launch.json` (cấu hình `web-mock`, cổng 3000).
- Web chạy ở http://localhost:3000/vi, đã chụp màn hình kiểm tra trang chủ hiện đúng.
- PR #26 (launch config, STATE, nhật ký) đã merge vào `main`.
- Link tạm `https://televisions-operated-done-adams.trycloudflare.com/vi`: build production với `SITE_URL` là link này, server cổng 3300; đã mở ở cỡ 375 px, 8 ảnh đều tải được.
