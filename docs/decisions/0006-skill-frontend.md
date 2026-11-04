# 0006 — Bộ skill cho frontend

## Bối cảnh
Chủ dự án muốn cài 4 bộ skill trên GitHub cho phần giao diện: anti-slop, taste-skill, web-design-guidelines (vercel-labs) và gsap-skills. Các session làm B2, B3 trước đây mở từ một thư mục khác, nên không nạp được plugin của repo.

## Quyết định
- Chép skill vào `.claude/skills/` của repo (không cài dạng plugin). Mỗi skill được đọc và quét bằng `scripts/scan-skill.mjs` trước khi chép, và giữ giấy phép MIT của nguồn.
- Nguồn, commit và giấy phép ghi trong `.claude/skills/THIRD_PARTY.md`.
- web-design-guidelines: repo `vercel-labs/agent-skills` không có file giấy phép, và skill đó tải luật từ internet mỗi lần chạy. Thay bằng skill `web-interface-guidelines` của dự án, dùng bản luật chép từ `vercel-labs/web-interface-guidelines` (MIT), ghim theo commit.
- Không cài máy chủ MCP kiểm tra độ tương phản của anti-slop.
- Hướng thiết kế vẫn là bộ nhận diện đã duyệt (`brand/README.md`, spec mục 2 và 3). anti-slop là bộ lọc; taste-skill chỉ dùng phần đánh giá và trình kiểm tra trên trình duyệt, không dùng để chọn hướng thiết kế mới.

## Lý do
- Plugin chỉ ghim được theo nhánh hoặc tag, không theo commit; hai repo được cập nhật liên tục. Bản chép trong repo là đúng bản đã đọc.
- Plugin khai báo trong project không chạy trong cloud session. Skill trong `.claude/skills/` chạy ở cả hai máy và cloud.

## Hệ quả
- Muốn cập nhật skill thì làm tay: tải lại nguồn, đọc thay đổi, quét, chép, sửa commit trong `THIRD_PARTY.md`.
- Skill chỉ được nạp khi session khởi động: session đang chạy cần mở lại để dùng.
