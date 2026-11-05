# 2026-11-05 — máy desktop — phần D (hạ tầng)

## Phản hồi
- Chủ dự án: "merge luôn nhé" cho PR #31 (phần D) → merge ngay khi CI xanh, không đợi review xong; các góp ý của review làm ở PR sau.
- Chủ dự án chưa có VPS. Cần một máy chủ nhẹ để đưa web lên internet; hiện web là landing page, chưa có dữ liệu quan trọng; ưu tiên chi phí thấp. → Chọn cấu hình và nhà cung cấp theo giá trước, bớt các phần tốn tài nguyên nếu không cần ngay.

## Quyết định
- VPS ở Việt Nam, 2 vCPU / 2 GB RAM (không phải 4 GB như spec), thêm 2 GB swap, giới hạn bộ nhớ từng container, bỏ Grafana Alloy lúc đầu — chủ dự án ưu tiên chi phí.
- Sao lưu: chủ dự án để agent chọn ("landing page, chỉ show sản phẩm và bài báo"). Agent chọn: restic chạy được ngay với kho trên VPS; khi chủ dự án tạo Backblaze B2 (miễn phí 10 GB, không cần thẻ) thì điền biến môi trường để gửi ra ngoài. Code nhận mọi kho restic (R2 cũng được).
- Chủ dự án duyệt thiết kế phần D, gồm hai điểm khác spec: deploy qua GHCR (không dùng `docker save | ssh docker load`), chưa chạy Grafana Alloy; cảnh báo bằng UptimeRobot và healthchecks.io. Duyệt luôn: viết plan rồi làm và mở PR.

## Còn mở
- Chủ dự án làm checklist `docs/deploy.md`: thuê VPS, key SSH, `setup.sh`, `init-env.sh`, GitHub Variables và Secrets, UptimeRobot, healthchecks.io, Backblaze B2; tên miền và Cloudflare sau cùng.

## Đã làm
- Plan `docs/superpowers/plans/2026-11-05-phan-d-ha-tang.md`, quyết định `docs/decisions/0012-ha-tang-vps-nho.md`.
- Image `api`, `web`, `caddy`; `infra/compose.prod.yml`; sao lưu restic và lịch systemd; script VPS; workflow `infra` (PR) và `deploy` (push `main`, bỏ qua khi chưa có biến `VPS_HOST`).
- Đã chạy ở máy này (Docker Desktop): `run-smoke.sh` qua hết 10 bước kiểm tra; `deploy-test.sh` qua (bản hỏng tự quay lại bản trước). Bước sao lưu và khôi phục thử chỉ chạy trên CI, vì máy này không có restic.
- Sửa theo review cả nhánh (nhánh `feat/ha-tang-sua-review`): rollback vẫn chạy khi `docker compose up` lỗi; rollback dùng lại file compose cũ; `setup.sh` kiểm tra giá trị SSH mà sshd thật sự dùng; khôi phục thử nối qua TCP; `restore.sh` xóa cả schema trước khi khôi phục; cache restic và thời gian chờ cho systemd; token gửi lên VPS chỉ đọc được; phiên bản Caddy và plugin được ghim; check healthchecks riêng cho khôi phục thử.
- Lỗi phát hiện khi thử: `deploy.sh` cũ chạy `docker image prune -af --filter until=168h`, nên lần chạy `deploy-test.sh` ở máy này đã xóa mọi image Docker không dùng (không mất container hay volume). Đã đổi: `deploy.sh` chỉ xóa image Nếp Nhà của tag cũ, giữ bản hiện tại và bản trước.
