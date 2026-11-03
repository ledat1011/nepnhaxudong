# 2026-11-03 — máy công ty — phần A (thương hiệu)

Nhánh `feat/phan-a-thuong-hieu`, worktree `D:\workspaces\nepnhaxudong-phan-a` (tách từ `main`).
Chạy song song với session phần C (nhánh `feat/phan-c-nen-tang`). Không sửa file của phần C:
`CLAUDE.md`, `docs/session/STATE.md`, `.claude/**`, `.mcp.json`, `package.json`, `scripts/**`.

## Phản hồi
- Chủ dự án duyệt plan phần A, chọn cách thực hiện Subagent-driven → mỗi task một subagent làm + một subagent review.

- Chủ dự án hỏi vì sao làm logo lại tốn tiền, rồi nói: "bạn tự làm, không dùng Nano Banana của Google" → Claude tự vẽ mascot và logo bằng SVG; không gọi Gemini, không dùng Recraft, không tốn phí API.
- Xem 6 ý tưởng, chủ dự án nói: "một người phụ nữ trung niên ~50 tuổi, với ôm một bó lúa" → lấy bản 1 (nhìn thẳng, ~50 tuổi) làm gốc, đổi tư thế thành hai tay ôm bó lúa (bàn tay nắm phía trước thân lúa), ngọn lúa vẫn cong qua vai.
- Chủ dự án thêm: "người phụ nữ nông dân chất phác" → dáng mộc mạc, giản dị của người làm ruộng (không làm điệu, không giống búp bê); áo cánh đơn giản, có thể xắn tay áo, nụ cười hiền và mộc.
- Chủ dự án gửi ảnh chân dung bà chủ sản phẩm → mascot giống bà chủ ở các nét: tóc đen thẳng ngang vai có mái thưa, nụ cười hiền mím môi, khoảng 55 tuổi. Không vẽ kính, không vẽ khuyên tai (chủ dự án nói không cần). Ảnh chân dung là ảnh riêng: không đưa vào repo.

## Quyết định
- Không dùng Nano Banana / Recraft (khác quy trình ở spec 2.3) — chủ dự án quyết định; Claude vẽ SVG trực tiếp, có nhóm `<g id>` ngay từ đầu, nên không cần bước chuyển ảnh sang SVG.
- Thêm màu `da` = `#F4CDA8`, chỉ dùng trong mascot — chủ dự án duyệt theo plan.
- Được tải font Pacifico / Quicksand + OFL, gói npm `@resvg/resvg-js`, `opentype.js`, `svgo`, `svgson` — chủ dự án duyệt theo plan.

## Còn mở
- Quyết định "không dùng Nano Banana / Recraft" nên được ghi vào `docs/decisions/` khi session phần C gộp trạng thái; `.mcp.json` của phần C có thể bỏ `nanobanana` và `recraft`.

## Đã làm
- Tạo worktree và nhánh `feat/phan-a-thuong-hieu`.
- Viết plan phần A.
