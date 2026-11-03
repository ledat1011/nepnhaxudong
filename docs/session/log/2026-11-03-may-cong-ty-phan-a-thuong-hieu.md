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
- Xem mascot bản Task 4, chủ dự án chỉ vào ảnh tham khảo Freepik: "mặt, bắp tay tròn như này được", "bó lúa to, dày, trĩu hạt" → sửa mascot: mặt tròn đầy đặn hơn (má phúng phính), cánh tay và bắp tay tròn, mập; bó lúa to và dày hơn, nhiều bông, hạt nặng làm bông cong rủ xuống. Chỉ lấy tỷ lệ tròn trịa của ảnh tham khảo, không chép hình.
- Chủ dự án gửi ảnh người nông dân ôm lúa: "để bó lúa ở khuỷu tay ôm kiểu như này" → bó lúa nằm chéo ngang người, đặt trong khuỷu tay như bế: gốc rạ ở dưới một bên, bông lúa trĩu hạt rủ xuống qua cánh tay bên kia; một tay đỡ dưới, một tay nắm phía trên. Thay cho "cong qua vai" ở spec 2.3.
- Chủ dự án sửa: "bó lúa nghiêng bên trái, không phải bên phải như hình" → lật ngược so với ảnh: bông lúa rủ về bên trái của người xem, gốc rạ ở dưới bên phải người xem.

## Quyết định
- Không dùng Nano Banana / Recraft (khác quy trình ở spec 2.3) — chủ dự án quyết định; Claude vẽ SVG trực tiếp, có nhóm `<g id>` ngay từ đầu, nên không cần bước chuyển ảnh sang SVG.
- Thêm màu `da` = `#F4CDA8`, chỉ dùng trong mascot — chủ dự án duyệt theo plan.
- Được tải font Pacifico / Quicksand + OFL, gói npm `@resvg/resvg-js`, `opentype.js`, `svgo`, `svgson` — chủ dự án duyệt theo plan.

## Còn mở
- (Từ session chính, chủ dự án nói) "Duy Tân" là tên phường, thương hiệu vẫn là "Nếp Nhà", bảng màu nâu / vàng / trắng không đổi. Bao bì hiện tại màu xanh lá, khẩu hiệu "Hạt Ngọc Xứ Đông", "Mềm - Dẻo - Thơm ngon". Có thể hỏi chủ dự án: dòng nhỏ của logo có muốn dùng "Hạt Ngọc Xứ Đông" thay cho "Xứ Đông · Gạo nếp cái hoa vàng" không. Không đưa số hotline và logo hội nông dân vào repo.
- Quyết định "không dùng Nano Banana / Recraft" nên được ghi vào `docs/decisions/` khi session phần C gộp trạng thái; `.mcp.json` của phần C có thể bỏ `nanobanana` và `recraft`.

## Đã làm
- Tạo worktree và nhánh `feat/phan-a-thuong-hieu`.
- Viết plan phần A.
