# 0011 — Làm nhóm A và B của danh sách đề xuất

## Bối cảnh
Ngày 2026-11-05, trang công khai và trang quản trị được rà bằng các skill giao diện. Danh sách chung: `docs/reviews/2026-11-05-tong-hop-de-xuat.md` (25 việc, chia nhóm A, B, C, D).

## Quyết định
Chủ dự án duyệt **nhóm A và B** (việc 1 đến 16), không sửa API. Nhóm C (làm lại bố cục trang chủ) và nhóm D (cần sửa API) chưa làm.

Cách chia việc để không sửa chung file:
- Nhánh `feat/cong-khai-nhom-ab` (trang công khai): việc 1 (phần mã: không vẽ ô ảnh trống), 2, 3 (phần trang công khai), 7, 12.
- Nhánh `feat/admin-noi-dung-nhom-ab` (các màn nội dung của trang quản trị): việc 4, 5, 6, 10, 14, 16, và phần "Xem trên web / Chia sẻ sau khi đăng" của việc 15.
- Nhánh `feat/admin-khung-nhom-ab` (khung và Lịch sử của trang quản trị): việc 8, 11, 13, và phần gợi ý micro, chấm số việc trên menu của việc 15.
- Việc 9 (cuộn khối câu chuyện mượt hơn): session làm cảnh minh họa, vì session đó đang giữ phần mã này.
- Việc 1, phần ảnh thật: gia đình chụp 6 đến 12 ảnh (túi 2 kg thật, hạt gạo cận cảnh, ruộng, máy sấy, máy xát, mâm xôi, người nhà).
- Việc 3, phần dữ liệu: tắt "Hiện trên web" của sản phẩm thử "[THỬ REVIEW]" trên bản xem thử.

## Hệ quả
- Chi tiết từng việc nằm trong danh sách chung và hai báo cáo `docs/reviews/2026-11-05-ui-cong-khai.md`, `docs/reviews/2026-11-05-ui-admin.md`.
