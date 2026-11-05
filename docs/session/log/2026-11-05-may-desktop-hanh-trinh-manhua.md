# 2026-11-05 — máy desktop — tranh hành trình kiểu manhua

## Phản hồi
- Chủ dự án: mascot "để sau"; giờ vẽ lại tranh khối "Từ hạt lúa tới người dùng" (8 bước) theo phong cách manhua kiếm hiệp bán thực tế: nét mực thô ráp mạnh, đổ bóng tương phản cao, nền thủy mặc cổ trang, ánh sáng điện ảnh. Làm ảnh tĩnh trước, chuyển động sau (Claude sắp hết giới hạn tuần).
- Sửa cảnh bước 2 (Nắng, mưa, gió): đồng lúa dày hơn, có ba mẹ đứng bên chăm sóc, có cảnh ngày và cảnh đêm trăng (để sau chuyển từ ngày sang đêm).
- Sửa cảnh bước 4 (Sấy thóc): quạt thấp xuống; ba đứng sau quạt, cho than vào lò.
- Gửi ảnh Nano Banana cho chủ dự án xem trước khi dùng. Đưa ảnh lên git để dùng ở nhiều máy.
- Xem 9 tranh manhua, chủ dự án: "nhìn ảnh chi tiết quá, đơn sơ mộc mạc như hiện tại" → bỏ kiểu manhua cho hành trình; giữ phong cách phẳng, đơn sơ của các cảnh hiện tại, chỉ sửa theo các góp ý ở trên.
- Chủ dự án gửi ảnh ba và anh 2 (ảnh riêng, không vào repo, không gửi lên dịch vụ vẽ) → vẽ ba: khoảng 65–70 tuổi, gầy, tóc ngắn bạc gần hết, mặt gầy xương gò má cao; anh 2: khoảng 40 tuổi, tóc đen ngắn, mặt tròn, người đầy đặn.
- Chủ dự án: giữ phong cách phẳng "để sau này còn làm chuyển động" → cảnh cuối phải là SVG tách lớp như hiện tại (người, quạt, mây, trời tách riêng). Ảnh Nano Banana chỉ là bản phác để duyệt bố cục; sau khi duyệt, dựng lại bằng SVG (sửa cảnh trong `brand/story/scenes/`, trace người mới bằng `vectorize-pose.py`).
- Xem bản phác bước 2 và 4, chủ dự án: "ba mặt đầy đặn hơn xíu, tóc không bạc quá" → ba: mặt đầy đặn hơn, ít nếp nhăn, tóc muối tiêu (đen nhiều hơn bạc).

## Quyết định
- Không dùng tranh manhua cho hành trình (chủ dự án thấy chi tiết quá). Các cảnh mới vẽ theo phong cách phẳng hiện tại, chờ chủ dự án duyệt.

## Còn mở
- Chủ dự án xem 9 tranh và góp ý.
- Tranh ngày và đêm của bước 2 chưa cùng bố cục (ba mẹ đứng khác chỗ); muốn chuyển từ ngày sang đêm mượt thì phải vẽ lại tranh đêm từ tranh ngày.
- Nối tranh vào web và làm chuyển động: làm sau.

## Đã làm
- Vẽ 9 tranh (8 bước, bước 2 có ngày và đêm), vẽ lại tranh gặt một lần vì tranh đầu có chữ "BA", "ANH HAI" và chữ trên máy gặt. Tổng 10 ảnh Pro, khoảng 1,35 USD.
- Phác phong cách phẳng (sửa từ cảnh hiện tại) cho bước 2 (ngày) và bước 4, lưu `brand/story/phac/` (commit `1ceed66`). Mẹ ở bước 2 trông như bé gái, ba trông già hơn ảnh (khoảng 80 tuổi). Thêm 2 ảnh Pro, khoảng 0,27 USD.
- Sửa ba ở bước 2 và 4: tóc muối tiêu, mặt đầy hơn một chút. Mẹ ở bước 2 vẫn như bé gái (lần sửa không đổi được). Thêm 2 ảnh, khoảng 0,27 USD.
- Chủ dự án hỏi "không làm style manhua hả" → giải thích: hành trình theo kiểu phẳng để làm chuyển động; manhua dùng cho tranh phần Câu chuyện; có thể làm kiểu phẳng với nét mực. Chờ chủ dự án chọn.
