# 0004 — Trạng thái làm việc xuyên máy

## Bối cảnh
Chủ dự án làm trên máy công ty, máy cá nhân và Claude cloud session. Mục tiêu: mở session trên bất kỳ máy nào thì agent tự đọc được trạng thái dự án mà không cần người dùng kể lại.

## Quyết định
- Giữ trạng thái hiện tại trong `docs/session/STATE.md`.
- Hook `SessionStart` nạp `STATE.md` vào context; hook `Stop` nhắc cập nhật nếu có file đổi mà `STATE.md` chưa đổi.
- Mỗi session có một file log trong `docs/session/log/` theo mẫu `_template.md`. File log được tạo ngay khi chủ dự án đưa phản hồi đầu tiên trong session và cập nhật trong cùng lượt (xem `CLAUDE.md`, mục "Nhật ký phản hồi của session").
- Spec và plan (`docs/superpowers/`) được commit vào repo.
- Hai máy không làm cùng một nhánh cùng lúc.

## Lý do
Git là nơi chung duy nhất mà cả hai máy và cloud đều truy cập được. File văn bản trong repo không phụ thuộc công cụ hay tài khoản.

## Hệ quả
- Cuối mỗi session phải cập nhật `STATE.md`, hoàn thiện log, commit và push.
- Đầu mỗi session phải `git pull`.
- Không ghi secret vào `STATE.md` hay log.
