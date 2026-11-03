# Trạng thái dự án Nếp Nhà

Cập nhật: 2026-11-04 — máy công ty

## Giai đoạn hiện tại
Phần B — website và API. B1 (API) đang làm trên nhánh `feat/phan-b1-api`. B2 (web công khai) đã xong trên nhánh `feat/phan-b2-web`; chờ B1 merge vào `main` trước, rồi mới merge B2.

## Đã xong
- Spec thiết kế: `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md`.
- Phần C (nền tảng làm việc): đã merge vào `main` (PR #1). Plan: `docs/superpowers/plans/2026-11-03-phan-c-nen-tang-lam-viec.md`.
- Plan phần B2: `docs/superpowers/plans/2026-11-04-phan-b2-web-cong-khai.md`. Cả 11 task xong: web `vi` + `en`, blog, SEO, route revalidate, test đơn vị và test đầu-cuối.
- Phần B2 đã sửa theo review cuối của cả nhánh (trang 404 và trang lỗi có tiêu đề, proxy trả 404 cho đường dẫn lạ).
- Đã chạy bản production với dữ liệu mẫu và đo Lighthouse mobile: cả `/vi` và `/en` đều từ 94 điểm trở lên ở cả ba mục, LCP từ 0,9 đến 1,1 giây. Bảng điểm và lệnh chạy lại nằm trong `docs/setup.md`.
- Chưa thử với API thật (B1 chưa merge vào `main`).

## Đang làm
- Phần B1 (API) trên nhánh `feat/phan-b1-api`.
- Phần A (logo) chạy song song trên nhánh `feat/phan-a-thuong-hieu`.

## Việc tiếp theo
1. Bảo vệ nhánh `main` với check `tools (ubuntu-latest)` và `tools (windows-latest)`: chưa xác nhận là đã bật. Chủ dự án kiểm tra trên GitHub.
2. Merge B1 trước, rồi merge B2. Sau đó chạy web với API thật theo `docs/setup.md` (`npm run dev:api`) và đo lại Lighthouse khi có ảnh.
3. Làm B3 (admin) hoặc B4 (hiệu ứng).
4. Kiểm tra trên máy cá nhân và cloud session theo `docs/setup.md`, ghi kết quả vào `docs/setup.md` và file này.

## Vướng mắc
- Chưa đặt `GEMINI_API_KEY`.
- 4 MCP của dự án chưa được duyệt trong Claude Code.
- Chưa đăng nhập Recraft.

## Việc cho B1 và phần D
1. B1: web đang giả định 8 điểm của hợp đồng API; xem bảng "Khoảng trống của hợp đồng API" ở đầu `docs/superpowers/plans/2026-11-04-phan-b2-web-cong-khai.md` và xác nhận từng điểm.
2. B1: `POST /api/revalidate` nhận từ 1 đến 50 tag hợp lệ. Chỉ cần một tag sai thì cả lần gọi bị trả 400. B1 chỉ được gửi `home`, `stories` và `story:<slug>`. Slug chỉ gồm chữ thường, chữ số và dấu `-`, dài tối đa 80 ký tự (xem `web/src/lib/revalidate.ts`).
3. Phần D: Cloudflare không được cache HTML (chỉ cache `/_next/static/*` và `/media/*`). Caddy không được cache, và phải chuyển tiếp header `rsc` và tham số `_rsc`. Các trang gửi `Cache-Control: s-maxage=31536000`, nên nếu cache ở rìa thì khách không thấy thay đổi từ admin. Trang 404 chung (đường dẫn lạ) cũng gửi header này.
4. Phần D: `SITE_URL` phải đặt cả lúc build (cấu hình ảnh) và lúc chạy (canonical, sitemap). Server web chạy bằng `node .next/standalone/server.js`, không phải `next start`. Server này nghe theo biến `HOSTNAME`: trong Docker phải đặt `HOSTNAME=0.0.0.0`, vì trong container biến này mặc định là ID của container.
5. Phần D: `POST /api/revalidate` chỉ gọi được trong mạng nội bộ (`WEB_BASE_URL=http://web:3000`), vì Caddy chuyển `/api/*` sang Spring.

## Quyết định gần nhất
- `docs/decisions/0004-trang-thai-xuyen-may.md`
