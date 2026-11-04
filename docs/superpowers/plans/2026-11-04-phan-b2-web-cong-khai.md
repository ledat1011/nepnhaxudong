# Phần B2 — Website công khai: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Website công khai song ngữ (`/vi`, `/en`) trong thư mục `web/`: trang chủ 8 khối, blog "Câu chuyện Nếp Nhà", SEO đầy đủ, route revalidate cho API gọi — chạy được ngay bằng dữ liệu mẫu `[MẪU]` khi chưa có API (B1), và đổi sang API thật chỉ bằng biến môi trường.

**Architecture:** Next.js App Router, TypeScript, Tailwind. Mọi trang nằm dưới `src/app/[lang]/` (layout gốc có `<html lang>`). Dữ liệu đi qua một interface `ContentClient` có hai bản: `api` (gọi `GET /api/public/...` của B1, `fetch` có cache theo tag) và `mock` (đọc fixture). Trang không tạo sẵn lúc build (`generateStaticParams` trả `[]`): trang được render ở lần xem đầu tiên rồi lưu tĩnh, và `POST /api/revalidate` xóa cache theo tag khi nội dung đổi. Nhờ vậy `next build` không cần API đang chạy (build Docker ở phần D không phụ thuộc API).

**Tech Stack:** Node ≥ 22, Next.js 16.4.x, React 19, TypeScript, Tailwind CSS 4, ESLint (`eslint-config-next`), Vitest 5 + Testing Library + jsdom, Playwright 1.64 (Chromium) + `@axe-core/playwright`, `cross-env`.

**Spec:** `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md` (mục 2 thương hiệu, mục 3 website công khai, mục 4.2 Caddy chia đường, mục 4.6 kiểm thử web, mục 5.2 container). Hợp đồng API: plan B1 `docs/superpowers/plans/2026-11-03-phan-b1-api-database.md`, Task 9 (JSON công khai) và Task 10 (revalidate) — trên nhánh `feat/phan-b1-api`.

## Global Constraints

- Node ≥ 22; npm, `web/package-lock.json` được commit. Mọi script chạy được trên Windows (Git Bash) và Linux (dùng `cross-env` khi cần đặt biến môi trường trong script).
- Next.js **16.4.x** (bản mới nhất lúc viết plan). Khi một API của Next khác với plan (tên `proxy.ts`, chữ ký `revalidateTag`), đọc tài liệu đi kèm trong `web/node_modules/next/dist/docs/` và làm theo bản đang cài; ghi lại khác biệt trong báo cáo task.
- Ngôn ngữ: `vi`, `en`; mặc định `vi`. Đường dẫn: `/vi`, `/en`, blog `/vi/cau-chuyen/<slug>`, `/en/stories/<slug>`. Thiếu bản EN thì API đã trả bản VI thay (web không tự ghép).
- Màu (mục 2.1 của spec): nâu đất `#4A2C1A`, nâu áo `#8B5A2B`, vàng lúa `#D9A13B`, vàng rơm `#F2E2B6`, trắng gạo `#FBF7EE`, hồng má `#E59A84` (chỉ trong mascot), xanh mạ `#6E8B3D` (rất ít). Vàng lúa không bao giờ là màu chữ trên nền sáng. Mọi cặp chữ / nền đạt WCAG AA (≥ 4,5:1).
- Font: Pacifico (chỉ chữ "Nếp Nhà" và tiêu đề lớn của khối) + Quicksand 400 / 500 / 700, qua `next/font/google`, subset `latin` + `vietnamese`.
- Chỉ giới thiệu: không giỏ hàng, không form liên hệ. Liên hệ bằng `tel:`, Zalo `https://zalo.me/<số>`, Messenger.
- `prefers-reduced-motion: reduce` → tắt mọi transition / animation và cuộn mượt. B2 không có GSAP (phần B4); chuyển động trong B2 chỉ là CSS `transform` / `opacity`.
- Mascot của phần A chưa xong: dùng SVG tạm có 4 nhóm `<g id="head">`, `rice`, `body`, `eyes`, mỗi nhóm có `transform-origin` (B4 sẽ animate các nhóm này).
- Dữ liệu mẫu (fixture): mọi chuỗi chữ bắt đầu bằng `[MẪU]`; số điện thoại `0000 000 000`; mọi URL là `https://example.com/...`; fixture không có ảnh (giống seed của B1), các khối dùng hình minh họa giữ chỗ.
- Biến môi trường (chỉ đọc ở server, không có secret trong repo; `web/.env.example` chỉ có giá trị mẫu): `CONTENT_SOURCE` (`mock` | `api`), `API_BASE_URL` (ví dụ `http://localhost:8080`, không có `/api` ở cuối), `SITE_URL` (ví dụ `http://localhost:3000`), `REVALIDATE_SECRET`.
- Không phạm vi: admin (B3), GSAP (B4), mọi thay đổi trong `api/`.
- Code, test, commit tiếng Anh; không dòng `Co-Authored-By`; LF.
- Mục tiêu đo: Lighthouse mobile ≥ 90 cho Performance, Accessibility, SEO trên `/vi` và `/en`; LCP < 2,5 giây.

## Review Focus

1. API chậm hoặc lỗi lúc khách xem trang lần đầu: client API dừng sau 5 giây và ném `ContentUnavailableError`; khách thấy trang lỗi thân thiện hai ngôn ngữ (không phải màn hình trắng, không lộ chi tiết lỗi). (Test ở Task 4 và Task 5)
2. Danh sách rỗng hoặc thiếu ảnh (seed B1 không có ảnh; chưa có báo chí / bài viết; sản phẩm chưa có quy cách đóng gói): khối rỗng bị ẩn khỏi trang và khỏi menu, ảnh thiếu thì hiện hình giữ chỗ — không lỗi render. (Test ở Task 6)
3. Chữ tiếng Việt dài trên điện thoại 320px (tên sản phẩm dài, địa chỉ dài, URL dài trong bài viết): trang không cuộn ngang. (Test ở Task 10)
4. Gọi revalidate sai: thiếu / sai secret → 401; body không phải JSON, `tags` rỗng hoặc có tag lạ → 400; server chưa đặt `REVALIDATE_SECRET` → 401 (đóng cửa khi thiếu cấu hình). Không trường hợp nào xóa cache. (Test ở Task 9)
5. Đường dẫn blog sai ngôn ngữ hoặc thiếu slug EN: `/vi/stories/x` và `/en/cau-chuyen/x` → 404; `/en/stories/<slug-vi>` vẫn mở được bài khi bài chưa có slug EN, và `hreflang` dùng đúng slug của từng ngôn ngữ. (Test ở Task 7)

## Khoảng trống của hợp đồng API (B1) — web tạm giả định, cần B1 xác nhận

| # | Khoảng trống | Web giả định |
|---|---|---|
| 1 | `GET /api/public/{lang}/stories?page=` không nói dạng trả về (mảng hay object có tổng số trang) | Mảng `StorySummary[]`; `page` bắt đầu từ 0; còn trang sau khi mảng đủ 12 phần tử |
| 2 | `contact.zalo` là số điện thoại hay URL | Chuỗi số điện thoại; web tạo `https://zalo.me/<chỉ chữ số>`; nếu chuỗi bắt đầu bằng `http` thì dùng nguyên |
| 3 | Ảnh `url` là `/media/...`; ở local không có gì phục vụ `/media/*` (Caddy chỉ có ở production) | Web đổi thành `${SITE_URL}/media/...` cho `next/image`; ở local với API thật, ảnh sẽ hỏng tới khi B1 / phần D thêm chỗ phục vụ `/media` |
| 4 | Đổi slug bài viết: API có phát tag `story:<slug-cũ>` không | Cần có, để đường dẫn cũ trả 404 thay vì bài cũ trong cache |
| 5 | Không có `updatedAt` trong API công khai | `sitemap.xml` không có `lastModified` (trừ bài viết dùng `publishedAt`) |
| 6 | `alternateSlug` khi ngôn ngữ kia không có slug riêng: `null` hay slug VI | `null` → web dùng chính slug hiện tại cho ngôn ngữ kia |
| 7 | Các trường trong `contact` / `social` có thể `null` không | Có thể `null`; nút / liên kết tương ứng bị ẩn |
| 8 | `POST /api/revalidate` của Next nằm dưới `/api/*`, mà Caddy chuyển `/api/*` sang Spring | Đúng ý: route này chỉ gọi được trong mạng nội bộ; `WEB_BASE_URL` của API phải là địa chỉ nội bộ (ví dụ `http://web:3000`) — ghi cho phần D |

---

## File Structure

```
web/
├── package.json, package-lock.json, tsconfig.json, next.config.ts,       Task 1
│   eslint.config.mjs, postcss.config.mjs, vitest.config.mts,
│   vitest.setup.ts, .env.example, .gitignore
├── playwright.config.ts, e2e/*.spec.ts, e2e/fake-api.mjs                 Task 10
├── public/                                                                (ảnh tĩnh nếu cần)
└── src/
    ├── app/
    │   ├── globals.css                     token màu, font, reduced motion   Task 2
    │   ├── icon.svg                        favicon = LogoMark                  Task 2
    │   ├── [lang]/layout.tsx               <html lang>, font, header, footer   Task 5
    │   ├── [lang]/error.tsx, not-found.tsx                                     Task 5
    │   ├── [lang]/page.tsx                 trang chủ                           Task 6
    │   ├── [lang]/[section]/page.tsx       danh sách bài                       Task 7
    │   ├── [lang]/[section]/[slug]/page.tsx  một bài                           Task 7
    │   ├── [lang]/opengraph-image.tsx                                          Task 8
    │   ├── sitemap.ts, robots.ts                                               Task 8
    │   └── api/revalidate/route.ts                                             Task 9
    ├── proxy.ts                            "/" → /vi hoặc /en                  Task 3
    ├── lib/
    │   ├── brand/colors.ts, contrast.ts                                        Task 2
    │   ├── i18n/langs.ts, pick-lang.ts, dictionaries.ts, routes.ts             Task 3
    │   ├── content/types.ts, tags.ts, client.ts, api-client.ts, mock-client.ts Task 4
    │   ├── format.ts                                                           Task 4
    │   ├── seo/metadata.ts, json-ld.ts                                         Task 8
    │   └── revalidate.ts                                                       Task 9
    ├── fixtures/home.vi.json, home.en.json, stories.vi.json, stories.en.json   Task 4
    └── components/
        ├── brand/Mascot.tsx, LogoMark.tsx, FieldBackdrop.tsx, ImagePlaceholder.tsx  Task 2
        ├── layout/SiteHeader.tsx, MobileMenu.tsx, LanguageSwitch.tsx, SiteFooter.tsx Task 5
        ├── ui/ContentImage.tsx, SectionHeading.tsx                             Task 5
        ├── home/Hero.tsx, ProductSection.tsx, Gallery.tsx, JourneySection.tsx,
        │   PressSection.tsx, StoriesSection.tsx, ContactSection.tsx            Task 6
        └── story/StoryCard.tsx, StoryBody.tsx, Pagination.tsx                  Task 7
.github/workflows/web.yml                                                       Task 1, 10
docs/setup.md (mục "Chạy web ở local"), docs/session/STATE.md                   Task 1, 11
```

Test Vitest đặt cạnh file: `*.test.ts` / `*.test.tsx`. Component khối trang chủ là component đồng bộ nhận dữ liệu qua props (để Testing Library render được); page `async` lấy dữ liệu rồi truyền xuống.

---

### Task 1: Khung app, Vitest, CI

**Files:**
- Create: `web/` bằng `npx create-next-app@16.4 web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm` (nếu bản này hỏi thêm câu hỏi, chọn mặc định; sau đó xóa file mẫu: `src/app/page.tsx`, `src/app/layout.tsx`, ảnh mẫu trong `public/`), `web/vitest.config.mts`, `web/vitest.setup.ts`, `web/.env.example`, `web/src/lib/smoke.test.ts`, `.github/workflows/web.yml`
- Modify: `docs/setup.md` (mục mới "Chạy web ở local")

**Interfaces:**
- Produces: script npm trong `web/package.json`: `dev` = `cross-env CONTENT_SOURCE=mock next dev`; `dev:api` = `cross-env CONTENT_SOURCE=api next dev`; `build` = `next build`; `start` = `next start`; `lint` = `eslint .`; `typecheck` = `tsc --noEmit`; `test` = `vitest run`; `test:e2e` = `playwright test` (Task 10). `engines.node` = `>=22`. `next.config.ts`: `output: 'standalone'`, `poweredByHeader: false`. Alias `@/` → `src/`.

- [ ] **Step 1: Tạo app và dọn file mẫu.** Thêm dev deps: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `vite-tsconfig-paths`, `cross-env`. `vitest.config.mts`: environment `jsdom`, `setupFiles: ['./vitest.setup.ts']`, `include: ['src/**/*.test.{ts,tsx}']`. `vitest.setup.ts` import `@testing-library/jest-dom/vitest`.
- [ ] **Step 2: Viết test khói `src/lib/smoke.test.ts`** — `expect(1 + 1).toBe(2)` (chỉ để chứng minh Vitest chạy; xóa ở Task 2).
- [ ] **Step 3: Chạy** `cd web && npm run lint && npm run typecheck && npm test` — Expected: PASS. (Build chưa chạy được vì chưa có layout; Task 5 mới có.)
- [ ] **Step 4: `.github/workflows/web.yml`** — tên `web`; trigger `push` + `pull_request` với `paths: ['web/**', '.github/workflows/web.yml']`; `permissions: contents: read`; job `web`, matrix `os: [ubuntu-latest, windows-latest]`, `defaults.run.shell: bash`, `working-directory: web`; `actions/setup-node@v4` node 22 với `cache: npm`, `cache-dependency-path: web/package-lock.json`; các bước `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; `timeout-minutes: 15`. (Task 10 thêm job `e2e`.)
- [ ] **Step 5: `web/.env.example`** — `CONTENT_SOURCE=mock`, `API_BASE_URL=http://localhost:8080`, `SITE_URL=http://localhost:3000`, `REVALIDATE_SECRET=doi-gia-tri-nay` (ghi chú: giá trị mẫu, phải giống `REVALIDATE_SECRET` của API).
- [ ] **Step 6: `docs/setup.md`** — mục "Chạy web ở local": `cd web && npm ci`; `npm run dev` (dữ liệu mẫu, không cần API) → `http://localhost:3000/vi`; chạy với API thật: chép `.env.example` thành `.env.local`, chạy API theo mục "Chạy API ở local", rồi `npm run dev:api`.
- [ ] **Step 7: Commit** — `git add web .github/workflows/web.yml docs/setup.md` → `git commit -m "feat(web): scaffold Next.js app with Vitest and CI"`

---

### Task 2: Thương hiệu — màu, font, mascot tạm, logo

**Files:**
- Create: `web/src/lib/brand/colors.ts`, `web/src/lib/brand/contrast.ts`, `web/src/lib/brand/contrast.test.ts`, `web/src/components/brand/Mascot.tsx`, `Mascot.test.tsx`, `LogoMark.tsx`, `FieldBackdrop.tsx`, `ImagePlaceholder.tsx`, `web/src/app/icon.svg`
- Modify: `web/src/app/globals.css`; xóa `web/src/lib/smoke.test.ts`

**Interfaces:**
- Produces:
  - `export const BRAND = { earth: '#4A2C1A', coat: '#8B5A2B', grain: '#D9A13B', straw: '#F2E2B6', rice: '#FBF7EE', blush: '#E59A84', sprout: '#6E8B3D' } as const`
  - `contrastRatio(foreground: string, background: string): number` (công thức WCAG 2.x, hex `#RRGGBB`).
  - `export const TEXT_PAIRS: ReadonlyArray<{ name: string; fg: string; bg: string }>` — mọi cặp chữ / nền được dùng trên web: earth/rice, coat/rice, earth/straw, coat/straw, rice/coat (chữ nút), rice/earth (footer), earth/grain (nhãn trên nền vàng lúa, nếu có).
  - Tailwind 4 `@theme` trong `globals.css`: `--color-earth`, `--color-coat`, `--color-grain`, `--color-straw`, `--color-rice`, `--color-blush`, `--color-sprout`; `--font-display` (Pacifico), `--font-sans` (Quicksand) lấy từ biến CSS của `next/font` (Task 5 gắn biến vào `<html>`). `body` nền `rice`, chữ `earth`.
  - Khối CSS: `@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth } }` và `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important } }`.
  - `<Mascot className?: string, title: string />` — SVG `viewBox="0 0 240 280"`, `role="img"`, có `<title>`; bốn nhóm `<g id="head">` (đầu + nón, `transform-origin` ở cổ), `<g id="rice">` (bó lúa, `transform-origin` ở bàn tay), `<g id="body">`, `<g id="eyes">`; chỉ dùng màu `BRAND`; hồng má chỉ ở má. Chỉ render một lần mỗi trang (vì có `id`).
  - `<LogoMark className?: string />` — đầu đội nón lá, không có `id`, `aria-hidden`. `icon.svg` cùng hình, rõ ở 32px.
  - `<FieldBackdrop />` — SVG cánh đồng trang trí, `aria-hidden`. `<ImagePlaceholder label: string />` — khối nền vàng rơm có bông lúa, `role="img"`, `aria-label={label}`.

- [ ] **Step 1: Viết test thất bại `contrast.test.ts`** — `contrastRatio('#000000', '#FFFFFF')` ≈ 21 (sai số 0,01); `contrastRatio('#FFFFFF', '#FFFFFF')` = 1; với mỗi cặp trong `TEXT_PAIRS`: `contrastRatio(fg, bg) >= 4.5`; và `TEXT_PAIRS` không có cặp nào có `fg === BRAND.grain` trên nền `rice` hoặc `straw`.
- [ ] **Step 2: Viết test thất bại `Mascot.test.tsx`** — render `<Mascot title="Nếp Nhà" />`: có đúng 4 phần tử `g#head`, `g#rice`, `g#body`, `g#eyes`; `head` và `rice` có `style.transformOrigin` khác rỗng; `getByRole('img', { name: 'Nếp Nhà' })` tồn tại; mọi giá trị `fill` / `stroke` thuộc `Object.values(BRAND)` hoặc `none`.
- [ ] **Step 3: Chạy** `npm test` — Expected: FAIL (chưa có module).
- [ ] **Step 4: Viết code** theo Interfaces.
- [ ] **Step 5: Chạy** `npm test && npm run lint && npm run typecheck` — Expected: PASS.
- [ ] **Step 6: Commit** — `feat(web): add brand tokens, contrast check and placeholder mascot`

---

### Task 3: Ngôn ngữ — chọn ngôn ngữ, từ điển, đường dẫn, chuyển hướng "/"

**Files:**
- Create: `web/src/lib/i18n/langs.ts`, `pick-lang.ts`, `pick-lang.test.ts`, `dictionaries.ts`, `dictionaries.test.ts`, `routes.ts`, `routes.test.ts`, `web/src/proxy.ts`

**Interfaces:**
- Produces:
  - `type Lang = 'vi' | 'en'`; `LANGS: readonly Lang[] = ['vi', 'en']`; `DEFAULT_LANG: Lang = 'vi'`; `isLang(value: string): value is Lang`.
  - `pickLang(acceptLanguage: string | null): Lang` — đọc danh sách `Accept-Language` có `q`, chọn ngôn ngữ (chỉ xét phần trước `-`) có `q` cao nhất trong `LANGS`; không có / không khớp / `q=0` → `vi`.
  - `STORY_SECTION: Record<Lang, string> = { vi: 'cau-chuyen', en: 'stories' }`; `homePath(lang): string` → `/vi`; `storiesPath(lang, page = 0): string` → `/vi/cau-chuyen`, trang > 0 thêm `?page=<n>`; `storyPath(lang, slug): string` → `/en/stories/<slug>`; `isStorySection(lang, section): boolean`.
  - `SECTION_IDS = ['san-pham', 'hanh-trinh', 'bao-chi', 'cau-chuyen', 'lien-he'] as const` (id neo dùng chung hai ngôn ngữ cho các khối trang chủ).
  - `getDictionary(lang): Dictionary` — `type Dictionary` là object lồng nhau có mọi nhãn giao diện (menu, nút "Liên hệ qua Zalo", "Xem hành trình", tiêu đề khối, "Xem tất cả", "Trang sau", "Trang trước", "Đọc tiếp", nhãn ngôn ngữ, "Mở menu", "Đóng", trang lỗi, trang 404, nhãn giữ chỗ ảnh, "Giá liên hệ", v.v.). Bản `vi` và `en` cùng kiểu `Dictionary`.
  - `proxy.ts`: chỉ khớp đường dẫn `/` (`config.matcher = ['/']`); trả redirect 307 tới `/${pickLang(request.headers.get('accept-language'))}`.

- [ ] **Step 1: Viết test thất bại `pick-lang.test.ts`** — `null` → `vi`; `''` → `vi`; `'en-US,en;q=0.9'` → `en`; `'en-GB;q=0.8, vi;q=0.9'` → `vi`; `'fr-FR,fr;q=0.9'` → `vi`; `'fr, en;q=0.5'` → `en`; `'*'` → `vi`; `'en;q=0'` → `vi`; `'EN'` → `en`.
- [ ] **Step 2: Viết test thất bại `routes.test.ts`** — `storyPath('vi','mua-gat')` = `/vi/cau-chuyen/mua-gat`; `storyPath('en','harvest')` = `/en/stories/harvest`; `storiesPath('en', 2)` = `/en/stories?page=2`; `storiesPath('vi')` = `/vi/cau-chuyen`; `isStorySection('vi','stories')` = `false`; `isStorySection('en','stories')` = `true`.
- [ ] **Step 3: Viết test thất bại `dictionaries.test.ts`** — hàm đệ quy lấy mọi đường dẫn khóa của `getDictionary('vi')` và `getDictionary('en')`: hai tập bằng nhau; không có giá trị chuỗi rỗng; không có giá trị nào bắt đầu bằng `[MẪU]` (nhãn giao diện là chữ thật).
- [ ] **Step 4: Chạy** — FAIL. **Step 5: Viết code.** **Step 6: Chạy** `npm test` — PASS.
- [ ] **Step 7: Commit** — `feat(web): add language selection, dictionaries and localized routes`

---

### Task 4: Lớp dữ liệu — kiểu theo hợp đồng, fixture, client API / mock, định dạng

**Files:**
- Create: `web/src/lib/content/types.ts`, `tags.ts`, `client.ts`, `client.test.ts`, `api-client.ts`, `api-client.test.ts`, `mock-client.ts`, `web/src/fixtures/home.vi.json`, `home.en.json`, `stories.vi.json`, `stories.en.json`, `web/src/fixtures/fixtures.test.ts`, `web/src/lib/format.ts`, `format.test.ts`

**Interfaces:**
- Consumes: `Lang` (Task 3).
- Produces (`types.ts`, đúng tên trường của Task 9 plan B1):
  ```ts
  type ImageRef = { url: string; width: number; height: number; alt: string }
  type Packaging = { weightGrams: number; priceVnd: number | null }
  type Product = { name: string; description: string; features: string[]; cookingTips: string; showPrice: boolean; packagings: Packaging[]; images: ImageRef[] }
  type TimelineEvent = { year: number; title: string; description: string; image: ImageRef | null }
  type PressMention = { title: string; sourceName: string; url: string; publishedOn: string | null; image: ImageRef | null }
  type StorySummary = { slug: string; title: string; excerpt: string; publishedAt: string; cover: ImageRef | null }
  type StoryDetail = StorySummary & { bodyHtml: string; alternateSlug: string | null }
  type Contact = { phone: string | null; zalo: string | null; messenger: string | null; address: string | null; mapUrl: string | null; hours: string | null }
  type Social = { facebook: string | null; youtube: string | null; tiktok: string | null }
  type HomeData = { lang: Lang; brand: { tagline: string }; products: Product[]; timeline: TimelineEvent[]; press: PressMention[]; stories: StorySummary[]; contact: Contact; social: Social }
  interface ContentClient { getHome(lang: Lang): Promise<HomeData>; getStories(lang: Lang, page: number): Promise<StorySummary[]>; getStory(lang: Lang, slug: string): Promise<StoryDetail | null> }
  ```
  - `tags.ts`: `TAG_HOME = 'home'`, `TAG_STORIES = 'stories'`, `storyTag(slug: string): string` → `story:<slug>`; `STORIES_PAGE_SIZE = 12`.
  - `class ContentUnavailableError extends Error` (trong `client.ts`).
  - `getContentClient(env = process.env): ContentClient` — `CONTENT_SOURCE=mock` → mock; `api` → api (thiếu `API_BASE_URL` → ném `Error` nói rõ biến thiếu); không đặt hoặc giá trị khác → ném `Error("CONTENT_SOURCE must be 'mock' or 'api'")` (không bao giờ tự rơi về dữ liệu mẫu).
  - `createApiClient(baseUrl: string, fetchFn = fetch): ContentClient` — URL `${baseUrl}/api/public/${lang}/home`, `/stories?page=${page}`, `/stories/${encodeURIComponent(slug)}`; mọi lời gọi `cache: 'force-cache'`, `signal: AbortSignal.timeout(5000)`, `next.tags`: home → `[TAG_HOME]`; danh sách → `[TAG_STORIES]`; một bài → `[TAG_STORIES, storyTag(slug)]`. `getStory` 404 → `null`. Mạng lỗi, hết giờ, HTTP ≥ 500, hoặc 404 ở home → `ContentUnavailableError`.
  - `createMockClient(): ContentClient` — đọc fixture; `getStories` cắt trang theo `STORIES_PAGE_SIZE`; `getStory` tìm theo `slug`, ở `en` nếu không thấy thì tìm trong bài VI theo slug VI (giống B1).
  - `format.ts`: `formatPrice(vnd: number, lang): string` (`Intl.NumberFormat` `vi-VN` / `en-US`, `currency: 'VND'`); `formatWeight(grams: number, lang): string` (≥ 1000 → kg, tối đa 1 chữ số lẻ, ví dụ `2 kg`, `1,5 kg` ở vi / `1.5 kg` ở en; < 1000 → `500 g`); `formatDate(iso: string, lang): string` (`dateStyle: 'long'`, múi giờ `Asia/Ho_Chi_Minh`); `telHref(phone: string): string` → `tel:` + chỉ chữ số và `+`; `zaloHref(zalo: string): string` → nếu bắt đầu `http` thì giữ nguyên, ngược lại `https://zalo.me/` + chỉ chữ số.
- Fixture: VI và EN; 1 sản phẩm (3 đặc điểm, 2 quy cách 1000 g / 2000 g, `showPrice: false`, `priceVnd: null`), 3 mốc hành trình, 2 bài báo, 4 bài viết (trang chủ chỉ lấy 3), liên hệ đủ trường, `social.tiktok: null`; mọi `images: []`, mọi `image` / `cover` = `null`. Fixture EN cố ý giữ một vài chuỗi tiếng Việt (giống API trả bản VI khi thiếu EN), và một bài không có slug EN riêng.

- [ ] **Step 1: Viết test thất bại `fixtures.test.ts`** — duyệt đệ quy mọi giá trị chuỗi của 4 fixture: chuỗi là URL (`http`) thì bắt đầu bằng `https://example.com/`; chuỗi trong các trường chữ (`name`, `description`, `features[]`, `cookingTips`, `title`, `excerpt`, `bodyHtml`, `tagline`, `sourceName`, `address`, `hours`) bắt đầu bằng `[MẪU]` (với `bodyHtml`: phần chữ sau khi bỏ thẻ); `contact.phone` = `0000 000 000`; không có ảnh.
- [ ] **Step 2: Viết test thất bại `api-client.test.ts`** (dùng `fetchFn` giả, ghi lại URL và option) — `getHome('en')` gọi đúng URL và `next.tags` = `['home']`, `cache` = `'force-cache'`, có `signal`; `getStory('vi','a b')` gọi `/stories/a%20b` với tag `['stories','story:a b']`; 404 ở `getStory` → `null`; 500 → `ContentUnavailableError`; `fetchFn` ném `TimeoutError` → `ContentUnavailableError` (Review Focus 1); 404 ở `getHome` → `ContentUnavailableError`.
- [ ] **Step 3: Viết test thất bại `client.test.ts`** — `getContentClient({ CONTENT_SOURCE: 'mock' })` trả client mock (`getHome('vi')` có `products.length === 1`); `{ CONTENT_SOURCE: 'api' }` không có `API_BASE_URL` → ném lỗi có chữ `API_BASE_URL`; `{}` → ném lỗi có chữ `CONTENT_SOURCE`; mock `getStory('en', <slug VI của bài không có slug EN>)` trả bài đó; mock `getStories('vi', 1)` → `[]` (4 bài < 12).
- [ ] **Step 4: Viết test thất bại `format.test.ts`** — `formatWeight(2000,'vi')` = `2 kg`; `formatWeight(1500,'vi')` = `1,5 kg`; `formatWeight(1500,'en')` = `1.5 kg`; `formatWeight(500,'en')` = `500 g`; `formatPrice(180000,'vi')` chứa `180.000` và `₫`; `telHref('0000 000 000')` = `tel:0000000000`; `telHref('+84 912 345 678')` = `tel:+84912345678`; `zaloHref('0912 345 678')` = `https://zalo.me/0912345678`; `zaloHref('https://zalo.me/abc')` giữ nguyên; `formatDate('2026-01-15T03:00:00Z','vi')` chứa `2026`.
- [ ] **Step 5: Chạy** — FAIL. **Step 6: Viết code và fixture.** **Step 7: Chạy** `npm test && npm run typecheck` — PASS.
- [ ] **Step 8: Commit** — `feat(web): add content client for the public API with mock fixtures`

---

### Task 5: Khung trang — layout theo ngôn ngữ, header, footer, trang lỗi

**Files:**
- Create: `web/src/app/[lang]/layout.tsx`, `error.tsx`, `not-found.tsx`, `web/src/components/layout/SiteHeader.tsx`, `SiteHeader.test.tsx`, `MobileMenu.tsx`, `MobileMenu.test.tsx`, `LanguageSwitch.tsx`, `SiteFooter.tsx`, `SiteFooter.test.tsx`, `web/src/components/ui/ContentImage.tsx`, `ContentImage.test.tsx`, `SectionHeading.tsx`
- Modify: `web/next.config.ts` (`images`)

**Interfaces:**
- Consumes: `Lang`, `isLang`, `getDictionary`, route helpers, `SECTION_IDS` (Task 3); `HomeData`, `Contact`, `Social`, `getContentClient`, `zaloHref`, `telHref` (Task 4); `LogoMark` (Task 2).
- Produces:
  - `[lang]/layout.tsx`: root layout; `<html lang={lang}>` (lang không hợp lệ → `vi`), gắn biến font Pacifico / Quicksand (`display: 'swap'`, subset `latin`, `vietnamese`; Quicksand 400 / 500 / 700); link "Bỏ qua tới nội dung" tới `#noi-dung`. Header và footer do từng page render (page có `HomeData`), layout không tự lấy dữ liệu.
  - `<SiteHeader lang, dict, nav: Array<{ id: string; label: string }>, zalo: string | null, alternateHref: string />` — `<header>` dính trên cùng; `LogoMark` + chữ "Nếp Nhà" (Pacifico) link về `homePath(lang)`; menu link `${homePath(lang)}#<id>`; `LanguageSwitch`; nút Zalo (ẩn khi `zalo` là `null`). Màn hình < `md`: menu nằm trong `MobileMenu`.
  - `<MobileMenu label, closeLabel, children />` (client) — nút có `aria-expanded`, `aria-controls`; mở / đóng bằng nút; `Escape` đóng và trả focus về nút; bấm một link trong menu thì đóng.
  - `<LanguageSwitch lang, alternateHref, labels />` — link tới ngôn ngữ kia, có `hreflang` và `lang` của ngôn ngữ đích.
  - `<SiteFooter lang, dict, contact: Contact, social: Social />` — logo, liên hệ (chỉ trường khác `null`), mạng xã hội (link `target="_blank"` `rel="noopener noreferrer"`), `© <năm hiện tại> Nếp Nhà`.
  - `<ContentImage image: ImageRef | null, sizes: string, placeholderLabel: string, priority?: boolean, className? />` — `null` → `ImagePlaceholder`; ngược lại `next/image` với `src` = `toImageSrc(url)`, `width` / `height` / `alt` từ API.
  - `toImageSrc(url: string, siteUrl = process.env.SITE_URL): string` — đường dẫn bắt đầu bằng `/` → `${siteUrl}${url}`; URL tuyệt đối giữ nguyên.
  - `next.config.ts` `images`: `formats: ['image/avif', 'image/webp']`; `remotePatterns` gồm origin của `SITE_URL` với `pathname: '/media/**'`. `next.config.ts` đọc `SITE_URL` lúc build, nên bản build cho production phải có `SITE_URL` đúng (ghi vào `web/.env.example` và cho phần D).
  - `<SectionHeading id, title, kicker? />` — `<h2>` Pacifico, `id` cho neo.
  - `error.tsx` (client): thông báo lỗi bằng cả hai ngôn ngữ (không biết chắc ngôn ngữ), nút "Thử lại" (`reset()`), không in `error.message`. `not-found.tsx`: thông báo 404 hai ngôn ngữ + link về `/vi` và `/en`.

- [ ] **Step 1: Viết test thất bại `SiteHeader.test.tsx`** — có link về `/vi`; có đúng các mục `nav` truyền vào với `href` `/vi#san-pham`…; `zalo='0000 000 000'` → link `https://zalo.me/0000000000`; `zalo=null` → không có link Zalo; link đổi ngôn ngữ có `href` = `alternateHref` và `hreflang="en"`.
- [ ] **Step 2: Viết test thất bại `MobileMenu.test.tsx`** (user-event) — ban đầu `aria-expanded="false"` và menu ẩn; bấm → `true`, menu hiện; `Escape` → `false` và focus về nút; bấm link trong menu → đóng.
- [ ] **Step 3: Viết test thất bại `SiteFooter.test.tsx`** — `tiktok: null` → không có link TikTok; link mạng xã hội có `rel` chứa `noopener`; có số điện thoại dạng `tel:`.
- [ ] **Step 4: Viết test thất bại `ContentImage.test.tsx`** — `image=null` → `getByRole('img', { name: placeholderLabel })`; có ảnh → `<img>` có `alt` đúng; `toImageSrc('/media/2026/01/a.webp','https://x.vn')` = `https://x.vn/media/2026/01/a.webp`; `toImageSrc('https://cdn.example.com/a.webp')` giữ nguyên. (Mock `next/image` thành `<img>` trong test.)
- [ ] **Step 5: Chạy** — FAIL. **Step 6: Viết code.** **Step 7: Chạy** `npm test && npm run lint && npm run typecheck` — PASS.
- [ ] **Step 8: Commit** — `feat(web): add localized layout, header, footer and error pages`

---

### Task 6: Trang chủ — 6 khối nội dung

**Files:**
- Create: `web/src/components/home/Hero.tsx`, `ProductSection.tsx`, `Gallery.tsx`, `JourneySection.tsx`, `PressSection.tsx`, `StoriesSection.tsx`, `ContactSection.tsx`, các file `*.test.tsx` tương ứng (`Hero`, `ProductSection`, `Gallery`, `JourneySection`, `PressSection`, `ContactSection`), `web/src/lib/content/home-nav.ts`, `home-nav.test.ts`, `web/src/app/[lang]/page.tsx`
- Create (dùng chung với Task 7): `web/src/components/story/StoryCard.tsx`

**Interfaces:**
- Consumes: mọi thứ của Task 2–5.
- Produces:
  - `buildHomeNav(home: HomeData, dict: Dictionary): Array<{ id: string; label: string }>` — theo thứ tự `SECTION_IDS`; bỏ `san-pham` nếu `products` rỗng, `hanh-trinh` nếu `timeline` rỗng, `bao-chi` nếu `press` rỗng, `cau-chuyen` nếu `stories` rỗng; `lien-he` luôn có.
  - `<Hero lang, dict, tagline, zalo: string | null />` — `Mascot` (bản duy nhất trên trang) + `FieldBackdrop`; `<h1>` "Nếp Nhà" (Pacifico); tagline; nút "Liên hệ qua Zalo" (ẩn khi `zalo` null) và "Xem hành trình" (`#hanh-trinh`, ẩn khi không có hành trình). Phần tử LCP là chữ, không phải ảnh.
  - `<ProductSection lang, dict, product: Product />` — `Gallery`; 3 đặc điểm có icon SVG (tròn mẩy, dẻo, thơm — icon theo thứ tự, chữ lấy từ `features`); quy cách: `formatWeight`, cộng `formatPrice` khi `showPrice` và `priceVnd !== null`, ngược lại nhãn "Giá liên hệ"; `cookingTips` (gợi ý món). `packagings` rỗng → ẩn phần quy cách. Nhiều sản phẩm → mỗi sản phẩm một `<article>`.
  - `<Gallery images: ImageRef[], dict />` (client) — ảnh lớn + hàng ảnh nhỏ; bấm ảnh nhỏ đổi ảnh lớn; bấm ảnh lớn mở lightbox (`role="dialog"`, `aria-modal="true"`, có nút đóng, `Escape` đóng, mũi tên trái / phải đổi ảnh, đóng thì trả focus); `images` rỗng → một `ImagePlaceholder`, không có lightbox.
  - `<JourneySection dict, events: TimelineEvent[] />` — `<ol>` dọc; mỗi mốc: năm, tiêu đề, mô tả, ảnh (`ContentImage`); một đường kẻ dọc đơn giản màu `grain` (B4 thay bằng cây lúa mọc).
  - `<PressSection lang, dict, items: PressMention[] />` — thẻ: tên báo, tiêu đề, ngày (`formatDate`, ẩn khi `null`), ảnh; link `target="_blank"` `rel="noopener noreferrer"`.
  - `<StoryCard lang, story: StorySummary, dict />` — ảnh bìa, tiêu đề, trích đoạn, ngày, link `storyPath(lang, slug)`.
  - `<StoriesSection lang, dict, stories: StorySummary[] />` — tối đa 3 `StoryCard` + link "Xem tất cả" `storiesPath(lang)`.
  - `<ContactSection lang, dict, contact: Contact />` — điện thoại (`telHref`), Zalo (`zaloHref`), Messenger, địa chỉ + link Google Maps (`mapUrl`, mở tab mới, không nhúng iframe), giờ liên hệ; trường `null` bị ẩn; không có `<form>`.
  - `[lang]/page.tsx`: `generateStaticParams = () => []`; `isLang` sai → `notFound()`; `getContentClient().getHome(lang)`; render `SiteHeader` (`alternateHref` = `homePath(ngôn ngữ kia)`), `<main id="noi-dung">` với các khối theo `buildHomeNav` (khối rỗng không render), `SiteFooter`.

- [ ] **Step 1: Viết test thất bại `home-nav.test.ts`** — với fixture VI: 5 mục đúng thứ tự; `timeline: []` và `press: []` → không có `hanh-trinh`, `bao-chi`; `products: []` → không có `san-pham`; luôn có `lien-he` (Review Focus 2).
- [ ] **Step 2: Viết test thất bại cho từng khối** — `ProductSection`: `showPrice:false` → có "Giá liên hệ", không có `₫`; `showPrice:true, priceVnd:180000` → có `180.000`; `packagings: []` → không có tiêu đề quy cách. `Gallery`: 3 ảnh → bấm ảnh nhỏ thứ 2 đổi `alt` của ảnh lớn; bấm ảnh lớn → `getByRole('dialog')`; `ArrowRight` → ảnh 3; `Escape` → không còn dialog; `images: []` → có placeholder, bấm không mở dialog. `JourneySection`: `image:null` → placeholder, không lỗi; thứ tự giữ như mảng. `PressSection`: `publishedOn:null` → không in ngày; link có `target="_blank"`. `ContactSection`: không có `form`; `messenger:null` → không có link Messenger; có `tel:0000000000`. `Hero`: `zalo:null` → không có nút Zalo; có `h1` "Nếp Nhà".
- [ ] **Step 3: Chạy** — FAIL. **Step 4: Viết code.** **Step 5: Chạy** `npm test && npm run lint && npm run typecheck` — PASS.
- [ ] **Step 6: Kiểm tra bằng mắt** — `npm run build && cross-env CONTENT_SOURCE=mock npm start` (qua `npx cross-env` nếu shell không có), mở `http://localhost:3000/vi` và `/en` ở bề rộng 375px và 1280px; chụp màn hình gửi chủ dự án ở bước báo cáo task.
- [ ] **Step 7: Commit** — `feat(web): add home page sections`

---

### Task 7: Blog "Câu chuyện Nếp Nhà"

**Files:**
- Create: `web/src/app/[lang]/[section]/page.tsx`, `web/src/app/[lang]/[section]/[slug]/page.tsx`, `web/src/components/story/StoryBody.tsx`, `Pagination.tsx`, `Pagination.test.tsx`, `web/src/lib/content/story-routing.ts`, `story-routing.test.ts`

**Interfaces:**
- Consumes: `StoryCard` (Task 6), `getContentClient`, `STORIES_PAGE_SIZE`, route helpers, header / footer (Task 5).
- Produces:
  - `parsePage(value: string | string[] | undefined): number | null` — không có → `0`; số nguyên ≥ 0 → số đó; khác (âm, chữ, số lẻ, mảng) → `null` (page trả 404).
  - `storyAlternates(lang: Lang, story: StoryDetail): Record<Lang, string>` — đường dẫn của bài ở cả hai ngôn ngữ: ngôn ngữ hiện tại dùng `story.slug`; ngôn ngữ kia dùng `story.alternateSlug ?? story.slug`.
  - `<Pagination lang, page: number, hasNext: boolean, dict />` — link "Trang trước" khi `page > 0`, "Trang sau" khi `hasNext`; `<nav aria-label>`.
  - `<StoryBody html: string />` — `<div className="prose…" dangerouslySetInnerHTML>`; HTML đã được API làm sạch (B1 Task 7, jsoup) nên web không lọc lại; ảnh trong bài `max-width: 100%`, chữ dài được ngắt (`overflow-wrap: anywhere`).
  - `[section]/page.tsx`: `generateStaticParams = () => []`; `isLang` sai hoặc `!isStorySection(lang, section)` → `notFound()`; `searchParams.page` qua `parsePage`; `getStories(lang, page)`; `page > 0` và mảng rỗng → `notFound()`; `hasNext = items.length === STORIES_PAGE_SIZE`.
  - `[section]/[slug]/page.tsx`: `generateStaticParams = () => []`; kiểm tra như trên; `getStory` `null` → `notFound()`; render tiêu đề (`h1`), ngày, ảnh bìa, `StoryBody`, link quay lại danh sách; `alternateHref` của header = `storyAlternates(...)[ngôn ngữ kia]`.

- [ ] **Step 1: Viết test thất bại `story-routing.test.ts`** — `parsePage(undefined)` = 0; `'2'` → 2; `'-1'`, `'abc'`, `'1.5'`, `['1','2']` → `null`; `storyAlternates('vi', { slug: 'mua-gat', alternateSlug: 'harvest', … })` = `{ vi: '/vi/cau-chuyen/mua-gat', en: '/en/stories/harvest' }`; `alternateSlug: null` → `en: '/en/stories/mua-gat'` (Review Focus 5).
- [ ] **Step 2: Viết test thất bại `Pagination.test.tsx`** — `page=0, hasNext=true` → chỉ có "Trang sau" tới `/vi/cau-chuyen?page=1`; `page=1, hasNext=false` → chỉ có "Trang trước" tới `/vi/cau-chuyen`.
- [ ] **Step 3: Chạy** — FAIL. **Step 4: Viết code.** **Step 5: Chạy** `npm test && npm run lint && npm run typecheck` — PASS. (Kiểm tra 404 của `/vi/stories/x` và `/en/cau-chuyen/x` nằm trong e2e Task 10.)
- [ ] **Step 6: Commit** — `feat(web): add story list and story pages`

---

### Task 8: SEO — metadata, hreflang, JSON-LD, sitemap, robots, ảnh OpenGraph

**Files:**
- Create: `web/src/lib/seo/metadata.ts`, `metadata.test.ts`, `json-ld.ts`, `json-ld.test.ts`, `web/src/app/sitemap.ts`, `web/src/app/robots.ts`, `web/src/app/[lang]/opengraph-image.tsx`
- Modify: `web/src/app/[lang]/layout.tsx` (`metadataBase`), `web/src/app/[lang]/page.tsx`, `[section]/page.tsx`, `[section]/[slug]/page.tsx` (thêm `generateMetadata`, chèn JSON-LD ở trang chủ)

**Interfaces:**
- Consumes: route helpers, `storyAlternates` (Task 7), `HomeData`, `StoryDetail`, `getContentClient`.
- Produces:
  - `getSiteUrl(env = process.env): URL` — từ `SITE_URL`, mặc định `http://localhost:3000`.
  - `buildMetadata({ lang, title, description, paths: Record<Lang, string>, type?: 'website' | 'article' }): Metadata` — `alternates.canonical` = `paths[lang]`; `alternates.languages` = `{ vi: paths.vi, en: paths.en, 'x-default': paths.vi }`; `openGraph` có `locale` (`vi_VN` / `en_US`), `alternateLocale`, `siteName: 'Nếp Nhà'`, `type`.
  - `productJsonLd(product: Product, home: HomeData, siteUrl: URL): object` — `@type: 'Product'`, `name`, `description`, `brand: { @type: 'Brand', name: 'Nếp Nhà' }`, `image` (URL tuyệt đối, bỏ khi không có ảnh); có `offers` (`priceCurrency: 'VND'`, `price`, `AggregateOffer` khi nhiều quy cách) chỉ khi `showPrice` và có giá.
  - `localBusinessJsonLd(home: HomeData, siteUrl: URL): object` — `@type: 'LocalBusiness'`, `name: 'Nếp Nhà'`, `url`, `telephone` (khi có), `address` (khi có), `sameAs` (mạng xã hội khác `null`).
  - `<script type="application/ld+json">` trên trang chủ: chuỗi JSON thay `<` bằng `<`.
  - `sitemap.ts`: `export const dynamic = 'force-dynamic'` (không gọi API lúc build); mục `/vi`, `/en`, `/vi/cau-chuyen`, `/en/stories`, và mọi bài (đọc lần lượt các trang `getStories` tới khi hết) ở cả hai ngôn ngữ, mỗi mục có `alternates.languages`; bài có `lastModified` = `publishedAt`.
  - `robots.ts`: cho phép tất cả, `disallow: ['/admin', '/api/']`, `sitemap: ${siteUrl}/sitemap.xml`.
  - `opengraph-image.tsx`: `ImageResponse` 1200×630, nền `rice`, hình mascot / cánh đồng bằng hình khối màu `BRAND`, không có chữ (tránh phải nhúng font có dấu tiếng Việt; tiêu đề đã có trong `og:title`); `alt` theo ngôn ngữ.

- [ ] **Step 1: Viết test thất bại `metadata.test.ts`** — `buildMetadata({ lang: 'en', paths: { vi: '/vi', en: '/en' }, … })`: `alternates.canonical` = `/en`; `alternates.languages` = `{ vi: '/vi', en: '/en', 'x-default': '/vi' }`; `openGraph.locale` = `en_US`; `getSiteUrl({}).href` = `http://localhost:3000/`.
- [ ] **Step 2: Viết test thất bại `json-ld.test.ts`** — fixture (`showPrice:false`) → không có `offers`; `showPrice:true` với giá 180000 và 340000 → `offers['@type']` = `AggregateOffer`, `lowPrice` 180000, `highPrice` 340000, `priceCurrency` `VND`; ảnh `/media/a.webp` → `https://x.vn/media/a.webp`; `localBusinessJsonLd` bỏ `telephone` khi `phone: null` và `sameAs` chỉ có link khác `null`; chuỗi `</script>` trong `name` được thoát thành `</script>` khi serialize.
- [ ] **Step 3: Chạy** — FAIL. **Step 4: Viết code.** **Step 5: Chạy** `npm test && npm run lint && npm run typecheck && npm run build` — PASS (build xanh mà không cần `CONTENT_SOURCE`).
- [ ] **Step 6: Commit** — `feat(web): add SEO metadata, hreflang, JSON-LD, sitemap and robots`

---

### Task 9: Route revalidate cho API gọi

**Files:**
- Create: `web/src/lib/revalidate.ts`, `revalidate.test.ts`, `web/src/app/api/revalidate/route.ts`, `web/src/app/api/revalidate/route.test.ts`

**Interfaces:**
- Consumes: `TAG_HOME`, `TAG_STORIES`, `storyTag` (Task 4). Hợp đồng B1 Task 10: `POST {WEB_BASE_URL}/api/revalidate`, header `x-revalidate-secret`, body `{"tags":[…]}`.
- Produces:
  - `isValidSecret(given: string | null, expected: string | undefined): boolean` — `expected` rỗng / không có → `false`; so sánh bằng `crypto.timingSafeEqual` trên SHA-256 của hai chuỗi (độ dài bằng nhau).
  - `parseRevalidateTags(body: unknown): string[] | null` — hợp lệ khi `body.tags` là mảng 1–50 chuỗi, mỗi chuỗi là `home`, `stories`, hoặc `story:` + slug khớp `^[a-z0-9-]{1,80}$`; trả mảng đã bỏ trùng; sai → `null`.
  - `POST /api/revalidate` (`runtime` Node): secret sai → 401 `{"error":"unauthorized"}`; body không đọc được JSON hoặc `parseRevalidateTags` → `null` → 400 `{"error":"invalid tags"}`; hợp lệ → gọi `revalidateTag(tag, { expire: 0 })` cho từng tag (hết hạn ngay; nếu bản Next đang cài có chữ ký khác, làm theo tài liệu trong `node_modules/next/dist/docs/` với ý nghĩa "hết hạn ngay") → 200 `{"revalidated":[…]}`. Các phương thức khác → 405 (mặc định của Next).

- [ ] **Step 1: Viết test thất bại `revalidate.test.ts`** — `isValidSecret('a','a')` = true; `('a','b')` = false; `('a', undefined)` = false; `('', '')` = false; `(null,'a')` = false; `parseRevalidateTags({ tags: ['home','story:mua-gat','home'] })` = `['home','story:mua-gat']`; `{ tags: [] }`, `{ tags: ['admin'] }`, `{ tags: ['story:Có Dấu'] }`, `{ tags: 'home' }`, `null` → `null`.
- [ ] **Step 2: Viết test thất bại `route.test.ts`** (mock `next/cache` bằng `vi.mock`, đặt `process.env.REVALIDATE_SECRET` trong test) — đúng secret + `{"tags":["home","stories"]}` → 200 và `revalidateTag` được gọi 2 lần; sai secret → 401, không gọi; không có `REVALIDATE_SECRET` trên server → 401, không gọi; body `"abc"` (không phải JSON) → 400; `{"tags":["x"]}` → 400; không trường hợp lỗi nào gọi `revalidateTag` (Review Focus 4).
- [ ] **Step 3: Chạy** — FAIL. **Step 4: Viết code.** **Step 5: Chạy** `npm test && npm run lint && npm run typecheck` — PASS.
- [ ] **Step 6: Commit** — `feat(web): add revalidate endpoint for content changes`

---

### Task 10: Kiểm thử đầu-cuối bằng Playwright, a11y, CI e2e

**Files:**
- Create: `web/playwright.config.ts`, `web/e2e/fake-api.mjs`, `web/e2e/home.spec.ts`, `web/e2e/stories.spec.ts`, `web/e2e/seo.spec.ts`, `web/e2e/a11y.spec.ts`, `web/e2e/revalidate.spec.ts`
- Modify: `web/package.json` (dev deps `@playwright/test`, `@axe-core/playwright`; script `test:e2e`), `web/vitest.config.mts` (loại trừ `e2e/**`), `web/.gitignore` (`test-results/`, `playwright-report/`), `.github/workflows/web.yml` (job `e2e`), `docs/setup.md` (lệnh chạy e2e)

**Interfaces:**
- Consumes: toàn bộ web; fixture Task 4.
- Produces:
  - `fake-api.mjs`: server `node:http` cổng `4010`, trả fixture JSON theo đúng URL của B1 (`/api/public/{lang}/home`, `/stories`, `/stories/{slug}`, 404 cho lang lạ / slug lạ); `POST /__test/tagline` body `{"vi":"…"}` đổi tagline VI trong bộ nhớ (chỉ để test).
  - `playwright.config.ts`: chỉ Chromium; `webServer` là mảng 3 server: (1) `node e2e/fake-api.mjs`; (2) bản build chạy dữ liệu mẫu ở cổng `3100` (`next start -p 3100`, env `CONTENT_SOURCE=mock`, `SITE_URL=http://localhost:3100`); (3) bản build chạy với API giả ở cổng `3200` (`CONTENT_SOURCE=api`, `API_BASE_URL=http://localhost:4010`, `REVALIDATE_SECRET=e2e-secret`, `SITE_URL=http://localhost:3200`). Hai project: `mock` (`baseURL` 3100, mọi spec trừ revalidate) và `api` (`baseURL` 3200, chỉ `revalidate.spec.ts`). Build một lần trước khi chạy (`npm run build` trong CI; script `test:e2e` = `playwright test`, tài liệu ghi chạy `npm run build` trước).

- [ ] **Step 1: Viết `home.spec.ts`** — `/` với header `Accept-Language: en-US` → URL cuối là `/en`; không header → `/vi`; `/vi` có `h1` "Nếp Nhà", có chữ `[MẪU]`, có link `https://zalo.me/0000000000`; đổi ngôn ngữ bằng `LanguageSwitch` → `/en` và `html[lang="en"]`; ở viewport 375×812 menu ☰ mở / đóng được và link "Liên hệ" cuộn tới `#lien-he`; ở viewport 320×640: `document.documentElement.scrollWidth <= clientWidth` trên `/vi`, `/en` và một trang bài (Review Focus 3); `reducedMotion: 'reduce'` → `getComputedStyle(html).scrollBehavior` = `auto`; `/fr` → 404.
- [ ] **Step 2: Viết `stories.spec.ts`** — `/vi/cau-chuyen` có 4 thẻ bài; mở một bài → `h1` đúng tiêu đề; `/vi/stories/<slug>` và `/en/cau-chuyen/<slug>` → 404; `/en/stories/<slug-vi của bài không có slug EN>` → 200 (Review Focus 5); `/vi/cau-chuyen?page=abc` → 404; `/vi/cau-chuyen/khong-co` → 404.
- [ ] **Step 3: Viết `seo.spec.ts`** — `/vi` có `link[rel=alternate][hreflang=en]` trỏ `/en`, `hreflang=x-default` trỏ `/vi`, `link[rel=canonical]`; có `script[type="application/ld+json"]` parse được và có `@type` `Product` và `LocalBusiness`; trang bài có `hreflang` theo `storyAlternates`; `/robots.txt` có `Disallow: /admin`; `/sitemap.xml` có `/en/stories`.
- [ ] **Step 4: Viết `a11y.spec.ts`** — `AxeBuilder` với tag `wcag2a`, `wcag2aa` trên `/vi`, `/en`, `/vi/cau-chuyen` và một trang bài: `violations` = `[]`.
- [ ] **Step 5: Viết `revalidate.spec.ts`** (project `api`) — mở `/vi`, đọc tagline A; `POST http://localhost:4010/__test/tagline` đổi thành B; tải lại `/vi` → vẫn A (trang đã lưu tĩnh); `POST /api/revalidate` với `x-revalidate-secret: e2e-secret` và `{"tags":["home"]}` → 200; tải lại `/vi` → B (tiêu chí thành công 4). Cùng request với secret sai → 401.
- [ ] **Step 6: Chạy** `npm run build && npm run test:e2e` — Expected: PASS. Lỗi a11y hoặc lỗi hiển thị → sửa ở component của task tương ứng, kèm test Vitest nếu sửa logic.
- [ ] **Step 7: CI job `e2e`** trong `web.yml` — `ubuntu-latest`, `needs: web`, `working-directory: web`, node 22 có cache npm; `npm ci`, `npx playwright install --with-deps chromium`, `npm run build`, `npm run test:e2e`; tải `playwright-report/` lên artifact khi lỗi; `timeout-minutes: 20`.
- [ ] **Step 8: Commit** — `test(web): add Playwright end-to-end, accessibility and revalidate tests`

---

### Task 11: Chạy thật, đo Lighthouse, cập nhật tài liệu

**Files:**
- Modify: `docs/setup.md`, `docs/session/STATE.md`

- [ ] **Step 1: Chạy bản build với dữ liệu mẫu** — `cd web && npm run build && npx cross-env CONTENT_SOURCE=mock SITE_URL=http://localhost:3000 npm start`.
- [ ] **Step 2: Đo Lighthouse mobile** — `npx lighthouse http://localhost:3000/vi --form-factor=mobile --only-categories=performance,accessibility,seo --output=json --output-path=<thư mục scratchpad>` và tương tự cho `/en`. Expected: mỗi điểm ≥ 90, LCP < 2,5 s. Điểm thấp hơn → sửa nguyên nhân (font, ảnh, JS client) rồi đo lại; không commit file báo cáo Lighthouse.
- [ ] **Step 3: Nếu B1 đã merge vào `main`** — chạy API theo `docs/setup.md`, `npm run dev:api`, xem `/vi` có dữ liệu seed `[MẪU]` của B1. Nếu B1 chưa merge, ghi "chưa thử với API thật" vào `STATE.md`.
- [ ] **Step 4: `docs/setup.md`** — thêm bảng điểm Lighthouse đo được (ngày, máy, `/vi`, `/en`) và các lệnh e2e.
- [ ] **Step 5: `docs/session/STATE.md`** — B2 xong trên nhánh `feat/phan-b2-web`; khoảng trống hợp đồng API (bảng ở đầu plan này) chờ B1 xác nhận; việc tiếp theo: B3 (admin) hoặc B4 (hiệu ứng).
- [ ] **Step 6: Commit** — `docs: record part B2 local run and Lighthouse scores`
