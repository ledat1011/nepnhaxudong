# 2026-11-05 — máy `C:\Users\Admin\Desktop` — chạy app ở local

## Phản hồi
- Chủ dự án yêu cầu chạy app trên máy này → chạy web với dữ liệu mẫu, vì máy thiếu Docker và JDK 21 cho API.
- Email git `ledat1011` trong cấu hình chung của máy: chủ dự án cho là đúng. Agent giữ ý kiến: repo cần email `75622784+ledat1011@users.noreply.github.com` theo `CLAUDE.md`; chỉ đặt email này trong `.git/config` của repo, không đổi cấu hình chung.
- Chủ dự án muốn xem web trên điện thoại qua link internet tạm → dùng Cloudflare quick tunnel tới bản production chạy dữ liệu mẫu ở cổng 3300.
- Chủ dự án yêu cầu cài đủ plugin, MCP và công cụ còn thiếu trên máy này, trong một session riêng. Yêu cầu này thay cho luật "không tự cài plugin" trong `CLAUDE.md`, chỉ cho lần cài này.

## Quyết định
- (chưa có)

## Còn mở
- Phần D (deploy lâu dài): session riêng, PR #31 chưa merge.
- Link tạm: tunnel đã tắt. Muốn xem lại trên điện thoại thì mở tunnel mới và build lại.

## Đã làm
- `npm ci` trong `web/`; tạo `.claude/launch.json` (cấu hình `web-mock`, cổng 3000).
- Web chạy ở http://localhost:3000/vi, đã chụp màn hình kiểm tra trang chủ hiện đúng.
- PR #26 (launch config, STATE, nhật ký) đã merge vào `main`.
- Link tạm `https://televisions-operated-done-adams.trycloudflare.com/vi`: build production với `SITE_URL` là link này, server cổng 3300; đã mở ở cỡ 375 px, 8 ảnh đều tải được.
