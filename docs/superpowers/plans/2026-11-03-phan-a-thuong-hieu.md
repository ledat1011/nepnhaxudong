# Phần A — Thương hiệu Nếp Nhà: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Ghi chú sau khi làm (2026-11-04):** plan này đã được chủ dự án thay đổi trong lúc làm. Mascot cuối cùng không vẽ tay: chủ dự án chọn tạo ảnh bằng ChatGPT / Gemini trên web (không gọi API trả phí), duyệt ảnh Gemini v5, rồi chuyển sang SVG bằng vtracer. Có thêm logo rút gọn (bản B), hai bản logo sáng cho nền tối, và màu `toc`. Các quyết định đầy đủ nằm ở `docs/session/log/2026-11-03-may-cong-ty-phan-a-thuong-hieu.md`; khi plan và log khác nhau, log đúng.

**Goal:** Tạo bộ nhận diện Nếp Nhà: token màu + font, 6 ý tưởng mascot, mascot SVG tách lớp, 3 bản logo SVG và PNG biểu tượng 32/192/512.

**Architecture:** Mọi file nằm trong `brand/`. Công cụ là các script Node nhỏ trong `brand/tools/`, có `package.json` riêng, không đụng `package.json` gốc của phần C. Claude tự vẽ mascot bằng SVG viết tay (không dùng dịch vụ tạo ảnh), có sẵn các nhóm `<g id>` ngay từ bản ý tưởng; mỗi lần vẽ được render ra PNG bằng resvg để xem lại. Ba bản logo được script ghép từ mascot + chữ đã đổi thành path. Test bằng `node --test` kiểm tra token, font, cấu trúc SVG, màu và kích thước PNG; phần nhìn (đẹp, rõ ở 32px, điểm xoay đúng) do chủ dự án duyệt trên `brand/preview.html`.

**Tech Stack:** Node 22 (`node:test`), `@resvg/resvg-js` (SVG → PNG, đo khung), `opentype.js` (chữ → path), `svgo`, `svgson`.

**Spec:** `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md` — mục 2 (2.1, 2.2, 2.3) và mục 7 bước 2. Riêng dòng "Quy trình" của 2.3 (Nano Banana → Recraft) đã được chủ dự án thay: Claude tự vẽ SVG, không dùng Nano Banana, không dùng Recraft.

## Global Constraints

- Bảng màu đúng mã của spec 2.1: Nâu đất `#4A2C1A`, Nâu áo `#8B5A2B`, Vàng lúa `#D9A13B`, Vàng rơm `#F2E2B6`, Trắng gạo `#FBF7EE`, Hồng má `#E59A84` (chỉ trong mascot), Xanh mạ `#6E8B3D` (rất ít, lá lúa). Thêm `da` = `#F4CDA8` (màu da, chỉ trong mascot).
- Vàng lúa không dùng làm màu chữ trên nền sáng. Mọi cặp chữ / nền cho web đạt WCAG AA 4,5:1.
- Font: Pacifico (chỉ chữ "Nếp Nhà" và tiêu đề lớn, không dùng cho chữ nhỏ); Quicksand 400 / 500 / 700.
- Mascot: người phụ nữ nửa người, mặt tròn, má hồng, cười hiền, đội nón lá, mặc áo cánh nâu, ôm bó bông lúa nếp vàng cong qua vai. Hoạt hình phẳng, viền Nâu đất, không gradient.
- Logo đầy đủ: mascot + "Nếp Nhà" (Pacifico) + dòng nhỏ "Xứ Đông · Gạo nếp cái hoa vàng" (Quicksand).
- Biểu tượng: đầu đội nón lá, rõ ở 32px. Một màu: chỉ `#4A2C1A`.
- SVG tách lớp: `<g id="head">` xoay quanh cổ, `<g id="rice">` xoay quanh bàn tay, `<g id="body">` đứng yên, `<g id="eyes">` tùy chọn.
- Ảnh tham khảo Freepik (giữ ngoài repo, trên máy chủ dự án) chỉ để tham khảo phong cách (nét viền nâu dày, mảng màu phẳng, má hồng, nửa người): không chép hình, không đưa ảnh vào repo.
- Không dùng dịch vụ tạo ảnh hay chuyển ảnh có phí (Nano Banana / Gemini, Recraft).
- Không sửa `CLAUDE.md`, `docs/session/STATE.md`, `.claude/**`, `.mcp.json`, `package.json`, `scripts/**` (thuộc phần C). Ghi trạng thái vào `docs/session/log/2026-11-03-may-cong-ty-phan-a-thuong-hieu.md`.
- Commit trên nhánh `feat/phan-a-thuong-hieu`, identity `ledat1011`, không có dòng Co-Authored-By. Không push, không merge khi chưa có đồng ý của chủ dự án.

## Quyết định đã chốt khi duyệt plan

1. Claude tự vẽ SVG; không Nano Banana, không Recraft, không phí API (chủ dự án, 2026-11-03).
2. Thêm token `da` = `#F4CDA8`, chỉ dùng trong mascot.
3. Được tải: font Pacifico-Regular.ttf và Quicksand 400 / 500 / 700 TTF tĩnh từ Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`), file giấy phép OFL từ `github.com/google/fonts`; gói npm `@resvg/resvg-js`, `opentype.js`, `svgo`, `svgson`.

## Cấu trúc file

```
brand/
├── README.md                 cách dùng logo, token, font; quy tắc màu
├── preview.html              trang xem: logo trên 3 nền, icon 16/32/64, mascot chạy thử hiệu ứng
├── tokens/tokens.json        nguồn gốc token (màu, font, cặp chữ/nền hợp lệ)
├── tokens/tokens.css         sinh từ tokens.json (biến CSS)
├── fonts/                    Pacifico-Regular.ttf, Quicksand-{400,500,700}.ttf, OFL-*.txt
├── concepts/concept-{1..6}.svg + concepts.png (bảng 6 ý tưởng, render từ SVG)
├── mascot/mascot-layered.svg
├── logo/logo-full.svg  logo-icon.svg  logo-mono.svg
├── png/logo-icon-{32,192,512}.png
└── tools/
    ├── package.json          "type": "module"; scripts: test, tokens, concepts, logos, png
    ├── .gitignore            node_modules/
    ├── lib/svg-check.mjs     hàm đọc SVG dùng chung cho test
    ├── build-tokens.mjs      tokens.json → tokens.css
    ├── fetch-fonts.mjs       tải font TTF tĩnh
    ├── render-concepts.mjs   6 concept SVG → concepts.png (lưới 3 × 2, có số thứ tự)
    ├── build-logos.mjs       mascot + chữ → 3 logo
    ├── export-png.mjs        logo-icon.svg → PNG
    └── test/brand.test.mjs
```

## Review Focus

1. **Logo trên nền tối** (footer có thể dùng nền Nâu đất): viền Nâu đất biến mất. `preview.html` hiện cả 3 logo trên Trắng gạo, Vàng rơm và Nâu đất; nếu bản trên nền tối không đọc được, ghi vào "Còn mở" để chủ dự án quyết định có cần bản sáng.
2. **Dấu tiếng Việt bị cắt** (dấu của "ế", "à", "ứ" vượt khung): test đo khung nội dung bằng resvg và yêu cầu nằm trong `viewBox` (Task 5).
3. **Màu lệch bảng màu**: test yêu cầu mọi `fill` / `stroke` thuộc bảng màu + `da` (Task 3, 4, 5).
4. **SVG hỏng khi dùng qua `<img>` hoặc `next/image`**: không `<text>`, `<image>`, `<script>`, `href` ra ngoài; có `viewBox` (Task 3, 4, 5).
5. **Điểm xoay sai làm đầu / bó lúa bay lệch**: `data-pivot` phải nằm trong khung của chính nhóm đó (đo bằng resvg), và `preview.html` chạy thử ±3° / ±6° để chủ dự án nhìn (Task 4, 6).

---

### Task 1: Công cụ và token màu, font

**Files:**
- Create: `brand/tools/package.json`, `brand/tools/.gitignore`, `brand/tools/build-tokens.mjs`, `brand/tools/lib/svg-check.mjs`, `brand/tools/test/brand.test.mjs`
- Create: `brand/tokens/tokens.json`, `brand/tokens/tokens.css`

**Interfaces:**
- Produces: `tokens.json` dạng `{ "color": { "<ten>": { "value": "#RRGGBB", "use": "..." } }, "font": { "display": {...}, "body": {...} }, "textPairs": [["<chu>", "<nen>"], ...] }`. Tên màu: `nau-dat`, `nau-ao`, `vang-lua`, `vang-rom`, `trang-gao`, `hong-ma`, `xanh-ma`, `da`.
- Produces: `buildCss(tokens) -> string` (export từ `build-tokens.mjs`); biến CSS `--color-<ten>`, `--font-display: 'Pacifico', cursive`, `--font-body: 'Quicksand', sans-serif`.
- Produces: `contrast(hexA, hexB) -> number` (WCAG 2.x) và `palette() -> Set<string>` (mã hex chữ thường) trong `lib/svg-check.mjs`.

- [ ] **Step 1: Viết test token (thất bại)** trong `test/brand.test.mjs`:
  - `tokens khop spec 2.1`: 7 màu bằng đúng mã spec; `da` = `#F4CDA8`.
  - `tokens.css sinh tu tokens.json`: `buildCss(tokens) === readFile('brand/tokens/tokens.css')`.
  - `moi cap chu/nen dat AA`: mọi cặp trong `textPairs` có `contrast >= 4.5`.
  - `contrast dung cong thuc`: `contrast('#4A2C1A', '#FBF7EE')` ≈ 11.79 (sai số 0.01); `contrast('#D9A13B', '#FBF7EE')` ≈ 2.16.
- [ ] **Step 2: Chạy** `cd brand/tools && npm install && npm test` → FAIL (thiếu file).
- [ ] **Step 3: Viết** `tokens.json`. `textPairs` (đã tính): Nâu đất/Trắng gạo 11.79, Nâu đất/Vàng rơm 9.80, Nâu áo/Trắng gạo 5.46, Nâu áo/Vàng rơm 4.54, Trắng gạo/Nâu áo 5.46 (nút), Trắng gạo/Nâu đất 11.79, Vàng lúa/Nâu đất 5.47 (chữ trên nền tối). Viết `build-tokens.mjs` (export `buildCss`, chạy trực tiếp thì ghi `tokens.css`), chạy `npm run tokens`.
- [ ] **Step 4: Chạy** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(brand): add color and font tokens`.

### Task 2: Font

**Files:**
- Create: `brand/tools/fetch-fonts.mjs`, `brand/fonts/*`
- Modify: `brand/tools/test/brand.test.mjs`

**Interfaces:**
- Produces: `brand/fonts/Pacifico-Regular.ttf`, `brand/fonts/Quicksand-400.ttf`, `Quicksand-500.ttf`, `Quicksand-700.ttf`, `OFL-Pacifico.txt`, `OFL-Quicksand.txt`.

- [ ] **Step 1: Viết test (thất bại)** `font co du dau tieng Viet`: mở từng TTF bằng `opentype.js`; mọi ký tự của "Nếp Nhà" có glyph khác `.notdef` trong Pacifico; mọi ký tự của "Xứ Đông · Gạo nếp cái hoa vàng" có glyph trong cả 3 file Quicksand. Kèm test `co file giay phep OFL`.
- [ ] **Step 2: Chạy** `npm test` → FAIL.
- [ ] **Step 3: Viết** `fetch-fonts.mjs`: gọi `https://fonts.googleapis.com/css2?family=Pacifico` và `...family=Quicksand:wght@400;500;700` không gửi User-Agent trình duyệt (để nhận TTF đầy đủ, không chia theo `unicode-range`), lấy URL `fonts.gstatic.com` trong CSS, tải về; tải `ofl/pacifico/OFL.txt` và `ofl/quicksand/OFL.txt` từ `raw.githubusercontent.com/google/fonts/main/`. Chạy script.
- [ ] **Step 4: Chạy** `npm test` → PASS. Nếu CSS trả về nhiều file theo `unicode-range`, ghép không được → dùng `--user-agent` cũ hơn; không tự ý đổi sang font khác.
- [ ] **Step 5: Commit** `feat(brand): add Pacifico and Quicksand fonts`.

### Task 3: Sáu ý tưởng mascot vẽ bằng SVG — chủ dự án chọn

**Files:**
- Create: `brand/concepts/concept-{1..6}.svg`, `brand/concepts/concepts.png`, `brand/tools/render-concepts.mjs`
- Modify: `brand/tools/test/brand.test.mjs`, `brand/tools/lib/svg-check.mjs`

**Interfaces:**
- Consumes: `palette()` (Task 1).
- Produces: `svgFacts(path) -> { viewBox, ids, colors, tags, hrefs, bytes }` trong `lib/svg-check.mjs` (`colors` = mọi giá trị `fill` / `stroke` / `stop-color`, cả trong thuộc tính `style`, chữ thường; bỏ `none`, `currentColor`, `transparent`).
- Produces: mỗi concept có `viewBox="0 0 512 512"` và đã có sẵn `<g id="body">`, `<g id="rice">`, `<g id="head">` (thứ tự vẽ body → rice → head), để Task 4 chỉ cần hoàn thiện bản được chọn.

- [ ] **Step 1: Viết test (thất bại)** `concept hop le`: với mỗi `concept-{1..6}.svg`: có `viewBox`; có `g#body`, `g#rice`, `g#head`; mọi màu thuộc `palette()`; không thẻ `image` / `text` / `script`; không `href` ra ngoài; < 40 KB. Kèm `concepts.png ton tai`.
- [ ] **Step 2: Chạy** `npm test` → FAIL.
- [ ] **Step 3: Vẽ 6 concept** bằng SVG viết tay (path, ellipse, circle), viền Nâu đất `stroke-width` 6–8 ở khung 512, `stroke-linejoin="round"`, mảng màu phẳng, nền trong suốt. Cùng nhân vật (mô tả ở Global Constraints), sáu biến thể:
  1. Nhìn thẳng, bó lúa cong qua vai phải, tuổi khoảng 50.
  2. Nghiêng 3/4, tay ôm bó lúa trước ngực, ngọn lúa cong qua vai.
  3. Bà cụ khoảng 70, tóc búi, nón lá hơi ngửa.
  4. Phụ nữ khoảng 35, nụ cười rộng hơn.
  5. Đặt trong khung tròn Vàng rơm (dạng huy hiệu).
  6. Ít chi tiết nhất (nét dày, ít mảng) để thu nhỏ tốt.
  Sau mỗi bản: render PNG bằng resvg và xem ảnh; sửa tới khi mặt cân đối, nón lá đúng hình chóp, bó lúa đọc được là lúa (thân cong + hạt hình giọt nước Vàng lúa, vài lá Xanh mạ).
- [ ] **Step 4: Viết** `render-concepts.mjs` (resvg) → `concepts.png`: lưới 3 × 2 ô 400px trên nền Trắng gạo, số 1–6 vẽ bằng hình (không dùng font hệ thống). Chạy `npm run concepts`.
- [ ] **Step 5: Chạy** `npm test` → PASS. Commit `feat(brand): add six mascot concepts`.
- [ ] **Step 6: Gửi `concepts.png` cho chủ dự án** chọn một bản (có thể kèm góp ý, ví dụ "mặt của bản 1 + bó lúa của bản 2"). Ghi lựa chọn vào log session. Sửa theo góp ý tới khi chủ dự án chọn được.

### Task 4: Mascot SVG tách lớp

**Files:**
- Create: `brand/mascot/mascot-layered.svg`
- Modify: `brand/tools/test/brand.test.mjs`, `brand/tools/lib/svg-check.mjs`

**Interfaces:**
- Consumes: concept được chọn (Task 3), `svgFacts`, `palette()`.
- Produces: `mascot-layered.svg` với `viewBox="0 0 512 512"`, thứ tự vẽ `body` → `rice` → `hands` → `head` (bàn tay nắm phía trước thân lúa, đứng yên; đầu đè lên cổ); `eyes` (nếu có) nằm trong `head`. Bốn nhóm là con trực tiếp của `<svg>`. Gốc: bản 1, tư thế hai tay ôm bó lúa (chủ dự án chọn: "phụ nữ trung niên ~50 tuổi, ôm một bó lúa"). `head` và `rice` có `data-pivot="x y"` (toạ độ viewBox, cho GSAP `svgOrigin`) và `style="transform-box: view-box; transform-origin: Xpx Ypx"` cùng giá trị.
- Produces: `contentBBox(svgString, id?) -> {x, y, width, height}` trong `lib/svg-check.mjs` (resvg; có `id` thì đo riêng nhóm đó).

- [ ] **Step 1: Viết test (thất bại)** cho `mascot-layered.svg`:
  - có `viewBox`; có `g#head`, `g#rice`, `g#body`; thứ tự trong file: body trước rice trước head.
  - `head` và `rice` có `data-pivot`; giá trị trùng với `transform-origin`; điểm pivot nằm trong khung nội dung của chính nhóm đó (`contentBBox`).
  - mọi màu thuộc `palette()`; không thẻ `image`, `text`, `script`; không `href` ra ngoài; dung lượng < 40 KB.
- [ ] **Step 2: Chạy** `npm test` → FAIL.
- [ ] **Step 3: Hoàn thiện** concept được chọn thành `mascot-layered.svg`: áp dụng góp ý của chủ dự án; đặt pivot `head` ở giữa cổ, pivot `rice` ở bàn tay đang cầm bó lúa; đầu xoay ±3° và bó lúa xoay ±6° quanh pivot không để lộ khe hở (vẽ cổ / phần thân lúa dưới tay dài hơn chỗ bị che). Kiểm tra bằng cách render 3 khung: 0°, +3° / +6°, −3° / −6°.
- [ ] **Step 4: Chạy** `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(brand): add layered mascot svg`.

### Task 5: Ba bản logo

**Files:**
- Create: `brand/tools/build-logos.mjs`, `brand/logo/logo-full.svg`, `brand/logo/logo-icon.svg`, `brand/logo/logo-mono.svg`
- Modify: `brand/tools/test/brand.test.mjs`

**Interfaces:**
- Consumes: `mascot-layered.svg` (Task 4), font (Task 2), `svgFacts`, `contentBBox`.
- Produces: 3 file SVG; `logo-icon.svg` có `viewBox` vuông.

- [ ] **Step 1: Viết test (thất bại)**:
  - cả 3 file: có `viewBox`; không `text` / `image` / `script` / `href` ra ngoài; khung nội dung (resvg) nằm trong `viewBox`.
  - `logo-full` và `logo-icon`: mọi màu thuộc `palette()`.
  - `logo-mono`: mọi màu `fill` / `stroke` là `#4a2c1a` hoặc `none`.
  - `logo-icon`: `viewBox` vuông; không chứa `g#body`.
- [ ] **Step 2: Chạy** `npm test` → FAIL.
- [ ] **Step 3: Viết** `build-logos.mjs`:
  - `logo-full`: mascot ở trên; "Nếp Nhà" = path từ `Pacifico.getPath(...)`, màu Nâu đất; dòng nhỏ = path Quicksand 700, chữ hoa, giãn chữ, màu Nâu áo; `viewBox` = khung nội dung + lề 4%.
  - `logo-icon`: chỉ `head` (đầu + nón), cắt vuông, nền tròn Vàng rơm; nếu ở 32px nét quá mảnh thì tăng độ dày viền Nâu đất.
  - `logo-mono`: giữ các mảng Nâu đất của mascot (viền, tóc, mắt) và chữ, bỏ các mảng màu khác, đổi hết sang `#4A2C1A`.
- [ ] **Step 4: Chạy** `npm run logos && npm test` → PASS.
- [ ] **Step 5: Commit** `feat(brand): add full, icon and mono logos`.

### Task 6: PNG, trang xem, duyệt cuối

**Files:**
- Create: `brand/tools/export-png.mjs`, `brand/png/logo-icon-{32,192,512}.png`, `brand/preview.html`, `brand/README.md`
- Modify: `brand/tools/test/brand.test.mjs`, `docs/session/log/2026-11-03-may-cong-ty-phan-a-thuong-hieu.md`

- [ ] **Step 1: Viết test (thất bại)** `png dung kich thuoc`: đọc khối IHDR của 3 file PNG, rộng = cao = 32 / 192 / 512.
- [ ] **Step 2: Chạy** `npm test` → FAIL.
- [ ] **Step 3: Viết** `export-png.mjs` (resvg, `fitTo` theo chiều rộng); chạy `npm run png`.
- [ ] **Step 4: Chạy** `npm test` → PASS.
- [ ] **Step 5: Viết** `preview.html` (một file, không thư viện ngoài, đọc `tokens.css`): 3 logo trên nền Trắng gạo / Vàng rơm / Nâu đất; icon ở 16 / 32 / 64 / 192 px; mascot nhúng trực tiếp với CSS keyframes: `head` ±3°, `rice` ±6°, tắt khi `prefers-reduced-motion: reduce`; bảng màu và các cặp chữ / nền kèm tỷ lệ tương phản. Viết `README.md` ngắn: file nào dùng ở đâu, quy tắc màu (Vàng lúa không làm màu chữ trên nền sáng; Hồng má, `da` chỉ trong mascot), cách chạy lại công cụ.
- [ ] **Step 6: Chủ dự án duyệt** trên `preview.html` (gửi file / ảnh chụp). Sửa theo góp ý, lặp lại Task 4–6 khi cần.
- [ ] **Step 7: Cập nhật log session**: đã làm gì, quyết định, việc còn mở (ví dụ: bản logo sáng cho nền tối, cập nhật `STATE.md` và `docs/decisions/` do session phần C gộp).
- [ ] **Step 8: Commit** `feat(brand): add icon png exports and preview page`. Không push, không merge khi chưa được đồng ý.
