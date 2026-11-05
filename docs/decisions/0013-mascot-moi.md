# 0013 — Mascot mới: vẽ lại nét

Ngày: 2026-11-05. Người quyết định: chủ dự án.

## Bối cảnh
Chủ dự án thấy mascot cũ (phần A) "nhìn chung chung giống AI generate, không giống design thủ công".
Khi hỏi kỹ, chủ dự án chỉ ra chỗ hỏng là **nét vẽ**: viền run, dày đều. Nhân vật, tư thế, màu và bố cục vẫn giữ.

Nét run có hai nguyên nhân:
- Ảnh gốc (Gemini v5) vẽ nét dày đều.
- Bước chuyển sang SVG (`brand/tools/vectorize-mascot.py`, dùng vtracer) làm đường cong gãy thành bậc thang.
  Đã thử: kể cả với ảnh có nét đẹp và ở độ phân giải gấp đôi, vtracer vẫn làm mép nét thành bậc thang.

Đã thử 5 kiểu vẽ khác (nét mảnh, Đông Hồ, bút lông, cắt giấy, chì màu), một bản cắt giấy, và hai bản mặt trung niên.
Chủ dự án không chọn các bản đó. Bản cắt giấy và bản trung niên vẫn giữ trong thư mục ghi chú, để xem lại nếu cần.

## Quyết định
- Ảnh gốc của mascot mới là bản Nano Banana Pro (`gemini-3-pro-image-preview`), vẽ lại từ mascot cũ. Bản này giữ nhân vật và chỉ vẽ lại nét: nét trơn, đầu nét thon, viền ngoài dày hơn nét trong.
- Chủ dự án gọi bản này là bản "Đông Hồ", vì nó được vẽ từ prompt Đông Hồ. Thực tế nét giống bản vẽ lại nét, không phải tranh khắc gỗ.
- Mặt, tóc (mái thưa, xõa thẳng), nón, áo và bó lúa giữ đúng như ảnh. Chủ dự án nói: "tóc giữ nguyên luôn".
- Ảnh gốc nằm ngoài repo: `C:\Users\Admin\Documents\nepnha-logo\nepnha-mascot-source-v2-dong-ho.png` trên máy desktop, 2048 × 2048 px.
  SHA-256 `3af668575b8033400a7a377f66b31f612deb24245b230501518dfe014fd16bed`.
- Không gửi ảnh chân dung của bà chủ lên dịch vụ vẽ, và không đưa ảnh đó vào repo.

## Còn phải làm
Chủ dự án chọn làm các việc này sau:
- Chuyển ảnh sang SVG tách lớp `#head`, `#rice`, `#hands`, `#body`, có `data-pivot`. Cần đổi cách trace, vì vtracer làm nét thành bậc thang.
  Đề xuất: ép bảng màu, rồi trace từng màu bằng potrace ở độ phân giải cao. Phải có cách mới trước khi viết lại `vectorize-mascot.py`.
- Xoá vài nét nhăn mảnh nếu còn.
- Dựng lại `logo/mascot-logo.svg`, 5 file logo, PNG favicon và `preview.html`.
- Cập nhật web và kiểm tra ở 375 px và 1280 px.
- Sửa `brand/README.md` và spec mục 2.3: phần quy trình và nguồn ảnh gốc.

## Hệ quả
- `CLAUDE.md` vẫn cấm tự bịa mascot mới. Mascot mới này do chủ dự án yêu cầu và chọn.
- Ngân sách đã dùng: 10 ảnh Nano Banana Pro, khoảng 1,35 USD theo bảng giá. Số chính xác nằm ở trang billing của Google.
