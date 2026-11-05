# 2026-11-05 — máy desktop — thiết kế lại mascot

## Phản hồi
- Mascot hiện tại nhìn chung chung, giống ảnh AI vẽ, không giống thiết kế thủ công → thiết kế lại mascot; hỏi ý tưởng của chủ dự án trước khi vẽ.
- Chủ dự án gửi ảnh tham khảo về nét vẽ: bà đầu bếp hoạt hình (mũ trắng, kính tròn, cầm đĩa), nét viền nâu sẫm mảnh có thon đầu, mảng màu phẳng có bóng nhẹ, má ửng mềm, sợi tóc có nét → mascot mới theo kiểu nét này (ảnh chỉ để tham khảo nét, không chép nhân vật).
- Chủ dự án muốn xem ảnh ví dụ cho từng kiểu vẽ được đề xuất trước khi chọn → vẽ mẫu cho mỗi kiểu, cùng một nhân vật, rồi cho xem.
- Chủ dự án muốn cùng viết một prompt cuối rồi gửi Nano Banana một lần, để tiết kiệm chi phí (qua session cha) → không gọi vẽ thêm; chờ prompt cuối rồi gọi đúng một lần.
- Chủ dự án xem 5 mẫu vòng 1 (A–E) và nói không mẫu nào giống logo thương hiệu; biểu tượng hiện tại (`logo-icon`: đầu đội nón trong vòng tròn) giống logo hơn → mascot mới phải là dấu hiệu kiểu logo (đầu to, nét viền dày, ít màu phẳng, hình khối đơn giản, nằm gọn trong khung tròn, rõ ở 32 px), không phải tranh minh hoạ.
- Chủ dự án chỉ vào mascot hiện tại ("mascot như này nè") và hỏi còn giữ mô tả thương hiệu không → mascot mới giữ đúng mô tả gốc ở phần A (`docs/session/log/2026-11-03-may-cong-ty-phan-a-thuong-hieu.md`): phụ nữ nông dân khoảng 55 tuổi giống bà chủ, mặt tròn phúc hậu, mắt cười híp lưỡi liềm, tóc đen ngang vai vén một bên, nón lá chóp thấp ngả ra sau, bó lúa to nhất hình ôm trong khuỷu tay, bông rủ về bên trái người xem. Ảnh tham khảo chủ dự án gửi hôm nay chính là ảnh Freepik ở spec 2.3. Mẫu vòng 1 sai vì vẽ cô gái trẻ.
- Chủ dự án nói chỗ "giống AI" của mascot hiện tại là **nét vẽ**: nét viền run, dày đều, do trace tự động từ ảnh → giữ nhân vật đã duyệt, chỉ làm lại nét: nét trơn, đầu nét thon, viền ngoài dày hơn nét trong; và đổi cách chuyển sang SVG để không làm run nét.
- Chủ dự án: "nắm rõ rồi thì gọi nano miêu tả để nó làm ảnh tôi review" → gọi Nano Banana một lần, sửa từ ảnh mascot hiện tại theo mô tả gốc, chỉ vẽ lại nét; cho chủ dự án xem.
- Chủ dự án hỏi đã tốn bao nhiêu tiền Nano Banana → ước khoảng 0,8 USD cho 6 ảnh (Pro, khoảng 0,134 USD mỗi ảnh); số chính xác xem ở billing của Google.
- Chủ dự án: "vẽ theo phong cách đông hồ và cắt giấy đi" → vẽ cùng nhân vật đã duyệt, cùng tư thế, theo hai kiểu: tranh Đông Hồ và cắt giấy.
- Chủ dự án thấy mặt trẻ quá, thử vẽ người trung niên (vòng 4: cắt giấy, tóc rẽ ngôi; vòng 5: mặt theo bà chủ, không kính, chỉ tả bằng chữ, không gửi ảnh chân dung lên dịch vụ vẽ). Chủ dự án không chọn hai bản đó.
- Chủ dự án chọn bản "Đông Hồ" vòng 3 (`mascot-moi/r3/dong-ho.png`): "nét vẽ này ok hơn nhé, tóc giữ nguyên luôn", rồi "hình này ok hơn lưu vào để hình dùng sau" → đây là ảnh gốc của mascot mới: nét vẽ, mặt, tóc (mái thưa, xõa thẳng), nón, bó lúa đều theo ảnh này. Đã lưu ngoài repo: `C:\Users\Admin\Documents\nepnha-logo\nepnha-mascot-source-v2-dong-ho.png` (bản sao trong thư mục ghi chú chung `mascot-moi/`), SHA-256 `3af66857…6bed`.
- Ảnh chân dung bà chủ là ảnh riêng: không đưa vào repo, không gửi lên dịch vụ vẽ.

## Quyết định
- Đổi mascot (thương hiệu cố định trong `CLAUDE.md`) theo yêu cầu của chủ dự án: ảnh gốc mới là bản vẽ lại nét (`r3/dong-ho.png`) — `docs/decisions/0013-mascot-moi.md`.

## Còn mở
- Chủ dự án nói "Để sau": chưa chuyển SVG, dựng logo, cập nhật web, mở PR. Khi chuyển SVG: xoá vài nét nhăn mảnh nếu có; đổi cách trace (vtracer làm nét thành bậc thang).

## Đã làm
- Vòng 1: vẽ 5 mẫu kiểu vẽ bằng Gemini API (`gemini-3-pro-image-preview`), cùng một nhân vật: A nét mảnh như ảnh tham khảo, B Đông Hồ, C bút lông, D cắt giấy, E chì màu. MCP `nanobanana` không kết nối được nên gọi API trực tiếp; Recraft chỉ còn 90 credit (gói Free).
- Thử chuyển mẫu A sang SVG bằng vtracer (gấp đôi độ phân giải): mép nét vẫn thành bậc thang → bước chuyển SVG hiện tại là nguyên nhân chính làm nét run.
- Vòng 2: một lần gọi `gemini-3-pro-image-preview` (sửa từ PNG mascot hiện tại, ảnh ra 2048 px): giữ nhân vật, vẽ lại nét. Ảnh gốc ngoài repo, trong thư mục ghi chú chung `mascot-moi/r2/moi-goc-2048.png`.
- Vòng 3: 2 lần gọi Pro (2048 px, sửa từ PNG mascot hiện tại): cắt giấy ra đúng chất giấy cắt tay; Đông Hồ gần như giống hệt vòng 2 (ảnh gốc giữ quá chặt), chưa ra chất Đông Hồ. Ảnh trong `mascot-moi/r3/`. Tổng đã gọi 8 ảnh, khoảng 1,1 USD.
- Vòng 4: 1 lần gọi Pro (sửa từ bản cắt giấy vòng 3): người trung niên, bỏ mái bằng, tóc rẽ ngôi. Còn nét nhăn dưới mắt, quanh miệng, dưới cằm; đầu chưa nhỏ lại. Ảnh `mascot-moi/r4/`. Tổng 9 ảnh, khoảng 1,2 USD.
- Vòng 5: 1 lần gọi Pro (sửa từ `r3/dong-ho.png`, chỉ đổi mặt theo mô tả bằng chữ về bà chủ, không gửi ảnh chân dung): mặt dài hơn, môi hồng, lông mày cong mảnh, không kính. Còn nét dưới mắt và dưới môi. Ảnh `mascot-moi/r5/`. Tổng 10 ảnh, khoảng 1,35 USD.
