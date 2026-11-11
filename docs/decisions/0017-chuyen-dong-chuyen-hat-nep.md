# 0017 — Chuyển động khối "Từ hạt lúa tới người dùng": lớp cắt từ bản phác

Ngày: 2026-11-11. Người quyết định: chủ dự án.

## Bối cảnh
8 cảnh của khối "Từ hạt lúa tới người dùng" là bản phác nét mực manhua (quyết định `0014`). Kế hoạch cũ là dựng lại từng cảnh thành SVG tách lớp rồi làm chuyển động. Cách đó tốn nhiều công, và nét mực có thể mất chất khi chuyển sang vector.

## Quyết định
- Giữ bản phác làm nền. Chỉ cắt vài vật cần động thành lớp ảnh trong suốt, cộng hiệu ứng vẽ bằng code (mưa, gió, hơi, trấu, đom đóm).
- Mỗi cảnh có đoạn mở đầu khi cảnh tới gần giữa màn hình, rồi chuyển động nhỏ lặp lại khi cảnh còn trên màn hình. Cảnh ra khỏi màn hình thì dừng. Nút tạm dừng dừng tất cả. Người xem bật "giảm chuyển động" thì chỉ thấy tranh tĩnh.
- Máy gặt và xe chở gạo chỉ rung hoặc quay bánh tại chỗ, không chạy ngang. Người trong tranh đứng yên.
- Bước 2: lúa lớn dần từ lúa non (tranh mới vẽ bằng Nano Banana Pro, cùng bố cục) qua lúa xanh (đổi màu từ bản phác, làm trong trình duyệt) tới lúa chín vàng, qua nắng, mưa, gió, rồi sang đêm trăng.
- Công cụ: `brand/tools/cut-story-layers.py` đọc `brand/story/layers.json` và ghi lớp vào `web/public/story/lop/`.
- Xóa đường cũ: cảnh SVG tách lớp, script `story:build`, mã nhúng SVG, công cụ trace người `vectorize-pose.py`, các tư thế người và phần sửa tay của chúng.

## Hệ quả
- Muốn đổi vị trí một lớp: sửa `layers.json` rồi chạy lại công cụ.
- Muốn thêm chuyển động cho người thì phải vẽ lại cảnh; cách lớp cắt không làm được.
- Đã dùng 1 ảnh Nano Banana Pro (tranh lúa non), khoảng 0,13 USD.
