# Trạng thái dự án Nếp Nhà

Cập nhật: 2026-11-03 — máy công ty

## Giai đoạn hiện tại
Phần C — nền tảng làm việc (code xong, chờ merge và kiểm tra trên máy cá nhân + cloud).

## Đã xong
- Spec thiết kế: `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md`.
- Plan phần C: `docs/superpowers/plans/2026-11-03-phan-c-nen-tang-lam-viec.md`.
- Task 1–5 và Task 6 bước 1–2 của plan phần C: khung repo, hook, plugin/MCP, scanner, skill đã lọc, CI.
- Nhánh `feat/phan-c-nen-tang` đã push.

## Đang làm
- Review cuối và sửa lỗi của nhánh phần C.
- Phần A (logo) chạy song song trên nhánh `feat/phan-a-thuong-hieu`.

## Việc tiếp theo
1. Chủ dự án merge PR phần C khi CI xanh.
2. Bật bảo vệ nhánh `main` với check `tools (ubuntu-latest)` và `tools (windows-latest)`.
3. Kiểm tra trên máy cá nhân và cloud session theo `docs/setup.md`.
4. Ghi kết quả vào `docs/setup.md` và `docs/session/STATE.md` bằng một PR nhỏ.
5. Viết plan phần B.

## Vướng mắc
- Chưa đặt `GEMINI_API_KEY`.
- 4 MCP của dự án chưa được duyệt trong Claude Code.
- Chưa đăng nhập Recraft.

## Quyết định gần nhất
- `docs/decisions/0004-trang-thai-xuyen-may.md`
