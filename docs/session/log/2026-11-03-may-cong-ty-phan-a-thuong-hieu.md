# 2026-11-03 — máy công ty — phần A (thương hiệu)

Nhánh `feat/phan-a-thuong-hieu`, worktree `D:\workspaces\nepnhaxudong-phan-a` (tách từ `main`).
Chạy song song với session phần C (nhánh `feat/phan-c-nen-tang`). Không sửa file của phần C:
`CLAUDE.md`, `docs/session/STATE.md`, `.claude/**`, `.mcp.json`, `package.json`, `scripts/**`.

## Phản hồi
- Chủ dự án duyệt plan phần A, chọn cách thực hiện Subagent-driven → mỗi task một subagent làm + một subagent review.

- Chủ dự án hỏi vì sao làm logo lại tốn tiền, rồi nói: "bạn tự làm, không dùng Nano Banana của Google" → Claude tự vẽ mascot và logo bằng SVG; không gọi Gemini, không dùng Recraft, không tốn phí API.

## Quyết định
- Không dùng Nano Banana / Recraft (khác quy trình ở spec 2.3) — chủ dự án quyết định; Claude vẽ SVG trực tiếp, có nhóm `<g id>` ngay từ đầu, nên không cần bước chuyển ảnh sang SVG.
- Thêm màu `da` = `#F4CDA8`, chỉ dùng trong mascot — chủ dự án duyệt theo plan.
- Được tải font Pacifico / Quicksand + OFL, gói npm `@resvg/resvg-js`, `opentype.js`, `svgo`, `svgson` — chủ dự án duyệt theo plan.

## Còn mở
- Quyết định "không dùng Nano Banana / Recraft" nên được ghi vào `docs/decisions/` khi session phần C gộp trạng thái; `.mcp.json` của phần C có thể bỏ `nanobanana` và `recraft`.

## Đã làm
- Tạo worktree và nhánh `feat/phan-a-thuong-hieu`.
- Viết plan phần A.
