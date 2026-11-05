# 2026-11-05 — cloud — tranh minh họa câu chuyện kiểu manhua

## Phản hồi
- Chủ dự án muốn vẽ tranh theo phong cách manhua kiếm hiệp bán thực tế (nét mực, vẽ chi tiết, nền thủy mặc xám trắng), giống ảnh mẫu Triệu Vân → chỉ lấy phong cách, không chép nhân vật, áo giáp hay bố cục của game.
- Chủ dự án đã có API key Nano Banana (Gemini) → đặt vào biến môi trường `GEMINI_API_KEY` của môi trường cloud, không dán vào chat hay repo.
- Mascot giữ nguyên. Phong cách manhua chỉ dùng cho tranh của phần Câu chuyện.

- Chủ dự án nhắn "vẽ thử 3 tranh bìa câu chuyện kiểu manhua" (session `cse_011zkgeUfp7fxRegaKPpFRvB`) → session này vẫn chưa có `GEMINI_API_KEY`, nên chưa vẽ được; đã chuẩn bị script để lần sau chỉ chạy một lệnh.

- Chủ dự án đặt `GEMINI_API_KEY` trong tab Environment variables của môi trường cloud. Ảnh chụp màn hình gửi vào chat có hiện đủ key → khuyên tạo key mới, xoá key cũ, không dùng key trong ảnh.

## Quyết định
- Phong cách manhua cho tranh minh họa Câu chuyện, giữ mascot, logo, font và màu — xem `docs/decisions/0011-minh-hoa-cau-chuyen-manhua.md`.

## Còn mở
- Đặt `GEMINI_API_KEY` trong cài đặt môi trường cloud, mở session mới, rồi vẽ thử 3 tranh bìa cho chủ dự án chọn.
- Chủ dự án cho biết danh sách câu chuyện cần tranh (tên bài, cảnh muốn vẽ).
- 3 tranh thử dùng 3 cảnh ví dụ trong quyết định 0011 (gặt lúa, sàng gạo bằng nia, cả nhà ăn xôi), vì chưa có danh sách bài.

- Chủ dự án tạo key Gemini mới, xoá key đã lộ trong ảnh chụp, thay vào môi trường cloud, rồi mở session mới để vẽ.

## Đã làm
- Viết quyết định 0011 kèm mẫu prompt vẽ.
- Thêm `scripts/ve-tranh-cau-chuyen.mjs`: gọi thẳng API Gemini (mặc định `gemini-2.5-flash-image`, đổi bằng `GEMINI_IMAGE_MODEL`), tỉ lệ 16:9, lưu vào `data/tranh-cau-chuyen/`, cắt WebP 1600×900 bằng ImageMagick. Đã thử: `--dry-run` in đúng prompt; thiếu key thì báo rõ và thoát mã 2; key sai thì API trả 400 (mạng tới Google thông).
