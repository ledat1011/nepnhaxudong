# Phần A — Thương hiệu Nếp Nhà: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo bộ nhận diện Nếp Nhà: token màu + font, 6 ý tưởng mascot, mascot SVG tách lớp, 3 bản logo SVG và PNG biểu tượng 32/192/512.

**Architecture:** Mọi file nằm trong `brand/`. Công cụ là các script Node nhỏ (một Python) trong `brand/tools/`, có `package.json` riêng, không đụng `package.json` gốc của phần C. Ảnh ý tưởng do Gemini 2.5 Flash Image ("Nano Banana") vẽ; ảnh được chọn được vẽ lại thành 3 lớp riêng (thân, đầu, bó lúa), mỗi lớp được ép về bảng màu rồi chuyển sang SVG, sau đó script ghép 3 lớp thành SVG có nhóm `<g id>` và điểm xoay. Test bằng `node --test` kiểm tra token, font, cấu trúc SVG, màu và kích thước PNG; phần nhìn (đẹp, rõ ở 32px, điểm xoay đúng) do chủ dự án duyệt trên `brand/preview.html`.

**Tech Stack:** Node 22 (`node:test`, `fetch`), `@resvg/resvg-js` (SVG → PNG, đo khung), `opentype.js` (chữ → path), `svgo`, `svgson`; Python 3.13 + Pillow + `vtracer` (ảnh → SVG); Gemini API model `gemini-2.5-flash-image`.

**Spec:** `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md` — mục 2 (2.1, 2.2, 2.3) và mục 7 bước 2.

## Global Constraints

- Bảng màu đúng mã của spec 2.1: Nâu đất `#4A2C1A`, Nâu áo `#8B5A2B`, Vàng lúa `#D9A13B`, Vàng rơm `#F2E2B6`, Trắng gạo `#FBF7EE`, Hồng má `#E59A84` (chỉ trong mascot), Xanh mạ `#6E8B3D` (rất ít, lá lúa).
- Vàng lúa không dùng làm màu chữ trên nền sáng. Mọi cặp chữ / nền cho web đạt WCAG AA 4,5:1.
- Font: Pacifico (chỉ chữ "Nếp Nhà" và tiêu đề lớn, không dùng cho chữ nhỏ); Quicksand 400 / 500 / 700.
- Logo đầy đủ: mascot + "Nếp Nhà" (Pacifico) + dòng nhỏ "Xứ Đông · Gạo nếp cái hoa vàng" (Quicksand).
- Biểu tượng: đầu đội nón lá, rõ ở 32px. Một màu: chỉ `#4A2C1A`.
- SVG tách lớp: `<g id="head">` xoay quanh cổ, `<g id="rice">` xoay quanh bàn tay, `<g id="body">` đứng yên, `<g id="eyes">` tùy chọn.
- Ảnh tham khảo (Freepik) chỉ để tham khảo phong cách: không đưa ảnh đó vào API, không đưa vào repo.
- Ngân sách gọi API < 10 USD; báo chủ dự án trước mỗi đợt gọi có phí.
- Key đọc từ biến môi trường `GEMINI_API_KEY`; không in key, không ghi key vào file.
- Không sửa `CLAUDE.md`, `docs/session/STATE.md`, `.claude/**`, `.mcp.json`, `package.json`, `scripts/**` (thuộc phần C). Ghi trạng thái vào `docs/session/log/2026-11-03-may-cong-ty-phan-a-thuong-hieu.md`.
- Commit trên nhánh `feat/phan-a-thuong-hieu`, identity `ledat1011`, không có dòng Co-Authored-By. Không push, không merge khi chưa có đồng ý của chủ dự án.

## Quyết định cần chủ dự án xác nhận khi duyệt plan

1. **Cách gọi công cụ.** Đề xuất: gọi thẳng Gemini REST API bằng script `brand/tools/gen-image.mjs` (cùng model với `nanobanana-mcp-server`) và chuyển sang SVG bằng `vtracer` chạy trên máy (miễn phí). Lý do: MCP thêm giữa chừng chỉ có hiệu lực ở session mới, và `--scope local` sẽ gắn vào thư mục dự án luz của session này; script không cần khởi động lại. Recraft chỉ dùng nếu `vtracer` cho kết quả xấu (khi đó chủ dự án đăng nhập Recraft). Cách khác: dùng MCP như spec viết, chủ dự án phải khởi động lại app sau khi đặt key.
2. **Màu da.** Bảng màu 2.1 không có màu da. Đề xuất thêm token `da` = `#F4CDA8`, chỉ dùng trong mascot, giống quy tắc của Hồng má.
3. **Tải về:** font Pacifico-Regular.ttf (~300 KB) và Quicksand 700 / 500 / 400 TTF tĩnh (~80 KB mỗi file) từ Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`), file giấy phép OFL từ `github.com/google/fonts`; gói npm `@resvg/resvg-js`, `opentype.js`, `svgo`, `svgson`; gói pip `vtracer`.
4. **Key:** chủ dự án tự đặt `GEMINI_API_KEY` thành biến môi trường người dùng của Windows (Cài đặt → Biến môi trường, hoặc `setx GEMINI_API_KEY ...` trong cửa sổ PowerShell riêng). Không dán key vào chat.

## Cấu trúc file

```
brand/
├── README.md                 cách dùng logo, token, font; quy tắc màu
├── preview.html              trang xem: logo trên 3 nền, icon 16/32/64, mascot chạy thử hiệu ứng
├── tokens/tokens.json        nguồn gốc token (màu, font, cặp chữ/nền hợp lệ)
├── tokens/tokens.css         sinh từ tokens.json (biến CSS)
├── fonts/                    Pacifico-Regular.ttf, Quicksand-{400,500,700}.ttf, OFL-*.txt
├── concepts/prompts.md       prompt gốc + 6 biến thể
├── concepts/concept-{1..6}.webp
├── layers/{body,head,rice}.webp + layers.json (dịch / co giãn từng lớp khi ghép)
├── mascot/mascot-layered.svg
├── logo/logo-full.svg  logo-icon.svg  logo-mono.svg
├── png/logo-icon-{32,192,512}.png
└── tools/
    ├── package.json          "type": "module"; scripts: test, tokens, mascot, logos, png
    ├── lib/svg-check.mjs     hàm đọc SVG dùng chung cho test
    ├── build-tokens.mjs      tokens.json → tokens.css
    ├── fetch-fonts.mjs       tải font TTF tĩnh
    ├── gen-image.mjs         gọi Gemini, lưu PNG
    ├── run-gemini.ps1        đọc GEMINI_API_KEY từ biến môi trường người dùng rồi chạy gen-image.mjs
    ├── vectorize.py          ép màu về bảng màu + vtracer → SVG một lớp
    ├── build-mascot.mjs      ghép 3 lớp → mascot-layered.svg
    ├── build-logos.mjs       mascot + chữ → 3 logo
    ├── export-png.mjs        logo-icon.svg → PNG
    └── test/brand.test.mjs
```

Ảnh gốc PNG từ Gemini (1–2 MB) để trong thư mục tạm, không commit; repo chỉ giữ bản WebP chất lượng 85.

## Review Focus

1. **Logo trên nền tối** (footer có thể dùng nền Nâu đất): viền Nâu đất biến mất. `preview.html` hiện cả 3 logo trên Trắng gạo, Vàng rơm và Nâu đất; nếu bản trên nền tối không đọc được, ghi vào "Còn mở" để chủ dự án quyết định có cần bản sáng.
2. **Dấu tiếng Việt bị cắt** (dấu của "ế", "à", "ứ" vượt khung): test đo khung nội dung bằng resvg và yêu cầu nằm trong `viewBox` (Task 5).
3. **Màu lệch bảng màu sau khi chuyển ảnh sang SVG**: test yêu cầu mọi `fill` / `stroke` thuộc bảng màu + `da` (Task 4, 5).
4. **SVG hỏng khi dùng qua `<img>` hoặc `next/image`**: không `<text>`, `<image>`, `<script>`, `href` ra ngoài; có `viewBox` (Task 4, 5).
5. **Điểm xoay sai làm đầu / bó lúa bay lệch**: `data-pivot` phải nằm trong khung của chính nhóm đó (đo bằng resvg), và `preview.html` chạy thử ±3° / ±6° để chủ dự án nhìn (Task 4, 6).

---

### Task 1: Công cụ và token màu, font

**Files:**
- Create: `brand/tools/package.json`, `brand/tools/build-tokens.mjs`, `brand/tools/lib/svg-check.mjs`, `brand/tools/test/brand.test.mjs`
- Create: `brand/tokens/tokens.json`, `brand/tokens/tokens.css`

**Interfaces:**
- Produces: `tokens.json` dạng `{ "color": { "<ten>": { "value": "#RRGGBB", "use": "..." } }, "font": { "display": {...}, "body": {...} }, "textPairs": [["<chu>", "<nen>"], ...] }`. Tên màu: `nau-dat`, `nau-ao`, `vang-lua`, `vang-rom`, `trang-gao`, `hong-ma`, `xanh-ma`, `da`.
- Produces: `buildCss(tokens) -> string` (export từ `build-tokens.mjs`); biến CSS `--color-<ten>`, `--font-display: 'Pacifico', cursive`, `--font-body: 'Quicksand', sans-serif`.
- Produces: `contrast(hexA, hexB) -> number` (WCAG 2.x) và `palette() -> Set<string>` (mã hex chữ thường) trong `lib/svg-check.mjs`.

- [ ] **Step 1: Viết test token (thất bại)** trong `test/brand.test.mjs`:
  - `tokens khop spec 2.1`: 7 màu bằng đúng mã spec; `da` = `#F4CDA8` (hoặc giá trị chủ dự án chọn).
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

### Task 3: Ý tưởng mascot — chủ dự án chọn

**Files:**
- Create: `brand/tools/gen-image.mjs`, `brand/tools/run-gemini.ps1`, `brand/concepts/prompts.md`, `brand/concepts/concept-{1..6}.webp`

**Interfaces:**
- Produces: `node gen-image.mjs --prompt-file <md> --section <ten> --out <png> [--input <png>]` — gọi `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent` với header `x-goog-api-key` từ `process.env.GEMINI_API_KEY`; `--input` gửi kèm ảnh để sửa ảnh (dùng ở Task 4). Thoát lỗi rõ ràng nếu thiếu key hoặc API không trả ảnh. In ra số ảnh đã tạo, không in key.
- Produces: `pwsh run-gemini.ps1 <tham-so>` — gán `$env:GEMINI_API_KEY` từ `[Environment]::GetEnvironmentVariable('GEMINI_API_KEY','User')` rồi chạy `node gen-image.mjs <tham-so>`.

- [ ] **Step 1: Viết** `prompts.md`. Prompt gốc (tiếng Anh cho model): flat cartoon mascot, half-body, kind Vietnamese countryside woman, round face, rosy cheeks, gentle smile, conical palm-leaf hat (nón lá), brown traditional áo cánh blouse, holding a bundle of golden glutinous rice stalks curving over her shoulder, thick dark brown outlines `#4A2C1A`, flat fills only, no gradient, no texture, palette (7 màu + `#F4CDA8`), plain background `#FBF7EE`, centered, square, no text, no watermark. Sáu biến thể:
  1. Nhìn thẳng, bó lúa cong qua vai phải, tuổi khoảng 50.
  2. Nghiêng 3/4, tay ôm bó lúa trước ngực, ngọn lúa cong qua vai.
  3. Bà cụ khoảng 70, tóc búi, nón lá hơi ngửa.
  4. Phụ nữ khoảng 35, nụ cười rộng hơn.
  5. Đặt trong khung tròn Vàng rơm (dạng huy hiệu).
  6. Ít chi tiết nhất (nét dày, ít mảng) để thu nhỏ tốt.
- [ ] **Step 2: Kiểm tra key.** `pwsh -c "[bool][Environment]::GetEnvironmentVariable('GEMINI_API_KEY','User')"` → `True`. Nếu `False`: hỏi chủ dự án đặt key, dừng.
- [ ] **Step 3: Báo chủ dự án trước khi gọi:** 6 ảnh × ~0,04 USD ≈ 0,25 USD. Chờ đồng ý.
- [ ] **Step 4: Chạy** 6 lần `run-gemini.ps1`, lưu PNG vào thư mục tạm; đổi sang `concept-N.webp` (Pillow, chất lượng 85). Kiểm tra: 6 file tồn tại, mỗi file < 400 KB.
- [ ] **Step 5: Gửi 6 ảnh cho chủ dự án** (một trang xem hoặc từng ảnh). Ghi lựa chọn và góp ý vào log session. Nếu chủ dự án muốn sửa: một đợt sửa (báo chi phí trước), lặp lại tới khi chọn được.
- [ ] **Step 6: Commit** `feat(brand): add mascot concepts` (prompts + webp).

### Task 4: Mascot SVG tách lớp

**Files:**
- Create: `brand/tools/vectorize.py`, `brand/tools/build-mascot.mjs`, `brand/layers/{body,head,rice}.webp`, `brand/layers/layers.json`, `brand/mascot/mascot-layered.svg`
- Modify: `brand/tools/test/brand.test.mjs`

**Interfaces:**
- Consumes: ảnh ý tưởng đã chọn (Task 3), `gen-image.mjs --input`, `palette()` và `contrast()` (Task 1).
- Produces: `python vectorize.py <in.png> <out.svg>` — ép mỗi điểm ảnh về màu gần nhất trong bảng màu + `da` (khoảng cách trong không gian Lab), nền `#FBF7EE` thành trong suốt, rồi `vtracer` chế độ `color` / `stacked`, `filter_speckle=8`.
- Produces: `mascot-layered.svg` với `viewBox="0 0 512 512"`, thứ tự vẽ `body` → `rice` → `head` (đầu đè lên cổ). `head` và `rice` có `data-pivot="x y"` (toạ độ viewBox, cho GSAP `svgOrigin`) và `style="transform-box: view-box; transform-origin: Xpx Ypx"` cùng giá trị.
- Produces: `svgFacts(path) -> { viewBox, ids, colors, tags, hrefs, bytes }` trong `lib/svg-check.mjs`; `contentBBox(svgString, id?) -> {x, y, width, height}` (resvg).

- [ ] **Step 1: Viết test (thất bại)** cho `mascot-layered.svg`:
  - có `viewBox`; có `g#head`, `g#rice`, `g#body`; thứ tự trong file: body trước rice trước head.
  - `head` và `rice` có `data-pivot`; giá trị trùng với `transform-origin`; điểm pivot nằm trong khung nội dung của chính nhóm đó.
  - mọi màu `fill` / `stroke` thuộc `palette()`; không có thẻ `image`, `text`, `script`; không `href` ra ngoài; dung lượng < 80 KB.
- [ ] **Step 2: Chạy** `npm test` → FAIL.
- [ ] **Step 3: Tạo 3 lớp.** Báo chi phí (3 ảnh ≈ 0,12 USD), rồi gửi ảnh đã chọn vào `gen-image.mjs --input` với 3 prompt sửa ảnh: "chỉ giữ thân + tay (gồm cổ), bỏ đầu và bó lúa", "chỉ giữ đầu + nón lá", "chỉ giữ bó lúa"; cùng khung, cùng vị trí, nền `#FBF7EE`. Lưu `layers/*.webp`.
- [ ] **Step 4: Chuyển lớp sang SVG** bằng `vectorize.py`. Nếu kết quả có nhiều mảng vụn hoặc mất nét mặt sau khi tăng `filter_speckle` / đổi `color_precision`: dừng, báo chủ dự án và đề xuất Recraft.
- [ ] **Step 5: Viết** `build-mascot.mjs`: đọc 3 SVG + `layers.json` (`{ "<lop>": { "dx", "dy", "scale" }, "pivot": { "head": [x,y], "rice": [x,y] } }`), đặt mỗi lớp vào `<g id>`, chạy `svgo` (giữ `id`, `data-*`, `style`), ghi `mascot-layered.svg`. Chỉnh `layers.json` tới khi 3 lớp khớp nhau và pivot nằm ở cổ / bàn tay (xem ảnh render bằng resvg).
- [ ] **Step 6: Chạy** `npm test` → PASS.
- [ ] **Step 7: Commit** `feat(brand): add layered mascot svg`.

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
- [ ] **Step 7: Cập nhật log session**: đã làm gì, quyết định, chi phí API đã dùng, việc còn mở (ví dụ: bản logo sáng cho nền tối, cập nhật `STATE.md` do session phần C gộp).
- [ ] **Step 8: Commit** `feat(brand): add icon png exports and preview page`. Không push, không merge khi chưa được đồng ý.
