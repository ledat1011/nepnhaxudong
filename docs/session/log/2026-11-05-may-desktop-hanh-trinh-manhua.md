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
- Chủ dự án chọn: "phẳng nét mực manhua đi đẹp đó" → cảnh hành trình giữ màu phẳng và bố cục tách lớp được, nhưng nét viền là nét mực bút lông kiểu manhua (đậm nhạt, đầu nét khô); nền trời có thể loang mực nhẹ vì là lớp riêng.
- Chủ dự án: "còn đồng lúa chưa sửa hả" → đồng lúa bước 2 phải dày hẳn: lúa mọc kín, chen nhau thành một biển lúa, không còn từng khóm rời có khoảng trống.
- Xem bản phác thứ 3 (màu phẳng, nét mực manhua) của bước 2 và 4, chủ dự án: "okay đẹp đó duyệt" → duyệt kiểu vẽ và bố cục 2 cảnh; vẽ tiếp cảnh đêm của bước 2 và 6 cảnh còn lại theo cùng kiểu, sửa từ cảnh hiện tại.
- Xem 7 cảnh mới, chủ dự án: cảnh xay xát chỉ có anh 2 (bỏ ba); cảnh đóng gói thì mẹ ngồi ghế đóng gạo; các cảnh còn lại OK.
- Chủ dự án duyệt 9 bản phác; hẹn dựng SVG và thay vào web vào tuần sau ("Để tuần sau").
- Chủ dự án: đưa ảnh lên web ở `main` rồi deploy lại lên cloud (link xem thử); ảnh động để tuần sau; nền trắng hiện tại hơi trống, nhờ gợi ý; thanh menu chưa có nút tới khối hành trình này → thêm mục menu; "làm luôn merge vào main".
- Chủ dự án: nút "Xem hành trình" ở hero trỏ tới khối quy trình, với chữ đẹp hơn. Báo lỗi: bấm link tới `#tu-hat-lua`, kéo lên đầu trang, bấm lại thì không cuộn tới nữa.
- Xem chữ "Từ đồng tới mâm cơm", chủ dự án: "từ cánh đồng tới mâm cơm ỏ ngắn hơn i" → chủ dự án gợi ý thêm "câu chuyện ..." → chữ nút hero: "Chuyện hạt nếp" (tiếng Anh "A grain's story"); không dùng "Câu chuyện" ở đầu vì trùng tên mục blog "Câu chuyện" trên menu.

## Quyết định
- Cảnh hành trình: màu phẳng, nét mực manhua, 9 bản phác đã duyệt — `docs/decisions/0014-hanh-trinh-net-muc.md`.

## Còn mở
- Dựng lại 9 cảnh bằng SVG tách lớp theo bản phác (sửa `brand/story/scenes/`, trace người mới). Xoá chữ lạ trên túi, máy và biển hiệu nếu có.
- Nối tranh vào web và làm chuyển động: làm sau.

## Đã làm
- Nút thứ hai ở hero đổi thành "Chuyện hạt nếp" (tiếng Anh "A grain's story"), trỏ tới `#tu-hat-lua`, luôn hiện. Sửa lỗi bấm lại link cùng `#`: Next.js coi đó là không đổi địa chỉ nên không cuộn; thêm `SectionLink` tự cuộn tới khối trong đúng trường hợp đó (menu và nút hero).
- Web dùng 8 bản phác (WebP 1200 × 675), thêm mục menu "Quy trình" tới `#tu-hat-lua`, proxy cho qua `/story/*.webp`; PR #34. Repo không cho bật auto-merge, nên merge tay khi CI đạt. Mở Cloudflare tunnel bị chặn bởi bộ lọc quyền của Claude: chủ dự án tự mở tunnel hoặc cho phép.
- Vẽ 9 tranh (8 bước, bước 2 có ngày và đêm), vẽ lại tranh gặt một lần vì tranh đầu có chữ "BA", "ANH HAI" và chữ trên máy gặt. Tổng 10 ảnh Pro, khoảng 1,35 USD.
- Phác phong cách phẳng (sửa từ cảnh hiện tại) cho bước 2 (ngày) và bước 4, lưu `brand/story/phac/` (commit `1ceed66`). Mẹ ở bước 2 trông như bé gái, ba trông già hơn ảnh (khoảng 80 tuổi). Thêm 2 ảnh Pro, khoảng 0,27 USD.
- Sửa ba ở bước 2 và 4: tóc muối tiêu, mặt đầy hơn một chút. Mẹ ở bước 2 vẫn như bé gái (lần sửa không đổi được). Thêm 2 ảnh, khoảng 0,27 USD.
- Chủ dự án hỏi "không làm style manhua hả" → giải thích: hành trình theo kiểu phẳng để làm chuyển động; manhua dùng cho tranh phần Câu chuyện; có thể làm kiểu phẳng với nét mực. Chờ chủ dự án chọn.
- Bản phác thứ 3 (màu phẳng, nét mực manhua): đồng lúa bước 2 đã dày kín; trời thành loang mực xám (mất màu Xanh trời). Mẹ vẫn như bé gái sau 2 lần sửa → khi dựng SVG sẽ dùng tư thế mẹ người lớn đã trace. Thêm 2 ảnh, khoảng 0,27 USD; tổng phần hành trình 14 ảnh, khoảng 1,9 USD.
- Vẽ cảnh đêm bước 2 (từ cảnh ngày, cùng bố cục) và 6 cảnh còn lại theo kiểu đã duyệt, lưu cả 9 ảnh trong `brand/story/phac/`. Mẹ vẫn dáng tròn như bé gái (giống người đã trace ở cảnh cũ). Thêm 7 ảnh, khoảng 0,95 USD; tổng phần hành trình 21 ảnh, khoảng 2,8 USD.
- Sửa cảnh xay xát (chỉ còn anh 2) và đóng gói (mẹ ngồi ghế, bỏ chữ trên túi và máy). Mẹ ở cảnh đóng gói giờ ra người lớn. Thêm 2 ảnh, khoảng 0,27 USD; tổng phần hành trình 23 ảnh, khoảng 3,1 USD.
