# 2026-11-05 — máy `C:\Users\Admin\Desktop` — chạy app ở local

## Phản hồi
- Chủ dự án yêu cầu chạy app trên máy này → chạy web với dữ liệu mẫu, vì máy thiếu Docker và JDK 21 cho API.

## Quyết định
- (chưa có)

## Còn mở
- Cài Docker Desktop và JDK 21 trên máy này nếu muốn chạy API và trang quản trị `/admin`.

## Đã làm
- `npm ci` trong `web/`; tạo `.claude/launch.json` (cấu hình `web-mock`, cổng 3000).
- Web chạy ở http://localhost:3000/vi, đã chụp màn hình kiểm tra trang chủ hiện đúng.
