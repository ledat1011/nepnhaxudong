# 0006 — Bộ skill cho frontend

## Bối cảnh
Chủ dự án muốn dùng 4 bộ skill trên GitHub cho phần giao diện: anti-slop, taste-skill, web-design-guidelines (vercel-labs) và gsap-skills. Các session làm B2, B3 trước đây mở từ một thư mục khác, nên không nạp được plugin của repo.

## Quyết định
- anti-slop, taste-skill và gsap-skills: khai báo dạng plugin trong `.claude/settings.json` (`enabledPlugins` và `extraKnownMarketplaces`), giống cách repo đang dùng cho `claude-seo` và `frontend-design`. Khi mở repo, app hỏi chủ dự án cài, mỗi máy một lần.
  - anti-slop ghim theo tag `v3.2.25`, taste-skill ghim theo tag `v2.1.5`. gsap-skills không có tag nên theo nhánh `main`.
- web-design-guidelines: repo `vercel-labs/agent-skills` không có plugin, không có file giấy phép, và skill đó tải luật từ internet mỗi lần chạy. Thay bằng skill `web-interface-guidelines` của dự án trong `.claude/skills/`, dùng bản luật chép từ `vercel-labs/web-interface-guidelines` (MIT), ghim theo commit.
- AI không tự cài plugin. Nếu thiếu skill, AI báo chủ dự án cài.
- Hướng thiết kế vẫn là bộ nhận diện đã duyệt (`brand/README.md`, spec mục 2 và 3). anti-slop là bộ lọc; taste-skill dùng phần đánh giá và trình kiểm tra trên trình duyệt. (Đã đổi ở `0009`: được dùng `draw.mjs` để chọn bố cục, giữ màu và font.)

## Lý do
- Lúc đầu đã chép cả 15 skill vào repo (khoảng 42.000 dòng). Chủ dự án thấy quá nặng; plugin giữ repo gọn, cập nhật dễ, và giống cách các plugin khác đang được khai báo.
- Ghi chú để AI tự cài khi thiếu là không đủ: AI tự tải code và đổi cấu hình lâu dài cần chủ dự án đồng ý, và khai báo trong `settings.json` làm app tự hỏi cài.

## Hệ quả
- gsap-skills tự cập nhật theo `main` mà không ai đọc trước.
- Plugin anti-slop tự chạy kèm MCP server `antislop-contrast` (kiểm tra độ tương phản, cần Python 3).
- Plugin khai báo trong project không chạy trong cloud session; cloud session không có các skill này.
- Cập nhật plugin đã ghim: đọc thay đổi của tag mới, quét, rồi đổi `ref` trong `.claude/settings.json`.
- Skill chỉ được nạp khi session khởi động: session đang chạy cần mở lại để dùng.
