# Phần B3 — Trang quản trị (admin): Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang quản trị `/admin` trong app Next.js `web/`. Trang này chỉ có tiếng Việt, làm cho điện thoại trước, có menu ở dưới cùng. Người nhà dùng nó để sửa toàn bộ nội dung của website (sản phẩm, hành trình, báo chí, câu chuyện, ảnh, liên hệ), quản lý tài khoản, xem lịch sử sửa và khôi phục bản trước. Mọi việc đều gọi API B1 đã có.

**Architecture:**
- Admin là một nhánh route riêng `web/src/app/admin/`, có layout gốc riêng (`<html lang="vi">`). Nó không đi qua `[lang]` và không bị proxy ngôn ngữ chặn.
- Mọi màn hình là client component. Chúng gọi API cùng gốc `/api/*` qua một module `adminFetch`. Module này lo token CSRF (lấy từ `GET /api/auth/csrf`), cookie phiên và lỗi problem+json.
- Server của Next không đọc dữ liệu riêng tư nào.
- Ở production, Caddy chuyển `/api/*` sang Spring và phục vụ `/media/*`.
- Ở local và trong e2e, `next.config.ts` có rewrite dự phòng: `/api/*` → API. Ngoài ra có một route chỉ chạy ở dev để phục vụ `/media/*` từ thư mục ảnh.
- Task 1 bổ sung ba thứ nhỏ vào API mà admin cần:
  - mã lỗi máy đọc được (`code` trong problem+json),
  - nhãn và cờ "khôi phục được" cho dòng lịch sử,
  - xem chi tiết một dòng lịch sử.

**Tech Stack:**
- Nền có sẵn từ B2: Node ≥ 22, Next.js 16.4.x, React 19, TypeScript, Tailwind CSS 4, Vitest 5 + Testing Library, Playwright 1.64 + `@axe-core/playwright`.
- Thêm cho admin:
  - shadcn/ui: chép component vào `web/src/components/admin/ui/`; Radix ở bên dưới; thông báo nhỏ (toast) dùng `sonner`.
  - Tiptap 3: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-image`.
  - `@dnd-kit/core` + `@dnd-kit/sortable` để kéo thả.
  - `qrcode` để tạo mã QR cho TOTP.
- Phía API (Task 1): Spring Boot 4.0.9, Java 21, như B1.

**Spec:** `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md`: mục 4.1 (9 màn hình admin), 4.2 (đăng nhập, bảo mật), 4.5 (ảnh), 4.6 (kiểm thử: Playwright "đăng nhập admin, sửa nội dung rồi thấy trang công khai đổi"). API đã có: plan B1 `docs/superpowers/plans/2026-11-03-phan-b1-api-database.md` và code trong `api/` (đã merge vào `main`).

## Global Constraints

- **Nền tảng:**
  - Node ≥ 22; `web/package-lock.json` được commit. Script chạy được trên Windows (Git Bash) và Linux (dùng `cross-env` khi cần).
  - Next 16 khác bản cũ (ví dụ `proxy.ts` thay cho middleware). Trước khi viết code Next, đọc `web/AGENTS.md` và tài liệu trong `web/node_modules/next/dist/docs/`. Ghi khác biệt với plan vào báo cáo task.
- **Ngôn ngữ và giao diện:**
  - Giao diện admin chỉ có tiếng Việt. Nội dung vẫn nhập hai ngôn ngữ VI và EN.
  - Mobile-first: thiết kế cho màn hình 375 px trước. Mỗi vùng bấm cao và rộng ít nhất 44 px. Không màn hình nào cuộn ngang ở 320 px.
  - Màu và font giống B2: token `earth`, `coat`, `grain`, `straw`, `rice`, `sprout` trong `web/src/app/globals.css`, font Quicksand. Vàng lúa (`grain`) không bao giờ là màu chữ trên nền sáng. Mọi cặp chữ / nền đạt WCAG AA (≥ 4,5:1).
- **Gọi API:**
  - Admin gọi API chỉ qua đường dẫn cùng gốc `/api/...`. Không gọi thẳng `localhost:8080` từ trình duyệt, nên không cần CORS.
  - Mọi đường dẫn quản trị nằm dưới `/api/admin/**`; đăng nhập nằm ở `/api/auth/**`.
  - Token CSRF lấy từ JSON của `GET /api/auth/csrf` (`{"headerName","token"}`). Cookie `XSRF-TOKEN` có `Path=/api`, nên trang `/admin` không đọc được nó. Mọi request POST / PUT / DELETE gửi header `X-XSRF-TOKEN`.
  - Token đổi sau khi đăng nhập và đăng xuất, nên phải lấy lại token mỗi lần như vậy.
- **Lỗi API:**
  - Lỗi API là problem+json có `detail` tiếng Việt. Admin hiện nguyên `detail`, không tự viết lại thông báo của API.
  - Riêng HTTP 413 (Caddy trả chữ thường, không phải JSON): hiện "Ảnh quá lớn. Tối đa 15 MB."
- **Ảnh:**
  - Trước khi tải ảnh, kiểm tra ở trình duyệt:
    - Dung lượng ≤ 15 MB.
    - Loại ảnh `image/jpeg`, `image/png` hoặc `image/webp`.
    - Ảnh HEIC / HEIF (theo `type` hoặc đuôi `.heic` / `.heif`) → hiện "Ảnh HEIC chưa được hỗ trợ. Hãy chọn ảnh JPEG hoặc PNG."
  - Mô tả ảnh VI và EN đều bắt buộc.
- **Song ngữ:**
  - Ô song ngữ là `LocalizedText = { vi: string | null; en: string | null }`. Ô trống gửi `null`, không gửi `""`. Mọi ô chữ được cắt khoảng trắng hai đầu trước khi gửi (email cũng vậy, và còn đổi sang chữ thường).
  - Nhãn "thiếu EN" (luật R12 của B1) chỉ hiện khi bản VI có chữ và bản EN trống. Danh sách nội dung dùng cờ `missingEn` mà API trả về.
- **Trình soạn thảo câu chuyện:**
  - Chỉ cho các thẻ mà API giữ lại khi làm sạch: `p, h2, h3, strong, em, a[href], ul, ol, li, blockquote, img[src, alt]`.
  - Ảnh chèn vào bài lấy từ thư viện ảnh (`/media/...`). Không dán ảnh từ ngoài vào.
- **Bảo mật và SEO cho trang admin:**
  - Mọi trang `/admin` có `robots: noindex, nofollow`. `robots.txt` chặn `/admin`. Header `Cache-Control: no-store`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`.
- **Không có secret trong repo:**
  - Mật khẩu tạm do admin tạo hiện ra một lần để sao chép, không lưu ở trình duyệt.
  - Test e2e tự sinh mật khẩu mỗi lần chạy.
- **Code, test, commit:**
  - Code, test và commit viết tiếng Anh. Không có dòng `Co-Authored-By`. Dùng LF.
  - Java: mỗi file một kiểu top-level, WARN (không ERROR) cho lỗi đã xử lý.
- **Ngoài phạm vi:**
  - Hai người cùng sửa một mục thì người lưu sau thắng, vì API không khóa lạc quan (luật R13 của B1). Lỡ ghi đè vẫn khôi phục được từ Lịch sử.
  - Không có GSAP (đó là phần B4).
  - Không phục vụ `/media` ở production (đó là phần D).

## Review Focus

1. **Phiên hết hạn trong lúc đang sửa** (để điện thoại qua đêm rồi bấm Lưu → 401): chữ đang gõ không mất. Một hộp đăng nhập lại hiện ngay trên form. Đăng nhập xong thì lưu lại đúng một lần. (Test ở Task 3 và Task 5)
2. **Bấm Lưu hai lần khi mạng điện thoại chậm:** nút Lưu bị khóa trong lúc chờ, nên chỉ có một request. (Test ở Task 4)
3. **Rời form khi còn thay đổi chưa lưu** (bấm menu dưới, nút quay lại, đóng tab): hỏi xác nhận trước khi đi. (Test ở Task 4)
4. **Tải ảnh từ điện thoại bị lỗi** (HEIC, lớn hơn 15 MB, Caddy trả 413 dạng chữ, API bận 503, mất mạng giữa chừng): hiện thông báo tiếng Việt rõ ràng, giữ nguyên mô tả VI / EN đã gõ, cho thử lại. (Test ở Task 4)
5. **Chữ tiếng Việt dài** (tên, địa chỉ, URL bài báo dài) **trên màn hình 375 px:** không màn hình admin nào cuộn ngang; menu dưới không che nút Lưu. (Test ở Task 11)

---

## Quyết định cho B3

| # | Quyết định | Lý do |
|---|---|---|
| D1 | Admin là client component, gọi `/api/*` cùng gốc | Cookie phiên `HttpOnly` đi kèm tự động; server Next không cần chuyển cookie sang API |
| D2 | Local / e2e: rewrite dự phòng `/api/:path*` → `API_PROXY_ORIGIN` (chỉ khi biến này có lúc build) | Route `/api/revalidate` của web vẫn thắng vì rewrite dự phòng chỉ chạy khi không route nào khớp; production không đặt biến này vì Caddy làm việc chia đường |
| D3 | Route dev `src/app/media/[...path]/route.ts` đọc file từ `MEDIA_DEV_DIR`; trả 404 khi `NODE_ENV === "production"` hoặc biến trống | Ảnh hiện được ở local (đóng khoảng trống R20 của B1); production không bao giờ dùng route này vì Caddy phục vụ `/media/*` trước Next |
| D4 | Menu dưới có 5 mục: Tổng quan, Câu chuyện, Ảnh, Lịch sử, Thêm (☰ mở danh sách: Sản phẩm, Hành trình, Báo chí, Liên hệ & cài đặt, Tài khoản, Đăng xuất) | 9 màn hình không vừa một thanh dưới trên màn hình 375 px |
| D5 | Kéo thả dùng dnd-kit (cảm biến chạm + bàn phím), kèm nút ↑ / ↓ cho từng mốc | Kéo trên điện thoại dễ trượt; nút ↑ / ↓ cũng giúp người dùng bàn phím |
| D6 | "Xem trước" câu chuyện hiện bản đã lưu do API trả về, đã được làm sạch, dùng component `StoryBody` của B2 | Không render HTML chưa làm sạch; xem trước giống hệt trang công khai |
| D7 | Đăng nhập cần TOTP: API trả 401 có `code: "totp-required"` → form hiện thêm ô mã 6 số | Không dò theo chữ trong `detail` |
| D8 | Kiểm thử đầu-cuối chạy với API thật và Postgres tạm (container docker) qua `web/e2e-fullstack/run.mjs`; CI có workflow riêng | Spec 4.6 yêu cầu "sửa nội dung rồi thấy trang công khai đổi"; giả lập toàn bộ API admin sẽ tốn hơn và không chứng minh được việc đó |

## File Structure

```
api/src/main/java/vn/nepnhaxudong/
├── common/ApiException.java, ApiExceptionHandler.java      Task 1 (thêm `code`)
├── auth/*Exception.java, MustChangePasswordFilter.java,
│   ProblemSecurityHandlers.java                            Task 1 (đặt `code`)
└── audit/AuditEntryDto.java, AuditDetailDto.java (mới),
    AuditLabels.java (mới), AuditController.java            Task 1

web/
├── next.config.ts                     Task 2 (rewrite dự phòng, header /admin)
├── src/lib/i18n/path-guard.ts         Task 2 (cho `/admin`, `/media` đi qua)
├── src/app/robots.ts                  Task 2 (chặn /admin)
├── src/app/media/[...path]/route.ts   Task 2 (chỉ dev)
├── src/app/admin/
│   ├── layout.tsx                     Task 2 (layout gốc của admin)
│   ├── (auth)/dang-nhap/page.tsx, doi-mat-khau/page.tsx       Task 3
│   ├── (app)/layout.tsx               Task 3 (chặn khi chưa đăng nhập + menu dưới)
│   ├── (app)/page.tsx                 Task 10 (Tổng quan)
│   ├── (app)/anh/page.tsx             Task 4
│   ├── (app)/san-pham/page.tsx, san-pham/[id]/page.tsx        Task 5
│   ├── (app)/hanh-trinh/page.tsx      Task 6
│   ├── (app)/bao-chi/page.tsx         Task 7
│   ├── (app)/cau-chuyen/page.tsx, cau-chuyen/[id]/page.tsx    Task 8
│   ├── (app)/cai-dat/page.tsx, tai-khoan/page.tsx             Task 9
│   └── (app)/lich-su/page.tsx         Task 10
├── src/lib/admin/
│   ├── api.ts, errors.ts, csrf.ts     Task 2
│   ├── types.ts                       Task 2 (kiểu theo record Java của B1)
│   ├── routes.ts                      Task 2
│   ├── session.tsx                    Task 3
│   ├── localized.ts, upload-check.ts, Task 4
│   │   use-unsaved-changes.ts, use-save.ts
│   ├── story-editor.ts                Task 8
│   └── audit-diff.ts                  Task 10
├── src/components/admin/
│   ├── ui/                            Task 2 (shadcn: button, input, textarea, label,
│   │                                  dialog, alert-dialog, sheet, tabs, switch, badge, sonner)
│   ├── shell/                         Task 3 (BottomNav, MoreSheet, ReLoginDialog, LoginForm)
│   ├── form/                          Task 4 (BilingualField, MissingEnBadge, SaveBar,
│   │                                  ConfirmDialog, ProblemMessage)
│   ├── media/                         Task 4 (MediaUploader, MediaGrid, MediaPicker)
│   └── <màn hình>/                    Task 5–10
├── e2e-fullstack/                     Task 11 (run.mjs, playwright.fullstack.config.ts, *.spec.ts)
└── .env.example                       Task 2 (API_PROXY_ORIGIN, MEDIA_DEV_DIR)
.github/workflows/fullstack.yml        Task 11
docs/setup.md, docs/session/STATE.md   Task 11
```

---

### Task 1: API — mã lỗi máy đọc được, nhãn và chi tiết lịch sử

**Files:**
- Modify: `api/src/main/java/vn/nepnhaxudong/common/ApiException.java`, `common/ApiExceptionHandler.java`, `auth/TotpRequiredException.java`, `auth/AccountLockedException.java`, `auth/SessionExpiredException.java`, `auth/MustChangePasswordFilter.java`, `auth/ProblemSecurityHandlers.java`, `audit/AuditEntryDto.java`, `audit/AuditController.java`, `audit/AuditLogRepository.java`
- Create: `audit/AuditDetailDto.java`, `audit/AuditLabels.java`
- Test: `api/src/test/java/vn/nepnhaxudong/common/ProblemCodeTest.java`, `audit/AuditDetailTest.java`

**Interfaces:**
- Consumes: `AuditRestoreService` (biết loại nào có handler khôi phục được), `AuditLog` (before/after JSON).
- Produces:
  - `ApiException(HttpStatus status, String detail, String code)` (giữ constructor cũ với `code = null`). Khi `code != null`, `handleApi` thêm thuộc tính `code` vào ProblemDetail.
  - Các mã cố định:
    - `totp-required` (TotpRequiredException)
    - `account-locked` (AccountLockedException)
    - `session-expired` (SessionExpiredException và 401 của Spring Security khi chưa đăng nhập)
    - `must-change-password` (403 của MustChangePasswordFilter)
    - `csrf-invalid` (403 khi token CSRF thiếu hoặc sai)
  - `GET /api/admin/audit` → mỗi phần tử thêm hai trường: `label` (string) và `restorable` (boolean).
  - `GET /api/admin/audit/{id}` → `AuditDetailDto(long id, String userDisplayName, String entityType, long entityId, AuditAction action, Instant createdAt, String label, boolean restorable, JsonNode before, JsonNode after)`. Id không có → 404 "Không tìm thấy dòng lịch sử."
  - `AuditLabels.label(String entityType, long entityId, JsonNode before, JsonNode after): String`:
    - Lấy bản `after`; nếu `after` là null thì lấy `before`.
    - Trả giá trị chữ đầu tiên không trống trong thứ tự: `name.vi`, `title.vi`, `displayName`, `email`, `altVi`.
    - Với `site_setting`, trả tên khóa cài đặt bằng tiếng Việt: `contact` → "Liên hệ", `social` → "Mạng xã hội", `brand` → "Thương hiệu".
    - Nếu không có giá trị nào, trả `"#" + entityId`.
  - `restorable` đúng khi cả bốn điều kiện sau đều đúng:
    - `action != CREATE`
    - có `before`
    - loại nội dung có handler khôi phục được (không phải `media`, không phải `app_user`)
    - `entityType` có handler

- [ ] **Step 1: Viết test thất bại**
  - `ProblemCodeTest`:
    - Đăng nhập tài khoản đã bật TOTP mà không gửi mã → 401, JSON có `"code":"totp-required"` và `detail` giữ nguyên "Cần mã xác thực 2 lớp.".
    - Khóa sau 5 lần sai → 423 `"code":"account-locked"`.
    - `GET /admin/products` khi chưa đăng nhập → 401 `"code":"session-expired"`.
    - Tài khoản phải đổi mật khẩu gọi `/admin/products` → 403 `"code":"must-change-password"`.
    - POST `/admin/timeline` không có header CSRF → 403 `"code":"csrf-invalid"`.
    - Lỗi validation → không có trường `code`.
  - `AuditDetailTest`:
    - Sửa tiêu đề một mốc → danh sách có `label` = `title.vi` mới và `restorable = true`.
    - Dòng CREATE → `restorable = false`.
    - Dòng `media` và `app_user` → `restorable = false`.
    - Chi tiết trả `before` / `after` là object JSON, không phải chuỗi.
    - Chi tiết của dòng `app_user` không chứa `passwordHash` và không chứa `totpSecret`.
    - Id lạ → 404 tiếng Việt.
- [ ] **Step 2: Chạy** `cd api && ./mvnw -B -q test -Dtest='ProblemCodeTest,AuditDetailTest'` → FAIL.
- [ ] **Step 3: Viết code** theo Interfaces.
  - `ProblemSecurityHandlers` phân biệt lỗi CSRF (`CsrfException`) với lỗi 403 khác.
  - Không thêm truy vấn theo từng dòng cho `label`: nhãn đọc từ JSON đã có trong `audit_log`.
- [ ] **Step 4: Chạy toàn bộ** `cd api && ./mvnw -B verify` → PASS (≥ 525 test cũ vẫn xanh).
- [ ] **Step 5: Commit** — `feat(api): add problem codes and audit labels for the admin`

---

### Task 2: Khung admin — layout gốc, chia đường local, client API

**Files:**
- Create:
  - `web/src/app/admin/layout.tsx`
  - `web/src/app/media/[...path]/route.ts`
  - `web/src/lib/admin/{api.ts,errors.ts,csrf.ts,types.ts,routes.ts}`
  - `web/src/components/admin/ui/*` (shadcn)
  - `web/components.json`
- Modify:
  - `web/next.config.ts`
  - `web/src/lib/i18n/path-guard.ts` (+ test)
  - `web/src/app/robots.ts` (+ test)
  - `web/.env.example`
  - `web/package.json`
- Test: `web/src/lib/admin/api.test.ts`, `web/src/app/media/media-route.test.ts`, `web/src/lib/i18n/path-guard.test.ts`

**Interfaces:**
- Produces:
  - `adminFetch<T>(path: string, init?: { method?: "GET"|"POST"|"PUT"|"DELETE"; body?: unknown; signal?: AbortSignal }): Promise<T>`.
    - `path` không có `/api` ở đầu, ví dụ `"/admin/products"`.
    - Gửi JSON với `credentials: "same-origin"`.
    - Trả `undefined` khi nhận 204.
  - `adminUpload<T>(path: string, form: FormData): Promise<T>`: multipart, không tự đặt `Content-Type`.
  - `class AdminApiError extends Error { status: number; detail: string; code: string | null }`.
    - Body là problem+json → `detail` lấy từ body.
    - 413 → `detail = "Ảnh quá lớn. Tối đa 15 MB."`.
    - Mất mạng → `status = 0`, `detail = "Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại."`.
    - Body không phải JSON → `detail = "Đã có lỗi xảy ra. Hãy thử lại sau."`.
  - `isSessionExpired(e: unknown): boolean` (401 với `code` là `session-expired` hoặc không có `code`).
  - `csrf.ts`:
    - `getCsrfToken(): Promise<string>` lấy một lần rồi giữ trong bộ nhớ.
    - `resetCsrfToken(): void` (gọi sau khi đăng nhập, đăng xuất, đổi mật khẩu).
    - `adminFetch` tự gửi header `X-XSRF-TOKEN` cho POST / PUT / DELETE.
    - Gặp 403 `csrf-invalid` → xóa token, lấy lại, gửi lại đúng 1 lần.
  - `types.ts`: kiểu TypeScript khớp từng trường với các record Java:
    - `ProductAdminDto` / `ProductRequest` / `PackagingDto`
    - `TimelineEventAdminDto` / `TimelineEventRequest`
    - `PressMentionAdminDto` / `PressMentionRequest` / `PressPreviewDto`
    - `StoryAdminDto` / `StoryRequest`
    - `MediaAdminDto`
    - `SiteSettingAdminDto` / `ContactSettings` / `SocialSettings` / `BrandSettings`
    - `UserSummary` / `UserResponse` / `CreateUserRequest` / `ResetPasswordRequest` / `TotpSetupResponse`
    - `AuditEntryDto` / `AuditDetailDto` (Task 1)
    - `LocalizedText` / `LocalizedList`

    Đọc file Java trong `api/src/main/java/vn/nepnhaxudong/**`. Không đoán.
  - `routes.ts`: `ADMIN_ROUTES = { home: "/admin", login: "/admin/dang-nhap", changePassword: "/admin/doi-mat-khau", products: "/admin/san-pham", timeline: "/admin/hanh-trinh", press: "/admin/bao-chi", stories: "/admin/cau-chuyen", media: "/admin/anh", settings: "/admin/cai-dat", accounts: "/admin/tai-khoan", history: "/admin/lich-su" } as const`.
  - `next.config.ts`:
    - `rewrites()` trả `{ fallback: [{ source: "/api/:path*", destination: \`${API_PROXY_ORIGIN}/api/:path*\` }] }` chỉ khi `API_PROXY_ORIGIN` có lúc build. Nếu không có thì trả `{ fallback: [] }`.
    - `headers()` cho `/admin/:path*` các header ở Global Constraints.
  - Route `/media/[...path]`:
    - `GET` đọc file trong `MEDIA_DEV_DIR` khi `NODE_ENV !== "production"`.
    - Từ chối `..`, đường dẫn tuyệt đối, ký tự `\`, và đường dẫn sau khi chuẩn hóa nằm ngoài thư mục → 404.
    - `Content-Type` theo đuôi (`.jpg`, `.png`, `.webp`).
    - Kèm `X-Content-Type-Options: nosniff`.
  - `path-guard.ts`: `admin` và `media` là tiền tố đi qua (`"pass"`).
  - `layout.tsx` của admin:
    - `<html lang="vi">`, font Quicksand, `globals.css`, `<Toaster />`.
    - `metadata.robots = { index: false, follow: false }`.
    - `title.template = "%s · Quản trị Nếp Nhà"`.

- [ ] **Step 1: Viết test thất bại**
  - `api.test.ts` (giả `fetch`):
    - POST gửi header `X-XSRF-TOKEN` lấy từ `/api/auth/csrf`, và chỉ lấy token 1 lần cho 2 request.
    - 403 `csrf-invalid` → lấy token mới, gửi lại đúng 1 lần, rồi trả kết quả.
    - 413 có body chữ → `AdminApiError` với `detail` = "Ảnh quá lớn. Tối đa 15 MB.".
    - `fetch` ném `TypeError` → `status === 0` và thông báo mất mạng.
    - 204 → `undefined`.
    - `adminUpload` không đặt `Content-Type`.
  - `media-route.test.ts`:
    - `/media/2026/11/a.webp` trả đúng byte và đúng `Content-Type`.
    - `/media/../secret.txt` → 404.
    - `/media/..%2fsecret.txt` → 404.
    - `NODE_ENV=production` → 404.
    - `MEDIA_DEV_DIR` trống → 404.
  - `path-guard.test.ts`: `/admin`, `/admin/cau-chuyen/3` và `/media/2026/11/a.jpg` → `"pass"`. `/vi`, `/xx` giữ kết quả cũ.
  - `robots.ts` test: có `disallow` chứa `/admin`.
- [ ] **Step 2: Chạy** `cd web && npm test` → FAIL.
- [ ] **Step 3: Cài và viết code.**
  - Cài shadcn bằng `npx shadcn@latest init`, rồi thêm các component ở File Structure vào `src/components/admin/ui`.
  - Ánh màu của shadcn sang token thương hiệu, và chỉ áp trong cây admin, để trang công khai không đổi.
  - Cài `sonner`.
  - `.env.example` thêm `API_PROXY_ORIGIN=http://localhost:8080` và `MEDIA_DEV_DIR=../api/data/media`, có chú thích "chỉ dùng ở local".
- [ ] **Step 4: Chạy** `cd web && npm test && npm run lint && npm run typecheck && npm run build` → PASS. Bản build không có `API_PROXY_ORIGIN` thì không có rewrite. Kiểm tra bằng cách đọc `.next/routes-manifest.json` trong test hoặc báo cáo.
- [ ] **Step 5: Commit** — `feat(web): add admin root layout, API client and local routing`

---

### Task 3: Đăng nhập, đổi mật khẩu, chặn trang, menu dưới

**Files:**
- Create:
  - `web/src/lib/admin/session.tsx`
  - `web/src/components/admin/shell/{LoginForm.tsx,ReLoginDialog.tsx,BottomNav.tsx,MoreSheet.tsx,AdminHeader.tsx}`
  - `web/src/app/admin/(auth)/dang-nhap/page.tsx`
  - `web/src/app/admin/(auth)/doi-mat-khau/page.tsx`
  - `web/src/app/admin/(app)/layout.tsx`
- Test: `web/src/components/admin/shell/*.test.tsx`, `web/src/lib/admin/session.test.tsx`

**Interfaces:**
- Consumes: `adminFetch`, `AdminApiError`, `isSessionExpired`, `resetCsrfToken`, `ADMIN_ROUTES` (Task 2).
- Produces:
  - `AdminSessionProvider` cùng hook `useAdminSession(): { status: "loading" | "signed-out" | "must-change-password" | "ready"; user: UserResponse | null; refresh(): Promise<void>; signOut(): Promise<void>; requireReLogin(): Promise<void> }`.
    - `refresh` gọi `GET /auth/me`.
    - `signOut` gọi `POST /auth/logout`, xóa token CSRF, rồi chuyển về trang đăng nhập.
    - `requireReLogin` mở `ReLoginDialog` và trả về khi đăng nhập lại xong. Nếu người dùng hủy thì nó ném `AdminApiError(401)`.
  - `LoginForm({ onSuccess(user: UserResponse) })`:
    - Có ô email và mật khẩu.
    - Khi API trả `totp-required`, hiện ô mã 6 số và gửi lại cả ba.
    - Khi gặp `account-locked`, hiện `detail`.
    - Sau khi thành công thì gọi `resetCsrfToken()`.
  - Layout `(app)`:
    - `status === "signed-out"` → chuyển tới `ADMIN_ROUTES.login?next=<đường dẫn hiện tại>`. Chỉ nhận `next` bắt đầu bằng `/admin`, chống chuyển hướng ra trang ngoài.
    - `must-change-password` → chuyển tới `ADMIN_ROUTES.changePassword`.
    - `ready` → hiện nội dung, `AdminHeader` (tên màn hình, tên người dùng) và `BottomNav`.
  - `BottomNav` có 5 mục theo D4. Mục đang mở có `aria-current="page"`. Nằm cố định dưới cùng, có `padding-bottom: env(safe-area-inset-bottom)`.
  - `MoreSheet` có các mục còn lại và nút "Đăng xuất".
  - Trang đổi mật khẩu:
    - Ô mật khẩu hiện tại, mật khẩu mới (≥ 12 ký tự, báo ngay ở trình duyệt), nhập lại.
    - Gọi `POST /auth/password`, sau đó `resetCsrfToken()` + `refresh()`, rồi về `ADMIN_ROUTES.home`.

- [ ] **Step 1: Viết test thất bại** (Testing Library, giả `adminFetch`)
  - `LoginForm`: 401 `totp-required` → hiện ô "Mã xác thực" và lần gửi sau có `totpCode`; 423 → hiện đúng `detail`; thành công → `onSuccess` nhận user.
  - Layout `(app)`:
    - `/auth/me` trả 401 → chuyển tới `/admin/dang-nhap?next=%2Fadmin%2Fanh`.
    - `next=https://evil.example` → bị bỏ qua, về `/admin`.
    - `mustChangePassword: true` → chuyển tới trang đổi mật khẩu.
  - Trang đổi mật khẩu: mật khẩu mới 11 ký tự → báo lỗi, không gọi API; nhập lại không khớp → báo lỗi.
  - `requireReLogin` (Review Focus 1): mở hộp, đăng nhập thành công → promise trả về; bấm Hủy → ném 401.
  - `BottomNav`: 5 mục, mục hiện tại có `aria-current`.
- [ ] **Step 2: Chạy** `cd web && npm test` → FAIL.
- [ ] **Step 3: Viết code** theo Interfaces.
- [ ] **Step 4: Chạy** `cd web && npm test && npm run lint && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** — `feat(web): add admin login, password change and bottom navigation`

---

### Task 4: Bộ form dùng chung và màn hình Ảnh

**Files:**
- Create:
  - `web/src/lib/admin/{localized.ts,upload-check.ts,use-unsaved-changes.ts,use-save.ts}`
  - `web/src/components/admin/form/{BilingualField.tsx,MissingEnBadge.tsx,SaveBar.tsx,ConfirmDialog.tsx,ProblemMessage.tsx}`
  - `web/src/components/admin/media/{MediaUploader.tsx,MediaGrid.tsx,MediaPicker.tsx,MediaEditDialog.tsx}`
  - `web/src/app/admin/(app)/anh/page.tsx`
- Test: một file `*.test.ts(x)` cạnh mỗi file trên.

**Interfaces:**
- Consumes: Task 2, Task 3 (`useAdminSession().requireReLogin`).
- Produces:
  - `localized.ts`:
    - `toRequestText(t: LocalizedText): LocalizedText`: cắt khoảng trắng; chuỗi rỗng → `null`.
    - `isMissingEn(t: LocalizedText): boolean`: luật R12.
  - `upload-check.ts`: `checkImageFile(file: File): string | null` trả thông báo tiếng Việt, hoặc `null` khi ảnh hợp lệ (luật ở Global Constraints).
  - `useSave<T>(action: () => Promise<T>): { save(): Promise<T | undefined>; pending: boolean; error: AdminApiError | null }`:
    - Gọi lần hai khi lần đầu chưa xong thì không làm gì.
    - Lỗi `isSessionExpired` → gọi `requireReLogin()` rồi chạy `action` lại đúng 1 lần.
    - Thành công → hiện toast "Đã lưu.".
  - `useUnsavedChanges(dirty: boolean): void`:
    - Gắn `beforeunload` khi `dirty`.
    - Chặn bấm link trong admin (menu dưới, `MoreSheet`) bằng hộp xác nhận "Bạn có thay đổi chưa lưu. Rời trang?".
  - `BilingualField({ label, value: LocalizedText, onChange, multiline?: boolean, maxLength?: number, viRequired?: boolean })`:
    - Hai ô "Tiếng Việt" và "English" xếp chồng trên điện thoại.
    - Hiện `MissingEnBadge` khi `isMissingEn`.
    - Có bộ đếm ký tự khi có `maxLength`.
  - `SaveBar({ dirty, pending, onSave, onCancel })`: thanh dính trên `BottomNav`. Nút Lưu bị khóa khi `!dirty || pending`.
  - `ConfirmDialog({ title, description, confirmLabel, destructive?, onConfirm })`.
  - `ProblemMessage({ error })`: hiện `error.detail` trong vùng `role="alert"`.
  - `MediaUploader({ onUploaded(m: MediaAdminDto) })`:
    - Có `<input type="file" accept="image/jpeg,image/png,image/webp" capture>`, ô mô tả VI + EN bắt buộc, xem trước bằng `URL.createObjectURL`.
    - `checkImageFile` chạy trước khi gửi.
    - Gửi `adminUpload("/admin/media", form)`.
    - Khi lỗi (413, 415, 503, mất mạng) vẫn giữ file và mô tả.
  - `MediaPicker({ mode: "single" | "multiple", value: number[], onChange(ids: number[]) })`: hộp chọn từ thư viện (`GET /admin/media?page=`, 50 ảnh một trang, có nút "Xem thêm"), có tab "Tải ảnh mới".
  - Trang Ảnh:
    - Lưới ảnh mới nhất trước.
    - Bấm vào ảnh → `MediaEditDialog` (sửa mô tả bằng `PUT /admin/media/{id}`, nút Xóa).
    - Xóa → `ConfirmDialog` → `DELETE`. Khi 409 "Ảnh đang được dùng." thì hiện đúng `detail`.

- [ ] **Step 1: Viết test thất bại**
  - `checkImageFile`:
    - `a.heic` (type rỗng) → thông báo HEIC.
    - `image/heif` → thông báo HEIC.
    - 15 MB + 1 byte → "Ảnh quá lớn. Tối đa 15 MB.".
    - `image/gif` → "Chỉ nhận ảnh JPEG, PNG hoặc WebP.".
    - JPEG 2 MB → `null`.
  - `toRequestText({vi:"  Gạo  ", en:"  "})` → `{vi:"Gạo", en:null}`.
  - `isMissingEn`:
    - `{vi:"a",en:null}` → true.
    - `{vi:null,en:null}` → false.
  - `useSave`:
    - Gọi `save()` 2 lần liền → `action` chạy 1 lần (Review Focus 2).
    - Lỗi 401 → `requireReLogin` được gọi rồi `action` chạy lại 1 lần, dữ liệu form không bị reset (Review Focus 1).
  - `useUnsavedChanges`: `dirty` → bấm một link trong `BottomNav` mở hộp xác nhận; bấm Hủy → đường dẫn không đổi (Review Focus 3).
  - `MediaUploader` (Review Focus 4):
    - API trả 413 chữ → hiện "Ảnh quá lớn. Tối đa 15 MB." và mô tả VI / EN vẫn còn.
    - Thiếu mô tả EN → nút Tải lên bị khóa.
    - 503 → hiện `detail`, nút "Thử lại".
  - Trang Ảnh: xóa ảnh đang dùng → hiện "Ảnh đang được dùng.".
- [ ] **Step 2: Chạy** `cd web && npm test` → FAIL.
- [ ] **Step 3: Viết code** theo Interfaces.
- [ ] **Step 4: Chạy** `cd web && npm test && npm run lint && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** — `feat(web): add admin form kit and media library`

---

### Task 5: Màn hình Sản phẩm

**Files:**
- Create:
  - `web/src/app/admin/(app)/san-pham/page.tsx`
  - `web/src/app/admin/(app)/san-pham/[id]/page.tsx` (`id = "moi"` là tạo mới)
  - `web/src/components/admin/product/{ProductForm.tsx,PackagingList.tsx,FeatureList.tsx}`
- Test: `web/src/components/admin/product/*.test.tsx`

**Interfaces:**
- Consumes: `BilingualField`, `SaveBar`, `useSave`, `useUnsavedChanges`, `MediaPicker` (Task 4); `ProductAdminDto`, `ProductRequest`, `PackagingDto` (Task 2).
- Produces:
  - Danh sách sản phẩm (`GET /admin/products`): tên VI, nhãn "thiếu EN", số quy cách đóng gói.
  - `ProductForm({ initial?: ProductAdminDto })` có các ô:
    - tên, mô tả, mẹo nấu (song ngữ);
    - đặc điểm (`FeatureList`: danh sách song ngữ, thêm / xóa / ↑↓);
    - công tắc "Hiện giá";
    - `PackagingList`: khối lượng gam, giá VND (chỉ hiện khi bật "Hiện giá"), ↑↓, tối đa 20;
    - ảnh (`MediaPicker` multiple, giữ thứ tự, tối đa 30).
  - Lưu bằng `POST /admin/products` hoặc `PUT /admin/products/{id}`.
  - Xóa sản phẩm có xác nhận.

- [ ] **Step 1: Viết test thất bại**
  - Tắt "Hiện giá" → ô giá ẩn đi, nhưng giá đã nhập vẫn được gửi (API tự ẩn giá ở trang công khai).
  - Thêm quy cách thứ 21 → nút "Thêm" bị khóa.
  - Request gửi đi có `name.en = null` khi ô EN trống.
  - Thứ tự ảnh sau khi bấm ↑ được giữ trong `mediaIds`.
  - Lưu bị 401 → hộp đăng nhập lại; sau đó dữ liệu được gửi đúng như đã gõ (Review Focus 1).
- [ ] **Step 2: Chạy** `cd web && npm test` → FAIL.
- [ ] **Step 3: Viết code.** Tên trường của request phải đúng theo `ProductRequest` (đọc file Java).
- [ ] **Step 4: Chạy** `cd web && npm test && npm run lint && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** — `feat(web): add admin product editor`

---

### Task 6: Màn hình Hành trình

**Files:**
- Create:
  - `web/src/app/admin/(app)/hanh-trinh/page.tsx`
  - `web/src/components/admin/timeline/{TimelineList.tsx,TimelineEventForm.tsx}`
- Test: `web/src/components/admin/timeline/*.test.tsx`

**Interfaces:**
- Consumes: Task 4; `TimelineEventAdminDto`, `TimelineEventRequest` (Task 2).
- Produces:
  - `TimelineList`:
    - Danh sách theo `sortOrder`. Kéo thả bằng dnd-kit (cảm biến chạm + bàn phím), kèm nút ↑ / ↓ (D5).
    - Sau khi đổi thứ tự thì gọi `PUT /admin/timeline/order` với body `{"ids":[...]}` (API trả 204).
    - Khi lỗi thì trả lại thứ tự cũ và hiện `detail`.
  - `TimelineEventForm` (hộp thoại / trang): năm (1900–2100), tiêu đề VI bắt buộc, mô tả (song ngữ), ảnh (`MediaPicker` single). Tạo mới bằng `POST`, sửa bằng `PUT`, xóa bằng `DELETE`.

- [ ] **Step 1: Viết test thất bại**
  - Bấm ↓ ở mốc đầu → gọi `PUT /admin/timeline/order` với `ids` đã đổi chỗ.
  - API trả 400 → thứ tự trên màn hình trở về như cũ.
  - Năm 1899 → báo lỗi ngay, không gọi API.
  - Thiếu tiêu đề VI → nút Lưu bị khóa.
- [ ] **Step 2: Chạy** `cd web && npm test` → FAIL.
- [ ] **Step 3: Viết code.**
- [ ] **Step 4: Chạy** `cd web && npm test && npm run lint && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** — `feat(web): add admin timeline editor with reordering`

---

### Task 7: Màn hình Báo chí

**Files:**
- Create:
  - `web/src/app/admin/(app)/bao-chi/page.tsx`
  - `web/src/components/admin/press/{PressList.tsx,PressForm.tsx}`
- Test: `web/src/components/admin/press/*.test.tsx`

**Interfaces:**
- Consumes: Task 4; `PressMentionAdminDto`, `PressMentionRequest`, `PressPreviewDto` (Task 2).
- Produces:
  - `PressForm`:
    - Ô URL. Khi dán link hoặc bấm "Lấy thông tin", gọi `POST /admin/press/preview` với `{"url"}`.
    - Chỉ điền vào ô còn trống: tiêu đề VI ← `title`, tên báo ← `sourceName`, ngày ← `publishedOn`. Không ghi đè chữ người dùng đã gõ.
    - Preview trả các trường `null` → hiện "Không đọc được thông tin từ trang này. Hãy tự nhập.".
    - Ô khác: ngày đăng (`<input type="date">`), tiêu đề VI bắt buộc, tiêu đề EN, ảnh (single).
  - Danh sách: thứ tự theo `sortOrder`, ↑↓ bằng `PUT` từng mục với `sortOrder` mới.
  - Link "Mở bài gốc" có `target="_blank" rel="noopener noreferrer"`.

- [ ] **Step 1: Viết test thất bại**
  - Dán URL → preview điền đủ ba ô.
  - Ô tiêu đề đã có chữ → preview không ghi đè.
  - Preview toàn `null` → hiện thông báo tự nhập.
  - URL `ftp://x` → API trả 400, hiện `detail`.
- [ ] **Step 2: Chạy** `cd web && npm test` → FAIL.
- [ ] **Step 3: Viết code.**
- [ ] **Step 4: Chạy** `cd web && npm test && npm run lint && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** — `feat(web): add admin press editor with link preview`

---

### Task 8: Màn hình Câu chuyện với Tiptap

**Files:**
- Create:
  - `web/src/lib/admin/story-editor.ts`
  - `web/src/components/admin/story/{StoryList.tsx,StoryForm.tsx,RichTextEditor.tsx,EditorToolbar.tsx,StoryPreview.tsx}`
  - `web/src/app/admin/(app)/cau-chuyen/page.tsx`
  - `web/src/app/admin/(app)/cau-chuyen/[id]/page.tsx`
- Test: `web/src/lib/admin/story-editor.test.ts`, `web/src/components/admin/story/*.test.tsx`

**Interfaces:**
- Consumes:
  - Task 4.
  - `StoryAdminDto`, `StoryRequest` (Task 2).
  - `StoryBody` của B2 (`web/src/components/story/StoryBody.tsx`) cho xem trước (D6).
  - `slugify` của web, nếu đã có. Nếu chưa có thì viết bản giống `SlugGenerator.slugify` của B1 (bỏ dấu NFD, `đ` → `d`, chỉ giữ `a-z0-9-`, gộp `-`, tối đa 80 ký tự) và đặt trong `story-editor.ts`.
- Produces:
  - `storyEditorExtensions(): Extension[]` (trong `story-editor.ts`): StarterKit đã tắt `code`, `codeBlock`, `horizontalRule`, `strike`, `underline`, `hardBreak` nếu không cần. Heading chỉ có cấp 2 và 3. Link (chỉ `http`, `https`, `mailto`, `tel`, `/`, `#`; không có `target`). Image (chỉ `src`, `alt`).
  - `RichTextEditor({ value: string, onChange(html: string), lang: "vi" | "en" })`.
    - Thanh công cụ: H2, H3, đậm, nghiêng, danh sách chấm, danh sách số, trích dẫn, liên kết, ảnh.
    - Ảnh lấy từ `MediaPicker` single: `src = media.url`, `alt` = `altVi` hoặc `altEn` theo `lang`.
  - `StoryForm`:
    - Tab "Tiếng Việt" / "English". Mỗi tab có tiêu đề, đường dẫn (gợi ý từ tiêu đề khi ô đường dẫn trống; không tự đổi đường dẫn đã có), tóm tắt, nội dung.
    - Ảnh bìa (single).
    - Trạng thái "Nháp" / "Đã đăng". Nút "Đăng bài" gọi `POST /{id}/publish`, nút "Gỡ bài" gọi `POST /{id}/unpublish`; cả hai trả DTO.
    - "Xem trước" chỉ bật sau khi đã lưu. Nó hiện `bodyHtml` mà API trả về trong `StoryBody` (D6).
  - Danh sách: lọc theo trạng thái, nhãn "Nháp", nhãn "thiếu EN".
  - 409 "Đường dẫn bài viết đã tồn tại." → hiện ngay dưới ô đường dẫn.

- [ ] **Step 1: Viết test thất bại**
  - `slugify("Câu chuyện mùa gặt ở Duy Tân")` → `"cau-chuyen-mua-gat-o-duy-tan"`.
  - `slugify("Đồng lúa đẹp")` → `"dong-lua-dep"`.
  - Tiêu đề 200 ký tự → `slugify` cho ≤ 80 ký tự, không kết thúc bằng `-`.
  - Editor không có nút gạch ngang chữ hay mã nguồn.
  - Dán `<h1>A</h1><script>x</script><p style="color:red">B</p>` → HTML trong `onChange` không có `h1`, `script`, `style`.
  - Chèn ảnh từ `MediaPicker` ở tab EN → `<img src="/media/..." alt="<altEn>">`.
  - Sửa tiêu đề của bài đã có đường dẫn → đường dẫn không đổi (giống luật R16 của B1).
  - "Xem trước" bị khóa khi form còn thay đổi chưa lưu.
  - 409 trùng đường dẫn → thông báo nằm cạnh ô đường dẫn.
- [ ] **Step 2: Chạy** `cd web && npm test` → FAIL.
- [ ] **Step 3: Cài Tiptap 3 và viết code.** Đọc tài liệu Tiptap 3 về StarterKit (ở bản 3, StarterKit đã gồm Link). Ghi phiên bản cài vào báo cáo.
- [ ] **Step 4: Chạy** `cd web && npm test && npm run lint && npm run typecheck && npm run build` → PASS. `npm run build` phải không tăng kích thước JS của trang công khai: Tiptap chỉ được nạp trong trang admin (dùng `next/dynamic`). Ghi kích thước trước / sau trong báo cáo.
- [ ] **Step 5: Commit** — `feat(web): add admin story editor with Tiptap`

---

### Task 9: Màn hình Liên hệ & cài đặt, Tài khoản

**Files:**
- Create:
  - `web/src/app/admin/(app)/cai-dat/page.tsx`
  - `web/src/app/admin/(app)/tai-khoan/page.tsx`
  - `web/src/components/admin/settings/{ContactForm.tsx,SocialForm.tsx,BrandForm.tsx}`
  - `web/src/components/admin/accounts/{UserList.tsx,CreateUserDialog.tsx,ResetPasswordDialog.tsx,TwoFactorCard.tsx}`
  - `web/src/lib/admin/temp-password.ts`
- Test: một file `*.test.ts(x)` cạnh mỗi file trên.

**Interfaces:**
- Consumes: Task 4; `SiteSettingAdminDto`, các kiểu settings, `UserSummary`, `CreateUserRequest`, `ResetPasswordRequest`, `TotpSetupResponse` (Task 2).
- Produces:
  - Cài đặt: ba form, mỗi form đọc `GET /admin/settings/{contact|social|brand}` và lưu bằng `PUT` riêng.
    - Liên hệ: điện thoại, Zalo (số), Messenger (URL), địa chỉ (song ngữ), link bản đồ, giờ liên hệ (song ngữ).
    - Mạng xã hội: Facebook, YouTube, TikTok.
    - Thương hiệu: khẩu hiệu (song ngữ).
    - Mọi ô có thể để trống.
  - `generateTempPassword(): string`: 16 ký tự từ `crypto.getRandomValues`. Bảng chữ không có ký tự dễ nhầm (`0O1lI`).
  - Tài khoản:
    - Danh sách `GET /admin/users`: tên, email, trạng thái "Đang dùng" / "Đã khóa", "Có 2 lớp".
    - `CreateUserDialog`: email (cắt khoảng trắng và đổi chữ thường), tên hiển thị, mật khẩu tạm (nút "Tạo mật khẩu", ≥ 12 ký tự). Sau khi tạo, hiện mật khẩu một lần kèm nút "Sao chép" và lời nhắc "Gửi riêng cho người nhà; họ phải đổi ở lần đăng nhập đầu.".
    - Khóa (`POST /{id}/disable`) / Mở khóa (`/enable`), có xác nhận. Không hiện nút Khóa ở dòng của chính mình.
    - `ResetPasswordDialog`: tạo mật khẩu tạm mới, cảnh báo "Thao tác này cũng tắt xác thực 2 lớp của người này.", gọi `POST /{id}/reset-password`.
  - `TwoFactorCard` (của chính mình):
    - Bật: `POST /admin/me/totp/setup` → hiện mã QR từ `otpauthUri` (thư viện `qrcode`, xuất SVG) và mã bí mật để gõ tay → nhập mã 6 số → `POST /enable`.
    - Tắt: nhập mã → `POST /disable`.
    - Có link "Đổi mật khẩu" tới `ADMIN_ROUTES.changePassword`.

- [ ] **Step 1: Viết test thất bại**
  - `generateTempPassword`: 1000 lần gọi đều dài 16 ký tự và không chứa ký tự nào trong `0O1lI`.
  - `CreateUserDialog`: email `"  Me@Example.COM "` gửi đi thành `"me@example.com"`; mật khẩu chỉ hiện sau khi tạo thành công; đóng hộp thoại thì mật khẩu bị xóa khỏi state.
  - Dòng của chính mình không có nút Khóa.
  - `ContactForm`: ô Zalo `"abc"` → API trả 400, hiện `detail`; ô trống gửi `null`.
  - `TwoFactorCard`: sau `setup` thì có một `<svg>` QR và mã bí mật; mã sai → hiện "Mã xác thực không đúng.".
- [ ] **Step 2: Chạy** `cd web && npm test` → FAIL.
- [ ] **Step 3: Viết code.**
- [ ] **Step 4: Chạy** `cd web && npm test && npm run lint && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** — `feat(web): add admin settings and account screens`

---

### Task 10: Lịch sử và Tổng quan

**Files:**
- Create:
  - `web/src/lib/admin/audit-diff.ts`
  - `web/src/components/admin/history/{HistoryList.tsx,HistoryDetail.tsx}`
  - `web/src/components/admin/dashboard/{Shortcuts.tsx,RecentChanges.tsx,MissingEnSummary.tsx}`
  - `web/src/app/admin/(app)/lich-su/page.tsx`
  - `web/src/app/admin/(app)/page.tsx`
- Test: `web/src/lib/admin/audit-diff.test.ts`, `web/src/components/admin/history/*.test.tsx`, `web/src/components/admin/dashboard/*.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`label`, `restorable`, `GET /admin/audit/{id}`), Task 4.
- Produces:
  - `diffSnapshots(before: unknown, after: unknown): { path: string; before: string | null; after: string | null }[]`:
    - Làm phẳng JSON thành đường dẫn có dấu chấm (`name.vi`, `packagings.0.weightGrams`).
    - Chỉ trả các đường dẫn có giá trị khác nhau, theo thứ tự chữ cái.
    - Chuỗi dài hơn 200 ký tự được cắt và thêm "…".
  - Nhãn tiếng Việt cho loại nội dung: `product` "Sản phẩm", `timeline_event` "Hành trình", `press_mention` "Báo chí", `story` "Câu chuyện", `media` "Ảnh", `site_setting` "Cài đặt", `app_user` "Tài khoản". Hành động: CREATE "Tạo", UPDATE "Sửa", DELETE "Xóa", RESTORE "Khôi phục".
  - `HistoryList`:
    - `GET /admin/audit?entityType=&page=`, 50 dòng một trang.
    - Mỗi dòng: thời gian (giờ Việt Nam, `Asia/Ho_Chi_Minh`), người sửa, loại, hành động, `label`.
    - Có bộ lọc loại nội dung.
  - `HistoryDetail`:
    - `GET /admin/audit/{id}` → bảng "Trước / Sau" từ `diffSnapshots`.
    - Nút "Khôi phục bản trước" chỉ hiện khi `restorable`. Bấm vào thì hỏi xác nhận, rồi gọi `POST /admin/audit/{id}/restore` (204), hiện toast "Đã khôi phục.", rồi tải lại danh sách.
    - Lỗi 409 → hiện `detail`.
  - Tổng quan:
    - `Shortcuts`: 6 ô (Viết câu chuyện, Tải ảnh, Sửa sản phẩm, Thêm mốc hành trình, Thêm bài báo, Liên hệ & cài đặt).
    - `RecentChanges`: 10 dòng đầu của `GET /admin/audit?page=0`.
    - `MissingEnSummary`: đếm số mục `missingEn` của sản phẩm, hành trình, báo chí, câu chuyện. Mỗi số là link tới màn hình đó.

- [ ] **Step 1: Viết test thất bại**
  - `diffSnapshots({name:{vi:"A",en:null}}, {name:{vi:"B",en:null}})` → đúng 1 dòng `name.vi` A → B.
  - `before = null` (dòng CREATE) → mọi trường của `after` có `before: null`.
  - Chuỗi 300 ký tự → bị cắt còn 201 ký tự, có "…".
  - `HistoryDetail`: `restorable: false` → không có nút khôi phục; khôi phục bị 409 → hiện `detail`; khôi phục 204 → toast và danh sách được tải lại.
  - Giờ hiển thị của `2026-11-04T01:00:00Z` là `08:00 04/11/2026`.
  - `MissingEnSummary` đếm đúng từ danh sách giả.
- [ ] **Step 2: Chạy** `cd web && npm test` → FAIL.
- [ ] **Step 3: Viết code.**
- [ ] **Step 4: Chạy** `cd web && npm test && npm run lint && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** — `feat(web): add admin history with restore and dashboard`

---

### Task 11: Kiểm thử đầu-cuối với API thật, CI, tài liệu

**Files:**
- Create:
  - `web/e2e-fullstack/run.mjs`
  - `web/e2e-fullstack/playwright.fullstack.config.ts`
  - `web/e2e-fullstack/{admin-flow,admin-mobile,admin-a11y}.spec.ts`
  - `web/e2e-fullstack/fixtures/tiny.jpg`: tạo bằng code lúc chạy nếu có thể; không chép ảnh có EXIF thật.
  - `.github/workflows/fullstack.yml`
- Modify: `web/package.json` (script `test:fullstack`), `docs/setup.md`, `docs/session/STATE.md`

**Interfaces:**
- Consumes: mọi task trước, `api/` (jar), `web/` (bản standalone).
- Produces: `npm run test:fullstack` (trong `web/`). Script `run.mjs` làm lần lượt:
  1. Chạy Postgres tạm: `docker run --rm -d -p <cổng trống>:5432 -e POSTGRES_DB=nepnha_e2e … postgres:16-alpine`. Chờ tới khi DB nhận kết nối.
  2. Build API: `cd ../api && ./mvnw -B -q -DskipTests package`.
  3. Chạy jar API với các biến: DB tạm, `BOOTSTRAP_ADMIN_EMAIL=admin@example.com`, `BOOTSTRAP_ADMIN_PASSWORD=<sinh ngẫu nhiên lúc chạy>`, `MEDIA_DIR=<thư mục tạm>`, `WEB_BASE_URL=<origin của web>`, `REVALIDATE_SECRET=<sinh ngẫu nhiên>`, profile mặc định (không phải `dev`), cookie `Secure` tắt bằng `SERVER_SERVLET_SESSION_COOKIE_SECURE=false`.
  4. Build web với `CONTENT_SOURCE=api`, `API_BASE_URL` và `API_PROXY_ORIGIN` = origin của API, `SITE_URL` = origin của web. Chạy bản standalone với cùng `REVALIDATE_SECRET`.
  5. Chạy Playwright với config fullstack. Mật khẩu admin truyền qua biến môi trường, không ghi ra file.
  6. Luôn dọn dẹp ở `finally`: dừng web, dừng API, xóa container, xóa thư mục tạm.

- [ ] **Step 1: Viết test** (là test đầu-cuối, chạy với hệ thống thật)
  - `admin-flow.spec.ts`:
    1. Đăng nhập lần đầu → bị chuyển sang đổi mật khẩu → đổi mật khẩu → về Tổng quan.
    2. Thêm mốc hành trình "[E2E] Mốc <số ngẫu nhiên>" → mở `/vi` → thấy tiêu đề mới (chờ tối đa 10 giây vì revalidate chạy sau commit).
    3. Tạo câu chuyện nháp → `/vi/cau-chuyen/<slug>` trả 404 → bấm Đăng bài → trang bài mở được.
    4. Tải `tiny.jpg` với mô tả VI / EN → ảnh có trong lưới.
    5. Lịch sử: mở dòng sửa mốc → Khôi phục bản trước → `/vi` hiện lại tiêu đề cũ.
  - `admin-mobile.spec.ts` (Review Focus 5): viewport 375×812. Ở từng màn hình trong `ADMIN_ROUTES`, `document.documentElement.scrollWidth <= 375`. Nút Lưu của form sản phẩm không bị menu dưới che (hộp bao của hai phần tử không chồng nhau).
  - `admin-a11y.spec.ts`: axe trên trang đăng nhập, Tổng quan và form câu chuyện → không có lỗi `serious` hoặc `critical`.
- [ ] **Step 2: Chạy** `cd web && npm run test:fullstack` (cần Docker và JDK 21) → PASS. Ghi thời gian chạy vào báo cáo.
- [ ] **Step 3: CI** — `.github/workflows/fullstack.yml`:
  - Chạy trên `pull_request` khi đổi `api/**`, `web/**` hoặc chính file workflow.
  - `ubuntu-latest`. Cài Java 21 (temurin, cache maven), Node 22 (cache npm), `npx playwright install --with-deps chromium`. Rồi chạy `cd web && npm run test:fullstack`.
  - Khi lỗi thì tải `playwright-report` lên làm artifact.
  - `timeout-minutes: 30`.
- [ ] **Step 4: Tài liệu** (tiếng Việt, câu ngắn):
  - `docs/setup.md` thêm mục "Chạy trang quản trị ở local":
    - `docker compose -f infra/compose.dev.yml up -d`
    - chạy API profile `dev` với `MEDIA_DIR`
    - trong `web/` đặt `API_PROXY_ORIGIN=http://localhost:8080` và `MEDIA_DEV_DIR` rồi chạy `npm run dev:api`
    - mở `http://localhost:3000/admin`
    - lần đầu phải đổi mật khẩu
    - Thêm mục "Chạy kiểm thử đầu-cuối" với lệnh `npm run test:fullstack`.
  - `docs/session/STATE.md`: B3 xong. Việc tiếp theo là B4 (GSAP, khi có mascot cuối) và phần D.
- [ ] **Step 5: Commit** — `test(web): add full-stack admin e2e, CI and setup docs`

---

## Self-review (người viết plan đã kiểm)

- **Spec 4.1 — 9 màn hình:**

  | Màn hình | Task |
  |---|---|
  | Tổng quan | Task 10 |
  | Sản phẩm | Task 5 |
  | Hành trình | Task 6 |
  | Báo chí | Task 7 |
  | Câu chuyện | Task 8 |
  | Ảnh | Task 4 |
  | Liên hệ & cài đặt | Task 9 |
  | Tài khoản | Task 9 |
  | Lịch sử | Task 10 |

  Nhãn "thiếu EN" ở Task 4 (`MissingEnBadge`) và Task 10 (tổng số). Menu dưới ở Task 3.
- **Spec 4.2:** đăng nhập, bắt đổi mật khẩu ở lần đầu, khóa sau 5 lần sai (hiện `detail` khi 423), TOTP (đăng nhập ở Task 3, bật / tắt ở Task 9), CSRF (Task 2).
- **Spec 4.5:** kiểm tra ảnh ở trình duyệt và thông báo HEIC ở Task 4.
- **Spec 4.6:** Playwright với luồng "đăng nhập admin → sửa → trang công khai đổi" ở Task 11.
- **Ghi chú từ B1 cho B3:**
  - email được cắt khoảng trắng (Task 9);
  - không hiện nút khôi phục cho dòng `app_user` / `media` / CREATE (cờ `restorable`, Task 1 + Task 10);
  - token CSRF lấy từ `/api/auth/csrf` (Task 2);
  - 413 dạng chữ của Caddy (Task 2 + Task 4);
  - ảnh hiện ở local qua route dev (Task 2, D3).
