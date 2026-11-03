# 0001 — Công nghệ

## Bối cảnh
Website giới thiệu gạo nếp cái hoa vàng, giai đoạn đầu chỉ giới thiệu và liên hệ qua điện thoại / Zalo / Messenger. Chủ dự án quen Java. Sau này có thể mở rộng sang bán hàng. Chi phí vận hành phải thấp (≤ 300 nghìn đồng / tháng, chưa tính tên miền).

## Quyết định
- Giao diện: Next.js.
- API: Spring Boot 3 trên Java 21.
- Cơ sở dữ liệu: Postgres 16.
- Chạy bằng docker compose trên một VPS.
- Chưa dùng Kubernetes ở giai đoạn này.

## Lý do
- Chủ dự án quen Java nên dễ bảo trì phần API.
- Mở rộng sang bán hàng sau này dễ hơn.
- Một VPS chạy docker compose rẻ và đủ cho lượng truy cập ban đầu.

## Hệ quả
- Image đã chạy trong container, nên chuyển sang k3s sau này vẫn được.
- Phải tự lo backup Postgres và thử khôi phục.
- Nếu môi trường cloud không có Docker, test cần Testcontainers chỉ chạy ở máy local và GitHub Actions.
