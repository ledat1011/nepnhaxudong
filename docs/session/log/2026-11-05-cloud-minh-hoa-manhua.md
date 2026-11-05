# 2026-11-05 — cloud — tranh minh họa câu chuyện kiểu manhua

## Phản hồi
- Chủ dự án muốn vẽ tranh theo phong cách manhua kiếm hiệp bán thực tế (nét mực, vẽ chi tiết, nền thủy mặc xám trắng), giống ảnh mẫu Triệu Vân → chỉ lấy phong cách, không chép nhân vật, áo giáp hay bố cục của game.
- Chủ dự án đã có API key Nano Banana (Gemini) → đặt vào biến môi trường `GEMINI_API_KEY` của môi trường cloud, không dán vào chat hay repo.
- Mascot giữ nguyên. Phong cách manhua chỉ dùng cho tranh của phần Câu chuyện.

## Quyết định
- Phong cách manhua cho tranh minh họa Câu chuyện, giữ mascot, logo, font và màu — xem `docs/decisions/0011-minh-hoa-cau-chuyen-manhua.md`.

## Còn mở
- Đặt `GEMINI_API_KEY` trong cài đặt môi trường cloud, mở session mới, rồi vẽ thử 3 tranh bìa cho chủ dự án chọn.
- Chủ dự án cho biết danh sách câu chuyện cần tranh (tên bài, cảnh muốn vẽ).

## Đã làm
- Viết quyết định 0011 kèm mẫu prompt vẽ.
