# Cảnh minh hoạ có chuyển động — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm nền Hero có trời, mây, mặt trời và ruộng lúa chuyển động lặp liền mạch; hình túi gạo có chuyển động một lần trong khối Sản phẩm; và khối mới "Từ hạt lúa tới người dùng" gồm 8 cảnh minh hoạ.

**Architecture:** Hình là SVG. Nền Hero và hình túi là component React (SVG viết tay, nằm sẵn trong HTML). 8 cảnh câu chuyện là file SVG tĩnh trong `web/public/story/`, do một script ghép từ các phần trong `brand/story/`. Mặc định trang hiện file bằng `<img>`; khi chuyển động bật thì thay bằng SVG nằm trong trang. Chuyển động chạy bằng các hàm `MotionSetup` của B4 trong `HomeMotion`. Mọi vòng lặp đi qua một bộ điều khiển chung, để dừng khi ra khỏi màn hình hoặc khi người xem bấm nút "Tạm dừng chuyển động".

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, GSAP 3.15 + ScrollTrigger, Vitest + Testing Library + jsdom, Playwright + axe; Python 3 (vtracer) cho bước trace tư thế người.

**Spec:** `docs/superpowers/specs/2026-11-04-canh-minh-hoa-design.md` (storyboard: `docs/superpowers/specs/2026-11-04-canh-minh-hoa-storyboard.html`; quyết định màu: `docs/decisions/0007-mau-troi-minh-hoa.md`).

## Global Constraints

- Bắt đầu khi nhánh `feat/phan-b4-gsap` đã merge vào `main`. Tạo nhánh `feat/canh-minh-hoa` từ `main`.
- Mọi màu trong hình thuộc `BRAND` hoặc nhóm màu chỉ dùng trong minh hoạ (`ILLUSTRATION_ONLY_COLORS`, Task 1). Không dùng `#fff`, `white`, `black`. Mây và phần inox dùng Trắng gạo `#FBF7EE`.
- Xanh trời `#CFE4EE`, Xanh trời nhạt `#E9F2F1`: chỉ trong hình; không dùng cho chữ, nút, viền giao diện.
- Pacifico chỉ cho tiêu đề lớn; mọi chữ khác Quicksand. Vàng lúa không làm màu chữ trên nền sáng.
- Chỉ animate `transform` và `opacity` (ngoại lệ: `skewX` cũng là transform).
- Khi `prefers-reduced-motion: reduce`: không tải GSAP (B4 đã làm), mọi nội dung hiện ở dạng tĩnh, nút dừng không hiện.
- Không nội dung nào bị ẩn trước khi code chuyển động chạy (trang không có JavaScript vẫn đầy đủ).
- Mọi SVG trang trí có `aria-hidden="true"` và `focusable="false"`; nội dung nằm trong chữ HTML.
- Mọi chữ hiển thị nằm trong `web/src/lib/i18n/dictionaries.ts`, có cả `vi` và `en`.
- Ngân sách gzip: nền Hero ≤ 12 KB; hình túi ≤ 6 KB; mỗi cảnh ≤ 18 KB; 8 cảnh ≤ 140 KB; mỗi tư thế người ≤ 12 KB.
- Chu kỳ chung của vòng lặp Hero: 60 giây; mọi chuyển động trong vòng lặp có số vòng / số nhịp nguyên trong 60 giây.
- Không thêm thư viện mới.
- Không chép hotline, logo hiệp hội, mã QR của túi thật. Ảnh tham khảo ở `.superpowers/ref/` không vào git.
- Commit: identity `ledat1011`, không có dòng `Co-Authored-By`; message tiếng Anh, câu ngắn.
- Chế độ antislop `during`; dial trang công khai `ENERGY 2 / RHYTHM 2 / MOTION 2`.

## Review Focus

1. **Đổi kích thước cửa sổ hoặc xoay điện thoại** khi khối câu chuyện đang ghim: phải về đúng bố cục (ghim ↔ xếp dọc) mà không kẹt trang và không mất cảnh. Test ở Task 11.
2. **Bấm nút dừng rồi tải lại trang**: vòng lặp vẫn dừng; trình duyệt chặn `localStorage` (chế độ riêng tư) thì nút vẫn chạy trong phiên, không lỗi. Test ở Task 2 và Task 4.
3. **Tải file cảnh lỗi** (mạng chập chờn, file cũ sau khi deploy): `<img>` tĩnh ở lại, các cảnh khác vẫn chạy. Test ở Task 11.
4. **Mở trang bằng link `#tu-hat-lua` hoặc `#hanh-trinh`**, hoặc trình duyệt khôi phục vị trí cuộn ở giữa khối ghim: trang dừng đúng chỗ, không có cảnh bị ẩn. Test ở Task 11.
5. **Đổi chế độ giảm chuyển động khi trang đang mở**: `matchMedia().revert()` gỡ hết, SVG đã thay vẫn hiện đúng khung cuối, không còn vòng lặp chạy ngầm trong bộ điều khiển. Test ở Task 2 và Task 11.

---

## Bản đồ file

| File | Việc |
|---|---|
| `brand/tokens/tokens.json`, `brand/tokens/tokens.css`, `brand/README.md`, `brand/tools/test/brand.test.mjs` | 2 màu trời, quy tắc màu minh hoạ (Task 1) |
| `web/src/lib/brand/colors.ts` (+ `colors.test.ts`) | `ILLUSTRATION_ONLY_COLORS` (Task 1) |
| `web/src/app/globals.css` | `--color-sky`, `--color-sky-light` (Task 1) |
| `web/src/lib/motion/loops.ts` (+ test) | Bộ điều khiển vòng lặp (Task 2) |
| `web/src/lib/motion/load-gsap.ts`, `web/src/components/motion/HomeMotion.tsx` | `MotionSetup` trả về hàm dọn (Task 2) |
| `web/src/components/motion/MotionPauseButton.tsx` (+ test) | Nút dừng (Task 2) |
| `web/src/components/home/HeroScene.tsx` (+ test) | Hình nền Hero (Task 3) |
| `web/src/components/home/Hero.tsx`; xoá `web/src/components/brand/FieldBackdrop.tsx` | Ghép Hero (Task 3) |
| `web/src/lib/motion/hero-scene.ts` (+ test) | Vòng lặp Hero (Task 4) |
| `web/src/components/home/ProductBag.tsx` (+ test), `ProductSection.tsx` | Hình túi (Task 5) |
| `web/src/lib/motion/product-bag.ts` (+ test) | Chuyển động túi, dùng lại ở cảnh 6 (Task 6) |
| `brand/tools/vectorize-pose.py`, `brand/story/people/*.svg` | Tư thế người (Task 7) |
| `brand/story/scenes/*.svg`, `brand/story/parts/*.svg` | Hình các cảnh (Task 9) |
| `web/scripts/story-scenes.mjs`, `web/scripts/build-story.mjs`, `web/public/story/*.svg` | Ghép cảnh (Task 8) |
| `web/src/lib/story/scenes.ts` | Danh sách cảnh (Task 8) |
| `web/src/components/home/RiceStory.tsx` (+ test) | Khối câu chuyện tĩnh (Task 10) |
| `web/src/lib/motion/story/inline-svg.ts`, `scene-motions.ts`, `rice-story.ts` (+ test) | Chuyển động câu chuyện (Task 11) |
| `web/e2e/motion.spec.ts`, `web/e2e/a11y.spec.ts` | Test đầu-cuối (Task 4, 6, 11) |

---

### Task 1: Màu chỉ dùng trong minh hoạ

**Files:**
- Modify: `brand/tokens/tokens.json`, `brand/README.md` (mục "Quy tắc màu"), `brand/tools/test/brand.test.mjs`
- Regenerate: `brand/tokens/tokens.css` (`npm run tokens` trong `brand/tools`)
- Modify: `web/src/lib/brand/colors.ts`, `web/src/components/brand/Mascot.test.tsx`, `web/src/app/globals.css`
- Create: `web/src/lib/brand/colors.test.ts`

**Interfaces:**
- Produces: `ILLUSTRATION_ONLY_COLORS = { skin: "#F4CDA8", hair: "#222222", sky: "#CFE4EE", skyLight: "#E9F2F1" } as const` trong `web/src/lib/brand/colors.ts` (thay `MASCOT_ONLY_COLORS`); `ILLUSTRATION_PALETTE: ReadonlySet<string>` = mọi giá trị của `BRAND` và `ILLUSTRATION_ONLY_COLORS`, viết thường. Tailwind: `bg-sky`, `bg-sky-light`, `from-sky`... từ `--color-sky`, `--color-sky-light`.

- [ ] **Step 1: Sửa test brand tools cho 2 màu mới**
  Trong `brand/tools/test/brand.test.mjs`, bảng màu mong đợi thêm `'xanh-troi': '#CFE4EE'`, `'xanh-troi-nhat': '#E9F2F1'`. Thêm test: `use` của `hong-ma`, `da`, `toc`, `xanh-troi`, `xanh-troi-nhat` chứa chuỗi `"chỉ trong hình minh hoạ"`. `textPairs` giữ nguyên (không cặp nào dùng 2 màu mới).
- [ ] **Step 2: Chạy test, thấy lỗi**
  Run: `cd brand/tools && npm test` — Expected: FAIL ở test bảng màu.
- [ ] **Step 3: Sửa `tokens.json`, chạy `npm run tokens`, sửa `brand/README.md`** theo quyết định 0007 (câu chữ của quyết định).
- [ ] **Step 4: Chạy lại** `cd brand/tools && npm test` — Expected: PASS.
- [ ] **Step 5: Viết test web `colors.test.ts`**
  `it("matches tokens.json")`: đọc `../brand/tokens/tokens.json`, so `BRAND` và `ILLUSTRATION_ONLY_COLORS` với giá trị cùng tên (`nau-dat`→`earth`, …, `xanh-troi`→`sky`, `xanh-troi-nhat`→`skyLight`). `it("palette has every brand and illustration color")`: `ILLUSTRATION_PALETTE.has("#cfe4ee")` là `true`, kích thước = 11.
- [ ] **Step 6: Run** `cd web && npx vitest run src/lib/brand` — Expected: FAIL (`ILLUSTRATION_ONLY_COLORS` chưa có).
- [ ] **Step 7: Sửa `colors.ts`, đổi import trong `Mascot.test.tsx`, thêm 2 biến vào `@theme` trong `globals.css`.**
- [ ] **Step 8: Run** `cd web && npm test && npm run typecheck` — Expected: PASS.
- [ ] **Step 9: Commit** `feat(brand): add two sky colors for illustrations only`

---

### Task 2: Bộ điều khiển vòng lặp và nút dừng

**Files:**
- Create: `web/src/lib/motion/loops.ts`, `web/src/lib/motion/loops.test.ts`
- Modify: `web/src/lib/motion/load-gsap.ts` (kiểu `MotionSetup`), `web/src/components/motion/HomeMotion.tsx` (+ `HomeMotion.test.tsx`)
- Create: `web/src/components/motion/MotionPauseButton.tsx` (+ test)
- Modify: `web/src/lib/i18n/dictionaries.ts`

**Interfaces:**
- Produces (`loops.ts`):
  ```ts
  export type Loop = { play: () => unknown; pause: () => unknown };
  export type LoopEntry = { setVisible: (visible: boolean) => void; remove: () => void };
  export type LoopController = {
    add: (loop: Loop) => LoopEntry;          // mới thêm: chưa thấy (đang dừng)
    setPaused: (paused: boolean) => void;    // lưu vào storage
    isPaused: () => boolean;
    subscribe: (listener: (paused: boolean) => void) => () => void;
  };
  export const PAUSED_STORAGE_KEY = "nepnha:motion-paused";
  export function createLoopController(storage: Pick<Storage, "getItem" | "setItem"> | null): LoopController;
  export function getLoopController(): LoopController; // một bản cho cả trang, storage = window.localStorage nếu đọc được
  ```
  Quy tắc: một vòng lặp chạy khi và chỉ khi nó đang thấy **và** `isPaused()` là `false`. Mọi lỗi của storage (`getItem`/`setItem` ném lỗi, hoặc truy cập `window.localStorage` ném lỗi) bị bỏ qua; khi đó trạng thái chỉ sống trong phiên.
- Produces (`load-gsap.ts`): `export type MotionSetup = (modules: GsapModules, root: Document) => void | (() => void);`. `HomeMotion` gom các hàm dọn và gọi chúng trong hàm dọn của `media.add(...)`.
- Produces: `MotionPauseButton({ dict }: { dict: Dictionary })` — `<button type="button" aria-pressed>`; nhãn `dict.motion.pause` khi đang chạy, `dict.motion.resume` khi đã dừng; mặc định có class `hidden`, chỉ hiện khi `html[data-motion='on']` (Tailwind `[html[data-motion=on]_&]:inline-flex`); vùng bấm ≥ 44 × 44 px; Nâu áo trên Trắng gạo.
- Dictionary: `motion: { pause, resume }` — vi `"Tạm dừng chuyển động"`, `"Chạy lại chuyển động"`; en `"Pause motion"`, `"Play motion"`.

- [ ] **Step 1: Viết test `loops.test.ts`**
  - `it("plays a loop only while it is visible and not paused")`: `add` → `setVisible(true)` → `play` gọi 1 lần; `setPaused(true)` → `pause` gọi; `setVisible(false)` rồi `setPaused(false)` → `play` không gọi thêm.
  - `it("starts paused when the storage says so")`: storage trả `"1"` → `isPaused()` là `true`, `setVisible(true)` không gọi `play`.
  - `it("saves the choice")`: `setPaused(true)` → `setItem(PAUSED_STORAGE_KEY, "1")`; `setPaused(false)` → `"0"`.
  - `it("keeps working when the storage throws")`: `getItem`, `setItem` ném lỗi → không ném ra ngoài, `isPaused()` theo lần `setPaused` cuối.
  - `it("works without storage")`: `createLoopController(null)`.
  - `it("a removed loop is not played again")`: `remove()` rồi `setPaused(false)` → không `play`.
  - `it("tells subscribers")`: listener nhận `true` rồi `false`; hàm huỷ trả về làm listener ngừng nhận.
- [ ] **Step 2: Run** `cd web && npx vitest run src/lib/motion/loops.test.ts` — Expected: FAIL (không có module).
- [ ] **Step 3: Viết `loops.ts`.**
- [ ] **Step 4: Run lại** — Expected: PASS.
- [ ] **Step 5: Test `HomeMotion` gọi hàm dọn của setup**
  Trong `HomeMotion.test.tsx`: setup giả trả về `vi.fn()`; khi `matchMedia` bị revert (unmount, hoặc đổi sang reduced motion) → hàm đó được gọi đúng 1 lần.
- [ ] **Step 6: Run, thấy FAIL; sửa `MotionSetup` và `HomeMotion`; run lại, PASS.**
- [ ] **Step 7: Test `MotionPauseButton`**
  `it("shows the pause label and aria-pressed=false")`; `it("toggles the controller and the label on click")` (dùng `createLoopController(null)` truyền qua prop tuỳ chọn `controller?: LoopController`, mặc định `getLoopController()`); `it("shows resume when the controller starts paused")`; `it("has the hidden class until motion is on")`.
- [ ] **Step 8: Run FAIL → viết component + dictionary → Run PASS** (`npx vitest run src/components/motion`).
- [ ] **Step 9: Run** `npm test && npm run typecheck && npm run lint` — Expected: PASS.
- [ ] **Step 10: Commit** `feat(web): add a shared loop controller and a pause button`

---

### Task 3: Hình nền Hero (tĩnh)

**Files:**
- Create: `web/src/components/home/HeroScene.tsx`, `web/src/components/home/HeroScene.test.tsx`
- Modify: `web/src/components/home/Hero.tsx`, `web/src/components/home/Hero.test.tsx`
- Delete: `web/src/components/brand/FieldBackdrop.tsx` (chỉ Hero dùng)

**Interfaces:**
- Consumes: `BRAND`, `ILLUSTRATION_ONLY_COLORS` (Task 1); `MotionPauseButton` (Task 2).
- Produces (các hook cho Task 4, mọi phần tử nằm trong `[data-hero-scene]`):
  - `HeroSky()` — dải mây toàn chiều rộng ở nửa trên; 3 SVG mây, mỗi cái `data-hero-cloud`, đặt bằng `left` theo phần trăm `HERO_CLOUD_STARTS = [0.08, 0.42, 0.74]`, mây 2 nhỏ hơn.
  - `HeroSun()` — SVG đặt sau mascot (trong cột mascot, góc trên bên phải của nó); nhóm tia `data-hero-sun-rays`, thân `data-hero-sun`.
  - `HeroField()` — SVG đáy (`viewBox="0 0 1440 260"`, `preserveAspectRatio="xMidYMax slice"`): luỹ tre + mái nhà (Nâu áo, `opacity` 0.35), 2–3 lớp ruộng (Vàng rơm, Vàng lúa), 20–24 cây lúa chia đúng 5 nhóm `data-hero-gust`, theo thứ tự trái sang phải.
  - `export const HERO_CLOUD_STARTS: readonly number[]`, `export const HERO_GUST_COUNT = 5`.
- Bố cục Hero: `<section data-hero-scene>` có nền `bg-linear-to-b from-sky via-sky-light to-rice` (đổi màu ở khoảng 0% / 55% / 80%); `HeroSky` và `HeroField` là lớp `absolute` phía sau nội dung (`pointer-events-none`); `MotionPauseButton` ở góc dưới phải của Hero (trên ruộng, `z-10`). Giữ `h1` là phần tử lớn nhất trong khung đầu (LCP là chữ).

- [ ] **Step 1: Viết test `HeroScene.test.tsx`**
  - `it("has 3 clouds, a sun with rays and 5 gust groups")` (đếm theo các `data-*` ở trên).
  - `it("is decorative")`: mọi `svg` có `aria-hidden="true"` và `focusable="false"`.
  - `it("uses only palette colors")`: mọi giá trị `fill`, `stroke`, `stop-color` (bỏ `none`, `url(...)`) thuộc `ILLUSTRATION_PALETTE`.
  - `it("fits the 12 KB gzip budget")`: `gzipSync(renderToStaticMarkup(<><HeroSky/><HeroSun/><HeroField/></>)).length <= 12 * 1024`.
- [ ] **Step 2: Run** `npx vitest run src/components/home/HeroScene.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Vẽ `HeroScene.tsx`** theo storyboard (khung Hero) và spec mục 2. Mây: Trắng gạo, viền Nâu đất 2 px. Mặt trời: Vàng lúa viền Nâu đất, tia Vàng rơm.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Sửa `Hero.test.tsx`**: Hero có `[data-hero-scene]`, có nút dừng, không còn `FieldBackdrop`; nút Zalo và "Xem hành trình" như cũ.
- [ ] **Step 6: Sửa `Hero.tsx`, xoá `FieldBackdrop.tsx`. Run** `npm test && npm run typecheck && npm run lint` — Expected: PASS.
- [ ] **Step 7: Xem bằng mắt**: `npm run dev`, mở `/vi` ở 375 px và 1280 px. Kiểm tra: chữ đọc rõ trên trời; mặt trời nằm sau mascot ở cả hai cỡ; ruộng không che nút. Chạy contrast check của antislop cho `#4A2C1A` trên `#CFE4EE` (mong đợi ≥ 4,5 : 1).
- [ ] **Step 8: Commit** `feat(web): draw the hero sky, sun and rice field`

---

### Task 4: Vòng lặp Hero

**Files:**
- Create: `web/src/lib/motion/hero-scene.ts`, `web/src/lib/motion/hero-scene.test.ts`
- Modify: `web/src/components/motion/HomeMotion.tsx` (`HOME_SETUPS` = `[setupReveals, setupMascot, setupHeroScene, setupJourney]`), `web/e2e/motion.spec.ts`

**Interfaces:**
- Consumes: hook `data-hero-*`, `HERO_CLOUD_STARTS`, `HERO_GUST_COUNT` (Task 3); `getLoopController` (Task 2); `MASCOT_PIVOTS.rice`.
- Produces:
  ```ts
  export const HERO_CYCLE_S = 60;
  export const CLOUD_LAPS = [1, 2, 1] as const;   // số vòng mỗi đám trong 60 s
  export const GUST_SWINGS = 15;                    // số nhịp lắc trong 60 s (chu kỳ 4 s)
  export const GUST_MAX_DEG = 4;
  export const GUST_PHASE_STEP = 0.12;              // nhóm bên phải trễ hơn nhóm bên trái, tính theo phần của một nhịp
  export const SUN_BOBS = 6;                        // số lần nhấp nhô trong 60 s
  export const SUN_BOB_PX = 4;
  export const MASCOT_RICE_SKEW_DEG = 2;
  export type HeroFrame = { rays: number; sunY: number; clouds: number[]; gusts: number[]; mascotRiceSkew: number };
  /** t = phần đã qua của chu kỳ, 0 ≤ t ≤ 1. clouds[i] là độ dời theo phần (−1..1) so với chỗ đứng tĩnh. */
  export function heroFrame(t: number, starts: readonly number[], gustCount: number): HeroFrame;
  export function cloudOffset(t: number, start: number, laps: number): number;
  export const setupHeroScene: MotionSetup;
  ```
- Thuật toán (cần ghi rõ vì test không tự quyết định được):
  - `rays = 360 * t`; `sunY = SUN_BOB_PX * sin(2π · SUN_BOBS · t)`.
  - `cloudOffset = wrap01(start + laps · t) − start`, với `wrap01(x) = x − floor(x)`. Độ dời px = `cloudOffset · (W + w)`, `W` = chiều rộng dải mây, `w` = chiều rộng đám mây; đọc lại khi `ScrollTrigger` refresh. Mây nhảy từ mép phải về mép trái đúng lúc nó nằm ngoài khung (cả hai phía).
  - `gusts[i] = GUST_MAX_DEG · sin(2π · (GUST_SWINGS · t − i · GUST_PHASE_STEP))`, quay quanh gốc nhóm (`transformOrigin: "50% 100%"`).
  - `mascotRiceSkew = MASCOT_RICE_SKEW_DEG · sin(2π · (GUST_SWINGS · t − GUST_PHASE_STEP · (gustCount − 1) / 2))`, đặt bằng `skewX` trên `#rice` của mascot với `svgOrigin` = `MASCOT_PIVOTS.rice`. Dùng `skewX`, không dùng `rotation`, để không tranh với `setupMascot` (đang điều khiển `rotation` của `#rice` theo tốc độ cuộn).
  - Một tween điều khiển tất cả: `gsap.to(proxy, { t: 1, duration: HERO_CYCLE_S, ease: "none", repeat: -1, paused: true, onUpdate })`; `onUpdate` dùng `gsap.quickSetter` để đặt giá trị của `heroFrame(proxy.t)`.
  - Vòng lặp đăng ký vào `getLoopController()`; `ScrollTrigger.create({ trigger: section, start: "top bottom", end: "bottom top", onToggle: (self) => entry.setVisible(self.isActive) })`. Hàm dọn trả về gọi `entry.remove()`.

- [ ] **Step 1: Viết test hàm thuần**
  - `it("is the same frame at the start and the end of the cycle")`: `heroFrame(0, …)` và `heroFrame(1, …)` bằng nhau (sai số 1e-9; `rays` so theo `% 360`).
  - `it("keeps every cloud at its static place at t = 0")`: mọi `clouds[i] === 0`.
  - `it("moves each cloud a whole number of laps")`: `cloudOffset(1, s, L) ≈ 0` với `L` trong `CLOUD_LAPS`.
  - `it("jumps a cloud only when it is off screen")`: quét `t` theo bước 1/6000; mỗi khi `cloudOffset` giảm (nhảy), vị trí trước nhảy `start + offset` ≥ 0.999 và sau nhảy ≤ 0.001.
  - `it("keeps every gust within the maximum angle")` và `it("lets the wind move from left to right")`: tại `t` mà `gusts[0]` đạt đỉnh, `gusts[1]` chưa đạt đỉnh (đỉnh của nhóm 1 đến sau).
  - `it("periods divide the cycle")`: `Number.isInteger` cho `GUST_SWINGS`, `SUN_BOBS`, mọi `CLOUD_LAPS`.
- [ ] **Step 2: Run** `npx vitest run src/lib/motion/hero-scene.test.ts` — Expected: FAIL.
- [ ] **Step 3: Viết `heroFrame`, `cloudOffset`.** Run — Expected: PASS phần hàm thuần.
- [ ] **Step 4: Test `setupHeroScene` với GSAP giả** (cùng kiểu `fakeModules()` trong `mascot.test.ts`):
  `it("does nothing without [data-hero-scene]")`; `it("registers one paused loop and plays it when the hero is visible")` (gọi `onToggle({ isActive: true })` → tween `play`); `it("stays paused when the controller is paused")`; `it("removes the loop on cleanup")`; `it("skews, not rotates, the mascot rice")` (quickSetter được tạo cho `skewX` trên `#rice`).
- [ ] **Step 5: Run FAIL → viết `setupHeroScene` → Run PASS.**
- [ ] **Step 6: Thêm vào `HOME_SETUPS`.**
- [ ] **Step 7: Test đầu-cuối trong `web/e2e/motion.spec.ts`**
  - `test("the hero clouds move and the pause button stops them")`: đợi `html[data-motion='on']`; đọc `transform` của `[data-hero-cloud]` thứ nhất, đợi 1 s, khác giá trị cũ; bấm nút dừng; đọc, đợi 1 s, bằng giá trị cũ; `aria-pressed="true"`.
  - `test("the paused choice survives a reload")`: sau reload, mây đứng yên, nút hiện "Chạy lại chuyển động".
  - `test("reduced motion hides the pause button")`: `page.emulateMedia({ reducedMotion: "reduce" })` → nút không hiện, mây không có `transform`.
- [ ] **Step 8: Run** `cd web && npm run test:e2e -- motion.spec.ts` — Expected: PASS.
- [ ] **Step 9: Commit** `feat(web): loop the hero sky, sun and rice in one 60 s cycle`

---

### Task 5: Hình túi gạo (tĩnh)

**Files:**
- Create: `web/src/components/home/ProductBag.tsx`, `web/src/components/home/ProductBag.test.tsx`
- Modify: `web/src/components/home/ProductSection.tsx` (+ test), `web/src/app/[lang]/page.tsx` (truyền `showBag` cho sản phẩm đầu), `web/src/lib/i18n/dictionaries.ts`

**Interfaces:**
- Produces: `ProductBag({ dict }: { dict: Dictionary })` — `<figure data-product-bag>` gồm một SVG (`viewBox="0 0 400 300"`) và `<ul>` 3 chú thích HTML `data-bag-note`. Các nhóm trong SVG dùng `data-bag`: `"puffy"` (túi phồng, mặc định `opacity` 0 trong khung cuối), `"brick"` (khối vuông), `"grains"` (khoảng 10 hạt rơi, mặc định ẩn), `"wrinkles"`, `"air"` (vệt khí, mặc định ẩn), `"seal"`, `"label"`, `"tray"` (nong).
  Khung tĩnh = trạng thái cuối (khối vuông, có nhãn, không có hạt rơi, không có vệt khí).
- Nhãn: khung Xanh mạ `#6E8B3D`; hình nhỏ trời Xanh trời + ruộng Vàng lúa; chữ `GẠO NẾP CÁI HOA VÀNG` và `DUY TÂN` (Trắng gạo, Quicksand 700, chữ trong SVG giữ nguyên ở bản en vì là chữ in trên bao bì); huy hiệu tròn `2KG` (Vàng lúa, chữ Nâu đất). Không hotline, logo hiệp hội, mã QR.
- `ProductSection` nhận thêm `showBag: boolean`; khi `true`, `ProductBag` nằm trong cột phải ngay trên khối "Đặc điểm"; điện thoại rộng khoảng 60% (`w-3/5 mx-auto md:w-full`).
- Dictionary `bag` (3 chú thích; SVG không cần chữ thay thế vì là trang trí): `["Túi trong — nhìn rõ từng hạt gạo", "Hút chân không — gạo giữ khô và thơm lâu", "Khối vuông — dễ cất, dễ làm quà"]`; en `["Clear bag — you can see every grain", "Vacuum packed — the rice stays dry and fragrant for longer", "A firm square block — easy to store and to give"]`. Vì `DeepStrings` chỉ hỗ trợ chuỗi lồng nhau, dùng khoá `note1`, `note2`, `note3` thay vì mảng.

- [ ] **Step 1: Viết test `ProductBag.test.tsx`**: có đủ 8 nhóm `data-bag`; 3 `data-bag-note` theo đúng thứ tự vi; bản en đúng chữ en; SVG `aria-hidden`; màu thuộc `ILLUSTRATION_PALETTE`; chữ SVG không chứa chuỗi số điện thoại (regex `/\d{4}[.\s]?\d{3}[.\s]?\d{3}/` không khớp); gzip ≤ 6 KB.
- [ ] **Step 2: Run FAIL → vẽ `ProductBag.tsx` theo storyboard (khung "Cuối chuyển động") → Run PASS.**
- [ ] **Step 3: Test `ProductSection`**: `showBag` true → có `[data-product-bag]` trước tiêu đề "Đặc điểm"; false → không có. Test trang: chỉ sản phẩm đầu có túi.
- [ ] **Step 4: Run FAIL → sửa → Run** `npm test && npm run typecheck && npm run lint` — PASS.
- [ ] **Step 5: Xem bằng mắt** ở 375 px và 1280 px (`npm run dev`).
- [ ] **Step 6: Commit** `feat(web): show a drawing of the vacuum-packed bag next to the product features`

---

### Task 6: Chuyển động túi gạo

**Files:**
- Create: `web/src/lib/motion/product-bag.ts`, `web/src/lib/motion/product-bag.test.ts`
- Modify: `web/src/components/motion/HomeMotion.tsx` (thêm `setupProductBag` sau `setupReveals`), `web/e2e/motion.spec.ts`

**Interfaces:**
- Consumes: hook `data-bag`, `data-bag-note` (Task 5).
- Produces:
  ```ts
  /** Builds the paused bag timeline inside `root` (a ProductBag figure or the scene 6 svg). Returns null when a part is missing. */
  export function buildBagTimeline(gsap: GsapModules["gsap"], root: Element): gsap.core.Timeline | null;
  export const BAG_DURATION_S = 2.5;
  export const setupProductBag: MotionSetup;
  ```
- Thứ tự (vị trí trên timeline, giây): hạt rơi 0–0,9 (`y` từ −120, `stagger` 0,06, `ease: "power2.in"`); co khối 0,9–1,5 (`puffy` mờ đi, `brick` từ `scaleX` 1,04 / `scaleY` 1,08 về 1; `wrinkles` hiện; `air` bay lên và mờ); đường hàn 1,5–1,7 (`seal` `scaleX` 0→1, gốc bên trái); nhãn 1,7–2,0 (`label` `rotation` −4→0, `scale` 0,9→1, `back.out(2)`); chú thích 2,0–2,5 (`data-bag-note` `opacity` 0→1, `y` 8→0, `stagger` 0,15; chỉ khi có trong `root`).
- `setupProductBag`: chỉ ẩn trước những phần tử dưới mép màn hình (dùng `shouldHideElement` của `reveal.ts`, giống `setupReveals`); nếu hình đã ở trong hoặc trên khung nhìn thì để nguyên khung cuối. `ScrollTrigger.create({ trigger, start: "clamp(top 75%)", once: true, onEnter: () => tl.play() })`.

- [ ] **Step 1: Viết test**: `buildBagTimeline` trả `null` khi thiếu nhóm; tổng thời gian = `BAG_DURATION_S` (±0,01); timeline đặt `scaleX`/`scaleY`/`rotation`/`opacity`/`y` mà không đặt thuộc tính khác (kiểm tra các `vars` truyền vào fake `to`/`fromTo`); `setupProductBag` không ẩn gì khi hình đang ở trong khung nhìn; có ẩn và chạy khi hình ở dưới.
- [ ] **Step 2: Run FAIL → viết → Run PASS.**
- [ ] **Step 3: E2E** `test("the bag animation ends in the static final frame")`: cuộn tới `[data-product-bag]`, đợi 3 s, `[data-bag='label']` có `transform` là `none` hoặc ma trận đơn vị, 3 chú thích `opacity` = 1. Với reduced motion: chú thích hiện ngay.
- [ ] **Step 4: Run** `npm run test:e2e -- motion.spec.ts` — PASS.
- [ ] **Step 5: Commit** `feat(web): animate the bag once when the product block scrolls into view`

---

### Task 7: Tư thế người (làm sau Task 9; chờ công cụ vẽ và chủ dự án duyệt)

Task này làm sau Task 9 (cần file giữ chỗ và script ghép) và độc lập với Task 10–11: các cảnh dùng tư thế giữ chỗ cho tới khi có bản đã duyệt. **Bị chặn** cho tới khi có một trong hai: Nano Banana kết nối được (cần `GEMINI_API_KEY`), hoặc chủ dự án đăng nhập Recraft qua `/mcp`.

**Files:**
- Create: `brand/tools/vectorize-pose.py`
- Create/replace: `brand/story/people/me-cay.svg`, `nong-dan-cay.svg`, `me-trao-tui.svg`, `ba-lai-may.svg`, `ba-canh-lo.svg`, `anh2-be-bao.svg`
- Modify: `brand/README.md` (bảng file và lệnh chạy)

**Interfaces:**
- Produces: mỗi file tư thế là `<svg viewBox="0 0 256 256">` có đúng một nhóm gốc `<g data-part="person">`, chân người chạm đáy khung (để script ghép đặt đúng mặt đất). Màu chỉ trong `ILLUSTRATION_PALETTE`.
- `vectorize-pose.py SOURCE.png OUT.svg`: dùng lại các bước của `vectorize-mascot.py` (phân loại màu theo CIE Lab, làm mượt 3 × 3, trace bằng vtracer 0.6.15, ép màu về bảng màu) nhưng **không** có các vùng đo tay riêng của mascot và không tách lớp; nhập các hàm bằng `importlib` (tên file có dấu gạch). Bỏ nền (pixel gần Trắng gạo nối với viền ảnh thành trong suốt).

- [ ] **Step 1: Mô tả cho chủ dự án và tạo ảnh** cho từng tư thế (mẹ theo mascot đã duyệt; ba: cao gầy, tóc bạc, mũ lưỡi trai, áo xanh — hỏi lại xanh lá hay xanh dương; anh 2: mặt tròn giống mẹ, tóc đen ngắn, áo thun Nâu áo; nông dân: nón lá, áo Vàng rơm, không giống ai cụ thể). Phong cách: hoạt hình phẳng, viền Nâu đất, giống mascot. Chủ dự án duyệt ảnh. Ảnh gốc giữ ngoài repo.
- [ ] **Step 2: Viết `vectorize-pose.py`, chạy cho từng ảnh đã duyệt, ghi đè file giữ chỗ cùng tên, rồi** `cd web && npm run story:build`. Định dạng, bảng màu và ngân sách của tư thế do `composeScene` và test của Task 8 kiểm tra, nên không cần test mới.
- [ ] **Step 3: Run** `cd web && npm test` — Expected: PASS (nếu một tư thế vượt 12 KB: giảm số màu hoặc tăng ngưỡng làm mượt rồi trace lại).
- [ ] **Step 4: Chạy lại** `cd brand/tools && npm test` để chắc không hỏng công cụ cũ — PASS.
- [ ] **Step 5: Chủ dự án duyệt từng tư thế trong cảnh** (chụp màn hình 8 cảnh ở 375 px và 1280 px).
- [ ] **Step 6: Commit** `feat(brand): trace the six poses for the story`

---

### Task 8: Script ghép cảnh và danh sách cảnh

**Files:**
- Create: `web/scripts/story-scenes.mjs`, `web/scripts/build-story.mjs`, `web/scripts/story-scenes.test.ts` (đặt trong `web/src/lib/story/` nếu Vitest chỉ quét `src/`), `web/src/lib/story/scenes.ts`
- Modify: `web/package.json` (script `"story:build": "node scripts/build-story.mjs"`)

**Interfaces:**
- Định dạng nguồn: `brand/story/scenes/<slug>.svg` là nền và đồ vật của cảnh (`viewBox="0 0 800 600"`). Chỗ đặt người là phần tử `<use data-person="<pose>" x y width height/>`; script thay bằng nội dung của `brand/story/people/<pose>.svg` (nhóm `data-part="person"` được bọc trong `<g data-part="<giá trị data-slot>" transform="translate(x y) scale(width/256)">`). Phần dùng chung (máy hút chân không, túi) nằm trong `brand/story/parts/<name>.svg`, chèn bằng `<use data-include="<name>" x y/>`.
- Produces (`story-scenes.mjs`):
  ```js
  /** @returns {string} the finished scene svg */
  export function composeScene({ slug, sceneSvg, people, parts }); // people/parts: Record<name, svgText>
  export const SCENE_SLUGS = ["cay-ma", "nang-mua-gio", "gat", "say", "xay-xat", "dong-goi", "den-tay-khach", "mam-com"];
  export const SCENE_BUDGET_BYTES = 18 * 1024;
  export const STORY_BUDGET_BYTES = 140 * 1024;
  ```
  `composeScene` làm: (1) ném lỗi nếu nguồn có markup không an toàn (cùng danh sách `UNSAFE_MARKUP` trong `brand-modules.mjs` — tách danh sách đó ra `web/scripts/svg-safety.mjs` và dùng ở cả hai nơi); (2) thay `data-person`, `data-include`; ném lỗi nếu tên không có, hoặc nếu tư thế không có `viewBox="0 0 256 256"` hay không có đúng một `data-part="person"`; (3) thêm tiền tố `<slug>-` cho mọi `id` và mọi tham chiếu `url(#…)`, `href="#…"`; (4) đặt `data-scene="<slug>"`, `aria-hidden="true"`, `focusable="false"`, `width="800" height="600"` trên thẻ `<svg>` gốc; (5) bỏ khoảng trắng giữa thẻ.
- `build-story.mjs`: đọc `brand/story/**`, ghi `web/public/story/canh-<n>-<slug>.svg` (n = 1..8 theo `SCENE_SLUGS`).
- Produces (`web/src/lib/story/scenes.ts`):
  ```ts
  export type SceneSlug = "cay-ma" | "nang-mua-gio" | "gat" | "say" | "xay-xat" | "dong-goi" | "den-tay-khach" | "mam-com";
  export type StoryScene = { slug: SceneSlug; src: string; width: 800; height: 600 };
  export const STORY_SCENES: readonly StoryScene[]; // 8 phần tử, đúng thứ tự, src = "/story/canh-<n>-<slug>.svg"
  ```

- [ ] **Step 1: Viết test với nguồn nhỏ tự tạo**: thay `data-person` đúng vị trí và tỉ lệ; thêm tiền tố cho `id` và `url(#…)`; ném lỗi với `<script>`, `onload=`, `href="https://…"`, `<foreignObject>`; ném lỗi khi thiếu tư thế; thẻ gốc có `data-scene`, `aria-hidden`, `width`, `height`.
- [ ] **Step 2: Viết test đồng bộ**: với mỗi slug, `composeScene(nguồn thật)` bằng đúng nội dung file trong `web/public/story/` (giống `brand-sync.test.ts`); mỗi file gzip ≤ `SCENE_BUDGET_BYTES`; tổng ≤ `STORY_BUDGET_BYTES`; mỗi file trong `brand/story/people/` gzip ≤ 12 KB; màu thuộc `ILLUSTRATION_PALETTE`; `STORY_SCENES` khớp `SCENE_SLUGS` và tên file. (Test đồng bộ dùng `it.skipIf` khi `brand/story/scenes/` chưa có, và bật ở Task 9.)
- [ ] **Step 3: Run FAIL → viết `svg-safety.mjs`, `story-scenes.mjs`, `build-story.mjs`, `scenes.ts`; sửa `brand-modules.mjs` dùng `svg-safety.mjs` → Run PASS** (`npm test`, `brand-sync.test.ts` vẫn PASS).
- [ ] **Step 4: Commit** `feat(web): add the story scene composer`

---

### Task 9: Vẽ 8 cảnh (cảnh vật, máy, đồ vật) và tư thế giữ chỗ

**Files:**
- Create: `brand/story/scenes/<slug>.svg` (8 file), `brand/story/parts/vacuum-machine.svg`, `brand/story/parts/bag.svg`
- Create: `brand/story/people/<pose>.svg` (6 file giữ chỗ, vẽ bằng code: đầu tròn, nón / mũ, thân; đúng định dạng Task 7)
- Generate: `web/public/story/*.svg` (`npm run story:build`)

**Interfaces:**
- Consumes: định dạng nguồn Task 8.
- Produces: các nhóm `data-part` sau, đúng tên (Task 11 dựa vào bảng này; test ở Step 2 kiểm tra):

| Cảnh | `data-part` (chạy một lần) | `data-part` (vòng lặp) |
|---|---|---|
| `cay-ma` | `mother` (slot `me-cay`), `farmer` (2, slot `nong-dan-cay`; người thứ hai lật ngang bằng `scale(-1 1)` trong nguồn), `seedling` (nhiều, theo hàng, gốc ở đáy) | `ripple` (nhiều) |
| `nang-mua-gio` | `sun`, `cloud`, `wind`, `rice` (gốc ở đáy), `rice-green` (trong nguồn có `opacity="0"`), `rice-gold` (hiện) | `rain` (nhiều giọt), `rice-sway` |
| `gat` | `harvester`, `crop` (nhiều cây trước máy), `sack`, `driver` (slot `ba-lai-may`, nằm trong `harvester`), `brother` (slot `anh2-be-bao`) | `reel` |
| `say` | `air` (nhiều mũi tên: quạt → lò → gầm → lên qua lưới và lớp thóc), `paddy`, `father` (slot `ba-canh-lo`) | `fan-blades`, `coals` |
| `xay-xat` | `brother` (slot `anh2-be-bao`), `pour-sack`, `husk` (nhiều), `rice-flow` | `elevator-grain` (nhiều) |
| `dong-goi` | `mother` (slot `me-trao-tui`), `lid`, `stack-bag` (nhiều) và các nhóm `data-bag` của part `bag` (Task 5) | — |
| `den-tay-khach` | `truck`, `shelf-bag` (nhiều), `mother` (slot `me-trao-tui`), `customer`, `handover-bag`, `gift` | `wheel` (nhiều, quay khi xe chạy) |
| `mam-com` | `dish` (4: xôi, bánh chưng, chè, rượu nếp, theo thứ tự này) | `steam` (nhiều) |

  Khung tĩnh của mọi cảnh là **khung cuối** (mạ đã cấy, lúa đã vàng, túi đã đóng…), vì đó là hình hiện khi không có chuyển động.
- Máy theo ảnh xưởng và spec mục 4.1 (tháp gầu tải Xanh mạ, máy bóc vỏ Nâu áo, máy đỏ Hồng má; máy hút chân không Vàng rơm / Trắng gạo). Máy sấy đúng phác thảo của chủ dự án (spec mục 1). Một đoạn đường đất ở mép dưới mỗi cảnh, hai đầu khớp nhau giữa các cảnh (cùng độ cao `y` 560 tại `x` 0 và 800).

- [ ] **Step 1: Vẽ cảnh `cay-ma`, `nang-mua-gio`, `gat`, `say`** (bám storyboard), tạo 6 tư thế giữ chỗ, `npm run story:build`.
- [ ] **Step 2: Viết test `web/src/lib/story/scene-parts.test.ts`**: đọc từng file trong `web/public/story/`, parse bằng `DOMParser` (jsdom), kiểm tra mỗi `data-part` trong bảng trên có ít nhất 1 phần tử (và `dish` đúng 4). Bật test đồng bộ của Task 8.
- [ ] **Step 3: Run** — FAIL cho 4 cảnh chưa vẽ.
- [ ] **Step 4: Vẽ `xay-xat`, `dong-goi`, `den-tay-khach`, `mam-com`, `npm run story:build`. Run** `npm test` — PASS (gồm ngân sách và bảng màu).
- [ ] **Step 5: Chủ dự án xem** 8 cảnh tĩnh (gửi ảnh chụp, hoặc mở storyboard mới). Sửa theo góp ý.
- [ ] **Step 6: Commit** `feat(brand): draw the eight story scenes`

---

### Task 10: Khối "Từ hạt lúa tới người dùng" (tĩnh)

**Files:**
- Create: `web/src/components/home/RiceStory.tsx`, `web/src/components/home/RiceStory.test.tsx`
- Modify: `web/src/app/[lang]/page.tsx` (đặt sau khối Sản phẩm, trước Hành trình; luôn hiện), `web/src/lib/i18n/dictionaries.ts`, `web/e2e/a11y.spec.ts` (nếu cần thêm điểm cuộn)

**Interfaces:**
- Consumes: `STORY_SCENES` (Task 8); `zaloHref` (`@/lib/format`).
- Produces: `RiceStory({ dict, zalo }: { dict: Dictionary; zalo: string | null })`:
  ```html
  <section aria-labelledby="tu-hat-lua" data-rice-story>
    <h2 id="tu-hat-lua">…</h2>            <!-- SectionHeading -->
    <a href="#sau-cau-chuyen" data-story-skip class="sr-only focus:not-sr-only">Bỏ qua câu chuyện</a>
    <ol data-story-progress aria-hidden="true" class="hidden">  <!-- 8 hạt, chỉ hiện trên máy tính khi chuyển động bật -->
    <div data-story-viewport>              <!-- phần được ghim -->
      <ol data-story-track>
        <li data-story-scene="<slug>"> <img src width=800 height=600 loading="lazy" decoding="async" alt="" class="aspect-[4/3] w-full">
            <h3>…</h3><p>…</p> </li> × 8
      </ol>
    </div>
    <p> <a href={zaloHref(zalo)}>Liên hệ qua Zalo</a> </p>   <!-- chỉ khi zalo !== null, nằm trong li cuối -->
    <div id="sau-cau-chuyen" tabindex="-1"></div>
  </section>
  ```
  CSS mặc định: danh sách dọc. Chỉ khi `html[data-motion='on']` và `min-width: 1024px`: `data-story-viewport` cao `100svh`, ẩn phần tràn; `data-story-track` là hàng ngang `w-max`; mỗi `li` rộng `min(80vw, 56rem)`; `data-story-progress` hiện.
- Dictionary `story`: `title`, `skip`, và cho mỗi slug `<slug>Title`, `<slug>Text` (vi / en). Câu chữ vi:
  - cay-ma: "Cấy mạ" — "Mẹ cùng bà con trong xóm cấy từng khóm mạ nếp cái hoa vàng xuống ruộng nước."
  - nang-mua-gio: "Nắng, mưa, gió" — "Lúa lớn lên qua nắng, mưa và gió của xứ Đông, từ xanh mạ đến vàng óng."
  - gat: "Gặt lúa" — "Ba lái máy gặt, anh 2 đỡ từng bao thóc mới."
  - say: "Sấy thóc tại nhà" — "Quạt thổi hơi nóng từ lò than vào gầm, hơi nóng đi lên qua lưới sắt và làm khô lớp thóc."
  - xay-xat: "Xay xát" — "Anh 2 đổ thóc vào máy; vỏ trấu bay ra, hạt gạo trắng chảy xuống."
  - dong-goi: "Đóng gói" — "Mẹ hút chân không từng túi 2 kg cho gạo giữ khô và thơm."
  - den-tay-khach: "Đến tay khách" — "Xe của nhà phân phối chở gạo tới siêu thị; khách cũng tới tận nhà lấy gạo, làm quà."
  - mam-com: "Mâm cơm" — "Xôi, bánh chưng, chè, rượu nếp: nếp nhà lên mâm cơm của mọi nhà."
  Bản en dịch sát nghĩa, câu ngắn. Chủ dự án đọc lại câu chữ ở bước review PR.

- [ ] **Step 1: Viết test**: 8 `li` đúng thứ tự `STORY_SCENES`; mỗi `img` có `width`, `height`, `loading="lazy"`, `alt=""`; tiêu đề và câu đúng bản vi và en; link bỏ qua trỏ tới `#sau-cau-chuyen` và phần tử đó tồn tại; nút Zalo có khi `zalo` có, không có khi `null`; `h2#tu-hat-lua` tồn tại.
- [ ] **Step 2: Run FAIL → viết → Run PASS. Thêm vào trang; test trang: khối nằm sau Sản phẩm, trước Hành trình.**
- [ ] **Step 3: Run** `npm test && npm run typecheck && npm run lint && npm run test:e2e -- a11y.spec.ts` — PASS (axe không báo lỗi).
- [ ] **Step 4: Commit** `feat(web): add the rice-to-table story section`

---

### Task 11: Chuyển động câu chuyện

**Files:**
- Create: `web/src/lib/motion/story/inline-svg.ts`, `web/src/lib/motion/story/scene-motions.ts`, `web/src/lib/motion/story/rice-story.ts` (+ test mỗi file)
- Modify: `web/src/components/motion/HomeMotion.tsx` (thêm `setupRiceStory` vào `HOME_SETUPS` trước `setupJourney`; sau khi mọi setup chạy, gọi `modules.ScrollTrigger.sort()` trước `modules.ScrollTrigger.refresh()`, để các trigger được tính lại theo thứ tự trên trang và các trigger nằm dưới khối ghim thấy phần đệm của nó), `web/e2e/motion.spec.ts`

**Interfaces:**
- Consumes: bảng `data-part` (Task 9), `buildBagTimeline` (Task 6), `getLoopController` (Task 2), hook HTML của `RiceStory` (Task 10), `assertSafe`-tương đương phía trình duyệt.
- Produces:
  ```ts
  // inline-svg.ts
  /** Replaces the <img> with the same file as inline svg. Returns null and keeps the <img> on any failure. */
  export async function inlineSvg(img: HTMLImageElement, fetcher?: typeof fetch): Promise<SVGSVGElement | null>;
  // scene-motions.ts
  export type SceneMotion = { intro: gsap.core.Timeline; loop: gsap.core.Timeline | null };
  export const SCENE_MOTIONS: Record<SceneSlug, (gsap: GsapModules["gsap"], svg: SVGSVGElement) => SceneMotion | null>;
  // rice-story.ts
  export const STORY_DESKTOP_QUERY = "(min-width: 1024px)";
  export const STORY_PIN_SCREENS = 5;
  export const STORY_LOAD_AHEAD = "top bottom+=100%"; // bắt đầu tải khi còn cách 1 màn hình
  export const setupRiceStory: MotionSetup;
  ```
- `inlineSvg`: `fetcher(img.currentSrc || img.src)`; nếu `!ok` → `null`. Parse bằng `DOMParser` (`image/svg+xml`); `null` nếu có `parsererror`, gốc không phải `svg`, hoặc có `script`, `foreignObject`, thuộc tính `on*`, `href` ra ngoài. `document.importNode`, chép `class` của `img`, giữ `aria-hidden`, thay `img`.
- `SCENE_MOTIONS[slug]`: timeline `intro` dài 1,5–2,5 s, `paused: true`, dùng `from`/`fromTo` để kết thúc đúng ở khung tĩnh (khung cuối); `loop` (nếu có) `repeat: -1`, `paused: true`. Trả `null` khi thiếu `data-part` bắt buộc. Cảnh `dong-goi` gọi `buildBagTimeline(gsap, svg)` rồi lồng vào `intro` (thêm `lid` đóng trước). Mọi tween chỉ đặt `x`, `y`, `scale*`, `rotation`, `opacity`.
- `setupRiceStory`: tìm `[data-rice-story]`; tạo `gsap.matchMedia()` riêng với `STORY_DESKTOP_QUERY` và phần còn lại; trả hàm dọn gọi `mm.revert()` và gỡ mọi `LoopEntry`.
  - **Tải:** `ScrollTrigger.create({ trigger: section, start: STORY_LOAD_AHEAD, once: true, onEnter })` → `inlineSvg` cho cả 8 ảnh (song song); cảnh nào `null` thì giữ ảnh tĩnh và bỏ qua chuyển động của cảnh đó.
  - **Dưới 1024 px:** mỗi cảnh `ScrollTrigger.create({ trigger: li, start: "clamp(top 75%)", once: true, onEnter: () => intro.play() })`; vòng lặp: `ScrollTrigger.create({ trigger: li, start: "top bottom", end: "bottom top", onToggle: (s) => entry.setVisible(s.isActive) })`. Cảnh đã nằm trên khung nhìn lúc setup (link `#…`, cuộn khôi phục) thì `intro.progress(1)` ngay, không ẩn gì.
  - **Từ 1024 px:** `const move = gsap.to(track, { x: () => -(track.scrollWidth - viewport.clientWidth), ease: "none", scrollTrigger: { trigger: viewport, pin: true, start: "top top", end: () => "+=" + STORY_PIN_SCREENS * innerHeight, scrub: 1, invalidateOnRefresh: true } })`. Mỗi cảnh: `ScrollTrigger.create({ trigger: li, containerAnimation: move, start: "left 70%", once: true, onEnter: () => intro.play() })`, vòng lặp theo `start: "left right", end: "right left"`; thanh tiến độ: `onToggle` của trigger `start: "left center", end: "right center"` đặt `data-active` cho hạt tương ứng.
  - Link bỏ qua: khi focus, nếu đang ghim thì cuộn tới `#sau-cau-chuyen` (hành vi mặc định của link là đủ; chỉ kiểm tra bằng e2e).

- [ ] **Step 1: Test `inline-svg.test.ts`**: thay `img` bằng `svg` khi file hợp lệ; giữ `img` khi `fetch` ném lỗi, khi `!ok`, khi XML hỏng, khi có `<script>` hoặc `onload=`; chép `class`.
- [ ] **Step 2: Run FAIL → viết → PASS.**
- [ ] **Step 3: Test `scene-motions.test.ts`** với SVG thật trong `web/public/story/` và GSAP thật (jsdom; `gsap` chạy được không cần trình duyệt): mỗi slug trả về `intro` có thời lượng 1,5–2,5 s; `intro.progress(1)` để mọi `data-part` có `opacity` 1 (trừ `rice-green`) và không có `transform` lệch so với nguồn; `loop` khác `null` đúng với các cảnh có cột vòng lặp trong bảng Task 9; trả `null` khi xoá một `data-part` bắt buộc.
- [ ] **Step 4: Run FAIL → viết `scene-motions.ts` → PASS.**
- [ ] **Step 5: Test `rice-story.test.ts`** với GSAP giả: không làm gì khi không có khối; tạo trigger tải với `STORY_LOAD_AHEAD`; nhánh điện thoại không `pin`; nhánh máy tính có `pin: true` và trigger con có `containerAnimation`; vòng lặp đăng ký và gỡ khi dọn; cảnh `inlineSvg` trả `null` không làm hỏng các cảnh khác.
- [ ] **Step 6: Run FAIL → viết `rice-story.ts`, thêm vào `HOME_SETUPS` → PASS.**
- [ ] **Step 7: E2E trong `motion.spec.ts`**
  - `test("phone: scenes stack, play once and keep their final frame")` (375 × 812): không có phần tử `pin-spacer`; cuộn qua khối; mỗi `li` có `svg[data-scene]`; sau 3 s, `[data-part='dish']` thứ 4 có `opacity` 1.
  - `test("desktop: the story pins and slides sideways")` (1280 × 800): khi cuộn vào khối, `transform` của `[data-story-track]` đổi theo cuộn; hạt tiến độ có `data-active` đổi; cuộn hết thì khối kế tiếp hiện.
  - `test("resizing from desktop to phone unpins the story")`: đặt 1280, cuộn vào giữa khối, đổi sang 375 → không còn `pin-spacer`, 8 cảnh xếp dọc, trang cuộn được tới chân trang.
  - `test("a broken scene file keeps the static image")`: `page.route("**/story/canh-4-say.svg", r => r.fulfill({ status: 500 }))` (chỉ cho request thứ hai, request `img` đầu vẫn thành công) → `li[data-story-scene='say'] img` còn; các cảnh khác có `svg`.
  - `test("the skip link jumps past the story")`: Tab tới link bỏ qua, Enter → `#sau-cau-chuyen` được focus và nằm trong khung nhìn.
  - `test("opening #hanh-trinh lands on the journey")`: mở `/vi#hanh-trinh` ở 1280 → `#hanh-trinh` nằm trong khung nhìn sau 2 s.
  - `test("reduced motion shows eight static images")`: không có `svg[data-scene]`, có 8 `img`.
  - `test("sections after the pinned story still reveal")` (1280): cuộn tới khối Báo chí → mọi `[data-reveal]` trong đó có `opacity` 1.
  - `test("the pause button also stops story loops")`: ở cảnh `say`, `transform` của `[data-part='fan-blades']` không đổi trong 1 s sau khi bấm dừng.
- [ ] **Step 8: Run** `npm run test:e2e` — PASS toàn bộ (gồm các test B2/B4 cũ).
- [ ] **Step 9: Commit** `feat(web): animate the story scenes, pinned sideways on desktop`

---

### Task 12: Kiểm tra cuối và tài liệu

**Files:**
- Modify: `docs/setup.md` (bảng Lighthouse), `docs/session/STATE.md`, file log phiên

- [ ] **Step 1: Lighthouse mobile** cho `/vi` và `/en` theo lệnh trong `docs/setup.md`. Expected: ≥ 94 ở cả ba mục; CLS = 0; LCP là `h1`. Ghi số đo thật vào `docs/setup.md`.
- [ ] **Step 2: Đo dung lượng thật**: tổng HTML `/vi` (gzip) trước và sau; ghi vào báo cáo PR.
- [ ] **Step 3: Antislop Delivery Gate** (PASS/FAIL có bằng chứng) và `taste-skill` `inspect.mjs` cho `/vi` ở 375 px và 1280 px; review theo `web-interface-guidelines`. Sửa mọi FAIL.
- [ ] **Step 4: Cập nhật `STATE.md` và log phiên; commit** `docs: record the illustration work and new Lighthouse numbers`.
- [ ] **Step 5: Hỏi chủ dự án trước khi push và mở PR** vào `main`.
