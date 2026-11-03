# 0003 — Một repo

## Bối cảnh
Dự án có web công khai, trang admin cho vài người trong gia đình, và API Java. Người làm chỉ có một chủ dự án.

## Quyết định
- Dùng một repo cho toàn bộ dự án.
- Next.js chứa cả web công khai và trang admin.

## Lý do
Chỉ có một giao diện duy nhất, nên ít thành phần phải chạy và ít thứ phải đồng bộ.

## Hệ quả
- Web công khai và admin dùng chung code giao diện và build.
- Phải tách quyền truy cập admin bằng đăng nhập, không bằng tách ứng dụng.
- Trạng thái làm việc, spec và plan cùng nằm trong repo này.
