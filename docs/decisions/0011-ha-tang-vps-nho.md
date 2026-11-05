# 0011 — Hạ tầng: VPS nhỏ, deploy qua GHCR, cảnh báo không cài agent

Ngày: 2026-11-05. Người quyết định: chủ dự án (theo đề xuất của agent).

## Bối cảnh
Spec mục 5 chọn VPS 2 vCPU / 4 GB, deploy bằng `docker save | ssh … docker load`, log bằng Grafana Alloy gửi lên Loki.
Chủ dự án muốn một máy chủ nhẹ, ưu tiên chi phí: web hiện là landing page (sản phẩm và bài báo), chưa có dữ liệu quan trọng.

## Quyết định
1. **VPS ở Việt Nam, 2 vCPU / 2 GB RAM**, Ubuntu 24.04, thêm 2 GB swap. Mỗi container có giới hạn bộ nhớ
   (API: heap 768 MB, ghi chú phần B1 cần ít nhất chừng này cho xử lý ảnh). Máy không build gì.
   Nâng lên 4 GB thì chỉ đổi vài biến trong `infra/compose.prod.yml`.
2. **Deploy qua GHCR** (kho image của GitHub) thay cho `docker save | ssh … docker load`. VPS chỉ tải các lớp đã đổi,
   ít hơn nhiều so với gửi cả image mỗi lần qua đường quốc tế. Workflow đưa token tạm của GitHub Actions cho VPS để
   `docker login` trong lúc deploy rồi `docker logout`, nên không cần thêm secret cho việc kéo image.
3. **Chưa chạy Grafana Alloy / Loki.** Log nằm trên VPS (xoay vòng 3 × 10 MB mỗi container), xem bằng
   `docker compose logs`. Cảnh báo dùng dịch vụ ngoài, không cài gì trên VPS: UptimeRobot (web chết) và
   healthchecks.io (bản sao lưu đêm không chạy hoặc lỗi). Khi nâng máy lên 4 GB thì có thể thêm Alloy.
4. **Sao lưu bằng restic**, chạy được ngay với kho trên VPS. Khi chủ dự án tạo Backblaze B2 (miễn phí 10 GB, không cần
   thẻ) thì đổi `RESTIC_REPOSITORY` và hai khóa truy cập để gửi bản sao lưu ra ngoài VPS. Kho restic nào cũng được
   (Cloudflare R2 cũng được).
5. **Trước khi có tên miền** dùng `<ip>.sslip.io` (HTTPS thật từ Let's Encrypt). Khi có tên miền: trỏ về Cloudflare,
   đổi `SITE_HOST`, và cho Caddy lấy chứng chỉ bằng DNS của Cloudflare (`TLS_MODE=cloudflare`).

## Hệ quả
- `SITE_URL` của web được đọc lúc build, nên đổi tên miền thì phải build lại web. Workflow deploy tự build theo biến
  `SITE_HOST` của repo.
- Image trên GHCR không chứa secret; mọi secret nằm trong `/opt/nepnha/.env` trên VPS và trong GitHub Secrets.
