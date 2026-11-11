# Bản phác cảnh hành trình (màu phẳng, nét mực manhua)

Chủ dự án đã duyệt kiểu vẽ: màu phẳng, nét viền bằng mực bút lông kiểu manhua, trời loang mực.
Các ảnh do Nano Banana Pro vẽ, bằng cách sửa từ cảnh SVG hiện tại (`web/public/story/canh-*.svg`). Bố cục và vị trí người giữ như cảnh cũ.
Trang chủ dùng các tranh này (thu về 1200 × 675 trong `web/public/story/`). Chuyển động được làm bằng các lớp cắt thẳng từ tranh, theo `brand/story/layers.json` và `brand/tools/cut-story-layers.py` (quyết định `0017`), không dựng lại SVG.
Prompt và ảnh đầu vào của từng ảnh nằm trong `prompts.json`.

| File | Bước |
|---|---|
| `1-cay-ma.webp` | 1. Cấy mạ |
| `2-nang-mua-gio-ngay.webp` | 2. Nắng, mưa, gió (ngày): đồng lúa dày, ba mẹ chăm lúa |
| `2-nang-mua-gio-dem.webp` | 2. Cùng cảnh, đêm trăng (cùng bố cục, để chuyển ngày sang đêm). Không có người: ban đêm hai ông bà đã về nghỉ (sửa ngày 2026-11-11, chủ dự án chọn) |
| `2-nang-mua-gio-non.webp` | 2. Cùng cảnh, lúa non xanh (cùng bố cục, để lúa lớn dần; vẽ ngày 2026-11-11, chủ dự án chọn) |
| `3-gat.webp` | 3. Gặt lúa |
| `4-say.webp` | 4. Sấy thóc: quạt thấp, ba đứng sau quạt cho than vào lò |
| `5-xay-xat.webp` | 5. Xay xát |
| `6-dong-goi.webp` | 6. Đóng gói |
| `7-den-tay-khach.webp` | 7. Đến tay khách |
| `8-mam-com.webp` | 8. Mâm cơm |
