# Nếp Nhà — Thiết kế cảnh minh hoạ có chuyển động

Ngày: 2026-11-04. Trạng thái: chờ chủ dự án duyệt.
Storyboard phác (mở bằng trình duyệt): `docs/superpowers/specs/2026-11-04-canh-minh-hoa-storyboard.html`.
Quyết định màu: `docs/decisions/0007-mau-troi-minh-hoa.md`.

## 0. Mục tiêu và phạm vi

### Mục tiêu
Trang chủ có thêm ba phần minh hoạ có chuyển động, theo hướng "làng quê mộc mạc nhưng hiện đại, bắt mắt, chuyển động mượt":
1. **Nền Hero:** cánh đồng lúa nếp sau lưng mascot, trời xanh, mây trắng, mặt trời chuyển động nhẹ, lúa lắc theo gió, lặp liền mạch.
2. **Hình túi gạo** trong khối Sản phẩm: cho khách thấy gói hàng thật trông thế nào (túi hút chân không trong suốt, hình khối vuông).
3. **Khối mới "Từ hạt lúa tới người dùng":** 8 cảnh từ cấy mạ đến mâm cơm, có người trong gia đình làm từng bước.

### Trong phạm vi
- Thiết kế hình, chuyển động, bố cục điện thoại và máy tính, cách tải, cách tắt chuyển động, kiểm thử.
- 2 màu mới chỉ dùng trong hình (quyết định 0007).
- Chữ của 3 chú thích túi gạo và 8 cảnh (vi / en), cố định trong code.

### Ngoài phạm vi
- Sửa chữ của câu chuyện trong admin (cần API và màn hình quản trị; để sau nếu cần).
- Thay đổi khối "Hành trình" hiện có. "Hành trình" là quá trình phát triển của thương hiệu (các mốc năm, sửa trong admin); khối mới là hành trình của hạt lúa đến người dùng. Hai khối là hai việc khác nhau.
- Hình 3D hoặc túi xoay được bằng tay.

### Tiêu chí thành công
- Chủ dự án duyệt storyboard, mỗi tư thế người và bản cuối của từng cảnh.
- Lighthouse mobile của `/vi` và `/en` giữ từ 94 điểm trở lên ở cả ba mục; CLS = 0; LCP vẫn là chữ "Nếp Nhà".
- Khi `prefers-reduced-motion: reduce` bật, không tải GSAP, mọi nội dung vẫn hiện đầy đủ ở dạng tĩnh.
- Mọi vòng lặp dừng khi ra khỏi màn hình, và dừng hẳn khi người xem bấm nút "Tạm dừng chuyển động".
- Antislop Delivery Gate PASS (chế độ `during`) và trình kiểm tra của taste-skill không báo lỗi trước khi mở PR.

## 1. Nguồn tham khảo

Ảnh chủ dự án gửi nằm ở `.superpowers/ref/` (ngoài git, có trong `.gitignore`):

| File | Nội dung | Dùng cho |
|---|---|---|
| `xuong-xay.jpg` | Xưởng xay: tháp gầu tải xanh lá, máy bóc vỏ xanh dương có phễu, máy đỏ, buồng sấy vách tôn xanh, nhà xưởng vách tôn | Cảnh 5 |
| `tui-trong-tren-may.jpg`, `tui-trong-va-nong-gao.jpg` | Túi hút chân không trong suốt 2 kg, nhãn dán trên mặt túi, nong tre đựng gạo | Hình túi, cảnh 6 |
| `tui-xanh.jpg` | Túi in màu xanh lá (không dùng làm mẫu, chỉ để biết) | — |
| `may-hut-chan-khong.jpg` | Máy hút chân không có buồng, thân inox, nắp trong | Cảnh 6 |
| `hero-hien-tai.png` | Hero hiện tại, phần trống được khoanh đỏ | Phần 2 |

**Máy sấy thóc** (theo phác thảo tay của chủ dự án, không có file): quạt bên trái đặt trên bệ, thổi gió qua lò than; khí nóng đi vào gầm của một buồng sấy dài; thóc nằm thành lớp trên lưới sắt phía trên gầm; khí nóng đi từ gầm lên, xuyên qua lưới và lớp thóc.

**Không chép vào web:** số hotline, logo hiệp hội, mã QR in trên túi thật.

## 2. Nền Hero

### Hình (từ xa đến gần)
1. **Trời:** chuyển dần Xanh trời `#CFE4EE` → Xanh trời nhạt `#E9F2F1` → Trắng gạo ở chân trời.
2. **Mặt trời:** hình tròn Vàng lúa, viền Nâu đất, một vòng tia nắng Vàng rơm; đặt ở góc trên, sau mascot, để vùng chữ bên trái thoáng.
3. **Mây:** 3 đám, màu Trắng gạo (không dùng trắng `#fff`, vì mọi màu trong hình phải nằm trong bảng màu), viền mảnh Nâu đất như nét mascot.
4. **Làng xa:** dải luỹ tre và vài mái nhà, Nâu áo nhạt (độ mờ khoảng 35%).
5. **Ruộng:** 2–3 lớp ruộng (Vàng rơm, Vàng lúa) và lớp gần nhất có 20–24 cây lúa trĩu bông, chia thành 5 nhóm.

Mascot giữ nguyên (`brand/mascot/mascot-layered.svg`).

### Bố cục (sửa theo góp ý của chủ dự án, 2026-11-04)
- **Cảnh trải hết chiều ngang Hero (sửa theo góp ý thứ ba của chủ dự án, 2026-11-05):** trời và ruộng rõ nhất phía sau mascot, rồi mờ dần rất nhẹ sang trái tới tận mép trái, nằm cả phía sau chữ "Nếp Nhà", tagline và nút. Không còn mép cắt nào. Chữ vẫn phải đạt tương phản ≥ 4,5 : 1 ở mọi điểm (Nâu đất trên Xanh trời khoảng 9 : 1).
- **Mép cảnh mờ dần** về Trắng gạo (về phía mép trái và mép dưới giáp khối Sản phẩm), bằng `mask-image` dạng gradient, nên không thấy vệt cắt.
- **Mascot đứng trước đồng lúa, ruộng ở sau.** Mascot neo vào đáy cảnh (phần dưới của mascot chạm mép dưới, như ảnh chụp ngang hông), không lơ lửng.
- **Đường chân trời** (ngọn lúa giáp bầu trời) nằm **ngang lưng** mascot.
- **Bông lúa dày, trĩu hạt:** mỗi bông nhiều hạt mẩy, thân cong xuống vì nặng; ruộng dày; hàng xa nhỏ dần.
- Điện thoại: cảnh nằm sau mascot ở nửa trên, rộng hết màn hình, mờ dần ở mép dưới trước chữ "Nếp Nhà". Chữ Nâu đất trên Xanh trời đạt khoảng 8,9 : 1.

### Chuyển động: một chu kỳ chung 60 giây, lặp liền mạch
- Mọi vòng lặp dùng chung chu kỳ 60 giây, nên hết chu kỳ mọi thứ về đúng vị trí đầu và vòng sau nối liền vòng trước. Không thấy chỗ bắt đầu lại.
- **Mây:** trôi ngang, đám thứ nhất đi đúng 1 vòng trong 60 giây, hai đám còn lại đi đúng 1 hoặc 2 vòng (luôn là số nguyên, để chu kỳ khép kín), ra mép phải ở chỗ khuất rồi vào lại từ mép trái (`gsap.utils.wrap`).
- **Mặt trời:** vòng tia xoay đúng 1 vòng trong 60 giây (`ease: "none"`); thân mặt trời nhấp nhô vài pixel theo hình sin.
- **Lúa:** mỗi nhóm nghiêng ±3–5° quanh gốc theo hình sin (`sine.inOut`, `yoyo`), số nhịp trong 60 giây là số nguyên; nhóm sau lệch pha với nhóm trước để thấy làn gió đi từ trái sang phải. Bó lúa của mascot (`#rice`) lắc cùng hướng gió.
- Chỉ dùng `transform`. GSAP điều khiển từng nhóm (khoảng 10 tween), không điều khiển từng cây.

### Khi nào dừng
- Hero ra khỏi màn hình → tạm dừng các vòng lặp (ScrollTrigger `onToggle`); vào lại → chạy tiếp.
- Tab bị ẩn → trình duyệt tự dừng (GSAP chạy theo `requestAnimationFrame`).
- **Nút "Tạm dừng chuyển động"**: nút tròn nhỏ ở góc dưới Hero, màu Nâu áo, có nhãn đọc được bằng máy đọc màn hình, `aria-pressed`, vùng bấm tối thiểu 44 × 44 px. Bấm để dừng / chạy lại **mọi vòng lặp trên trang** (Hero và các vòng lặp trong câu chuyện). Hiệu ứng chạy một lần không bị ảnh hưởng. Lựa chọn lưu trong `localStorage` (bọc `try/catch`). Lý do: WCAG 2.2.2 và quy tắc antislop về vòng lặp không dừng.
- `prefers-reduced-motion: reduce` → không tải GSAP, nền là một khung đứng yên, nút dừng không hiện.

## 3. Hình túi gạo trong khối Sản phẩm

### Hình
- **Túi:** khối hút chân không trong suốt, **dáng đứng, cao và mỏng** như túi 2 kg mẫu (`.superpowers/ref/tui-mau-mong.png`): mặt trước là hình chữ nhật đứng (cao khoảng 1,7 lần rộng), cạnh bên rất mỏng (khoảng 1/4 chiều rộng), vẽ nghiêng nhẹ để thấy cạnh mỏng. Mép màng nilon thừa (có đường hàn) chỉ ở phía trên. Nhãn dán trên mặt trước. (Sửa theo góp ý của chủ dự án: bản đầu quá dày.) Hạt gạo trắng ngà vẽ bằng một `<pattern>` lặp, mép màng nilon thừa ở hai đầu.
- **Nhãn:** giống nhãn thật của túi "Gạo nếp cái hoa vàng Duy Tân": khung Xanh mạ `#6E8B3D`, hình nhỏ đồng lúa và trời xanh vẽ lại, chữ "GẠO NẾP CÁI HOA VÀNG" và "DUY TÂN", huy hiệu tròn "2KG". Không có hotline, logo hiệp hội, mã QR.
- **Cạnh túi:** một nong tre nhỏ đựng gạo rời.

### Vị trí (sửa theo quyết định của chủ dự án, 2026-11-04)
- Hình túi nằm **trong ô vàng của bộ ảnh** (cột trái) và là **ảnh đầu tiên** của bộ ảnh. Khi có ảnh thật, ảnh thật nằm sau; khách bấm ảnh nhỏ để xem. Khi chưa có ảnh thật, ô vàng chỉ hiện hình túi (không còn ô trống).
- Hình túi không mở lightbox; lightbox chỉ dùng cho ảnh thật. Ảnh nhỏ của hình túi chỉ hiện khi có ít nhất một ảnh thật.
- 3 chú thích nằm ngay dưới ô vàng. Cột phải chỉ còn mô tả, đặc điểm, quy cách đóng gói, gợi ý món.
- Chỉ hiện ở sản phẩm đầu tiên (trang hiện có một sản phẩm).

### 3 chú thích (chữ HTML, vi / en; chủ dự án có thể sửa câu)
1. "Túi trong: nhìn rõ từng hạt gạo"
2. "Hút chân không: gạo giữ khô và thơm lâu"
3. "Túi gọn: dễ cất, dễ làm quà"

### Chuyển động: chạy một lần khi vào màn hình (khoảng 2,5 giây), rồi đứng yên
1. Túi còn phồng; khoảng 10 hạt gạo rơi vào, hạt sau chậm hơn hạt trước (`stagger`).
2. Túi co thành khối vuông (`scaleX`, `scaleY`); nếp nhăn hiện ra (`opacity`); vài vệt khí bay khỏi miệng túi.
3. Đường hàn miệng túi kéo từ trái sang phải (`scaleX` từ 0).
4. Nhãn dán vào: hơi nghiêng rồi về thẳng, nảy nhẹ (`back.out`).
5. 3 chú thích lần lượt hiện (`opacity`, `y` 8 px).

Khi giảm chuyển động: hiện ngay trạng thái cuối. Không lặp, nên không phụ thuộc nút dừng.

## 4. Khối "Từ hạt lúa tới người dùng"

Vị trí: ngay sau khối Sản phẩm, trước "Hành trình". `id` của khối: `tu-hat-lua`. Không thêm mục mới vào menu đầu trang ở giai đoạn này; nút "Xem hành trình" ở Hero vẫn trỏ tới khối "Hành trình".

### 4.1 Các cảnh

| # | Cảnh | Người | Chuyển động chính (chạy một lần) | Vòng lặp khi đang thấy |
|---|---|---|---|---|
| 1 | Cấy mạ | Mẹ và 2 người nông dân | Mẹ cùng bà con nông dân cúi cấy thành một hàng ngang; cây mạ nhú lên theo hàng (`scale` từ gốc) | Mặt nước gợn vòng |
| 2 | Nắng, mưa, gió | — | Nắng lên → mây kéo tới → gió thổi; lúa lớn dần (`scaleY`) và đổi xanh sang vàng (hai lớp chồng, `opacity`) | Mưa rơi, lúa lắc |
| 3 | Gặt lúa | Ba lái máy, anh 2 nhận bao thóc | Máy gặt đập liên hợp chạy vào ruộng, lúa trước máy ngả xuống, bao thóc đầy dần rồi sang tay anh 2 | Guồng phía trước quay |
| 4 | Sấy thóc tại nhà | Ba | Mũi tên hơi nóng chạy: quạt → lò than → gầm → lên qua lưới sắt và lớp thóc (theo mục 1) | Cánh quạt quay, than lập loè |
| 5 | Xay xát | Anh 2 | Anh 2 đổ bao thóc vào phễu; trấu bay ra ống; gạo trắng chảy xuống bao | Hạt chạy lên tháp gầu tải |
| 6 | Đóng gói | Mẹ | Đặt túi vào máy hút chân không inox, nắp đóng, túi co thành khối vuông (dùng lại chuyển động mục 3), chồng túi cao dần | — |
| 7 | Đến tay khách | Mẹ, khách | Xe tải nhỏ của nhà phân phối chạy tới kệ siêu thị, kệ đầy dần túi gạo; khách tới nhà, mẹ trao túi; hộp quà buộc nơ hiện ra (bánh xe quay khi xe chạy vào) | — |
| 8 | Mâm cơm | — | Món lần lượt hiện trên mâm: xôi, bánh chưng, chè, bình rượu nếp | Hơi nóng bốc lên |

Mỗi cảnh có tiêu đề ngắn và 1–2 câu (vi / en). Chữ kể theo việc làm, không nêu cụ thể ai làm (theo góp ý của chủ dự án, 2026-11-05), ví dụ "Cho thóc vào máy…"; người chỉ có trong hình. Cuối cảnh 8 có nút thật "Liên hệ qua Zalo" (dùng `zaloHref` như Hero; không hiện nếu chưa có số Zalo).

Màu máy theo ảnh xưởng, đổi sang màu thương hiệu gần nhất: tháp gầu tải Xanh mạ, máy bóc vỏ Nâu áo, máy đỏ dùng Hồng má, máy hút chân không dùng Vàng rơm và Trắng gạo cho phần inox.

### 4.2 Người
- **Mẹ** là mascot (mẹ của chủ dự án), giữ đúng bản đã duyệt: nón lá, áo cánh nâu.
- **Ba:** cao gầy, tóc bạc, đội mũ lưỡi trai, áo xanh. Tạm vẽ áo xanh lá nhạt gần Xanh mạ; chủ dự án sửa nếu là xanh dương.
- **Anh 2:** mặt tròn giống mẹ; tạm vẽ tóc đen ngắn, áo thun Nâu áo.
- **Khách:** nhân vật đơn giản, vẽ bằng code.
- **Nông dân cùng cấy (cảnh 1):** 2 người nông dân đội nón lá, áo Vàng rơm (khác áo nâu của mẹ), không giống ai cụ thể.
- **Tư thế cần vẽ (6):** mẹ cúi cấy; nông dân cúi cấy (dùng cho cả 2 người, người thứ hai lật ngang); mẹ ôm / trao túi; ba trong cabin máy gặt (chỉ thấy nửa người); ba đứng cạnh lò sấy; anh 2 bê bao thóc. Dùng lại giữa các cảnh.

### 4.3 Bố cục và cách cuộn
**Timeline dọc theo một con đường, ở mọi cỡ màn hình** (sửa theo góp ý của chủ dự án, 2026-11-05: không để từng hình rời; thay cho dải trượt ngang ghim trên máy tính).
- Một **con đường đất** chạy dọc suốt khối, uốn nhẹ qua lại, từ ruộng (đầu khối) tới mâm cơm (cuối khối). Màu Vàng rơm, viền Nâu áo. Khác khối "Hành trình" (thân lúa thẳng màu Xanh mạ), để hai timeline nằm gần nhau không trông lặp.
- 8 mốc trên đường: mỗi mốc một chấm tròn và nhãn "Bước 1" … "Bước 8" (vi) / "Step 1" … "Step 8" (en).
- **Từ 768 px:** đường ở giữa, cảnh xen kẽ trái / phải (cảnh 1 bên trái), giống cách xếp của "Hành trình".
- **Dưới 768 px:** đường nằm bên trái, cảnh xếp dọc bên phải đường.
- Mỗi cảnh: hình 4:3, tiêu đề, 1–2 câu, như cũ.
- **Hạt gạo đi theo đường:** một hạt gạo (cùng hình hạt gạo của thương hiệu) đi dọc con đường theo vị trí cuộn (ScrollTrigger `scrub`); đoạn đường đã đi qua đậm hơn đoạn chưa tới. Chấm của cảnh đang xem được tô màu.
- Chuyển động chính của từng cảnh chạy một lần khi cảnh vào màn hình; vòng lặp chạy khi cảnh đang thấy (`onToggle`).
- **Không ghim** ở cỡ màn hình nào. Bỏ thanh tiến độ 8 hạt lúa (con đường đã cho thấy tiến độ).
- Link "Bỏ qua câu chuyện" ở đầu khối, hiện khi được focus bằng bàn phím, nhảy tới khối kế tiếp.

**Không có chuyển động** (`prefers-reduced-motion`, chưa có JavaScript, GSAP tải lỗi): vẫn là timeline con đường như trên (danh sách `<ol>` 8 cảnh), đường vẽ đủ, không có hạt gạo chạy, mỗi cảnh là hình tĩnh ở khung cuối. Không có nội dung nào bị ẩn trước khi code chuyển động chạy.

### 4.4 Cách tải hình
- Mỗi cảnh là một file SVG trong `web/public/story/`: `canh-1-cay-ma.svg`, `canh-2-nang-mua-gio.svg`, `canh-3-gat.svg`, `canh-4-say.svg`, `canh-5-xay-xat.svg`, `canh-6-dong-goi.svg`, `canh-7-den-tay-khach.svg`, `canh-8-mam-com.svg`.
- Mặc định, trang hiện file đó bằng `<img loading="lazy">` có `width` và `height`, nên bố cục không xô lệch.
- Khi chuyển động bật: lúc người xem còn cách cảnh khoảng 1 màn hình, code tải lại chính file đó dưới dạng chữ (đã có trong cache), đọc bằng `DOMParser` và thay `<img>` bằng SVG nằm trong trang để điều khiển từng nhóm. File là của chính trang web, cùng nguồn gốc. Nếu tải lỗi, `<img>` tĩnh ở lại.
- Các phần hình (tư thế người, máy, đồ vật, nền mỗi cảnh) đặt trong `brand/story/`. Script `web/scripts/build-story.mjs` (cùng kiểu với `web/scripts/sync-brand.mjs` đang có) ghép chúng thành các file cảnh, kiểm tra an toàn (không `<script>`, không thuộc tính `on*`, không link ngoài) và kiểm tra ngân sách mục 6.
- Mỗi nhóm cần chuyển động có thuộc tính `data-part` cố định; code chuyển động tìm nhóm trong phạm vi một cảnh (`[data-scene]`), nên không cần `id`. Script thêm tiền tố của cảnh vào mọi `id` còn lại (ví dụ `gradient` của hình trace), để không trùng `id` khi nhiều SVG nằm cùng một trang.

## 5. Cách làm hình

Chọn cách kết hợp:
- **Cảnh vật, máy móc, đồ vật:** SVG vẽ bằng code, cùng kiểu nét với mascot (hoạt hình phẳng, viền Nâu đất, góc bo).
- **Người:** theo quy trình đã làm ra mascot: ảnh từ Nano Banana → trace bằng `brand/tools/vectorize-mascot.py` → gom lớp; dùng bản giản lược (như `brand/logo/mascot-logo.svg`) để nhẹ. Chủ dự án duyệt từng tư thế. Recraft là phương án dự phòng cho bước trace.

Các cách đã cân nhắc và không chọn:
- Tất cả bằng code: nhanh và nhẹ nhất, nhưng người sẽ không giống phong cách mascot.
- Vẽ trong Figma rồi xuất SVG tách lớp: đẹp nhất nhưng cần người vẽ và thời gian; phiên này không có kết nối Figma.
- Canva: xuất ảnh phẳng (PNG, hoặc SVG đã gộp lớp, mất tên nhóm), không làm chuyển động từng phần được.

## 6. Ngân sách dung lượng (sau gzip)

| Phần | Giới hạn | Tải khi nào |
|---|---|---|
| Nền Hero (không tính mascot) | ≤ 12 KB | Nằm trong HTML |
| Hình túi gạo | ≤ 6 KB | Nằm trong HTML |
| Mỗi cảnh câu chuyện | ≤ 18 KB | Khi cuộn gần tới |
| Cả 8 cảnh | ≤ 140 KB | Khi cuộn gần tới |
| Mỗi tư thế người (trong cảnh) | ≤ 12 KB | Theo cảnh |

Không thêm thư viện mới: dùng GSAP 3.15 và ScrollTrigger đã có ở B4.

## 7. Kỹ thuật

- Bắt đầu sau khi nhánh `feat/phan-b4-gsap` merge vào `main`. Dùng `HomeMotion` và kiểu `MotionSetup` của B4: thêm các setup mới vào danh sách của trang chủ, chạy trong `gsap.matchMedia()` với điều kiện không giảm chuyển động.
- **Vòng lặp:** một danh sách chung; mỗi vòng lặp đăng ký vào đó. Nút dừng và ScrollTrigger `onToggle` cùng điều khiển: một vòng lặp chỉ chạy khi nó đang trên màn hình **và** người xem chưa bấm dừng.
- **Hero:** `FieldBackdrop` hiện chỉ dùng ở Hero; thay bằng component nền Hero mới.
- **Màu:** làm theo quyết định 0007 (`tokens.json`, `tokens.css`, `brand/README.md`, `colors.ts`, test `brand-sync`).
- **Chữ:** thêm vào `web/src/lib/i18n/dictionaries.ts` (vi / en): 3 chú thích túi, 8 cảnh, nhãn nút dừng (hai trạng thái), "Bỏ qua câu chuyện", tiêu đề khối.
- **Trợ năng:** các SVG trang trí có `aria-hidden="true"`; nội dung nằm trong chữ HTML. Danh sách cảnh dùng `<ol>`; con đường, chấm và hạt gạo có `aria-hidden="true"`. Nhãn "Bước N" là chữ thật trong mỗi cảnh.

## 8. Thứ tự làm

1. Màu (quyết định 0007) và nền Hero, kèm nút "Tạm dừng chuyển động" và danh sách vòng lặp chung.
2. Hình túi gạo.
3. 6 tư thế người (chờ chủ dự án duyệt từng tư thế).
4. Câu chuyện 8 cảnh: các phần hình, script ghép, component, chuyển động điện thoại và máy tính.

Bước 1, 2 và phần cảnh vật của bước 4 không phụ thuộc bước 3, nên làm được trước khi có người.

## 9. Kiểm thử

- **Test đơn vị (Vitest):** các `id` nhóm hình có mặt trong SVG; chữ có đủ vi / en; khi giảm chuyển động thì hiện danh sách hình tĩnh; nút dừng đổi `aria-pressed` và lưu lựa chọn; vòng lặp chỉ chạy khi đang thấy và chưa bị dừng; các setup chuyển động dùng GSAP giả như test B4.
- **Test dung lượng:** báo lỗi nếu một file vượt ngân sách mục 6.
- **Test đồng bộ màu:** `brand-sync` kiểm tra nhóm màu chỉ dùng trong minh hoạ.
- **Test đầu-cuối (Playwright):** điện thoại: đường bên trái, cảnh xếp dọc; máy tính: cảnh xen kẽ trái / phải, không ghim, hạt gạo đi xuống khi cuộn và chấm của cảnh đang xem đổi màu; "Bỏ qua câu chuyện" bằng bàn phím; chế độ giảm chuyển động hiện đủ nội dung.
- **Đo lại Lighthouse mobile** (`/vi`, `/en`) theo `docs/setup.md`.
- **Trước khi giao:** antislop Delivery Gate, trình kiểm tra của taste-skill (`inspect.mjs`), review theo `web-interface-guidelines`.

## 10. Rủi ro và việc cần xác nhận

- **Công cụ vẽ người:** Nano Banana hiện không kết nối được và `GEMINI_API_KEY` chưa đặt; Recraft cần chủ dự án đăng nhập qua `/mcp`. Nếu chưa có công cụ, bước 3 phải chờ; các bước khác làm trước.
- **Hai timeline dọc liền nhau:** khối này nằm ngay trước "Hành trình". Khác nhau ở đường (con đường đất uốn / thân lúa thẳng), nền (Trắng gạo / Vàng rơm) và nhãn (Bước / năm). Nếu vẫn trông lặp, xem lại khi có bản thật.
- **Màu áo của ba:** chưa rõ xanh lá hay xanh dương (đang tạm xanh lá).
- **Câu chữ:** 3 chú thích và chữ 8 cảnh cần chủ dự án đọc lại; câu "giữ khô và thơm lâu" là một lời hứa về sản phẩm.
- **Quy tắc màu mở rộng:** quyết định 0007 cho phép Hồng má, `da`, `toc` dùng trong mọi hình minh hoạ (không chỉ mascot); cần chủ dự án đồng ý.
