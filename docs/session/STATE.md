# Trạng thái dự án Nếp Nhà

Cập nhật: 2026-11-04 — máy công ty

## Giai đoạn hiện tại
Phần B2 — website công khai (code xong trên nhánh `feat/phan-b2-web`, chưa merge). Phần C — nền tảng làm việc: code xong, chờ merge và kiểm tra trên máy cá nhân + cloud.

## Đã xong
- Spec thiết kế: `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md`.
- Plan phần C: `docs/superpowers/plans/2026-11-03-phan-c-nen-tang-lam-viec.md`. Task 1–5 và Task 6 bước 1–2: khung repo, hook, plugin/MCP, scanner, skill đã lọc, CI.
- Plan phần B2: `docs/superpowers/plans/2026-11-04-phan-b2-web-cong-khai.md`. Cả 11 task xong: web `vi` + `en`, blog, SEO, route revalidate, test đơn vị và test đầu-cuối.
- Đã chạy bản production với dữ liệu mẫu và đo Lighthouse mobile: cả `/vi` và `/en` đều từ 94 điểm trở lên ở cả ba mục, LCP từ 0,9 đến 1,1 giây. Bảng điểm và lệnh chạy lại nằm trong `docs/setup.md`.
- Chưa thử với API thật (B1 chưa merge vào `main`).

## Đang làm
- Review cuối của nhánh B2 (`feat/phan-b2-web`).
- Phần A (logo) chạy song song trên nhánh `feat/phan-a-thuong-hieu`.
- Phần B1 (API) chạy trên nhánh `feat/phan-b1-api`.

## Việc tiếp theo
1. Chủ dự án merge PR phần C khi CI xanh, rồi bật bảo vệ nhánh `main` với check `tools (ubuntu-latest)` và `tools (windows-latest)`.
2. Merge B1 trước, rồi merge B2. Sau đó chạy web với API thật theo `docs/setup.md` (`npm run dev:api`) và đo lại Lighthouse khi có ảnh.
3. Làm B3 (admin) hoặc B4 (hiệu ứng).
4. Kiểm tra trên máy cá nhân và cloud session theo `docs/setup.md`, ghi kết quả vào `docs/setup.md` và file này.

## Vướng mắc
- Chưa đặt `GEMINI_API_KEY`.
- 4 MCP của dự án chưa được duyệt trong Claude Code.
- Chưa đăng nhập Recraft.

## Việc cho B1 và phần D
1. B1: web đang giả định 8 điểm của hợp đồng API; xem bảng "Khoảng trống của hợp đồng API" ở đầu `docs/superpowers/plans/2026-11-04-phan-b2-web-cong-khai.md` và xác nhận từng điểm.
2. B1: `POST /api/revalidate` nhận từ 1 đến 50 tag hợp lệ. Chỉ cần một tag sai thì cả lần gọi bị trả 400. B1 chỉ được gửi `home`, `stories` và `story:<slug>`.
3. Phần D: Cloudflare không được cache HTML (chỉ cache `/_next/static/*` và `/media/*`). Caddy không được cache, và phải chuyển tiếp header `rsc` và tham số `_rsc`. Các trang gửi `Cache-Control: s-maxage=31536000`, nên nếu cache ở rìa thì khách không thấy thay đổi từ admin.
4. Phần D: `SITE_URL` phải đặt cả lúc build (cấu hình ảnh) và lúc chạy (canonical, sitemap). Server web chạy bằng `node .next/standalone/server.js`, không phải `next start`.
5. Phần D: `POST /api/revalidate` chỉ gọi được trong mạng nội bộ (`WEB_BASE_URL=http://web:3000`), vì Caddy chuyển `/api/*` sang Spring.

## Quyết định gần nhất
- `docs/decisions/0004-trang-thai-xuyen-may.md`
