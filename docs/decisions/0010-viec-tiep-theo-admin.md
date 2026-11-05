# 0010 — 5 việc tiếp theo cho trang quản trị

## Bối cảnh
Ngày 2026-11-05, sau khi 5 việc của quyết định `0008` đã merge, trang quản trị được rà lại bằng các skill giao diện. Báo cáo: `docs/reviews/2026-11-05-ui-admin.md`, mục 6 đề xuất 5 việc tiếp theo.

## Quyết định
Ngày 2026-11-05, chủ dự án duyệt cả 5 việc ("Duyệt cả 5"). Các quy định chi tiết dưới đây do người điều phối chọn theo báo cáo; chủ dự án xem sản phẩm cuối rồi góp ý.

1. **Chạm an toàn** (báo cáo mục 4.1, 4.7, 4.8, 4.9; không sửa API):
   - Hộp thoại không tự bật bàn phím và không bôi đen sẵn chữ trong ô.
   - Trong hộp "Có bài đang viết dở", "Khôi phục" là nút được chọn sẵn.
   - Thông báo ngắn (ví dụ "Đã lưu") hiện ở đầu màn hình, không che menu dưới.
   - Xóa một dòng trong form (quy cách đóng gói, đặc điểm) thì có "Hoàn tác" trong vài giây.
2. **Sản phẩm "Hiện trên web"** (mục 4.2; có sửa API):
   - Mỗi sản phẩm có công tắc "Hiện trên web". Sản phẩm **mới** mặc định ẩn. Sản phẩm **đang có** giữ trạng thái hiện như hôm nay.
   - Web công khai chỉ thấy sản phẩm đang hiện.
   - Bật "Hiện trên web" thì mở bảng kiểm tra những gì còn thiếu (ảnh, bản tiếng Anh, quy cách), giống bảng kiểm tra khi đăng bài; vẫn cho hiện nếu người nhà chọn "Vẫn hiện".
3. **Vai trò "Chủ" và "Người nhà"** (mục 4.3; có sửa API):
   - "Chủ" quản lý tài khoản: tạo, khóa, mở khóa, đặt lại mật khẩu, đổi vai trò, tắt xác thực 2 lớp của người khác. "Người nhà" sửa nội dung nhưng không vào được các việc quản lý tài khoản.
   - Khi nâng cấp: tài khoản admin đầu tiên (tạo lúc khởi động) là "Chủ"; các tài khoản khác là "Người nhà".
   - Luôn phải còn ít nhất một "Chủ" đang hoạt động: không khóa, không hạ vai trò người "Chủ" cuối cùng.
4. **Xác thực 2 lớp trên điện thoại** (mục 4.4; phần cuối có sửa API):
   - Màn hình nhập mã có nút "Mở ứng dụng xác thực" (khi máy hỗ trợ) và lúc cài đặt có nút "Sao chép mã".
   - "Chủ" tắt được xác thực 2 lớp của một người nhà bị mất điện thoại. Lần đăng nhập sau, người đó phải cài lại. Việc này được ghi vào Lịch sử.
5. **Dễ tìm đường** (mục 4.5, 4.6; không sửa API):
   - Trang chi tiết có "‹ Quay lại", tên mục đang sửa và "Xem trên web" (khi mục đó có trên web).
   - "Sản phẩm" có trên menu dưới. Chữ trên menu từ 13 đến 14 px.

## Cách làm
Ba nhánh làm song song: việc 1 và 5 (`feat/admin-cham-an-toan`), việc 2 (`feat/san-pham-an-hien`), việc 3 và 4 (`feat/vai-tro-2fa`). Thay đổi cơ sở dữ liệu: nhánh việc 2 dùng file migration `V3`, nhánh việc 3 và 4 dùng `V4`, để hai nhánh không trùng số.

## Hệ quả
- Ba việc ngay sau theo báo cáo: màn hình rộng (4.10), Lịch sử đọc được (4.13), Hành trình tự xếp theo năm (T7). Chưa làm.
