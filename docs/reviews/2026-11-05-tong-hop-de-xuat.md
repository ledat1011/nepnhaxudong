# Tổng hợp đề xuất tiếp theo cho cả trang web (2026-11-05)

Danh sách này gộp hai báo cáo, chỉ giữ các việc **chưa làm**:
- Trang công khai: `docs/reviews/2026-11-05-ui-cong-khai.md` (mục 4, số ghi là "CK 4.x").
- Trang quản trị: `docs/reviews/2026-11-05-ui-admin.md` (mục 4 và 5, số ghi là "QT 4.x", "QT T7"…). Các việc QT 4.1 đến 4.9 đã làm và merge theo quyết định `0010` (PR #17, #18, #20), nên không có ở đây.

Cột:
- **Phần:** công khai (khách thấy) hoặc quản trị (người nhà dùng).
- **Công sức:** nhỏ (dưới nửa ngày), vừa (1–2 ngày), lớn (hơn 2 ngày).
- **API:** có nghĩa là phải sửa phần Spring (và thường có migration).

Thứ tự xếp theo: khách hoặc người nhà gặp việc đó thường thế nào, hậu quả nếu không làm, rồi công sức. Chủ dự án có thể duyệt theo nhóm (A, B, C, D) hoặc theo từng dòng.

## Nhóm A: nên làm ngay (nhỏ, không cần API)

| # | Việc | Phần | Nguồn | Công sức | API |
|---|---|---|---|---|---|
| 1 | Ảnh thật: gia đình chụp 6 đến 12 ảnh (túi 2 kg thật, hạt gạo cận cảnh, ruộng, máy sấy, máy xát, mâm xôi, người nhà). Trong lúc chờ: mục nào không có ảnh thì không vẽ ô ảnh trống. | công khai | CK 4.1 | nhỏ (mã) + chụp ảnh | không |
| 2 | Màn đầu điện thoại nói rõ bán gì: dòng cố định "Gạo nếp cái hoa vàng · Hải Dương" dưới tên; bớt khoảng trống dưới hai nút để hình túi gạo ló lên. | công khai | CK 4.2 | nhỏ | không |
| 3 | Sửa nhanh để qua Delivery Gate: ảnh lỗi hiện ô "Ảnh sắp được cập nhật" thay cho ảnh vỡ; nút điện thoại ghi "Gọi …"; cuối bài viết có lời mời nhắn Zalo; "Xem tất cả câu chuyện" thay cho "Xem tất cả". Trong admin: tắt "Hiện trên web" của sản phẩm thử. | công khai | CK 4.3, 4.4, 4.9 | nhỏ | không |
| 4 | Quy cách và giá hiện cách đọc quen: dưới ô hiện "= 2 kg", "= 150.000 đ"; nhắc khi khối lượng dưới 100 g. Lý do xếp cao: nếu người nhà gõ "2" vào ô gam, trang công khai sẽ ghi "2 g". | quản trị | QT 4.12 | nhỏ | không |
| 5 | Liên hệ: nhãn "Số Zalo" với ví dụ, ô "Zalo dùng số điện thoại ở trên", nút "Thử mở Zalo". Popup Zalo ở trang công khai dùng đúng số này, nên số sai là khách không nhắn được. | quản trị | QT 4.11 | nhỏ | không |
| 6 | Hành trình tự xếp theo năm và nhắc khi thứ tự sai năm (API `PUT /admin/timeline/order` đã có). Trang công khai hiện đúng thứ tự người nhà xếp, nên xếp sai là khách thấy 2005 trước 1990. | quản trị | QT T7 | nhỏ | không |
| 7 | Khách tiếng Anh: "Hải Dương province, northern Vietnam" thay cho "xứ Đông"; ở `/en` đặt nút Messenger cạnh nút Zalo; `translate="no"` cho tên "Nếp Nhà". | công khai | CK 4.5 | nhỏ | không |
| 8 | Lịch sử đọc được: tên trường bằng tiếng Việt, dòng ở Tổng quan bấm được, "Tài khoản đã xóa", giữ dòng đang mở khi bấm Back, câu lỗi mạng nói phải làm gì. | quản trị | QT 4.13 | nhỏ | không |

## Nhóm B: làm tiếp theo (nhỏ hoặc vừa, không cần API)

| # | Việc | Phần | Nguồn | Công sức | API |
|---|---|---|---|---|---|
| 9 | Cuộn mượt qua khối câu chuyện trên điện thoại tầm trung (đo được 33 đến 41 khung/giây khi cuộn): đổi hình sang SVG khi trình duyệt rảnh, xem lại mặt nạ mờ hai lớp, đo trên điện thoại thật. | công khai | CK 4.7 | vừa | không |
| 10 | Câu chuyện: Tiêu đề, Ảnh bìa, Nội dung lên đầu; giấu "Đường dẫn"; nút soạn thảo có chữ; nút "Xóa bài" có hỏi lại (API xóa đã có). | quản trị | QT 4.14 | nhỏ | không |
| 11 | Màn hình rộng: chữ ô nhập 16 px ở mọi độ rộng, nội dung rộng tối đa khoảng 960 px, menu bên trái từ 1024 px. | quản trị | QT 4.10 | vừa | không |
| 12 | Các điểm nhỏ trang công khai: link mở tab mới báo cho máy đọc màn hình; một vùng "đang tải" chung thay cho 15 vùng; menu điện thoại đóng khi chạm ra ngoài; tấm trượt Zalo không kéo trang phía sau; `theme-color`; `touch-action`; tiêu đề không để một chữ lẻ ở dòng cuối; hạt gạo trên đường dễ thấy hơn. | công khai | CK 4.10 | nhỏ | không |
| 13 | Các điểm nhỏ trang quản trị: nút lòi khỏi khung ở 375 px, `transition-all`, `touch-action`, hộp thoại cuộn được khi bàn phím mở, ô đường dẫn không tự viết hoa, nút bị khóa nói lý do, chữ 12 px lên 13–14 px, "(chưa có tiêu đề)", dấu ngoặc, chữ "Close" tiếng Anh. | quản trị | QT 4.17 | nhỏ | không |
| 14 | Đăng nhập: logo, nút "Hiện" mật khẩu, dòng "Quên mật khẩu? Nhờ người quản trị trong nhà đặt lại." | quản trị | QT 4.15 | nhỏ | không |
| 15 | Ba ý nhỏ cho điện thoại: gợi ý dùng micro trên bàn phím để nói thay vì gõ (M1); sau khi đăng có "Xem trên web" và "Chia sẻ" vào nhóm Zalo (M2); chấm số việc cần làm trên menu "Tổng quan" (M3). | quản trị | QT M1, M2, M3 | nhỏ | không |
| 16 | Mật khẩu tạm dễ đọc dạng cụm từ và nút "Gửi qua Zalo" bằng nút chia sẻ của điện thoại. | quản trị | QT T9 | nhỏ | không |

## Nhóm C: việc lớn về giao diện

| # | Việc | Phần | Nguồn | Công sức | API |
|---|---|---|---|---|---|
| 17 | Làm lại bố cục trang chủ theo hướng "Một họa tiết / hạt gạo nếp" (đã chọn, `docs/design/2026-11-04-huong-bo-cuc-one-motif.md`). Việc này giải quyết luôn: hai khối cùng dạng liền nhau (CK 4.8), footer lặp lại liên hệ (phần của CK 4.4), đường kẻ mảnh. Hai chỗ cần chủ dự án chốt trước: giữ con đường của khối câu chuyện (bản thiết kế muốn bảng gấp ngang), giữ trời chuyển màu ở Hero (bản thiết kế cấm gradient). Nên làm sau khi có ảnh thật (việc 1). | công khai | CK 4.6, 4.8, mục 5 | lớn | không |
| 18 | Chỉ nếu việc 17 chưa bắt đầu trong tuần này: khối câu chuyện trên máy tính đặt hình một bên, chữ bên kia đường, để không trống nửa màn. | công khai | CK 4.6 | vừa | không |

## Nhóm D: cần sửa API

| # | Việc | Phần | Nguồn | Công sức | API |
|---|---|---|---|---|---|
| 19 | Ảnh: hiện mô tả ngắn và dấu "đang dùng" dưới ảnh; khi không xóa được thì liệt kê nơi dùng. | quản trị | QT 4.16 | vừa | có |
| 20 | Nút "Làm mới trang web" khi trang công khai chưa cập nhật. Cũng là đường dự phòng cho ghi chú phần D về sự kiện làm mới bị mất. | quản trị | QT T12 | nhỏ–vừa | có |
| 21 | "Lấy thông tin" của bài báo điền thêm tên báo và ngày đăng. | quản trị | QT T8 | nhỏ–vừa | có |
| 22 | Xem trước đúng trang công khai (`draftMode` của Next.js) cho câu chuyện và sản phẩm. | quản trị | QT T6 | lớn | có |
| 23 | Lưu nháp lên máy chủ, mở được trên máy khác. | quản trị | QT T4 | lớn | có |
| 24 | Gợi ý tiếng Anh cạnh ô English (cần `GEMINI_API_KEY` hoặc dịch vụ dịch; key chưa đặt). | quản trị | QT T10 | vừa | có, và dịch vụ ngoài |
| 25 | Gợi ý mô tả ảnh từ nội dung ảnh (cần key của mô hình nhìn ảnh). | quản trị | QT T11 | vừa–lớn | có, và dịch vụ ngoài |

## Ưu tiên thấp (ghi lại, chưa cần duyệt)
- Mascot được gửi hai lần trong trang chủ (HTML và dữ liệu RSC, khoảng 90 KB mỗi lần). Lighthouse vẫn 97 đến 100. (CK 4.11, `docs/session/STATE.md`)
- Bó lúa của mascot nghiêng 30 lần mỗi giây; chỉ sửa nếu đo trên máy thật thấy giật ở Hero. (CK 4.11)

## Đề nghị duyệt

- **Duyệt nhóm A (việc 1 đến 8):** tất cả nhỏ, không cần API. Có thể làm trong 2 nhánh song song: một nhánh trang công khai (việc 2, 3, 7, phần mã của việc 1), một nhánh trang quản trị (việc 4, 5, 6, 8). Việc chụp ảnh (việc 1) là của gia đình.
- **Sau đó nhóm B**, bắt đầu bằng việc 9 (độ mượt trên điện thoại).
- **Việc 17 (bố cục mới)** nên bắt đầu khi đã có ảnh thật, và sau khi chủ dự án chốt hai chỗ xung đột ghi trong dòng 17.
- **Nhóm D** đợi đến khi cần; việc 20 nên làm trước phần D (hạ tầng).
