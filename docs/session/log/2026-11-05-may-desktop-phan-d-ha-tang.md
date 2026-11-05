# 2026-11-05 — máy desktop — phần D (hạ tầng)

## Phản hồi
- Chủ dự án chưa có VPS. Cần một máy chủ nhẹ để đưa web lên internet; hiện web là landing page, chưa có dữ liệu quan trọng; ưu tiên chi phí thấp. → Chọn cấu hình và nhà cung cấp theo giá trước, bớt các phần tốn tài nguyên nếu không cần ngay.

## Quyết định
- VPS ở Việt Nam, 2 vCPU / 2 GB RAM (không phải 4 GB như spec), thêm 2 GB swap, giới hạn bộ nhớ từng container, bỏ Grafana Alloy lúc đầu — chủ dự án ưu tiên chi phí.
- Sao lưu: chủ dự án để agent chọn ("landing page, chỉ show sản phẩm và bài báo"). Agent chọn: restic chạy được ngay với kho trên VPS; khi chủ dự án tạo Backblaze B2 (miễn phí 10 GB, không cần thẻ) thì điền biến môi trường để gửi ra ngoài. Code nhận mọi kho restic (R2 cũng được).
- Chủ dự án duyệt thiết kế phần D, gồm hai điểm khác spec: deploy qua GHCR (không dùng `docker save | ssh docker load`), chưa chạy Grafana Alloy; cảnh báo bằng UptimeRobot và healthchecks.io. Duyệt luôn: viết plan rồi làm và mở PR.

## Còn mở

## Đã làm
