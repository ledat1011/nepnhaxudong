# 2026-11-03 — máy công ty — phần A (thương hiệu)

Nhánh `feat/phan-a-thuong-hieu`, worktree `D:\workspaces\nepnhaxudong-phan-a` (tách từ `main`).
Chạy song song với session phần C (nhánh `feat/phan-c-nen-tang`). Không sửa file của phần C:
`CLAUDE.md`, `docs/session/STATE.md`, `.claude/**`, `.mcp.json`, `package.json`, `scripts/**`.

## Phản hồi
- Chủ dự án duyệt plan phần A, chọn cách thực hiện Subagent-driven → mỗi task một subagent làm + một subagent review.

## Quyết định
- Gọi Gemini REST bằng script `brand/tools/gen-image.mjs` (không dùng MCP), chuyển SVG bằng `vtracer`; Recraft chỉ khi `vtracer` xấu — chủ dự án duyệt theo plan.
- Thêm màu `da` = `#F4CDA8`, chỉ dùng trong mascot — chủ dự án duyệt theo plan.
- Được tải font Pacifico / Quicksand + OFL, gói npm `@resvg/resvg-js`, `opentype.js`, `svgo`, `svgson`, gói pip `vtracer` — chủ dự án duyệt theo plan.

## Còn mở
- Chủ dự án đặt `GEMINI_API_KEY` làm biến môi trường người dùng Windows (cần trước Task 3).

## Đã làm
- Tạo worktree và nhánh `feat/phan-a-thuong-hieu`.
- Viết plan phần A.
