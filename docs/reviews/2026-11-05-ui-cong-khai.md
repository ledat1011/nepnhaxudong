# Rà soát giao diện trang công khai (2026-11-05)

Bản được rà: `main` ở commit `df43e46` (đủ phần B, popup Zalo, thanh đang tải, cảnh minh họa: nền đồng lúa ở Hero, hình túi hút chân không, khối 8 cảnh "Từ hạt lúa tới người dùng"). Chỉ rà, không sửa mã sản phẩm.

Ảnh chụp màn hình nằm trong thư mục `docs/reviews/2026-11-05-ui-cong-khai/`. Dữ liệu là dữ liệu mẫu (chữ có `[MẪU]`), nên các nhận xét về chữ và ảnh nói về cách trang hiện nội dung, không nói về câu chữ mẫu. Nút tròn chữ "N" ở góc dưới trái các ảnh là nút của Next.js khi chạy bản phát triển; trang thật không có nút này.

| Số | Ảnh |
|---|---|
| 01 | [`/vi` điện thoại, màn đầu](2026-11-05-ui-cong-khai/01-vi-dien-thoai-man-dau.jpg) |
| 02 | [`/vi` máy tính, màn đầu](2026-11-05-ui-cong-khai/02-vi-may-tinh-man-dau.jpg) |
| 03 | [`/en` điện thoại, màn đầu](2026-11-05-ui-cong-khai/03-en-dien-thoai-man-dau.jpg) |
| 04 | [`/vi` máy tính: Sản phẩm, đầu khối câu chuyện](2026-11-05-ui-cong-khai/04-vi-may-tinh-cau-chuyen-trong-nua.jpg) |
| 05 | [`/vi` máy tính: giữa khối câu chuyện, đầu Hành trình](2026-11-05-ui-cong-khai/05-vi-may-tinh-cau-chuyen-tiep.jpg) |
| 06 | [`/vi` điện thoại: từ Hero tới hết câu chuyện](2026-11-05-ui-cong-khai/06-vi-dien-thoai-trang-1.jpg) |
| 07 | [`/vi` điện thoại: Hành trình, Báo chí, Câu chuyện, Liên hệ](2026-11-05-ui-cong-khai/07-vi-dien-thoai-trang-2.jpg) |
| 08 | [`/vi` máy tính: Hành trình, Báo chí, Câu chuyện, Liên hệ](2026-11-05-ui-cong-khai/08-vi-may-tinh-bao-chi-lien-he.jpg) |
| 09 | [Popup Zalo trên máy tính](2026-11-05-ui-cong-khai/09-zalo-hop-thoai-may-tinh.jpg) |
| 10 | [Tấm trượt Zalo trên điện thoại](2026-11-05-ui-cong-khai/10-zalo-tam-truot-dien-thoai.jpg) |
| 11 | [Câu chuyện trên điện thoại, có chuyển động](2026-11-05-ui-cong-khai/11-cau-chuyen-dien-thoai-co-chuyen-dong.jpg) |
| 12 | [Câu chuyện trên điện thoại, giảm chuyển động](2026-11-05-ui-cong-khai/12-cau-chuyen-dien-thoai-giam-chuyen-dong.jpg) |
| 13 | [Thanh đang tải và dòng "Đang tải trang…"](2026-11-05-ui-cong-khai/13-thanh-dang-tai.jpg) |
| 14 | [Menu điện thoại](2026-11-05-ui-cong-khai/14-menu-dien-thoai.jpg) |
| 15 | [Trang bài viết trên điện thoại](2026-11-05-ui-cong-khai/15-trang-bai-viet-dien-thoai.jpg) |
| 16 | [Liên hệ và footer trên điện thoại](2026-11-05-ui-cong-khai/16-lien-he-dien-thoai.jpg) |

## 1. Tóm tắt

**Phần đã tốt (giữ nguyên):**
- Không có thanh cuộn ngang ở 375 px. LCP là chữ "Nếp Nhà", CLS bằng 0.
- Giảm chuyển động làm đúng như spec: không tải GSAP (0 yêu cầu tải), nút tạm dừng ẩn, khối câu chuyện hiện đủ 8 cảnh ở khung cuối, con đường vẽ đủ (ảnh `12`).
- Bàn phím: thứ tự Tab hợp lý (bỏ qua tới nội dung → logo → menu → English → Zalo → 2 nút Hero → nút tạm dừng → ảnh sản phẩm → "Bỏ qua câu chuyện"), mọi phần tử có viền focus 2 px. Esc đóng popup Zalo và focus quay về đúng nút đã mở.
- Popup Zalo: máy tính là hộp thoại có mã QR (ảnh `09`); điện thoại là tấm trượt từ dưới lên, không có QR, nút to "Mở Zalo" và "Sao chép số" (ảnh `10`).
- Thanh đang tải màu Vàng lúa ở mép trên và dòng "Đang tải trang…" ở đáy, chỉ hiện khi trang chờ lâu hơn 250 ms (ảnh `13`).
- Khối câu chuyện trên điện thoại đẹp và dễ đọc: đường đất bên trái, hình và chữ bên phải, hạt gạo đi theo cuộn, đoạn đường đã qua đậm hơn (ảnh `11`, `06`).
- Lighthouse mobile: 97 đến 100 điểm Performance, 100 Accessibility, 100 SEO (mục 3).

**Năm vấn đề lớn nhất:**
1. Trang chưa có ảnh thật nào. Hành trình, Báo chí, Câu chuyện và trang bài viết là các khối vàng có bông lúa nhỏ "Ảnh sắp được cập nhật". Trên điện thoại, các khối này chiếm phần lớn nửa dưới trang (ảnh `07`, `15`).
2. Màn đầu trên điện thoại chỉ nói "Nếp Nhà" và dòng tagline từ admin. Không có chữ nào nói đây là gạo nếp cái hoa vàng ở Hải Dương. Dưới hai nút còn khoảng trống khoảng 130 px trước khi tới "Sản phẩm" (ảnh `01`, `03`).
3. Ảnh bị lỗi hiện biểu tượng ảnh vỡ của trình duyệt (ảnh `06`, cột 3), và sản phẩm thử "[THỬ REVIEW] Gạo nếp thử" (giá 150.000 đ) đang hiện trên trang công khai của bản local.
4. Trên máy tính, khối câu chuyện để trống một nửa màn ở mỗi cảnh (ảnh `04`, `05`). Hai khối timeline dọc nằm liền nhau (Câu chuyện, Hành trình), rồi hai khối lưới thẻ liền nhau (Báo chí, Câu chuyện Nếp Nhà).
5. Khi cuộn qua khối câu chuyện trên điện thoại tầm trung, khung hình rơi xuống 33 đến 41 khung/giây (đo với CPU chậm 4 lần); khi đứng yên thì đủ 60.

**Kết quả các bước kiểm:** Delivery Gate của antislop: **FAIL** (3 mục, xem mục 2). Inspector của taste-skill báo FAIL ở cả 4 trang; phần lớn là các lựa chọn đã được duyệt (nền trời chuyển màu, đường kẻ dưới header) và việc thiếu ảnh thật. Điểm chấm theo taste-skill: 6,5 / 10 (mục 2.2).

## 2. Kết quả Delivery Gate (antislop, chế độ `during`)

Dial của trang công khai: ENERGY 2 / RHYTHM 2 / MOTION 2 (spec mục 3.0). Đã chạy và bấm thử bằng Playwright trên `http://localhost:3011` (1280 px và 375 px, có và không có giảm chuyển động), cộng với `inspect.mjs` và đọc mã.

### Khối 1: Hard Gate

| Mục | Kết quả | Bằng chứng |
|---|---|---|
| R-02 gạch dài `—` | PASS | 0 lần trong HTML của `/vi`, `/en`, `/vi/cau-chuyen`; không có trong `web/src/lib/i18n/dictionaries.ts`. |
| R-03 điện thoại | PASS | `scrollWidth` = 375 ở 375 px trên mọi trang đã đo; nút cao ít nhất 44 px. |
| R-17 số liệu | PASS | Không có số thống kê. "2 kg" là quy cách thật. |
| R-18 lời khen giả | PASS | Không có khối lời khen. |
| R-23 tài sản tự tạo | PASS | Logo, mascot, 6 tư thế người và 8 cảnh đã được chủ dự án duyệt (spec cảnh minh họa). Chữ mẫu có `[MẪU]`, ảnh trống có nhãn "Ảnh sắp được cập nhật". |
| R-24 menu | PASS | Menu dựng từ các khối có thật (`buildHomeNav`); mọi link nhảy đúng khối. |
| R-25 tương phản | PASS | Lighthouse Accessibility 100 ở cả 4 lần đo; chữ chỉ dùng các cặp trong `tokens.json`. |
| R-26 nút không làm gì | PASS | Mọi nút có `href` hoặc `onClick` thật; đã bấm thử Zalo, menu, tạm dừng, ngôn ngữ, "Xem tất cả". |
| R-27 trạng thái rỗng, đang tải, lỗi | **FAIL** | Có trạng thái rỗng (câu chuyện), đang tải (khung xương, thanh tải), lỗi trang (`error.tsx`). Nhưng ảnh lỗi hiện biểu tượng ảnh vỡ: `web/src/components/ui/ContentImage.tsx:29` không có xử lý khi ảnh tải lỗi (ảnh `06`). |
| R-28 FAQ | PASS | Không có FAQ. |
| R-32 bàn phím | PASS | Thứ tự Tab ở mục 1; viền focus `solid 2px`; Esc đóng popup, focus quay về nút Zalo ở header. |
| R-33 vá bằng script ngoài | PASS | Không có. |
| R-34 sáng / tối | PASS | Không có nút đổi giao diện; chỉ có giao diện sáng. |
| R-35 chạy và bấm thử | PASS | Đã chạy `main` và bản production; script bấm thử ghi ở mục 2.4. |
| R-36 tuyên bố bịa | PASS | Chỉ có câu về túi hút chân không và cách làm của nhà. |
| R-37 hướng thiết kế | PASS | Design Read và dial ở spec mục 3.0. |
| R-38 nội dung bịa trông như thật | PASS (ghi chú) | Không có trong mã. Ghi chú dữ liệu: sản phẩm thử "[THỬ REVIEW] Gạo nếp thử" đang hiện trên `/vi` và `/en` của bản local. |
| R-39 điều khiển, ảnh, chuyển động, tài liệu | PASS | Con trỏ tay cho mọi điều khiển (`web/src/app/globals.css:66`); ảnh có `alt`; giảm chuyển động tắt hết; vòng lặp 60 giây có nút tạm dừng; có `lang`, `<title>`, `main`, `nav`, `footer`; không chặn phóng to. |
| R-40 hiệu năng | PASS | Hình câu chuyện có `width` và `height`; LCP là chữ; không có script bên thứ ba; số đo ở mục 3 là số đo thật. |

### Khối 2: Purpose-Gate

| Mục | Kết quả | Bằng chứng |
|---|---|---|
| R-01 gradient | PASS | Chỉ có trời chuyển màu ở Hero (`web/src/components/home/Hero.tsx:51`), lý do ghi ở quyết định `0007` và spec cảnh minh họa mục 2. |
| R-04 icon | PASS | 3 icon đặc điểm vẽ riêng (hạt tròn, hai hạt dính, hạt có hơi thơm). |
| R-06 font, chữ hoa giãn | PASS | Pacifico và Quicksand theo `brand/README.md`; không có nhãn viết hoa giãn chữ. |
| R-07 lưới, chấm nền | PASS | Không có. |
| R-08 mũi tên | PASS | Chỉ "Đọc tiếp →" và "← Quay lại danh sách", đều chỉ hướng thật. |
| R-09 nhãn hình viên thuốc | PASS | Không có. |
| R-10 kính mờ | PASS | Không có. |
| R-12 bóng đổ | PASS | Chỉ popup Zalo và menu điện thoại (nằm trên trang). |
| R-13 phát sáng | PASS | Không có. |
| R-14 thẻ giống hệt | PASS | Thẻ báo và thẻ câu chuyện giống nhau vì cùng loại nội dung. |
| R-19 chuyển động mẫu | PASS | Mỗi chuyển động có mục đích ghi ở spec 3.3 và spec cảnh minh họa; không ghim, không parallax. |
| R-22 hình minh họa chung chung | PASS | Mọi hình vẽ riêng cho gia đình (mẹ, ba, anh 2, xưởng xay). |

### Khối 3: Liveliness

| Mục | Kết quả | Bằng chứng |
|---|---|---|
| Có dial | PASS | Spec 3.0. |
| Đúng với dial | PASS (ghi chú) | MOTION 2 đúng. RHYTHM 2 hơi lặp: hai timeline dọc liền nhau, hai lưới thẻ liền nhau (đề xuất 4.8). |
| Mỗi màn có một điểm nhìn chính | PASS | Mascot ở Hero, hình túi ở Sản phẩm, từng cảnh ở câu chuyện. |
| Khoảng trống có chủ đích | **FAIL** | Máy tính: mỗi cảnh câu chuyện để trống nửa màn còn lại (ảnh `04`, `05`); Báo chí với 2 bài để trống 1/3 bên phải (`lopsided` của inspector). Điện thoại: khoảng trống khoảng 130 px dưới nút Hero (ảnh `01`). |
| Một điểm nhấn | PASS | Vàng lúa cho mặt trời, bông lúa, đường đã đi qua, viền thẻ. |
| Họa tiết riêng | PASS | Bông lúa và hạt gạo lặp lại (icon, ảnh trống, hạt gạo trên đường). |
| Có Design Read | PASS | Spec 3.0. |

### Khối 4: Craftsmanship và Quality Locks

| Mục | Kết quả | Bằng chứng |
|---|---|---|
| C-1 đến C-5 | PASS (ghi chú C-4) | C-4: ảnh lỗi không có trạng thái thay thế (đã tính ở R-27). |
| R-05 bố cục mẫu AI | PASS (ghi chú) | Không có bento, không có bảng giá. Nhịp lặp ghi ở Khối 3. |
| R-11 mọi thứ bo tròn hết | PASS | Nút bo tròn hẳn, thẻ bo 16 px, popup 16 px. |
| R-15 nút chung chung | **FAIL** | Nút "Xem tất cả" / "View all" (`web/src/components/home/StoriesSection.tsx:35`, `web/src/lib/i18n/dictionaries.ts:114` và `:254`) không nói xem tất cả cái gì. |
| R-16 từ quảng cáo | PASS | Không có. |
| R-20 đổi logo vẫn giống | PASS | Mascot, cảnh xưởng xay, máy sấy của nhà là riêng của Nếp Nhà. |
| R-21 tối mặc định | PASS | Không. |
| R-29 số màu | PASS | 5 màu thương hiệu + 2 màu chỉ cho hình (quyết định `0007`). |
| R-30 sao chép sản phẩm khác | PASS | Không. |
| R-31 lý do cho mỗi quyết định lớn | PASS | Ghi trong spec và các quyết định. |

**Kết luận Delivery Gate: FAIL**, 3 mục: R-27 (ảnh lỗi), khoảng trống không chủ đích (Khối 3), R-15 ("Xem tất cả"). Cả 3 đều nhỏ, sửa được trong một nhánh (đề xuất 4.3, 4.6, 4.9).

### 2.1 Inspector của taste-skill (`inspect.mjs`, 375 px và 1280 px)

| Trang | FAIL | WARN |
|---|---|---|
| `/vi` | gradient (trời Hero), hairline (đường dưới header, đường trên dòng bản quyền), few-pictures (0 ảnh thật), broken-image | palette-cream, no-footage, lopsided (Báo chí), name-only-title (375 px) |
| `/en` | như `/vi` + lopsided (Báo chí, Câu chuyện) | palette-cream, no-footage, name-only-title |
| `/vi/cau-chuyen` | hairline, few-pictures, focal-point, off-centre, still-page | palette-cream, no-footage, hero-void |
| `/vi/cau-chuyen/mau-cau-chuyen-mot` | hairline, few-pictures, focal-point, still-page | palette-cream, no-footage, off-centre, hero-void |

Cách đọc:
- **Giữ, vì đã duyệt:** gradient trời (quyết định `0007`), palette-cream (Trắng gạo là màu nền của thương hiệu). still-page ở trang danh sách và trang bài viết đúng spec (chuyển động chỉ ở trang chủ).
- **Nên sửa:** name-only-title (đề xuất 4.2), few-pictures (4.1), broken-image (4.3), lopsided (4.8).
- **Để cho bố cục mới:** hairline (đường dưới header `web/src/components/layout/SiteHeader.tsx:34` và đường trên dòng bản quyền `web/src/components/layout/SiteFooter.tsx:137`). Hướng "Một họa tiết" cấm đường kẻ mảnh, nên bỏ khi làm bố cục mới.
- off-centre ở trang bài viết là do thân bài giới hạn 65 ký tự mỗi dòng, hẹp hơn tiêu đề. Không cần sửa.
- `scenes.mjs`: báo "no `<section class="scene">`" ở cả máy tính và điện thoại. Đúng như thiết kế: khối câu chuyện không ghim, nên công cụ này không áp dụng. Đã thay bằng việc đo khung hình (mục 2.4).

### 2.2 Chấm điểm theo taste-skill (critique, vòng 1)

```
ROUND 1
Seen in one second: mẹ đội nón lá ôm bó lúa trước đồng lúa vàng.
Idea (one sentence): hạt nếp của nhà đi từ ruộng tới mâm cơm, có người nhà làm từng bước.
Live thing: hạt gạo chạy dọc con đường khi cuộn; mã QR Zalo trên máy tính.
Layout words by section: hero=split / product=split / story=timeline / journey=timeline / press=grid / stories=grid / contact=split / footer=split
Scores: design 6,5 · usability 7,5 · creativity 7,5 · content 5 → overall 6,9 → 6,5 sau giới hạn
Caps applied: gradient và hairline thấy được (overall ≤ 6,5); dưới 4 ảnh thật (design ≤ 6,5); có ô ảnh trống (content ≤ 5).
Top three problems:
1. Không có ảnh thật; ô trống chiếm nửa dưới trang (07, 08, 15) → gia đình chụp ảnh; trong lúc chờ, ẩn ô trống.
2. Màn đầu điện thoại chỉ có tên (01) → thêm dòng "Gạo nếp cái hoa vàng · Hải Dương", bớt khoảng trống dưới nút.
3. Máy tính: câu chuyện trống nửa màn, hai timeline và hai lưới thẻ liền nhau (04, 05, 08) → chữ cảnh sang bên kia đường; bố cục "Một họa tiết".
```

Điểm thấp chủ yếu do thiếu ảnh thật và do các luật chung của taste-skill (không gradient, không đường kẻ) mà thương hiệu đã chọn khác. Ý tưởng và hình minh họa là phần mạnh nhất.

### 2.3 Review mã theo `web-interface-guidelines` (chỉ phần công khai)

```text
## web/src/components/ui/ContentImage.tsx
web/src/components/ui/ContentImage.tsx:29 - no onError fallback: a missing file shows the browser's broken-image icon

## web/src/components/ui/LinkPendingStatus.tsx
web/src/components/ui/LinkPendingStatus.tsx:54 - one empty role=status per link: 15 live regions on the home page; use one shared region

## web/src/components/home/PressSection.tsx
web/src/components/home/PressSection.tsx:24 - target=_blank without "(mở trong tab mới)" for screen readers (ZaloPanel.tsx:232 does it right)

## web/src/components/home/ContactSection.tsx
web/src/components/home/ContactSection.tsx:30 - phone button text is only the number; add a verb ("Gọi …")
web/src/components/home/ContactSection.tsx:46 - target=_blank without new-tab note
web/src/components/home/ContactSection.tsx:68 - target=_blank without new-tab note

## web/src/components/layout/SiteFooter.tsx
web/src/components/layout/SiteFooter.tsx:94 - brand name without translate="no"
web/src/components/layout/SiteFooter.tsx:125 - target=_blank without new-tab note

## web/src/components/layout/MobileMenu.tsx
web/src/components/layout/MobileMenu.tsx:67 - panel does not close on a tap outside or on scroll; focus stays on the button

## web/src/components/contact/ZaloPanel.tsx
web/src/components/contact/ZaloPanel.tsx:46 - sheet: add overscroll-behavior: contain; no swipe-down to close

## web/src/app/[lang]/layout.tsx
web/src/app/[lang]/layout.tsx:16 - no <meta name="theme-color"> (export viewport.themeColor #FBF7EE)

## web/src/app/globals.css
web/src/app/globals.css:56 - no touch-action: manipulation, no -webkit-tap-highlight-color on the public pages

## web/src/components/home/Hero.tsx
web/src/components/home/Hero.tsx:58 - brand name h1 without translate="no"
web/src/components/home/Hero.tsx:59 - first screen does not say what the product is (admin tagline only)

## web/src/components/layout/LogoLink.tsx
web/src/components/layout/LogoLink.tsx:23 - brand name without translate="no"

## web/src/components/ui/SectionHeading.tsx
web/src/components/ui/SectionHeading.tsx:10 - heading without text-wrap: balance
web/src/app/[lang]/[section]/[slug]/page.tsx:64 - same
web/src/components/home/RiceStory.tsx:170 - same

## web/src/components/story/StoryBody.tsx
web/src/components/story/StoryBody.tsx:17 - images in the body have no width/height unless the API keeps them; check for layout shift

## web/src/components/home/StoriesSection.tsx
web/src/components/home/StoriesSection.tsx:35 - "Xem tất cả" / "View all": name what is listed

## web/src/components/home/RiceStory.tsx, JourneySection.tsx, StoryCard.tsx, Gallery.tsx, ProductBag.tsx, NavigationProgress.tsx, Pagination.tsx
✓ pass (labels, alt, aria-hidden on drawings, sizes, reduced motion)
```

### 2.4 Chuyển động (gsap-skills) và đo khung hình

**Đã tốt:**
- GSAP chỉ tải sau sự kiện `load` và khi trình duyệt rảnh (`web/src/components/motion/HomeMotion.tsx:64`), và không tải khi giảm chuyển động.
- Mọi phần chạy trong `gsap.matchMedia()`, nên khi người dùng bật giảm chuyển động thì mọi thứ được trả về như cũ.
- Mọi vòng lặp đi qua một bộ điều khiển (`web/src/lib/motion/loops.ts:29`): chỉ chạy khi đang thấy, dừng hẳn khi bấm nút tạm dừng, lựa chọn được lưu.
- Vòng lặp Hero và vòng lặp cảnh câu chuyện chỉ vẽ 30 lần mỗi giây. Dùng `quickSetter` / `quickTo`; chỉ đổi `transform` và `opacity`.
- Dọn dẹp đầy đủ: bỏ listener `refresh`, kill trigger, `gsap.context` cho các cảnh tải muộn (`web/src/lib/motion/story/rice-story.ts:247`).

**Đo khung hình** (Playwright, 375 × 812, CPU chậm 4 lần để giống điện thoại tầm trung, bản production, 2 lần đo):

| Lúc | Khung/giây | Khung dài hơn 50 ms |
|---|---|---|
| Đứng yên ở Hero 5 giây | 52 / 59 | 1 / 0 |
| Cuộn qua khối câu chuyện | 33 / 41 | 10 / 4 |
| Đứng yên trong khối câu chuyện 4 giây | 59 / 60 | 0 / 0 |

**Điểm cần sửa:**
- G1. Mỗi cảnh đổi `<img>` thành SVG nội tuyến đúng lúc khách đang cuộn: tải file, phân tích, kiểm tra an toàn, chèn vào trang (`web/src/lib/motion/story/rice-story.ts:259`–`:271`, `web/src/lib/motion/story/inline-svg.ts:53`–`:69`). Việc này nằm trên luồng chính trong lúc cuộn. Có thể là một nguyên nhân của các khung dài.
- G2. Mỗi hình cảnh có `mask-image` hai lớp giao nhau (`web/src/app/globals.css:157`–`:176`). Khi nhóm bên trong SVG chuyển động, trình duyệt phải vẽ lại cả hình và lớp mặt nạ. Đây là nghi vấn, cần đo bằng Performance panel trên máy thật trước khi sửa.
- G3. Bó lúa của mascot nghiêng (`skewX`) 30 lần mỗi giây khi Hero đang thấy (`web/src/lib/motion/hero-scene.ts:118`, `:155`). Mascot là SVG lớn, nên mỗi lần nghiêng là vẽ lại cả mascot. Số đo ở Hero vẫn ổn (52 đến 59), nên ưu tiên thấp.
- G4. Hạt gạo trên đường nhỏ và cùng tông với đường (ảnh `11`), khó thấy trên điện thoại. Có thể làm hạt to hơn hoặc viền Nâu đất đậm hơn.
- G5. Mọi khối cùng một kiểu trượt lên 24 px trong 0,6 giây (`web/src/lib/motion/reveal.ts:58`–`:72`). Hợp với MOTION 2, nhưng hơi đều. Bố cục mới dùng kiểu "chuyển dần chậm" cho ảnh chính.

**Các việc đã bấm thử** (script ngoài repo): popup Zalo trên máy tính (có QR, focus trong hộp, Esc trả focus), tấm trượt trên điện thoại (`data-layout="sheet"`, không QR), menu điện thoại, nút tạm dừng, link bỏ qua câu chuyện, thanh đang tải với mạng chậm, giảm chuyển động (không có yêu cầu tải GSAP, 8/8 hình cảnh hiện), trang `/en` (`lang="en"`).

## 3. Lighthouse

Lighthouse 13.6.0, mobile, bản production của `main` chạy bằng `node .next/standalone/server.js` với `CONTENT_SOURCE=mock` (giống cách đo trong `docs/setup.md`). Trình duyệt là **Microsoft Edge 156 không cửa sổ**, vì Chromium của Playwright không khởi động được từ công cụ dòng lệnh của agent (`spawn UNKNOWN`). Edge dùng cùng bộ máy Chromium, nhưng số đo có thể lệch nhẹ so với các lần đo trước bằng Chrome. Mỗi trang đo 2 lần (lần 1 / lần 2).

| Trang | Performance | Accessibility | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| `/vi` | 99 / 100 | 100 / 100 | 100 / 100 | 1,4 s / 1,4 s | 0 / 0 | 110 ms / 50 ms |
| `/en` | 97 / 99 | 100 / 100 | 100 / 100 | 1,4 s / 1,4 s | 0 / 0 | 180 ms / 100 ms |

So với lần đo sau B4 (`docs/setup.md`: `/vi` 98 / 86, `/en` 91 / 95, LCP 1,1 s, TBT 180 đến 560 ms):
- Performance cao hơn và đều hơn, dù trang có thêm 3 phần minh họa. TBT thấp hơn.
- LCP tăng từ 1,1 lên 1,4 giây. Phần tử LCP vẫn là chữ "Nếp Nhà" (`h1`); phần lớn thời gian là "element render delay" (khoảng 370 ms). Vẫn dưới mục tiêu 2,5 giây. Có thể do đổi trình duyệt; nên đo lại bằng Chrome.
- Một lần đo thêm của `/vi` (trước 4 lần trên, trên một server khác đã bị dừng giữa chừng) cho Performance 83, TBT 700 ms. Số đo TBT trên máy này vẫn dao động; không tính lần này vào bảng.
- Lighthouse không thấy chi phí của chuyển động (GSAP tải sau khi trang rảnh) và không cuộn trang. Phần này xem ở bảng khung hình mục 2.4.
- Gợi ý còn lại của Lighthouse: JavaScript không dùng (khoảng 48 KiB), JavaScript cho trình duyệt cũ (khoảng 14 KiB), CSS chặn hiển thị (70 đến 190 ms).

Chưa ghi số này vào `docs/setup.md` (việc này chỉ rà, không sửa tài liệu cài đặt). Chủ dự án có thể đo lại bằng Chrome theo lệnh trong `docs/setup.md`.

## 4. Đề xuất, xếp theo thứ tự ưu tiên

Công sức: nhỏ (dưới nửa ngày), vừa (1–2 ngày), lớn (hơn 2 ngày). Không đề xuất nào cần sửa API, trừ khi ghi rõ.

### 4.1 Ảnh thật, và ẩn ô ảnh trống trong lúc chờ
- **Thấy gì:** 0 ảnh thật trên mọi trang. Hành trình, Báo chí, Câu chuyện và đầu trang bài viết là các khối Vàng rơm có bông lúa nhỏ (ảnh `07`, `08`, `15`). Trên điện thoại mỗi khối cao khoảng 200 đến 230 px.
- **Vì sao quan trọng với khách trên điện thoại:** nửa dưới trang trông như chưa làm xong. Khách muốn thấy hạt gạo thật, túi thật, ruộng thật trước khi nhắn Zalo hỏi mua.
- **Thay đổi:**
  - Gia đình chụp 6 đến 12 ảnh: túi 2 kg thật, hạt gạo cận cảnh, ruộng, máy sấy và máy xát của nhà, mâm xôi, người nhà đang làm. Tải lên trong admin (đã có hộp tải ảnh cho điện thoại).
  - Trong lúc chờ: khi mục không có ảnh, không vẽ khung ảnh. Chỗ sửa: `web/src/components/home/JourneySection.tsx:62`, `web/src/components/home/PressSection.tsx:28`, `web/src/components/story/StoryCard.tsx:35`, `web/src/app/[lang]/[section]/[slug]/page.tsx:70`.
- **Công sức:** nhỏ (mã); việc chụp ảnh là của gia đình.

### 4.2 Màn đầu trên điện thoại nói rõ bán gì
- **Thấy gì:** dưới chữ "Nếp Nhà" chỉ có tagline từ admin ("Hạt nếp quê nhà"). Không có "gạo nếp cái hoa vàng", không có "Hải Dương" (`web/src/components/home/Hero.tsx:59`; inspector: `name-only-title`). Dưới hai nút có khoảng trống khoảng 130 px trước tiêu đề "Sản phẩm" (`web/src/components/home/Hero.tsx:56` `pb-16` cộng `web/src/app/[lang]/page.tsx:74` `py-16`). Ảnh `01`, `03`.
- **Vì sao quan trọng:** khách mở link từ Zalo hay Facebook chỉ có vài giây trên màn đầu. Nếu màn đầu không nói đây là gạo nếp, khách phải cuộn mới biết.
- **Thay đổi:** thêm một dòng cố định ngay dưới tên: "Gạo nếp cái hoa vàng · Hải Dương" / "Yellow-flower sticky rice · Hải Dương, Vietnam" (đã có `site.tagline` trong `web/src/lib/i18n/dictionaries.ts:10`), tagline từ admin nằm dưới. Giảm khoảng đệm dưới Hero trên điện thoại để đầu hình túi gạo ló lên trong màn đầu.
- **Công sức:** nhỏ.

### 4.3 Ảnh lỗi có hình thay thế; tắt sản phẩm thử
- **Thấy gì:** một ảnh sản phẩm không tải được hiện biểu tượng ảnh vỡ trong ô vàng (ảnh `06`, cột 3). `web/src/components/ui/ContentImage.tsx:29` và ảnh lớn trong bộ ảnh không có xử lý lỗi. Trên bản local, file ảnh không có ở `/media`, và sản phẩm "[THỬ REVIEW] Gạo nếp thử" (giá 150.000 đ) đang hiện trên `/vi` và `/en`.
- **Vì sao quan trọng:** ảnh vỡ làm trang trông hỏng. Sản phẩm thử có giá thật làm khách hiểu sai.
- **Thay đổi:** khi ảnh lỗi, hiện ô "Ảnh sắp được cập nhật" như khi chưa có ảnh. Trong admin, tắt "Hiện trên web" của sản phẩm thử (công tắc đã có từ PR #18).
- **Công sức:** nhỏ.

### 4.4 Liên hệ trên điện thoại: nút "Gọi", footer gọn, lời mời ở cuối bài viết
- **Thấy gì:**
  - Nút điện thoại chỉ có số "0000 000 000" (`web/src/components/home/ContactSection.tsx:30`; ảnh `16`).
  - Ngay dưới khối Liên hệ, footer lặp lại điện thoại, Zalo, Messenger, địa chỉ, bản đồ, giờ (`web/src/components/layout/SiteFooter.tsx:97`–`:118`). Trên điện thoại khách cuộn qua cùng thông tin hai lần.
  - Cuối trang bài viết chỉ có "← Quay lại danh sách" (`web/src/app/[lang]/[section]/[slug]/page.tsx:82`–`:90`; ảnh `15`).
- **Vì sao quan trọng:** người lớn tuổi cần chữ "Gọi" để biết bấm vào là gọi. Khách đọc xong bài là lúc muốn hỏi mua, nhưng không có nút nào ở đó.
- **Thay đổi:** nút ghi "Gọi 0000 000 000"; footer chỉ giữ logo, mạng xã hội, bản quyền (hoặc một dòng điện thoại); cuối bài thêm hộp nhỏ "Muốn đặt nếp? Nhắn Nếp Nhà qua Zalo" dùng lại `ZaloLink`.
- **Công sức:** nhỏ.

### 4.5 Khách tiếng Anh
- **Thấy gì:**
  - Chữ tiếng Anh dùng "xứ Đông" (`web/src/lib/i18n/dictionaries.ts:148`, `:190`). Khách nước ngoài không biết đây là đâu.
  - Nút chính ở Hero là "Contact us on Zalo" (`web/src/lib/i18n/dictionaries.ts:167`). Khách nước ngoài thường không có Zalo.
  - Tên "Nếp Nhà" không có `translate="no"` (`web/src/components/home/Hero.tsx:58`, `web/src/components/layout/LogoLink.tsx:23`, `web/src/components/layout/SiteFooter.tsx:94`). Google Dịch có thể đổi tên thương hiệu khi khách dịch trang tiếng Việt.
  - Nội dung chưa có bản tiếng Anh hiện tiếng Việt trên `/en` (đúng spec 3.1), ví dụ sản phẩm thử.
- **Thay đổi:** viết "Hải Dương province, northern Vietnam"; ở `/en` đặt nút Messenger cạnh nút Zalo trong Hero và thêm câu ngắn "Zalo is Vietnam's most used chat app"; thêm `translate="no"` cho tên; dịch đủ nội dung trước khi chạy thật.
- **Công sức:** nhỏ.

### 4.6 Câu chuyện trên máy tính: dùng cả hai bên đường
- **Thấy gì:** từ 768 px, mỗi cảnh chỉ nằm ở một bên đường; bên kia trống gần hết màn (ảnh `04`, `05`; `web/src/components/home/RiceStory.tsx:110`–`:155`).
- **Vì sao quan trọng:** trên điện thoại khối này đã đẹp. Trên máy tính khách cuộn qua nhiều màn chỉ có một nửa được dùng, trông thưa.
- **Thay đổi:** từ 768 px, đặt hình ở một bên và tiêu đề + câu ở bên kia đường, đối diện nhau, rồi đổi bên ở cảnh sau. Khối ngắn đi gần một nửa và mỗi màn có nội dung ở cả hai bên. Giữ nguyên con đường, hạt gạo và chuyển động (chủ dự án đã duyệt con đường ngày 2026-11-05).
- **Công sức:** vừa.

### 4.7 Cuộn mượt hơn qua khối câu chuyện trên điện thoại tầm trung
- **Thấy gì:** 33 đến 41 khung/giây và 4 đến 10 khung dài hơn 50 ms khi cuộn qua khối câu chuyện, đo với CPU chậm 4 lần (mục 2.4). Đứng yên thì 60.
- **Vì sao quan trọng:** phần lớn khách dùng điện thoại; giật khi cuộn làm mất cảm giác "chuyển động mượt" mà chủ dự án muốn.
- **Thay đổi:** đổi `<img>` sang SVG nội tuyến trong lúc trình duyệt rảnh (`requestIdleCallback`), không ngay khi trigger chạy (G1); thử bỏ mặt nạ hai lớp trên SVG đang chuyển động, ví dụ vẽ sẵn phần mờ trong file SVG hoặc đặt mặt nạ lên lớp bọc ngoài (G2). Đo lại bằng Performance panel và trên một điện thoại Android thật.
- **Công sức:** vừa.

### 4.8 Nhịp trang: tránh hai khối cùng dạng liền nhau
- **Thấy gì:** Câu chuyện và Hành trình đều là timeline dọc xen trái phải, nằm liền nhau. Báo chí và Câu chuyện Nếp Nhà đều là lưới thẻ, nằm liền nhau. Báo chí với 2 bài để trống 1/3 bên phải trên máy tính (ảnh `08`; inspector `lopsided`).
- **Vì sao quan trọng:** trên điện thoại mọi khối thành một cột nên ít thấy; trên máy tính trang trông như lặp mẫu.
- **Thay đổi:** khi có dưới 3 thẻ thì dùng 2 cột rộng; Hành trình trên máy tính có thể thành dải ngang các năm. Phần lớn việc này sẽ được bố cục "Một họa tiết" giải quyết (mục 5), nên chỉ làm nếu bố cục mới còn xa.
- **Công sức:** vừa.

### 4.9 Nút nói rõ việc
- **Thấy gì:** "Xem tất cả" / "View all" (`web/src/components/home/StoriesSection.tsx:35`). Delivery Gate R-15.
- **Thay đổi:** "Xem tất cả câu chuyện" / "All stories".
- **Công sức:** nhỏ.

### 4.10 Các điểm nhỏ về trợ năng và cảm giác chạm (theo `web-interface-guidelines`)
- Link mở tab mới chưa báo cho máy đọc màn hình: `web/src/components/home/PressSection.tsx:24`, `web/src/components/home/ContactSection.tsx:46`, `:68`, `web/src/components/layout/SiteFooter.tsx:125`. Dùng lại cách của popup Zalo (`web/src/components/contact/ZaloPanel.tsx:232`).
- 15 vùng `role="status"` rỗng trên trang chủ, mỗi link một vùng (`web/src/components/ui/LinkPendingStatus.tsx:54`). Gộp thành một vùng chung.
- Menu điện thoại không đóng khi chạm ra ngoài (`web/src/components/layout/MobileMenu.tsx:67`).
- Tấm trượt Zalo: thêm `overscroll-behavior: contain`; cân nhắc cho vuốt xuống để đóng (`web/src/components/contact/ZaloPanel.tsx:46`).
- Thêm `theme-color` Trắng gạo (`web/src/app/[lang]/layout.tsx:16`), `touch-action: manipulation` và màu chạm có chủ đích (`web/src/app/globals.css:56`).
- `text-wrap: balance` cho tiêu đề (`web/src/components/ui/SectionHeading.tsx:10`, `web/src/app/[lang]/[section]/[slug]/page.tsx:64`, `web/src/components/home/RiceStory.tsx:170`).
- Hạt gạo trên đường khó thấy (G4).
- **Công sức:** nhỏ.

### 4.11 Ưu tiên thấp
- Mascot được gửi hai lần (trong HTML và trong dữ liệu RSC, khoảng 90 KB mỗi lần). Đã ghi trong `docs/session/STATE.md`. Lighthouse vẫn 97 đến 100, nên để sau.
- Bó lúa của mascot nghiêng 30 lần mỗi giây (G3). Chỉ sửa nếu đo trên máy thật thấy giật ở Hero.

## 5. Các đề xuất và bố cục "Một họa tiết / hạt gạo nếp"

Bố cục đã chọn (`docs/design/2026-11-04-huong-bo-cuc-one-motif.md`) đổi trang chủ thành: Hero thẻ in sọc bên cạnh hình lớn → Sản phẩm trên một đĩa → các bước dạng bảng gấp → khối giới thiệu có ảnh cắt theo hình → bảng ô lớn → một khung ảnh đổi dần → liên hệ dạng phiếu cắt → footer là dấu thương hiệu dựng lớn. Họa tiết hạt gạo nếp làm khung ảnh, nút, chấm đầu dòng và dải ngăn.

| Đề xuất | Bố cục mới có giải quyết không | Ghi chú |
|---|---|---|
| 4.1 Ảnh thật | **Không, còn cần hơn** | Bố cục mới cần ít nhất 4 ảnh thật, thường 6 đến 12, đặt trong khung hình hạt gạo. Không có ảnh thì bố cục mới trông trống hơn bây giờ. Nên chụp ảnh trước. |
| 4.2 Màn đầu nói rõ bán gì | Một phần | Hero mới có tiêu đề 2 dòng và một câu; phải viết câu đó là "gạo nếp cái hoa vàng, Hải Dương". Dòng chữ là việc của từ điển, dùng lại được. |
| 4.3 Ảnh lỗi | Không | `ContentImage` vẫn dùng trong bố cục mới. Làm ngay. |
| 4.4 Liên hệ | Một phần | Footer "dấu thương hiệu dựng lớn" thay footer hiện tại, nên phần lặp liên hệ tự hết. Nút "Gọi" và lời mời cuối bài vẫn cần. |
| 4.5 Khách tiếng Anh | Không | Việc chữ. Làm ngay. |
| 4.6 Câu chuyện trên máy tính | **Có xung đột** | Bản thiết kế đặt các bước thành "bảng gấp ngang", tức là bỏ con đường. Chủ dự án đã chọn con đường ngày 2026-11-05. Đề nghị: giữ con đường, dùng họa tiết hạt gạo cho các chấm dừng và hạt chạy (đã có), và sửa theo 4.6. |
| 4.7 Cuộn mượt | Không | Mã chuyển động giữ nguyên. Làm trước hoặc cùng lúc. |
| 4.8 Nhịp trang | **Có** | Mỗi khối mới có dạng riêng (đĩa, bảng gấp, khối giới thiệu, bảng ô, khung đổi ảnh, phiếu). Không cần làm riêng. |
| 4.9 Nút nói rõ việc | Không | Việc chữ, 5 phút. |
| 4.10 Trợ năng nhỏ | Không | Phần lớn nằm ở các component giữ lại (header, menu, popup Zalo, `LinkPendingStatus`). |
| Inspector: đường kẻ mảnh | Có | Bản thiết kế cấm đường kẻ; header và footer mới không có đường kẻ. |
| Inspector: gradient trời | **Có xung đột** | Bản thiết kế cấm gradient, nhưng trời chuyển màu đã được duyệt (`0007`). Đề nghị giữ, vì đó là hình minh họa, không phải nền giao diện. |

**Cách làm đề nghị:** làm ngay các việc nhỏ nằm ở phần sẽ giữ lại (4.2 phần chữ, 4.3, 4.4 nút Gọi và lời mời cuối bài, 4.5, 4.9, 4.10), và 4.7. Không làm 4.8 và phần footer của 4.4 riêng, vì bố cục mới sẽ thay chúng. 4.6 chỉ làm nếu bố cục mới chưa bắt đầu trong tuần này.

## 6. Năm việc nên làm tiếp (để chủ dự án duyệt)

| # | Việc | Mục | Công sức | API |
|---|---|---|---|---|
| 1 | Gia đình chụp 6 đến 12 ảnh thật; trong lúc chờ, ẩn ô ảnh trống | 4.1 | nhỏ (mã) + chụp ảnh | không |
| 2 | Màn đầu điện thoại: dòng "Gạo nếp cái hoa vàng · Hải Dương", bớt khoảng trống dưới nút | 4.2 | nhỏ | không |
| 3 | Sửa nhanh để qua Delivery Gate: ảnh lỗi có hình thay thế, nút "Gọi", lời mời Zalo cuối bài, "Xem tất cả câu chuyện", tắt sản phẩm thử | 4.3, 4.4, 4.9 | nhỏ | không |
| 4 | Khách tiếng Anh: "Hải Dương province", nút Messenger cạnh Zalo ở `/en`, `translate="no"` cho tên | 4.5 | nhỏ | không |
| 5 | Cuộn mượt qua khối câu chuyện: đổi SVG khi trình duyệt rảnh, xem lại mặt nạ, đo trên điện thoại thật | 4.7 | vừa | không |

**Lý do chọn 5 việc này:** việc 1 làm trang đẹp lên nhiều nhất và bố cục mới cũng cần. Việc 2, 3, 4 nhỏ, chỉ sửa chữ và vài component sẽ giữ lại sau khi đổi bố cục. Việc 5 là phần "chuyển động mượt" mà chủ dự án yêu cầu, trên đúng thiết bị khách dùng nhiều nhất.

**Đứng ngay sau:** bố cục "Một họa tiết" (giải quyết 4.8 và footer), rồi các điểm trợ năng nhỏ (4.10).

## 7. Những gì chưa kiểm được
- Chưa xem bộ ảnh sản phẩm và lightbox với ảnh thật: bản local thiếu file ảnh ở `/media`.
- Lighthouse đo bằng Edge, không phải Chrome (Chromium của Playwright không khởi động được từ công cụ của agent).
- Chưa thử trên điện thoại thật: quét mã QR Zalo, mở app Zalo từ tấm trượt, độ mượt khi cuộn. Số khung hình ở mục 2.4 là giả lập CPU chậm trên máy tính.
- Chưa thử máy đọc màn hình thật (chỉ đọc cấu trúc ARIA và thứ tự Tab).
