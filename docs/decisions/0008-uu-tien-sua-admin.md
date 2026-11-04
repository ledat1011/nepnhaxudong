# 0008 — 5 việc ưu tiên để sửa trang quản trị

## Bối cảnh
Ngày 2026-11-04, trang quản trị (phần B3, nhánh `feat/phan-b3-admin`) được review về độ dễ dùng cho người nhà lớn tuổi dùng điện thoại. Báo cáo: `docs/reviews/2026-11-04-admin-ux.md`. Mục 7 của báo cáo đề xuất 5 việc nên làm trước.

## Quyết định
Ngày 2026-11-04, chủ dự án duyệt 5 việc sau ("Duyệt top 5"). Thứ tự dưới đây là thứ tự làm:
1. Lỗi hiện ngay dưới ô bị sai, màn hình cuộn tới ô đó, và có dấu `*` cho mọi phần bắt buộc (mục 5.1 của báo cáo).
2. Hỏi lại trước khi "Bỏ thay đổi" (nút "Hủy" hiện nay) và trước khi "Gỡ bài". Khi "Đăng bài" thì mở bảng kiểm tra: thiếu ảnh bìa, thiếu bản tiếng Anh (mục 5.2 và T2).
3. Làm lại hộp tải ảnh (mục 5.3 và T5):
   - Một nút lớn "Chụp hoặc chọn ảnh".
   - Chọn được nhiều ảnh một lần.
   - Tải lên ngay khi chọn.
   - Thu nhỏ ảnh trong trình duyệt trước khi gửi.
4. Tự lưu bài đang viết trên máy (bộ nhớ của trình duyệt), và hỏi khôi phục khi mở lại (T3).
5. Đổi Tổng quan thành danh sách việc cần làm, mỗi dòng dẫn tới đúng ô cần sửa, có tính cả phần cài đặt (T1).

## Lý do
- Cả 5 việc giải quyết các lỗi mà người lớn tuổi gặp nhiều nhất trên điện thoại: bấm Lưu không thấy gì, bấm nhầm là mất hoặc lộ, tải ảnh rối, mất bài đang viết.
- Cả 5 việc không cần sửa API.

## Hệ quả
- Việc 3 vẫn giữ quy định hiện nay là mô tả tiếng Anh của ảnh bắt buộc. Muốn cho bỏ trống thì phải sửa API (`MediaService`) và cần một quyết định riêng.
- Việc 5 tự tính từ các API danh sách đã có. Một endpoint "việc cần làm" chỉ là cách làm nhanh hơn, làm sau nếu cần.
- Các việc chưa được duyệt để làm ngay:
  - Sản phẩm có trạng thái "Ẩn hoặc Hiện" (5.4).
  - Đường thoát khi mất điện thoại có 2FA (5.5).
  - Giới hạn quyền khoá tài khoản (5.6).
  - Các gợi ý còn lại của mục 5 và mục 6.
- Hai ý tưởng cần dịch vụ ngoài (gợi ý bản tiếng Anh và gợi ý mô tả ảnh) cần `GEMINI_API_KEY` hoặc key khác. Key này chưa được đặt.
- Việc sửa mã phải làm trên nhánh của B3 (hoặc một nhánh tách từ đó), không làm trên nhánh review này.
