# 2026-11-04 — máy công ty — rà soát prompt

## Phản hồi
- Chủ dự án: "Áp dụng cả 5" → áp dụng cả 5 phát hiện có đề xuất sửa trong `docs/session/prompt-audit-2026-11-04.md` (skill `call-chain` và `visual-deck`).
- Chủ dự án: "đổi tên file đi" (log tên `…-prompt-audit.md`) → phần chủ đề trong tên file log viết bằng tiếng Việt không dấu, như các log khác: `…-ra-soat-prompt.md`.

## Quyết định
- Sửa 5 phát hiện 1–5 của bản rà soát — chủ dự án chọn.

## Còn mở
- 4 mục chỉ ghi nhận trong báo cáo (6–9) chờ chủ dự án quyết định: "PO" và bản tiếng Anh trong `explain-root-cause`; `state-diagram` lưu sơ đồ không hỏi trước; `web/AGENTS.md` không được Claude Code đọc; thông báo lỗi trỏ tới mục "Offline" trong `render.js`.

## Đã làm
- Rà soát các file hướng dẫn Claude, viết báo cáo `docs/session/prompt-audit-2026-11-04.md`.
- Áp dụng phát hiện 1–5: `origin/master` → `origin/main`; bỏ "limit 30 s" khỏi mẫu đánh dấu transaction; ví dụ đường dẫn trỏ vào `api/`; `visual-deck` nói rõ cần máy Windows có WPS và cách làm khi không có; bỏ các nguyên tắc nội dung lấy từ một bài thuyết trình cụ thể.
