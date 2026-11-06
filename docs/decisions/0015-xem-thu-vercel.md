# 0015 — Bản xem thử giao diện trên Vercel trong lúc chưa thuê VPS

Ngày: 2026-11-05. Người quyết định: chủ dự án (theo đề xuất của agent).

## Bối cảnh
Chủ dự án hoãn thuê VPS đến khi web ổn (đã chọn sẵn Vietnix "VPS SSD LINUX 1", 2 vCPU / 2 GB). Trước mắt cần một
bản xem thử giao diện chạy 24/24, không phụ thuộc máy đang bật như link tunnel tạm.

GitHub Pages chỉ chứa file tĩnh, còn web cần máy chủ Node (chuyển ngôn ngữ ở `proxy.ts`, route `/api/revalidate` và
`/media`, trang quản trị, ảnh OG). Codespaces tự tắt khi không dùng. Render, Railway gói miễn phí ngủ khi không có
người vào. Oracle Cloud Always Free cần thẻ và hay bị từ chối hoặc thu hồi máy.

## Quyết định
1. **Bản xem thử chạy trên Vercel, gói Hobby (miễn phí)**, lấy code từ GitHub, thư mục gốc `web`. Mỗi lần merge vào
   `main` thì tự cập nhật; mỗi PR có link xem thử riêng.
2. **Chỉ chạy giao diện với dữ liệu mẫu** (`CONTENT_SOURCE=mock`). API và cơ sở dữ liệu vẫn chờ VPS (quyết định 0012).
3. **Không cho máy tìm kiếm index bản xem thử**: biến `SITE_NOINDEX=1` thêm `noindex, nofollow` vào mọi trang công khai
   (thẻ meta và header `X-Robots-Tag`, cả ảnh OG). `robots.txt` không chặn trang công khai (sửa ngày 2026-11-06): bot
   tạo thẻ link của Zalo và Messenger tuân theo `robots.txt`, nên khi bị chặn thì thẻ link không có hình và tiêu đề.

## Hệ quả
- Không đổi cách build: Vercel đọc `next.config.ts` như cũ, bản Docker cho VPS vẫn dùng `output: "standalone"`.
- Trang quản trị trên Vercel không đăng nhập được (không có API).
- Gói Hobby chỉ dành cho dùng cá nhân, không thương mại. Khi web bán hàng thật thì chuyển sang VPS và tắt bản Vercel.
- Các bước chủ dự án làm: `docs/xem-thu-vercel.md`.
