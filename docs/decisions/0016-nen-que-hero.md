# 0016 — Nền quê cho mascot: núi đá Duy Tân, đồng lúa, bao 2 kg

Ngày: 2026-11-11. Người quyết định: chủ dự án.

## Bối cảnh
Chủ dự án muốn nền của mascot "mang đậm quê hương": ngọn núi đá vôi thật sau cánh đồng ở Duy Tân (ảnh Street View của chủ dự án), sản phẩm (bao 2 kg), không thêm cảnh vật khác để ảnh không rối. Các bản xem thử vẽ bằng Nano Banana Pro; nhật ký: `docs/session/log/2026-11-11-may-cong-ty-nen-mascot-que.md`.

## Quyết định
- Bao trên tranh dùng đúng chữ của bao thật: "GẠO NẾP CÁI HOA VÀNG", "Duy Tân", "2KG". Bỏ dải "Hạt Ngọc Xứ Đông" để không lẫn với tên Nếp Nhà. Tên "Nếp Nhà" chỉ nằm ở chữ tiêu đề, không in lên bao.
- Bao vẽ cùng nét với tranh. Bản bao giống ảnh chụp bị chê "fake", không dùng.
- Chữ trên bao do AI viết phải soát từng dấu. Khi AI viết sai, ghép lại phần chữ đúng của bản trước (hai ảnh trùng khớp).
- Hero trang chủ: ảnh nền (`web/public/hero/nen-que.webp`) chỉ có núi, đồng và bao. Mây bay, mặt trời xoay, mascot SVG thật, chữ và nút vẫn là phần của web, đặt lên trên ảnh. Ảnh đặt theo mascot: mép phải của bao cách mascot 0,5rem. Từ cỡ md, hero cao ít nhất 34rem để núi đủ lớn.
- Lúa ngoài ruộng không lay theo gió nữa (lúa trong ảnh đứng yên). Bó lúa trên tay mascot vẫn lay.
- Ảnh chia sẻ link (Facebook, Zalo) dùng cùng ảnh nền, có mây, mặt trời, mascot thật, chữ "Nếp Nhà" và dòng giới thiệu.
- Tranh mascot đứng riêng (ngang 16:9, vuông 1:1) để trong `brand/hero/`, dùng cho ảnh bìa và bài đăng.

## Giữ bản cũ
Chủ dự án muốn giữ hình cũ để quay lại được:
- Tag git `hero-cu-2026-11-11` trỏ vào `main` trước thay đổi.
- Code đồng lúa cũ (`HeroField`, `HeroFieldStatic` trong `web/src/components/home/HeroScene.tsx`) vẫn để trong repo, không vẽ ra. Muốn quay lại: đưa `<HeroField />` vào lại `Hero.tsx`, bỏ ảnh nền.
- Ảnh chia sẻ cũ: `brand/hero/anh-chia-se-cu-2026-11-11.png`.

## Hệ quả
- Màn hình rất rộng (trên khoảng 1500 px) hoặc rất hẹp: ảnh không phủ hết bề ngang, hai mép ảnh mờ dần vào nền trời.
- Ảnh nền được vẽ lên `<canvas>` (`web/src/components/home/HeroPicture.tsx`), không dùng `<img>`. Lý do: khi là `<img>`, ảnh trở thành phần tử lớn nhất của màn hình đầu (LCP), và Lighthouse mobile tính cả thời gian chạy JS trước nó: Performance 80–83, LCP 4,4–5,0 giây, dưới mục tiêu 90 và 2,5 giây của spec; test e2e "LCP là chữ" trên `main` báo lỗi. Canvas không bao giờ là LCP, nên LCP vẫn là chữ "Nếp Nhà". Ảnh được tải trước (preload, ưu tiên cao) ngay trong `<head>`; canvas vẽ ảnh khi script của trang chạy. Không có JS thì không có ảnh, chỉ còn nền trời.
- Đo sau khi đổi (Lighthouse 13.6.0, mobile, bản production, dữ liệu mẫu): `/vi` Performance 91 / 93 / 95, LCP 1,5 giây; `/en` 93 / 98, LCP 1,4 giây; CLS 0. Ảnh nền trên điện thoại khoảng 24 KB (AVIF).
- Tiền Nano Banana cho cả phần này: khoảng 3 USD.
