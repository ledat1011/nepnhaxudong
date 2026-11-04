# 2026-11-04 — máy công ty — cảnh minh hoạ (Hero, hình sản phẩm, câu chuyện từ hạt lúa tới người dùng)

## Phản hồi
- Ảnh tham khảo (xưởng xay, túi trong suốt, túi in xanh, nong gạo, máy hút chân không) do chủ dự án gửi → lưu ở `.superpowers/ref/` (ngoài git). Không chép số hotline và logo hiệp hội trên túi vào web.

## Quyết định
- Câu chuyện mới là một khối riêng, không gộp với "Hành trình". "Hành trình" hiện tại = hành trình phát triển sản phẩm của thương hiệu (các mốc năm). Khối mới = hành trình từ hạt lúa tới người dùng.
- Hình hoạt hoạ sản phẩm vẽ theo túi trong suốt (thấy hạt gạo).
- Hình túi đặt cạnh 3 đặc điểm trong khối Sản phẩm; bộ ảnh thật giữ nguyên. Hiệu ứng chạy một lần: gạo rơi vào túi, túi co thành khối vuông, nhãn và chú thích hiện ra.
- Hero có trời xanh: thêm 2 màu xanh trời nhạt chỉ dùng trong hình minh hoạ (không dùng cho chữ, nút). Cần ghi quyết định trong `docs/decisions/`.
- Mascot là mẹ của chủ dự án. Câu chuyện có 3 người: mẹ (mascot), ba, anh 2. Họ làm các bước thu hoạch, sấy, xát, đóng gói.
- Phần phân phối sau đóng gói: xe ô tô, xe tải nhỏ của nhà phân phối chở tới chuỗi siêu thị; khách hàng tới nhà lấy gạo.
- Ba và anh 2 vẽ "giống vừa", từ mô tả (không cần ảnh). Ba: cao gầy, tóc bạc, đội mũ lưỡi trai, áo xanh. Anh 2: mặt tròn giống mẹ.
- Cách vẽ: kết hợp. Cảnh vật, máy móc, đồ vật vẽ SVG bằng code; 3 người (mẹ, ba, anh 2) vẽ theo quy trình mascot (ảnh → trace → tách lớp), bản giản lược.
- Hero: chuyển động "lặp đi lặp lại liên tục 1 vòng mượt mà" → mọi vòng lặp chung một chu kỳ, nối liền, không thấy chỗ bắt đầu lại.
- Có nút "Tạm dừng chuyển động" ở góc dưới Hero (WCAG 2.2.2).
- Hình túi (phần 2) đã duyệt, nhưng nhãn phải giống nhãn thật "Gạo nếp cái hoa vàng Duy Tân": bố cục, chữ, hình đồng lúa + trời xanh vẽ lại, huy hiệu 2KG. Khung màu Xanh mạ `#6E8B3D`. Bỏ hotline, logo hiệp hội, mã QR. (Thay cho ý "nhãn theo màu Nếp Nhà" trước đó.)
- Câu chuyện có 8 cảnh: cấy mạ → nắng mưa gió → gặt → sấy → xay xát → đóng gói → đến tay khách → mâm cơm. Cảnh gặt vẽ máy gặt đập liên hợp (ba lái, anh 2 nhận bao thóc). Câu chữ cố định trong code, không sửa trong admin.
- Bố cục câu chuyện (3b) đã duyệt: điện thoại xếp dọc không ghim; máy tính ghim và trượt ngang, thanh tiến độ 8 hạt lúa, link "Bỏ qua câu chuyện"; SVG mỗi cảnh tải khi gần tới.
- Máy sấy thóc (phác thảo của chủ dự án): quạt bên trái thổi qua lò than; khí nóng vào gầm của một buồng dài; thóc nằm trên lưới sắt phía trên gầm; khí nóng đi từ gầm lên xuyên qua lưới và lớp thóc.
- Phần 4 (thứ tự làm: màu + Hero → túi gạo → 5 tư thế người → câu chuyện; kiểm thử, rủi ro) đã duyệt.

- Chủ dự án duyệt spec `docs/superpowers/specs/2026-11-04-canh-minh-hoa-design.md` và storyboard (gồm cả việc mở rộng quy tắc Hồng má / da / tóc trong quyết định 0007). Bước tiếp: viết plan.
- Góp ý 8 cảnh, cảnh 1: có những người nông dân cùng mẹ cấy → thêm 2 nông dân (nón lá, áo Vàng rơm, cùng một tư thế, người thứ hai lật ngang); tư thế người thành 6. Đã sửa spec, plan, storyboard.
- Góp ý Hero (bản Task 3): người như bay, bông lúa không trĩu hạt → mascot đứng trước đồng lúa, neo vào đáy cảnh; đường chân trời ngang lưng mascot; bông lúa dày, trĩu hạt. Nền chỉ chiếm khoảng nửa chiều ngang (phía sau mascot), không nằm sau chữ "Nếp Nhà"; trời xanh và lúa mờ dần ở mép để không thấy vệt cắt với phần chữ và khối Sản phẩm. Đã sửa spec mục 2.

## Còn mở
- Xác nhận khi duyệt tư thế người: áo của ba là xanh lá hay xanh dương. Câu chữ 3 chú thích túi và 8 cảnh đọc lại khi có bản thật.
- Công cụ vẽ người: Nano Banana không kết nối được, `GEMINI_API_KEY` chưa đặt, Recraft cần đăng nhập `/mcp`.

## Đã làm
- Viết spec, storyboard phác (`docs/superpowers/specs/2026-11-04-canh-minh-hoa-storyboard.html`) và quyết định `docs/decisions/0007-mau-troi-minh-hoa.md`.
- Viết plan `docs/superpowers/plans/2026-11-04-canh-minh-hoa.md` (12 task). Sửa spec theo plan: script ghép cảnh ở `web/scripts/`, nhóm chuyển động dùng `data-part`, mây màu Trắng gạo.
