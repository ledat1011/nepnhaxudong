# Phần B4 — Hiệu ứng GSAP và mascot thật: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang chủ công khai dùng mascot, logo và favicon thật của phần A, và có chuyển động khi cuộn: mascot nghiêng theo tốc độ cuộn, cây lúa mọc dọc phần Hành trình, các khối trượt nhẹ lên khi vào màn hình. Không có chuyển động khi máy bật "giảm chuyển động".

**Architecture:** Một script sinh mã (`npm run brand:sync`) đọc SVG trong `brand/` và ghi ra các module TypeScript trong `web/` (web build không đọc `../brand`, vì build Docker ở phần D có thể chỉ có thư mục `web/`). Mọi chuyển động chạy trong một client component `HomeMotion` không render gì: nó chờ trình duyệt rảnh, rồi mới `import()` GSAP + ScrollTrigger, và đặt mọi tween trong `gsap.matchMedia()` với điều kiện `(prefers-reduced-motion: no-preference)`. Khi người dùng bật "giảm chuyển động", GSAP không được tải; nếu bật giữa chừng, `matchMedia` gỡ hết tween và mọi phần tử về trạng thái tĩnh. HTML do server render luôn là trạng thái cuối (mọi thứ hiện đủ); JavaScript chỉ ẩn những phần tử đang nằm dưới màn hình rồi cho chúng hiện lên khi cuộn tới.

**Tech Stack:** Next.js 16.4.4, React 19.3, TypeScript, Tailwind 4, GSAP **3.15.0** (gồm ScrollTrigger; miễn phí), Vitest 5 + Testing Library + jsdom, Playwright 1.64, Lighthouse 13.6.0.

**Spec:** `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md` — mục 2.3 (logo, bảng nhóm SVG tách lớp), mục 3.2 (Hero, Hành trình), mục 3.3 (hiệu ứng). Bộ nhận diện: `brand/README.md`. Plan web trước đó: `docs/superpowers/plans/2026-11-04-phan-b2-web-cong-khai.md`.

## Quyết định của chủ dự án (2026-11-04)

| # | Quyết định | Lý do |
|---|---|---|
| D1 | Bỏ hiệu ứng chớp mắt (nhóm `eyes` trong spec) | Mascot thật không có lớp mắt riêng; không sửa `brand/` |
| D2 | Bó lúa lắc cả bó (một nhóm `#rice`), không lắc lệch nhịp từng bông | Mascot thật gom cả bó vào một nhóm |
| D3 | Logo ở header / footer và favicon dùng `brand/logo/logo-icon.svg` | Thay đồ tạm của B2 bằng đồ thật trong cùng phần |
| D4 | Hero dùng mascot chi tiết `brand/mascot/mascot-layered.svg` (90 KB, khoảng 25 KB sau gzip), nhúng thẳng vào HTML | Phải có DOM của từng nhóm để GSAP xoay; `brand/README.md` chỉ định mascot chi tiết cho chỗ lớn |
| D5 | GSAP 3.15.0, không dùng 3.15.1 | 3.15.1 phát hành ngày viết plan; dùng bản đã có từ tháng 4/2026 |
| D6 | Không dùng `@gsap/react` | GSAP được `import()` muộn; dọn dẹp bằng `matchMedia().revert()` trong `useEffect` là đủ |

## Global Constraints

- Làm trong worktree `D:\workspaces\nepnhaxudong-b4`, nhánh `feat/phan-b4-gsap`. Không đụng `D:\workspaces\nepnhaxudong` (website local đang chạy ở đó), không đụng `D:\workspaces\nepnhaxudong-b3` (phần B3 đang làm song song), không dùng cổng 3000 / 8080 / 5433.
- Node ≥ 22; npm; `web/package-lock.json` được commit. Script chạy được trên Windows (Git Bash) và Linux.
- Next.js 16.4.x khác các bản cũ: khi không chắc một API, đọc `web/node_modules/next/dist/docs/` (xem `web/AGENTS.md`).
- Chỉ animate `transform` và `opacity` (spec mục 3.3).
- `prefers-reduced-motion: reduce` → tắt mọi chuyển động, mascot đứng yên (spec mục 3.3); GSAP không được tải.
- Không bao giờ ẩn một phần tử đang nằm trong màn hình hoặc phía trên màn hình lúc chuyển động khởi động. Chỉ phần tử có cạnh trên nằm dưới cạnh dưới màn hình mới được đặt về trạng thái ẩn ban đầu.
- Mọi điểm bắt đầu của ScrollTrigger dùng `clamp(...)`, để phần tử ở cuối trang vẫn hiện khi trang không cuộn thêm được.
- Hiệu ứng mascot (spec mục 2.3): đầu xoay quanh điểm `data-pivot` của `#head` (`278 257`), tối đa ±3°; bó lúa xoay quanh `data-pivot` của `#rice` (`302 356`), tối đa ±6°; `#body` và `#hands` đứng yên.
- Màu chỉ lấy từ `web/src/lib/brand/colors.ts`. Hai màu da `#F4CDA8` và tóc `#222222` chỉ có trong mascot (`brand/README.md`).
- Mục tiêu đo: Lighthouse mobile ≥ 90 cho Performance, Accessibility, SEO trên `/vi` và `/en`; LCP < 2,5 giây; CLS < 0,1.
- Không phạm vi: admin (B3), `api/`, ảnh Open Graph (`opengraph-image.tsx` giữ nguyên), logo đầy đủ `logo-full.svg`, `apple-icon`, sửa file trong `brand/`, chuyển động ở trang blog.
- Code, test, commit tiếng Anh; không dòng `Co-Authored-By`; LF. Không chép số hotline trên bao bì vào repo.

## Review Focus

1. Khách mở thẳng `/vi#bao-chi` hoặc bấm menu nhảy xuống giữa trang: các khối phía trên và trong màn hình không bị ẩn; các khối phía dưới vẫn hiện khi cuộn tới. (Test ở Task 2)
2. Khối cuối trang (Liên hệ) không bao giờ cuộn được tới mốc 85% của màn hình: vẫn phải hiện, không kẹt ở `opacity: 0`. (Test ở Task 2)
3. Người dùng đổi "giảm chuyển động" khi trang đang mở: bật lên thì mọi tween bị gỡ và mọi phần tử hiện đủ, mascot về 0°; tắt đi thì chuyển động bắt đầu mà không cần tải lại trang. (Test ở Task 2)
4. Đầu và bó lúa xoay sai tâm (CSS `transform-origin` có sẵn trong SVG đánh nhau với `svgOrigin` của GSAP): đầu trông như rơi khỏi cổ. Điểm pivot phải đứng yên trên màn hình khi nhóm đang xoay. (Test ở Task 3)
5. Cuộn rất nhanh (kéo thanh cuộn, phím End) hoặc tốc độ cuộn trả về `NaN` / vô cực: góc xoay không vượt ±3° / ±6°, và mascot về 0° sau khi ngừng cuộn. (Test ở Task 3)

---

## File Structure

```
web/
├── package.json, package-lock.json                     Task 1 (script brand:sync), Task 2 (gsap)
├── scripts/
│   ├── brand-modules.mjs        hàm thuần: SVG nguồn → nội dung các file sinh ra    Task 1
│   └── sync-brand.mjs           đọc ../brand, ghi file                               Task 1
├── src/app/icon.svg             bản sao byte-đúng của brand/logo/logo-icon.svg       Task 1
├── src/components/brand/
│   ├── generated/mascot.ts      SINH RA: viewBox, markup bên trong, pivot             Task 1
│   ├── generated/logo-icon.ts   SINH RA: viewBox, markup bên trong                    Task 1
│   ├── brand-sync.test.ts       file sinh ra khớp với brand/                          Task 1
│   ├── Mascot.tsx (+ test)      mascot thật                                           Task 1
│   └── LogoMark.tsx (+ test)    logo biểu tượng thật                                  Task 1
├── src/lib/brand/colors.ts      thêm MASCOT_ONLY_COLORS                               Task 1
├── src/lib/motion/
│   ├── load-gsap.ts             import() GSAP + ScrollTrigger, đăng ký một lần        Task 2
│   ├── reduced-motion.ts        hằng số query + hàm đọc                               Task 2
│   ├── reveal.ts (+ test)       shouldHideOnSetup, setupReveals                       Task 2
│   ├── mascot.ts (+ test)       tiltFor, setupMascot                                  Task 3
│   └── journey.ts               setupJourney                                          Task 4
├── src/components/motion/HomeMotion.tsx (+ test)                                      Task 2
├── src/components/home/RicePlant.tsx (+ test)   RiceLeaf, RiceEar                     Task 4
├── src/components/home/{Product,Press,Stories,Contact}Section.tsx, ui/SectionHeading.tsx   data-reveal, Task 2
├── src/components/home/JourneySection.tsx (+ test)                                    Task 4
├── src/app/[lang]/page.tsx      gắn <HomeMotion />                                    Task 2
└── e2e/motion.spec.ts           Task 2, 3, 4 thêm test
docs/setup.md, docs/session/STATE.md, docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md   Task 5
```

## Hợp đồng chung giữa các task

`HomeMotion` gọi lần lượt các hàm setup, mỗi hàm có cùng chữ ký và chạy bên trong callback của `gsap.matchMedia().add(...)` (nên mọi tween / ScrollTrigger tạo trong đó tự bị gỡ khi `revert()`):

```ts
// web/src/lib/motion/load-gsap.ts
export type GsapModules = { gsap: typeof import("gsap").gsap; ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger };
export type MotionSetup = (modules: GsapModules, root: Document) => void;
```

Task 2 tạo `HomeMotion` với danh sách `[setupReveals]`; Task 3 thêm `setupMascot`; Task 4 thêm `setupJourney`.

---

### Task 1: Mascot, logo và favicon thật

**Files:**
- Create: `web/scripts/brand-modules.mjs`, `web/scripts/sync-brand.mjs`, `web/src/components/brand/generated/mascot.ts`, `web/src/components/brand/generated/logo-icon.ts`, `web/src/components/brand/brand-sync.test.ts`, `web/src/components/brand/LogoMark.test.tsx`
- Modify: `web/package.json` (script), `web/src/app/icon.svg`, `web/src/components/brand/Mascot.tsx`, `web/src/components/brand/Mascot.test.tsx`, `web/src/components/brand/LogoMark.tsx`, `web/src/lib/brand/colors.ts`, `web/src/components/home/Hero.tsx` (chỉ nếu cần đổi kích thước)

**Interfaces:**
- Produces:
  - `buildBrandModules({ mascotSvg: string, logoIconSvg: string }): { mascotTs: string, logoIconTs: string }` trong `web/scripts/brand-modules.mjs`. Ném `Error` khi: thiếu một trong 4 nhóm `#head`, `#rice`, `#hands`, `#body`; thiếu `data-pivot` trên `#head` hoặc `#rice`; SVG có `<script`, thuộc tính `on…=`, `href`/`xlink:href` trỏ ra ngoài (`http:`, `https:`, `//`, `javascript:`), hoặc `<foreignObject`.
  - `web/src/components/brand/generated/mascot.ts` exports `MASCOT_VIEWBOX: string`, `MASCOT_INNER: string`, `MASCOT_PIVOTS: { head: { x: number; y: number }; rice: { x: number; y: number } }`.
  - `web/src/components/brand/generated/logo-icon.ts` exports `LOGO_ICON_VIEWBOX: string`, `LOGO_ICON_INNER: string`.
  - `<Mascot title className />` render `<svg data-mascot role="img">`, bên trong có `g#head`, `g#rice`, `g#hands`, `g#body`.
  - `MASCOT_ONLY_COLORS = { skin: "#F4CDA8", hair: "#222222" } as const` trong `colors.ts`.

- [ ] **Step 1: Viết test thất bại**

`brand-sync.test.ts`:
- `it("generated modules match the brand sources")`: đọc `../brand/mascot/mascot-layered.svg` và `../brand/logo/logo-icon.svg` (đường dẫn tính từ `process.cwd()` là `web/`), gọi `buildBrandModules`, so bằng `toBe` với nội dung hai file `generated/*.ts` trên đĩa.
- `it("the favicon is a byte copy of logo-icon.svg")`: `readFileSync("src/app/icon.svg")` bằng `readFileSync("../brand/logo/logo-icon.svg")`.
- `it("reads the pivots from data-pivot")`: `MASCOT_PIVOTS` bằng `{ head: { x: 278, y: 257 }, rice: { x: 302, y: 356 } }`.
- `it.each(['<script>x</script>', '<g onload="x">', '<image href="https://evil.example/a.png"/>', '<foreignObject/>'])("rejects unsafe markup %s")`: chèn chuỗi vào trong một mascot hợp lệ → `toThrow()`.
- `it("rejects a mascot without #hands")` → `toThrow(/hands/)`.

`Mascot.test.tsx` (viết lại):
- 4 nhóm `head`, `rice`, `hands`, `body`, mỗi nhóm đúng 1 lần; không có `g#eyes`.
- Có `role="img"` với tên bằng `title`; `svg` có thuộc tính `data-mascot`.
- Mọi giá trị `fill` / `stroke` (so không phân biệt hoa thường) thuộc `BRAND ∪ MASCOT_ONLY_COLORS ∪ {"none"}`.

`LogoMark.test.tsx`: `svg` có `aria-hidden="true"` và `focusable="false"`; không có phần tử nào mang `id` (logo xuất hiện 2 lần trên trang, ở header và footer).

- [ ] **Step 2: Chạy test, thấy thất bại**

Run (trong `web/`): `npx vitest run src/components/brand`
Expected: FAIL (chưa có `scripts/brand-modules.mjs` và `generated/`).

- [ ] **Step 3: Viết `buildBrandModules` và `sync-brand.mjs`**

Markup bên trong = phần giữa thẻ mở `<svg …>` gốc và `</svg>` cuối; viewBox lấy từ thẻ gốc. Mỗi file sinh ra mở đầu bằng dòng `// Generated by "npm run brand:sync" from brand/<file>. Do not edit.` và xuất chuỗi bằng `JSON.stringify` (không dùng template literal). `sync-brand.mjs` ghi 2 file `.ts` và chép `logo-icon.svg` sang `src/app/icon.svg`. Thêm script `"brand:sync": "node scripts/sync-brand.mjs"` vào `package.json`. Chạy `npm run brand:sync` một lần và commit các file sinh ra.

- [ ] **Step 4: Viết `Mascot` và `LogoMark`**

`Mascot`: `<svg viewBox={MASCOT_VIEWBOX} role="img" data-mascot …><title>{title}</title><g dangerouslySetInnerHTML={{ __html: MASCOT_INNER }} /></svg>`. `LogoMark`: tương tự với `LOGO_ICON_*`, `aria-hidden="true"`, `focusable="false"`, giữ prop `className`. Thêm `MASCOT_ONLY_COLORS` vào `colors.ts`. Kiểm tra `Hero.test.tsx` vẫn qua; kích thước khung mascot (`w-40` / `md:w-72`) giữ nguyên trừ khi mascot 512×512 trông lệch (ghi lý do trong báo cáo nếu đổi).

- [ ] **Step 5: Chạy test, thấy qua**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS hết.

- [ ] **Step 6: Commit**

```bash
git add web/scripts web/package.json web/src/app/icon.svg web/src/components/brand web/src/lib/brand/colors.ts
git commit -m "feat(web): use the real mascot, logo icon and favicon"
```

---

### Task 2: Nền chuyển động và các khối trượt lên

**Files:**
- Create: `web/src/lib/motion/load-gsap.ts`, `web/src/lib/motion/reduced-motion.ts`, `web/src/lib/motion/reveal.ts`, `web/src/lib/motion/reveal.test.ts`, `web/src/components/motion/HomeMotion.tsx`, `web/src/components/motion/HomeMotion.test.tsx`, `web/e2e/motion.spec.ts`
- Modify: `web/package.json`, `web/package-lock.json`, `web/src/app/[lang]/page.tsx`, `web/src/components/ui/SectionHeading.tsx`, `web/src/components/home/ProductSection.tsx`, `web/src/components/home/PressSection.tsx`, `web/src/components/home/StoriesSection.tsx`, `web/src/components/home/ContactSection.tsx`

**Interfaces:**
- Consumes: không có.
- Produces:
  - `loadGsap(): Promise<GsapModules>` — `import("gsap")` + `import("gsap/ScrollTrigger")`, gọi `gsap.registerPlugin(ScrollTrigger)` đúng 1 lần; gọi nhiều lần trả cùng một promise.
  - `GsapModules`, `MotionSetup` (xem "Hợp đồng chung").
  - `REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"`, `MOTION_OK_QUERY = "(prefers-reduced-motion: no-preference)"`, `prefersReducedMotion(): boolean`.
  - `shouldHideOnSetup(rect: { top: number }, viewportHeight: number): boolean` — `true` chỉ khi `rect.top >= viewportHeight`.
  - `setupReveals: MotionSetup` — phần tử `[data-reveal]`.
  - `<HomeMotion setups?: MotionSetup[] />` (mặc định là danh sách setup của trang chủ). Khi chuyển động đang chạy, `document.documentElement.dataset.motion === "on"`; khi bị gỡ hoặc unmount thì thuộc tính này bị xóa.

- [ ] **Step 1: Cài GSAP**

Run (trong `web/`): `npm install --save-exact gsap@3.15.0`
Expected: `package.json` có `"gsap": "3.15.0"` trong `dependencies`.

- [ ] **Step 2: Viết test đơn vị thất bại**

`reveal.test.ts`:
- `shouldHideOnSetup({ top: 900 }, 800)` → `true`; `({ top: 800 }, 800)` → `true`; `({ top: 400 }, 800)` → `false`; `({ top: -300 }, 800)` → `false`.

`HomeMotion.test.tsx` (mock `@/lib/motion/load-gsap`; giả `window.matchMedia` trả đối tượng có `matches`, `addEventListener`, `removeEventListener`; dùng fake timers; `requestIdleCallback` không có trong jsdom nên code dùng `setTimeout` thay thế):
- `it("does not load GSAP when reduced motion is on")`: `matches = true` cho `REDUCED_MOTION_QUERY` → sau `vi.runAllTimers()`, `loadGsap` không được gọi; `dataset.motion` không có.
- `it("loads GSAP after the browser is idle and runs every setup")`: `matches = false` → trước khi chạy timer `loadGsap` chưa được gọi; sau đó được gọi 1 lần; hai setup giả mỗi cái được gọi 1 lần với `(modules, document)`; `dataset.motion === "on"`.
- `it("starts when the user turns reduced motion off")`: bắt đầu `matches = true`, phát sự kiện `change` với `matches = false` → `loadGsap` được gọi.
- `it("reverts on unmount")`: `unmount()` → `revert` của matchMedia giả được gọi; `dataset.motion` bị xóa.
- `it("renders nothing")`: `container` rỗng.

- [ ] **Step 3: Chạy test, thấy thất bại**

Run: `npx vitest run src/lib/motion src/components/motion`
Expected: FAIL (module chưa có).

- [ ] **Step 4: Viết `load-gsap.ts`, `reduced-motion.ts`, `reveal.ts`, `HomeMotion.tsx`**

`HomeMotion` ("use client"): trong `useEffect`, nếu `prefersReducedMotion()` thì chỉ nghe sự kiện `change` của `REDUCED_MOTION_QUERY`; nếu không thì chờ rảnh (`requestIdleCallback` với `timeout: 2000`, không có thì `setTimeout(…, 200)`), `await loadGsap()`, rồi `const mm = gsap.matchMedia(); mm.add(MOTION_OK_QUERY, () => { setups.forEach(s => s(modules, document)); set dataset.motion = "on"; return () => delete dataset.motion; })`. Cleanup của effect: hủy chờ, bỏ listener, `mm?.revert()`. Nếu component đã unmount trước khi `loadGsap` xong thì không chạy setup.

`setupReveals`: lấy mọi `[data-reveal]`; phần tử nào `shouldHideOnSetup(el.getBoundingClientRect(), innerHeight)` thì `gsap.set(el, { opacity: 0, y: 24 })`; rồi `ScrollTrigger.batch` cho đúng các phần tử đó với `start: "clamp(top 85%)"`, `once: true`, `onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.08 })`. Phần tử không bị ẩn thì không có tween nào.

- [ ] **Step 5: Gắn `data-reveal` và `HomeMotion`**

Thêm thuộc tính `data-reveal` vào: thẻ bọc ngoài của `SectionHeading`; từng khối ảnh / đặc điểm / quy cách đóng gói / gợi ý món trong `ProductSection`; từng thẻ trong `PressSection` và `StoriesSection`; khối nội dung của `ContactSection`. Không gắn vào Hero và không gắn vào các mốc Hành trình (Task 4 lo). Render `<HomeMotion />` ở cuối `<main>` trong `web/src/app/[lang]/page.tsx`.

- [ ] **Step 6: Viết test e2e `e2e/motion.spec.ts` (project `mock`)**

Hàm phụ `scrollThroughPage(page)`: cuộn từng bước 400px tới cuối trang, chờ 100 ms mỗi bước, rồi chờ 1 giây.
- `test("motion starts and nothing stays hidden after scrolling to the end")`: `goto("/vi")`, chờ `html[data-motion="on"]`; `scrollThroughPage`; mọi `[data-reveal]` có `getComputedStyle(el).opacity === "1"`.
- `test("elements in the first screen are never hidden")`: `goto("/vi")`, chờ `data-motion="on"`, chờ thêm 300 ms; mọi `[data-reveal]` có `getBoundingClientRect().top < innerHeight` đều có opacity `"1"`.
- `test("a deep link keeps the sections above and in view visible")`: `goto("/vi#bao-chi")`, chờ `data-motion="on"`; mọi `[data-reveal]` có `top < innerHeight` (cả số âm) có opacity `"1"`.
- `test("the contact block at the end of the page appears")`: `goto("/vi")`, chờ `data-motion="on"`, `page.keyboard.press("End")`, chờ 1,5 giây; `[data-reveal]` trong khối Liên hệ có opacity `"1"`.
- `test("no layout shift while scrolling")`: đăng ký `PerformanceObserver` cho `layout-shift` (bỏ các mục có `hadRecentInput`) bằng `page.addInitScript` trước khi `goto`; `scrollThroughPage`; tổng `value` < 0.1.
- `test.describe` với `test.use({ reducedMotion: "reduce" })`:
  - `test("reduced motion: GSAP is never loaded and nothing is hidden")`: ghi lại mọi response JS trong lúc `goto("/vi")` + chờ 3 giây; không body nào chứa chuỗi `_gsap` (tên thuộc tính GSAP gắn vào phần tử; minifier không đổi tên thuộc tính, còn chuỗi `ScrollTrigger` có thể nằm trong chính chunk của `HomeMotion`); `html` không có `data-motion`; sau `scrollThroughPage`, mọi `[data-reveal]` có opacity `"1"` và `transform` là `"none"`.
- `test("GSAP arrives as a separate chunk after load")` (đối chứng cho test trên, không bật reduced motion): ghi lại response JS; có ít nhất một body chứa `_gsap`, và response đó đến sau sự kiện `load` của trang.
- `test("turning reduced motion on while the page is open reverts the motion")`: `goto("/vi")`, chờ `data-motion="on"`; `page.emulateMedia({ reducedMotion: "reduce" })`; chờ `html` không còn `data-motion`; mọi `[data-reveal]` có opacity `"1"`.

- [ ] **Step 7: Chạy toàn bộ test**

Run: `npm test && npm run lint && npm run typecheck && npm run test:e2e`
Expected: PASS hết (test e2e cũ của B2 cũng qua, kể cả `a11y.spec.ts`).

- [ ] **Step 8: Commit**

```bash
git add web/package.json web/package-lock.json web/src/lib/motion web/src/components/motion web/src/components/home web/src/components/ui/SectionHeading.tsx "web/src/app/[lang]/page.tsx" web/e2e/motion.spec.ts
git commit -m "feat(web): load GSAP lazily and slide sections in on scroll"
```

---

### Task 3: Mascot nghiêng theo tốc độ cuộn

**Files:**
- Create: `web/src/lib/motion/mascot.ts`, `web/src/lib/motion/mascot.test.ts`
- Modify: `web/src/components/motion/HomeMotion.tsx` (thêm `setupMascot` vào danh sách mặc định), `web/e2e/motion.spec.ts`

**Interfaces:**
- Consumes: `MotionSetup`, `GsapModules` (Task 2); `MASCOT_PIVOTS` (Task 1); `svg[data-mascot]` với `g#head`, `g#rice` (Task 1).
- Produces:
  - Hằng số `HEAD_MAX_DEG = 3`, `RICE_MAX_DEG = 6`, `FULL_TILT_VELOCITY = 1500` (px/giây), `SETTLE_AFTER_MS = 150`.
  - `tiltFor(velocity: number, maxDeg: number, fullAt: number): number` = `velocity / fullAt * maxDeg`, kẹp trong `[-maxDeg, maxDeg]`; trả `0` khi `velocity` không phải số hữu hạn.
  - `setupMascot: MotionSetup`.

- [ ] **Step 1: Viết test thất bại**

`mascot.test.ts`:
- `tiltFor(0, 3, 1500)` → `0`; `tiltFor(750, 3, 1500)` → `1.5`; `tiltFor(-750, 6, 1500)` → `-3`; `tiltFor(99999, 3, 1500)` → `3`; `tiltFor(-99999, 6, 1500)` → `-6`; `tiltFor(NaN, 3, 1500)` → `0`; `tiltFor(Infinity, 3, 1500)` → `0`.
- `it("does nothing when the page has no mascot")`: gọi `setupMascot` với `gsap` / `ScrollTrigger` giả trên một `document` không có `svg[data-mascot]` → không ném lỗi, `ScrollTrigger.create` không được gọi.

- [ ] **Step 2: Chạy test, thấy thất bại**

Run: `npx vitest run src/lib/motion/mascot.test.ts`
Expected: FAIL.

- [ ] **Step 3: Viết `tiltFor` và `setupMascot`**

`setupMascot`: tìm `svg[data-mascot]`; không có thì return. Đặt `svgOrigin` của `#head` là `"278 257"` và của `#rice` là `"302 356"` (lấy từ `MASCOT_PIVOTS`). Dùng `gsap.quickTo(head, "rotation", { duration: 0.3, ease: "power3.out" })` và `gsap.quickTo(rice, "rotation", { duration: 0.6, ease: "power3.out" })`. `ScrollTrigger.create({ trigger: svg, start: "top bottom", end: "bottom top", onUpdate: self => … })`: mỗi lần cập nhật, `v = self.getVelocity()`; đầu tới `tiltFor(v, HEAD_MAX_DEG, FULL_TILT_VELOCITY)`, bó lúa tới `-tiltFor(v, RICE_MAX_DEG, FULL_TILT_VELOCITY)` (ngược chiều đầu, như bị quán tính kéo lại); hẹn lại một `gsap.delayedCall(SETTLE_AFTER_MS / 1000, settle)`. `settle` đưa cả hai về `0` bằng `gsap.to` với `ease: "elastic.out(1, 0.35)"`, `duration: 1.2` cho đầu, `1.6` cho bó lúa. Nếu `svgOrigin` đánh nhau với `transform-origin` trong style của nhóm (test pivot ở Step 4 thất bại), thì trong `setupMascot` đặt `transformOrigin` của nhóm về `"0px 0px"` trước khi tween; không sửa file trong `brand/`.

- [ ] **Step 4: Thêm test e2e vào `motion.spec.ts`**

Hàm phụ `rotationOf(page, id)`: đọc `getCTM()` của `svg[data-mascot] g#<id>` so với `getCTM()` của `svg[data-mascot]`, trả góc theo độ (`Math.atan2(b, a)` của ma trận tương đối).
Hàm phụ `pivotDrift(page, id, x, y)`: khoảng cách (px màn hình) giữa điểm `(x, y)` biến đổi bằng `getScreenCTM()` của nhóm và bằng `getScreenCTM()` của `svg`.
- `test("the mascot tilts while scrolling and settles after")`: viewport 375×812, `goto("/vi")`, chờ `data-motion="on"`; `page.mouse.wheel(0, 300)` 4 lần cách nhau 30 ms; ngay sau đó `|rotationOf("head")| > 0.5` và `≤ 3.01`, `|rotationOf("rice")| ≤ 6.01`; `pivotDrift("head", 278, 257) < 1` và `pivotDrift("rice", 302, 356) < 1`; chờ 2,5 giây → cả hai góc có trị tuyệt đối `< 0.1`.
- `test("very fast scrolling stays within the limits")`: `page.keyboard.press("End")` rồi `Home` liên tục 3 lần; lấy mẫu góc 10 lần cách nhau 50 ms; mọi mẫu `|head| ≤ 3.01`, `|rice| ≤ 6.01`.
- Trong `describe` reduced motion: `test("reduced motion: the mascot does not move")`: cuộn như trên; cả hai góc bằng `0`.

- [ ] **Step 5: Chạy toàn bộ test**

Run: `npm test && npm run lint && npm run typecheck && npm run test:e2e`
Expected: PASS hết.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/motion/mascot.ts web/src/lib/motion/mascot.test.ts web/src/components/motion/HomeMotion.tsx web/e2e/motion.spec.ts
git commit -m "feat(web): tilt the mascot head and rice bundle with scroll speed"
```

---

### Task 4: Cây lúa mọc ở phần Hành trình

**Files:**
- Create: `web/src/components/home/RicePlant.tsx`, `web/src/components/home/RicePlant.test.tsx`, `web/src/lib/motion/journey.ts`
- Modify: `web/src/components/home/JourneySection.tsx`, `web/src/components/home/JourneySection.test.tsx`, `web/src/components/motion/HomeMotion.tsx`, `web/e2e/motion.spec.ts`

**Interfaces:**
- Consumes: `MotionSetup`, `shouldHideOnSetup` (Task 2).
- Produces:
  - `<RiceLeaf className? />`: SVG lá lúa khoảng 20×12px, `fill` xanh mạ `BRAND.sprout`, viền `BRAND.earth`, `aria-hidden="true"`, có thuộc tính `data-journey-leaf`.
  - `<RiceEar className? />`: SVG bông lúa khoảng 24×40px, hạt màu `BRAND.grain`, viền `BRAND.earth`, `aria-hidden="true"`, có thuộc tính `data-journey-ear`.
  - `setupJourney: MotionSetup`.
  - Markup của `JourneySection`: `[data-journey-line]` (thân cây), mỗi `li[data-journey-event]` chứa đúng một `RiceLeaf`, và đúng một `RiceEar` ở đầu dưới thân cây.

- [ ] **Step 1: Viết test thất bại**

`RicePlant.test.tsx`: mỗi component render một `svg` có `aria-hidden="true"` và đúng thuộc tính `data-journey-*` của nó; màu chỉ thuộc `BRAND`.
`JourneySection.test.tsx` (thêm vào test cũ, giữ test "gives the line and each event a hook"):
- `it("renders one leaf per event and one ear")`: với 3 mốc → 3 `[data-journey-leaf]`, mỗi cái nằm trong một `[data-journey-event]` khác nhau; 1 `[data-journey-ear]`.
- `it("shows the whole plant without JavaScript")`: không phần tử nào trong section có `style` chứa `opacity` hoặc `scale` (HTML tĩnh là cây đã mọc xong).

- [ ] **Step 2: Chạy test, thấy thất bại**

Run: `npx vitest run src/components/home/RicePlant.test.tsx src/components/home/JourneySection.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Viết `RicePlant.tsx` và sửa `JourneySection.tsx`**

Thân cây: giữ thẻ `div[data-journey-line]` ở vị trí cũ, đổi màu sang `bg-sprout`, rộng `w-1.5`. Lá: đặt cạnh chấm tròn của mỗi mốc, chĩa về phía thẻ nội dung; khi mốc nằm bên trái (desktop) thì lật lá bằng một thẻ bọc ngoài (`-scale-x-100`), vì GSAP sẽ animate `scale` của chính `svg` bên trong. Bông lúa: đặt ở đầu dưới thân cây, căn giữa thân. Mobile (thân ở `left-[14px]`): lá và bông không làm trang cuộn ngang ở 320px.

- [ ] **Step 4: Viết `setupJourney` và thêm vào `HomeMotion`**

- Thân: `gsap.fromTo(line, { scaleY: 0 }, { scaleY: 1, ease: "none", transformOrigin: "top center", scrollTrigger: { trigger: <ol của timeline>, start: "clamp(top 70%)", end: "clamp(bottom 70%)", scrub: 0.5 } })`.
- Mỗi mốc có `shouldHideOnSetup` đúng: `gsap.set(event, { opacity: 0, y: 24 })` và `gsap.set(leaf, { scale: 0, transformOrigin: <gốc lá, phía thân cây> })`; khi `start: "clamp(top 75%)"`, `once: true` thì `event` về `opacity: 1, y: 0` (0,6 giây, `power2.out`) và `leaf` về `scale: 1` (0,5 giây, `back.out(2)`, trễ 0,15 giây). Mốc không bị ẩn thì lá cũng không bị ẩn.
- Bông lúa: nếu `shouldHideOnSetup` đúng thì `gsap.set(ear, { scale: 0, transformOrigin: "top center" })` và hiện (`scale: 1`, 0,6 giây, `back.out(2)`) khi ScrollTrigger của bông có `start: "clamp(top 90%)"`, `once: true`.

- [ ] **Step 5: Thêm test e2e vào `motion.spec.ts`**

- `test("the rice plant grows with the journey and every event appears")`: `goto("/vi")`, chờ `data-motion="on"`; cuộn tới ngay trên `#hanh-trinh` (`scrollIntoView` của tiêu đề rồi lùi 600px); `scaleY` của `[data-journey-line]` (đọc từ `getComputedStyle(...).transform`, phần tử `d` của `matrix`) `< 0.5`; `scrollThroughPage`; `scaleY` `> 0.99`; mọi `[data-journey-event]` opacity `"1"`; mọi `[data-journey-leaf]` và `[data-journey-ear]` có `transform` là `"none"` hoặc ma trận có tỉ lệ `> 0.99`.
- Trong `describe` reduced motion: `test("reduced motion: the plant is fully grown")`: `goto("/vi")`, cuộn tới `#hanh-trinh`; thân cây `transform` là `"none"`; mọi mốc opacity `"1"`.
- Viewport 320×640: `document.documentElement.scrollWidth <= 320` sau khi cuộn hết trang.

- [ ] **Step 6: Chạy toàn bộ test**

Run: `npm test && npm run lint && npm run typecheck && npm run test:e2e`
Expected: PASS hết.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/home/RicePlant.tsx web/src/components/home/RicePlant.test.tsx web/src/components/home/JourneySection.tsx web/src/components/home/JourneySection.test.tsx web/src/lib/motion/journey.ts web/src/components/motion/HomeMotion.tsx web/e2e/motion.spec.ts
git commit -m "feat(web): grow a rice plant along the journey timeline"
```

---

### Task 5: Đo lại, xem bằng mắt và cập nhật tài liệu

**Files:**
- Modify: `docs/setup.md` (bảng Lighthouse), `docs/session/STATE.md`, `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md` (mục 2.3, 3.3)

**Interfaces:**
- Consumes: mọi thứ của Task 1–4.
- Produces: không có code.

- [ ] **Step 1: Build production và chạy server**

Làm theo mục "Chạy bản production" trong `docs/setup.md` (cổng 3300, `CONTENT_SOURCE=mock`).
Expected: `curl -s http://127.0.0.1:3300/vi` trả HTML có `data-mascot`.

- [ ] **Step 2: Đo Lighthouse mobile**

Chạy lệnh trong mục "Đo Lighthouse (mobile)" của `docs/setup.md` cho `/vi` và `/en`, mỗi trang 2 lần.
Expected: mỗi lần đo, Performance, Accessibility, SEO đều ≥ 90; LCP < 2,5 giây; CLS < 0,1. Nếu một số dưới mục tiêu ở cả 2 lần đo của một trang: dừng, không sửa tiếp, báo lại cho người điều phối kèm số đo và mục bị trừ điểm lớn nhất.

- [ ] **Step 3: Xem bằng mắt**

Mở `/vi` trên Chromium của Playwright (có giao diện), viewport 375×812 và 1280×800; chụp ảnh màn hình hero khi đứng yên, hero lúc đang cuộn nhanh, và phần Hành trình lúc cây lúa mọc được một nửa. Lưu ảnh ngoài repo (thư mục home). Kiểm tra: đầu xoay quanh cổ, bó lúa xoay quanh bàn tay, không có mảnh nào của SVG tách rời khi xoay; logo ở header rõ ở 36px; favicon đúng trong tab.
Expected: ghi kết quả từng điểm (đạt / không đạt) vào báo cáo task.

- [ ] **Step 4: Cập nhật tài liệu**

- `docs/setup.md`: thêm bảng đo mới (ngày, máy, "sau B4") ngay dưới bảng cũ; giữ bảng cũ để so sánh.
- Spec mục 2.3: bảng nhóm SVG theo mascot thật — `head` (pivot `278 257`, ±3°), `rice` (pivot `302 356`, cả bó lắc ±6°), `hands` và `body` đứng yên; bỏ dòng `eyes`. Thêm một dòng: "Chủ dự án quyết định ngày 2026-11-04: bỏ chớp mắt, lắc cả bó lúa."
- `docs/session/STATE.md`: B4 xong trên nhánh `feat/phan-b4-gsap`; việc tiếp theo; ghi chú cho người merge sau cùng giữa B3 và B4: merge `main` vào nhánh của mình rồi chạy `npm install` trong `web/` để tạo lại `package-lock.json` (cả hai phần đều thêm thư viện).

- [ ] **Step 5: Chạy lại toàn bộ test**

Run (trong `web/`): `npm test && npm run lint && npm run typecheck && npm run test:e2e`
Expected: PASS hết.

- [ ] **Step 6: Commit**

```bash
git add docs/setup.md docs/session/STATE.md docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md
git commit -m "docs: record part B4 measurements and the final mascot motion"
```
