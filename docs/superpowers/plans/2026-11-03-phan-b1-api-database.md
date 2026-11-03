# Phần B1 — API và database: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một API Spring Boot chạy được ở local (Postgres trong Docker), có đủ dữ liệu, đăng nhập admin, lịch sử sửa có khôi phục, tải ảnh, API công khai cho trang chủ / blog, và lời gọi revalidate tới Next.js — để phần B2 (web công khai) và B3 (admin) dựng lên trên.

**Architecture:** Thư mục `api/` là một app Maven, package `vn.nepnhaxudong`, chia package theo chức năng (`auth`, `product`, `timeline`, `press`, `story`, `media`, `site`, `audit`, `publish`, `common`). Mỗi loại nội dung có bảng chính + bảng `*_translation`. Mọi lần ghi của admin đi qua một service ghi `audit_log` trong cùng transaction, rồi phát sự kiện; sau khi commit, `publish` gọi Next.js revalidate. App chạy dưới context path `/api`.

**Tech Stack:** Java 21, Spring Boot 4.0.x (Spring MVC, Data JPA / Hibernate, Validation, Security, Session JDBC, Actuator), Postgres 16, Flyway, Testcontainers, JUnit 5, Maven Wrapper, TwelveMonkeys ImageIO (đọc WebP).

**Spec:** `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md` (mục 4.2–4.6, 5.2; mục 3.1 cho quy tắc ngôn ngữ)

## Global Constraints

- Java 21 (`maven.compiler.release=21`). Spring Boot **4.0.x, bản patch mới nhất trên Maven Central lúc làm Task 1** (spec ghi "Spring Boot 3"; 3.5 hết hỗ trợ miễn phí ngày 2026-06-30 — chủ dự án xác nhận khi duyệt plan). Postgres 16.
- Build bằng Maven Wrapper trong `api/` (`./mvnw`), chạy được trên Windows (Git Bash) và Linux.
- Package gốc `vn.nepnhaxudong`; class main `NepNhaApplication`. Context path `/api`; health ở `/api/actuator/health`.
- Ngôn ngữ nội dung: `vi`, `en`. Mọi nội dung có bản `vi` bắt buộc, bản `en` có thể thiếu.
- Lỗi trả về `application/problem+json` (Spring `ProblemDetail`), trường `detail` bằng tiếng Việt cho admin.
- Thời gian lưu dạng `timestamptz`, đọc qua một bean `java.time.Clock` (để test điều khiển được thời gian).
- Không có secret trong repo: DB, admin đầu tiên, secret revalidate đọc từ biến môi trường; `api/.env.example` chỉ có giá trị mẫu.
- Nội dung mẫu (seed) chỉ dùng cho local / dev, mọi chuỗi mẫu bắt đầu bằng `[MẪU]`; không bao giờ chạy seed ở production.
- Test DB thật bằng Testcontainers (`postgres:16-alpine`); không dùng H2.
- Code và commit tiếng Anh; không dòng `Co-Authored-By`; LF.

## Review Focus

1. Chuỗi tiếng Việt có dấu và emoji (ví dụ `Nếp cái hoa vàng 🌾`) đi qua API → DB → API mà không bị lỗi mã hóa. (Test ở Task 5)
2. Slug blog tạo từ tiêu đề tiếng Việt: `Câu chuyện mùa gặt ở Duy Tân` → `cau-chuyen-mua-gat-o-duy-tan` (đ/Đ → d); trùng slug trong cùng ngôn ngữ → 409. (Test ở Task 7)
3. Thiếu bản `en`: API công khai `/en/...` trả từng trường bản `vi` thay thế, và đánh dấu `missingEn: true` ở API admin. (Test ở Task 5 và Task 9)
4. Khóa tài khoản: lần sai thứ 5 thì khóa; đúng mật khẩu trong lúc khóa vẫn bị từ chối; sau 15 phút mở lại. (Test ở Task 3)
5. File ảnh giả đuôi (`.jpg` nhưng là HEIC hoặc là text) bị từ chối dựa trên nội dung file; ảnh JPEG có GPS được lưu lại không còn EXIF. (Test ở Task 8)

---

## File Structure

```
api/
├── mvnw, mvnw.cmd, .mvn/wrapper/…           Task 1
├── pom.xml                                   Task 1 (Task 8 thêm TwelveMonkeys)
├── .env.example                              Task 1
├── src/main/resources/application.yml        Task 1 (các task sau thêm khóa)
├── src/main/resources/db/migration/V1__schema.sql        Task 2
├── src/main/resources/db/migration/V2__spring_session.sql Task 2
├── src/main/java/vn/nepnhaxudong/
│   ├── NepNhaApplication.java                Task 1
│   ├── common/  (Lang, LocalizedText, ProblemDetails, ClockConfig, SlugGenerator)  Task 1, 5, 7
│   ├── auth/    (AppUser, login, lockout, bootstrap, users admin, TOTP)            Task 3, 4
│   ├── audit/   (AuditLog, AuditService, AuditedHandler, restore)                  Task 6
│   ├── product/ (Product, Packaging, ProductMedia)                                 Task 5
│   ├── timeline/, press/                                                           Task 6
│   ├── story/                                                                      Task 7
│   ├── media/                                                                      Task 8
│   ├── site/    (SiteSetting)                                                      Task 9
│   ├── publicapi/ (HomeController, StoryPublicController)                          Task 9
│   └── publish/ (ContentChangedEvent, RevalidateClient)                            Task 10
├── src/main/java/vn/nepnhaxudong/dev/DevSeed.java       Task 9 (profile "dev")
└── src/test/java/vn/nepnhaxudong/…  (một file test cho mỗi task, cùng package)
infra/compose.dev.yml                         Task 1
.github/workflows/api.yml                     Task 1
```

---

### Task 1: Khung app, Postgres local, CI

**Files:**
- Create: `api/pom.xml`, Maven Wrapper (`./mvnw -N wrapper:wrapper` hoặc copy từ `spring init`), `api/.env.example`, `api/src/main/resources/application.yml`, `api/src/main/java/vn/nepnhaxudong/NepNhaApplication.java`, `api/src/main/java/vn/nepnhaxudong/common/ClockConfig.java`, `api/src/test/java/vn/nepnhaxudong/TestcontainersConfig.java`, `api/src/test/java/vn/nepnhaxudong/HealthTest.java`, `infra/compose.dev.yml`, `.github/workflows/api.yml`
- Modify: `docs/setup.md` (mục "Chạy API ở local")

**Interfaces:**
- Produces: `TestcontainersConfig` (`@TestConfiguration(proxyBeanMethods = false)` với bean `@ServiceConnection PostgreSQLContainer<?>` image `postgres:16-alpine`) — mọi test tích hợp sau `@Import(TestcontainersConfig.class)`; bean `Clock` (mặc định `Clock.systemUTC()`); context path `/api`.

- [ ] **Step 1: Tạo `pom.xml`** — parent `spring-boot-starter-parent` 4.0.x; starters: `web`, `data-jpa`, `validation`, `security`, `actuator`; `spring-session-jdbc`; `flyway-core` + `flyway-database-postgresql`; `postgresql` (runtime); test: `spring-boot-starter-test`, `spring-security-test`, `spring-boot-testcontainers`, `testcontainers` `postgresql` + `junit-jupiter`.
- [ ] **Step 2: `application.yml`** — `server.servlet.context-path: /api`; datasource từ `DB_URL` / `DB_USER` / `DB_PASSWORD` (mặc định trỏ `jdbc:postgresql://localhost:5433/nepnha`, user `nepnha`); `spring.jpa.open-in-view: false`; `spring.jpa.hibernate.ddl-auto: validate`; `spring.flyway.enabled: true`; actuator chỉ mở `health`.
- [ ] **Step 3: `infra/compose.dev.yml`** — một service `postgres` image `postgres:16-alpine`, port `5433:5432`, DB/user `nepnha`, mật khẩu từ biến `DB_PASSWORD` (mặc định `nepnha-local` chỉ cho local), volume tên `nepnha-pg`.
- [ ] **Step 4: Viết test thất bại `HealthTest`**

```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
@Import(TestcontainersConfig.class)
class HealthTest {
  @Autowired TestRestTemplate rest;
  @Test void healthIsUp() {
    var r = rest.getForEntity("/api/actuator/health", String.class);
    assertThat(r.getStatusCode().value()).isEqualTo(200);
    assertThat(r.getBody()).contains("\"status\":\"UP\"");
  }
}
```
(Nếu Boot 4 bỏ `TestRestTemplate`, dùng `RestClient` với `@LocalServerPort`; assertions giữ nguyên.)

- [ ] **Step 5: Chạy, xác nhận thất bại** — Run: `cd api && ./mvnw -q test -Dtest=HealthTest` — Expected: FAIL (chưa có class main / security chặn health).
- [ ] **Step 6: Viết `NepNhaApplication`, `ClockConfig`, và một `SecurityFilterChain` tạm cho phép `/actuator/health`** (Task 3 thay bằng cấu hình đầy đủ).
- [ ] **Step 7: Chạy lại** — Expected: PASS.
- [ ] **Step 8: `.github/workflows/api.yml`** — tên `api`; trigger `push` + `pull_request` với `paths: ['api/**', '.github/workflows/api.yml']`; job `api` trên `ubuntu-latest` (có Docker cho Testcontainers); `actions/setup-java@v4` Temurin 21 với cache maven; `cd api && ./mvnw -B verify`; `permissions: contents: read`; `timeout-minutes: 20`.
- [ ] **Step 9: `docs/setup.md`** — thêm mục "Chạy API ở local": `docker compose -f infra/compose.dev.yml up -d`, `cd api && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`, health ở `http://localhost:8080/api/actuator/health`; JDK 21 phải là JDK đang dùng (`JAVA_HOME`).
- [ ] **Step 10: Commit** — `git add api infra .github/workflows/api.yml docs/setup.md` → `git commit -m "feat(api): scaffold Spring Boot app with Postgres and CI"`

---

### Task 2: Schema database

**Files:**
- Create: `api/src/main/resources/db/migration/V1__schema.sql`, `V2__spring_session.sql`, `api/src/test/java/vn/nepnhaxudong/SchemaTest.java`

**Interfaces:**
- Produces: các bảng dưới đây (tên cột dạng `snake_case`, khóa chính `bigint generated by default as identity` tên `id` (cho phép khôi phục bản đã xóa với đúng `id` cũ ở Task 6), mọi bảng chính có `created_at`, `updated_at` `timestamptz not null`).

| Bảng | Cột chính (ngoài id / created_at / updated_at) |
|---|---|
| `app_user` | `email` unique (lưu chữ thường), `display_name`, `password_hash`, `must_change_password` bool, `enabled` bool, `failed_attempts` int, `locked_until` timestamptz null, `totp_secret` text null, `totp_enabled` bool |
| `product` | `sort_order` int, `show_price` bool |
| `product_translation` | `product_id` fk, `lang` (`vi`/`en`), `name`, `description` text, `features` jsonb (mảng chuỗi), `cooking_tips` text |
| `packaging` | `product_id` fk, `weight_grams` int > 0, `price_vnd` bigint null, `sort_order` int |
| `media` | `path` unique, `mime`, `width`, `height`, `size_bytes`, `alt_vi` not null, `alt_en` not null |
| `product_media` | `product_id` fk, `media_id` fk, `sort_order`; unique (`product_id`, `media_id`) |
| `timeline_event` | `year` int, `sort_order` int, `media_id` fk null |
| `timeline_event_translation` | `timeline_event_id` fk, `lang`, `title`, `description` text |
| `press_mention` | `url` not null, `source_name`, `published_on` date null, `media_id` fk null, `sort_order` |
| `press_mention_translation` | `press_mention_id` fk, `lang`, `title` |
| `story` | `status` (`DRAFT`/`PUBLISHED`), `published_at` timestamptz null, `cover_media_id` fk null |
| `story_translation` | `story_id` fk, `lang`, `slug`, `title`, `excerpt` text, `body_html` text; unique (`lang`, `slug`) |
| `site_setting` | `key` unique, `value` jsonb |
| `audit_log` | `user_id` fk null, `entity_type`, `entity_id` bigint, `action` (`CREATE`/`UPDATE`/`DELETE`/`RESTORE`), `before_json` jsonb null, `after_json` jsonb null, `created_at` |

Mọi bảng `*_translation`: `UNIQUE(<entity>_id, lang)` và `CHECK (lang IN ('vi','en'))`; xóa bảng chính thì xóa bản dịch (`ON DELETE CASCADE`). `V2__spring_session.sql` = nội dung `org/springframework/session/jdbc/schema-postgresql.sql` của bản spring-session đang dùng.

- [ ] **Step 1: Viết test thất bại `SchemaTest`** — dùng `JdbcTemplate`, đọc `information_schema.tables` (schema `public`), assert tập tên bảng chứa đủ 14 bảng ở bảng trên + `spring_session` + `spring_session_attributes`; và `insert` hai dòng `story_translation` cùng `lang='vi', slug='a'` → ném `DuplicateKeyException`.
- [ ] **Step 2: Chạy, xác nhận thất bại** — `./mvnw -q test -Dtest=SchemaTest` — FAIL.
- [ ] **Step 3: Viết hai migration.**
- [ ] **Step 4: Chạy lại `SchemaTest` và `HealthTest`** — PASS (Hibernate `validate` chưa có entity nên không lỗi).
- [ ] **Step 5: Commit** — `feat(api): add database schema`

---

### Task 3: Đăng nhập, phiên, CSRF, khóa tài khoản, admin đầu tiên

**Files:**
- Create: `auth/AppUser.java`, `auth/AppUserRepository.java`, `auth/SecurityConfig.java`, `auth/AuthController.java`, `auth/LoginService.java`, `auth/BootstrapAdmin.java`, `common/ApiExceptionHandler.java`; test `auth/AuthFlowTest.java`, `auth/LockoutTest.java`
- Modify: `application.yml`

**Interfaces:**
- Produces:
  - `POST /api/auth/login` body `{"email","password","totpCode"?}` → 200 `{"id","email","displayName","mustChangePassword"}` + cookie phiên; 401 problem `"Email hoặc mật khẩu không đúng."`; 423 problem `"Tài khoản tạm khóa 15 phút vì đăng nhập sai nhiều lần."`.
  - `POST /api/auth/logout` → 204. `GET /api/auth/me` → 200 như trên, hoặc 401.
  - `POST /api/auth/password` body `{"currentPassword","newPassword"}` → 204; mật khẩu mới ≥ 12 ký tự, khác mật khẩu cũ; xóa cờ `mustChangePassword`.
  - `GET /api/auth/csrf` → 200 `{"headerName","token"}` (và cookie `XSRF-TOKEN`). Mọi request ghi (POST/PUT/PATCH/DELETE) trừ `/api/auth/login` cần header `X-XSRF-TOKEN`.
  - Khi `mustChangePassword = true`: mọi `/api/admin/**` trả 403 problem `"Bạn cần đổi mật khẩu trước."`.
  - `PasswordEncoder` bean = `Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()`.
  - Giá trị cố định: `MAX_FAILED_ATTEMPTS = 5`, `LOCK_DURATION = Duration.ofMinutes(15)`; phiên 30 ngày (`spring.session.timeout: 30d`), cookie `NEPNHA_SESSION` `HttpOnly`, `Secure` (tắt ở profile `dev`), `SameSite=Lax`, max-age 30 ngày.
  - `/api/public/**` và `/api/actuator/health` không cần đăng nhập; `/api/admin/**` cần đăng nhập.
  - `BootstrapAdmin` (ApplicationRunner): nếu `app_user` rỗng và có `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD` → tạo admin với `mustChangePassword = true`; nếu bảng rỗng mà thiếu biến → log WARN, không tạo; nếu đã có user → không làm gì.

- [ ] **Step 1: Viết test thất bại `AuthFlowTest`** — (a) bootstrap tạo đúng 1 user từ biến (đặt qua `@TestPropertySource`); khởi động lần 2 không tạo thêm; (b) login đúng → 200 và `mustChangePassword: true`; (c) `GET /api/admin/users` lúc đó → 403 với `detail` "Bạn cần đổi mật khẩu trước."; (d) đổi mật khẩu (có CSRF) → 204, rồi `GET /api/auth/me` → `mustChangePassword: false`; (e) POST không có CSRF → 403; (f) logout → `GET /api/auth/me` → 401; (g) email đăng nhập không phân biệt hoa thường.
- [ ] **Step 2: Viết test thất bại `LockoutTest`** (dùng `MutableClock` của test thay bean `Clock`) — sai 4 lần → lần 5 trả 423; đúng mật khẩu ngay sau đó → 423; tăng clock 14 phút 59 giây → 423; tăng thêm 2 giây → đăng nhập đúng 200 và `failed_attempts` về 0; email không tồn tại → 401 cùng thông báo như sai mật khẩu.
- [ ] **Step 3: Chạy, xác nhận thất bại.**
- [ ] **Step 4: Viết code** (Spring Security với `SessionCreationPolicy.IF_REQUIRED`, `CookieCsrfTokenRepository.withHttpOnlyFalse()`, đăng nhập qua `AuthController` gọi `LoginService` rồi lưu `SecurityContext` vào session bằng `HttpSessionSecurityContextRepository`; `ApiExceptionHandler` chuyển lỗi validation và lỗi nghiệp vụ thành `ProblemDetail` tiếng Việt).
- [ ] **Step 5: Chạy lại cả hai test và toàn bộ suite** — PASS.
- [ ] **Step 6: Commit** — `feat(api): add login, sessions, CSRF and lockout`

---

### Task 4: Quản lý tài khoản người nhà và TOTP tùy chọn

**Files:**
- Create: `auth/UserAdminController.java`, `auth/Totp.java`, `auth/TotpController.java`; test `auth/UserAdminTest.java`, `auth/TotpTest.java`

**Interfaces:**
- Consumes: `AppUser`, `PasswordEncoder`, login của Task 3.
- Produces:
  - `GET /api/admin/users` → `[{"id","email","displayName","enabled","totpEnabled","mustChangePassword"}]`.
  - `POST /api/admin/users` `{"email","displayName","temporaryPassword"}` → 201; user mới `mustChangePassword = true`; email trùng → 409 `"Email đã được dùng."`.
  - `POST /api/admin/users/{id}/disable` → 204 (không tự khóa chính mình: 409 `"Bạn không thể khóa tài khoản của chính mình."`); `POST /api/admin/users/{id}/enable` → 204; `POST /api/admin/users/{id}/reset-password` `{"temporaryPassword"}` → 204, đặt `mustChangePassword = true`, xóa khóa.
  - User bị `enabled = false` không đăng nhập được (401 cùng thông báo chung).
  - `Totp` (thuần Java, `javax.crypto.Mac` HmacSHA1, 6 chữ số, bước 30 giây, cho phép lệch ±1 bước): `static String generateSecret()` (Base32, 20 byte ngẫu nhiên), `static String code(String base32Secret, long epochSeconds)`, `static boolean verify(String base32Secret, String code, long epochSeconds)`.
  - `POST /api/admin/me/totp/setup` → `{"secret","otpauthUri"}` (`otpauth://totp/Nep%20Nha:<email>?secret=…&issuer=Nep%20Nha`); `POST /api/admin/me/totp/enable` `{"code"}` → 204 khi mã đúng; `POST /api/admin/me/totp/disable` `{"code"}` → 204.
  - Login khi user có `totpEnabled`: thiếu `totpCode` → 401 `"Cần mã xác thực 2 lớp."`; mã sai → 401 và tính là một lần sai.

- [ ] **Step 1: Viết test thất bại `TotpTest`** — vector RFC 6238 (SHA1, secret ASCII `12345678901234567890` = Base32 `GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ`): thời điểm 59 → `287082`, 1111111109 → `081804`, 1234567890 → `005924`, 2000000000 → `279037` (6 chữ số cuối của vector 8 chữ số); `verify` chấp nhận mã của bước trước/sau, từ chối mã cách 2 bước.
- [ ] **Step 2: Viết test thất bại `UserAdminTest`** — tạo user, email trùng → 409; tự khóa mình → 409; user bị khóa đăng nhập → 401; reset → user đó phải đổi mật khẩu; bật TOTP rồi login thiếu mã → 401 "Cần mã xác thực 2 lớp.", login có mã đúng (sinh bằng `Totp.code` với clock test) → 200.
- [ ] **Step 3: Chạy, xác nhận thất bại. Step 4: Viết code. Step 5: Chạy lại toàn bộ suite — PASS.**
- [ ] **Step 6: Commit** — `feat(api): add family user management and optional TOTP`

---

### Task 5: Sản phẩm, quy cách đóng gói, kiểu nội dung song ngữ

**Files:**
- Create: `common/Lang.java`, `common/LocalizedText.java`, `product/*` (entity, repository, `ProductAdminController`, `ProductService`, DTO record); test `product/ProductAdminTest.java`

**Interfaces:**
- Produces:
  - `enum Lang { VI, EN }` với `static Lang fromPath(String)` (`"vi"`/`"en"` → enum, khác → `UnknownLangException` → 404).
  - `record LocalizedText(String vi, String en)` — `vi` bắt buộc không rỗng, `en` có thể `null`; `String resolve(Lang lang)` trả `en` nếu `lang == EN` và `en` không rỗng, ngược lại trả `vi`; `boolean missingEn()`.
  - `GET /api/admin/products` → danh sách; `GET /api/admin/products/{id}`; `POST`, `PUT /api/admin/products/{id}`; JSON:
    ```json
    {"id":1,"sortOrder":0,"showPrice":false,
     "name":{"vi":"…","en":null},"description":{"vi":"…","en":null},
     "features":{"vi":["…"],"en":[]},"cookingTips":{"vi":"…","en":null},
     "packagings":[{"weightGrams":2000,"priceVnd":null,"sortOrder":0}],
     "mediaIds":[3,5],"missingEn":true}
    ```
  - `ProductService` ghi qua `AuditService.record(...)` (Task 6) — trong Task 5 tạo interface `AuditService` với `void record(String entityType, long entityId, AuditAction action, Object before, Object after)` và một bản tạm không làm gì; Task 6 thay bằng bản thật.

- [ ] **Step 1: Viết test thất bại `ProductAdminTest`** — tạo sản phẩm với tên `Nếp cái hoa vàng 🌾`, đọc lại đúng từng ký tự (Review Focus 1); thiếu `name.vi` → 400 problem có `detail` tiếng Việt chỉ rõ trường; `missingEn: true` khi thiếu bất kỳ trường `en` nào, `false` khi đủ (Review Focus 3); `packagings` thay toàn bộ khi `PUT`; `weightGrams` ≤ 0 → 400; `mediaIds` không tồn tại → 400; chưa đăng nhập → 401.
- [ ] **Step 2–5: Chạy (FAIL) → viết code → chạy toàn bộ (PASS).**
- [ ] **Step 6: Commit** — `feat(api): add bilingual product and packaging admin`

---

### Task 6: Lịch sử sửa (audit), khôi phục, hành trình, báo chí

**Files:**
- Create: `audit/AuditLog.java`, `audit/AuditLogRepository.java`, `audit/JpaAuditService.java`, `audit/AuditedHandler.java`, `audit/AuditController.java`; `timeline/*`, `press/*` (entity, repository, service, admin controller, DTO); test `audit/AuditRestoreTest.java`, `timeline/TimelineAdminTest.java`, `press/PressAdminTest.java`
- Modify: bỏ bản tạm `AuditService` của Task 5

**Interfaces:**
- Consumes: `AuditService` interface (Task 5), `LocalizedText`.
- Produces:
  - `JpaAuditService implements AuditService`: chạy trong transaction của caller (`Propagation.MANDATORY`), lưu `before`/`after` là JSON của DTO admin, `user_id` = user đang đăng nhập.
  - `interface AuditedHandler { String entityType(); void restore(long entityId, String snapshotJson); }` — mỗi loại nội dung (`product`, `timeline_event`, `press_mention`, `story`, `site_setting`) có một bean.
  - `GET /api/admin/audit?entityType=&entityId=&page=` → `[{"id","userDisplayName","entityType","entityId","action","createdAt"}]` mới nhất trước, 50 dòng một trang.
  - `POST /api/admin/audit/{id}/restore` → 204: với `UPDATE`/`DELETE` dựng lại trạng thái `before_json` (tạo lại nếu đã xóa, giữ nguyên `id`); với `CREATE` → 409 `"Không thể khôi phục bản tạo mới; hãy xóa nội dung."`; ghi một dòng `RESTORE`.
  - Timeline: `/api/admin/timeline` CRUD + `PUT /api/admin/timeline/order` `{"ids":[…]}` (sắp xếp lại theo thứ tự mảng); JSON `{"id","year","sortOrder","title":LocalizedText,"description":LocalizedText,"mediaId","missingEn"}`.
  - Báo chí: `/api/admin/press` CRUD; `POST /api/admin/press/preview` `{"url"}` → `{"title","publishedOn","sourceName"}` đọc từ thẻ `og:title`, `article:published_time`, `og:site_name` của trang (timeout 5 giây, tối đa 2 MB, chỉ `http`/`https`, không theo IP nội bộ / `localhost`); lỗi → 200 với các trường `null` (admin tự nhập). Không tải ảnh của báo.

- [ ] **Step 1: Viết test thất bại** — `AuditRestoreTest`: sửa tiêu đề timeline 2 lần, khôi phục dòng sửa đầu → tiêu đề về bản gốc, có dòng `RESTORE`; xóa một bài báo rồi khôi phục → có lại cùng `id` và bản dịch; khôi phục dòng `CREATE` → 409; danh sách audit sắp mới nhất trước. `TimelineAdminTest`: CRUD, sắp xếp lại, thiếu `title.vi` → 400. `PressAdminTest`: CRUD; `preview` với một `HttpServer` của JDK trong test trả HTML có `og:title` → đúng tiêu đề; `preview` tới `http://127.0.0.1:…` khi chạy thật bị từ chối (cấu hình test cho phép bật/tắt kiểm tra IP nội bộ, mặc định bật) → các trường `null`.
- [ ] **Step 2–5: Chạy (FAIL) → viết code → chạy toàn bộ (PASS).**
- [ ] **Step 6: Commit** — `feat(api): add audit log with restore, timeline and press admin`

---

### Task 7: Blog "Câu chuyện Nếp Nhà"

**Files:**
- Create: `common/SlugGenerator.java`, `story/*`; test `common/SlugGeneratorTest.java`, `story/StoryAdminTest.java`

**Interfaces:**
- Consumes: `AuditService`, `AuditedHandler`, `LocalizedText`.
- Produces:
  - `SlugGenerator.slugify(String text): String` — bỏ dấu tiếng Việt (`Normalizer.Form.NFD` + bỏ dấu kết hợp, `đ`/`Đ` → `d`), chữ thường, ký tự không phải `a-z0-9` → `-`, gộp nhiều `-`, cắt `-` ở hai đầu, tối đa 80 ký tự.
  - `/api/admin/stories` CRUD; JSON `{"id","status","publishedAt","coverMediaId","slug":{"vi","en"},"title":LocalizedText,"excerpt":LocalizedText,"bodyHtml":LocalizedText,"missingEn"}`; `slug.vi` để trống → tạo từ `title.vi`; `slug.en` để trống và có `title.en` → tạo từ `title.en`.
  - `POST /api/admin/stories/{id}/publish` → `status=PUBLISHED`, `publishedAt` = lúc đó nếu chưa có; `POST /api/admin/stories/{id}/unpublish` → `DRAFT`.
  - `bodyHtml` được làm sạch khi lưu: chỉ giữ thẻ `p, h2, h3, strong, em, a[href], ul, ol, li, blockquote, img[src, alt]`, bỏ mọi thuộc tính khác và `javascript:` (dùng thư viện `org.jsoup:jsoup` `Safelist`; thêm vào `pom.xml`).
  - Trùng slug cùng ngôn ngữ → 409 `"Đường dẫn bài viết đã tồn tại."`.

- [ ] **Step 1: Viết test thất bại** — `SlugGeneratorTest`: `Câu chuyện mùa gặt ở Duy Tân` → `cau-chuyen-mua-gat-o-duy-tan`; `Đồng lúa đẹp` → `dong-lua-dep`; `  Xôi   NẾP!! ` → `xoi-nep`; chuỗi 200 ký tự → dài ≤ 80 và không kết thúc bằng `-`. `StoryAdminTest`: slug tự sinh; trùng slug → 409 (Review Focus 2); `<script>` và `onclick` bị bỏ khỏi `bodyHtml`, `<p><strong>` giữ lại; publish đặt `publishedAt` một lần, unpublish rồi publish lại giữ nguyên `publishedAt`.
- [ ] **Step 2–5: Chạy (FAIL) → viết code → chạy toàn bộ (PASS).**
- [ ] **Step 6: Commit** — `feat(api): add story blog admin with slugs and HTML sanitizing`

---

### Task 8: Tải ảnh

**Files:**
- Create: `media/*` (`Media`, `MediaRepository`, `MediaService`, `MediaAdminController`, `ImageProcessor`); test `media/MediaUploadTest.java` (ảnh test tạo ngay trong test: JPEG vẽ bằng ImageIO rồi chèn một segment APP1 `Exif\0\0` có tag GPS ngay sau `FF D8`; "fake.jpg" là bytes của chuỗi text; HEIC là 12 bytes `00 00 00 18 66 74 79 70 68 65 69 63`)
- Modify: `pom.xml` (TwelveMonkeys `imageio-webp`), `application.yml` (`app.media.dir`, `spring.servlet.multipart.max-file-size: 15MB`)

**Interfaces:**
- Produces:
  - `POST /api/admin/media` multipart `file` + `altVi` + `altEn` (cả hai bắt buộc, không rỗng) → 201 `{"id","url","width","height","mime","altVi","altEn"}`; `url` = `/media/<yyyy>/<mm>/<uuid>.<ext>`.
  - `GET /api/admin/media?page=` (mới nhất trước); `PUT /api/admin/media/{id}` sửa `altVi`/`altEn`; `DELETE /api/admin/media/{id}` → 409 `"Ảnh đang được dùng."` nếu còn bảng nào trỏ tới.
  - `ImageProcessor.process(InputStream in): ProcessedImage(byte[] bytes, String mime, int width, int height)` — nhận diện theo magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`); HEIC (`ftypheic`/`ftypheix`/`ftypmif1`) → `UnsupportedImageException("Ảnh HEIC chưa được hỗ trợ. Hãy chọn ảnh JPEG hoặc PNG.")` → 415; loại khác → 415 `"Chỉ nhận ảnh JPEG, PNG hoặc WebP."`; thu nhỏ để cạnh dài ≤ `MAX_EDGE_PX = 2560` (giữ tỉ lệ, không phóng to); ghi lại bằng ImageIO (JPEG chất lượng 0.85 cho đầu vào JPEG / WebP, PNG cho đầu vào PNG) — ghi lại không mang theo metadata, nên EXIF / GPS bị bỏ.
  - File lưu vào `app.media.dir` (mặc định `./data/media`, biến `MEDIA_DIR`); ghi file tạm rồi đổi tên; lỗi DB thì xóa file đã ghi.

- [ ] **Step 1: Viết test thất bại `MediaUploadTest`** — JPEG 4000×3000 → lưu 2560×1920; file lưu ra không còn segment `APP1` (`FF E1`) Exif (Review Focus 5); `fake.jpg` → 415; bytes HEIC (`....ftypheic`) → 415 với thông báo HEIC; thiếu `altEn` → 400; file 16 MB → 413; xóa ảnh đang gắn vào sản phẩm → 409.
- [ ] **Step 2–5: Chạy (FAIL) → viết code → chạy toàn bộ (PASS).**
- [ ] **Step 6: Commit** — `feat(api): add image upload with resize and EXIF removal`

---

### Task 9: Cài đặt trang, API công khai, dữ liệu mẫu

**Files:**
- Create: `site/*` (`SiteSetting`, `SiteSettingAdminController`), `publicapi/HomeController.java`, `publicapi/StoryPublicController.java`, `publicapi/*Dto.java`, `dev/DevSeed.java`; test `publicapi/PublicApiTest.java`, `dev/DevSeedTest.java`

**Interfaces:**
- Consumes: mọi repository của Task 3–8, `LocalizedText.resolve`.
- Produces:
  - Khóa `site_setting` cố định: `contact` → `{"phone","zalo","messenger","address":LocalizedText,"mapUrl","hours":LocalizedText}`, `social` → `{"facebook","youtube","tiktok"}`, `brand` → `{"tagline":LocalizedText}`. `GET/PUT /api/admin/settings/{key}` (key khác → 404).
  - `GET /api/public/{lang}/home` →
    ```json
    {"lang":"vi","brand":{"tagline":"…"},
     "products":[{"name","description","features":[…],"cookingTips","showPrice","packagings":[{"weightGrams","priceVnd"}],"images":[{"url","width","height","alt"}]}],
     "timeline":[{"year","title","description","image":{…}|null}],
     "press":[{"title","sourceName","url","publishedOn","image":{…}|null}],
     "stories":[{"slug","title","excerpt","publishedAt","cover":{…}|null}],
     "contact":{…}, "social":{…}}
    ```
    Mọi chữ đã chọn theo `lang` qua `resolve`; `priceVnd` là `null` khi `showPrice = false`; `stories` = 3 bài `PUBLISHED` mới nhất; `alt` theo `lang`.
  - `GET /api/public/{lang}/stories?page=` (12 bài một trang, chỉ `PUBLISHED`) và `GET /api/public/{lang}/stories/{slug}` → `{"slug","title","excerpt","bodyHtml","publishedAt","cover","alternateSlug"}` (`alternateSlug` = slug ở ngôn ngữ kia, để web làm `hreflang`); bài `DRAFT` hoặc không có → 404. Ở `en`, nếu bài không có `slug.en`, tìm theo `slug.vi`.
  - `lang` khác `vi`/`en` → 404.
  - `DevSeed` (chỉ profile `dev`, chỉ khi bảng `product` rỗng): 1 sản phẩm "Gạo nếp cái hoa vàng" với quy cách 2 kg, 3 mốc hành trình, 2 bài báo (URL `https://example.com/...`), 2 bài blog `PUBLISHED`, cài đặt `contact` với số điện thoại `0000 000 000`; mọi chuỗi mẫu bắt đầu bằng `[MẪU]`; không tạo ảnh.

- [ ] **Step 1: Viết test thất bại** — `PublicApiTest`: `/api/public/en/home` khi chỉ có bản `vi` → trả chữ `vi` (Review Focus 3); có `en` → trả `en`; `showPrice=false` → `priceVnd` null; bài `DRAFT` không xuất hiện và `/stories/{slug}` → 404; `/api/public/fr/home` → 404; không cần đăng nhập; `alternateSlug` đúng. `DevSeedTest` (profile `dev`): sau khởi động có đúng 1 sản phẩm và mọi tên bắt đầu `[MẪU]`; khởi động lần 2 không nhân đôi.
- [ ] **Step 2–5: Chạy (FAIL) → viết code → chạy toàn bộ (PASS).**
- [ ] **Step 6: Commit** — `feat(api): add site settings, public API and dev seed data`

---

### Task 10: Gọi revalidate của Next.js sau khi lưu

**Files:**
- Create: `publish/ContentChangedEvent.java`, `publish/RevalidateClient.java`, `publish/RevalidateListener.java`; test `publish/RevalidateTest.java`
- Modify: mọi service ghi nội dung (Task 5–9) phát `ContentChangedEvent`; `application.yml` (`app.web.base-url` từ `WEB_BASE_URL`, `app.web.revalidate-secret` từ `REVALIDATE_SECRET`)

**Interfaces:**
- Produces:
  - `record ContentChangedEvent(Set<String> tags)` — tag cố định: `home` (sản phẩm, hành trình, báo chí, cài đặt, ảnh), `stories` và `story:<slug>` cho mỗi slug bị ảnh hưởng (blog; publish/unpublish cũng phát `home`).
  - `RevalidateListener` `@TransactionalEventListener(phase = AFTER_COMMIT)` + `@Async` → `RevalidateClient.revalidate(Set<String> tags)`: `POST {base-url}/api/revalidate`, header `x-revalidate-secret`, body `{"tags":[…]}`, timeout 5 giây; lỗi hoặc HTTP ≥ 400 → thử lại tối đa 3 lần (chờ 1 s, 2 s, 4 s), mỗi lần log WARN có tag và lỗi; hết lần thử → log WARN `revalidate failed after 3 retries`; nội dung đã lưu không bị ảnh hưởng.
  - Khi `base-url` trống (local chưa chạy web) → log INFO một lần và bỏ qua.

- [ ] **Step 1: Viết test thất bại `RevalidateTest`** (JDK `HttpServer` làm Next.js giả) — sửa sản phẩm → server nhận 1 request có tag `home` và đúng secret; transaction bị rollback (lỗi validation) → không có request; server trả 500 hai lần rồi 200 → tổng 3 request, không lỗi cho admin; server luôn 500 → 4 request (1 + 3 lần thử) và API vẫn trả 200 cho lần lưu; publish bài → tag gồm `home`, `stories`, `story:<slug>`.
- [ ] **Step 2–5: Chạy (FAIL) → viết code → chạy toàn bộ (PASS).**
- [ ] **Step 6: Cập nhật `api/.env.example`** — `DB_URL`, `DB_USER`, `DB_PASSWORD`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `MEDIA_DIR`, `WEB_BASE_URL`, `REVALIDATE_SECRET` với giá trị mẫu rõ ràng là mẫu.
- [ ] **Step 7: Commit** — `feat(api): revalidate the website after content changes`

---

### Task 11: Kiểm tra chạy thật ở local

**Files:**
- Modify: `docs/setup.md`, `docs/session/STATE.md`

- [ ] **Step 1: Chạy thật** — `docker compose -f infra/compose.dev.yml up -d`; `cd api && BOOTSTRAP_ADMIN_EMAIL=admin@example.com BOOTSTRAP_ADMIN_PASSWORD=<mật khẩu tạm tự sinh> ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`.
- [ ] **Step 2: Gọi thử bằng `curl`** (ghi lệnh vào `docs/setup.md` mục "Thử API"): health → `UP`; `/api/public/vi/home` → có dữ liệu `[MẪU]`; login → đổi mật khẩu → tạo một mốc hành trình → `/api/public/vi/home` có mốc mới; tải một ảnh JPEG → file mới nằm trong `MEDIA_DIR` đúng đường dẫn của `url` (ở production Caddy phục vụ `/media/*`, phần D).
- [ ] **Step 3: Cập nhật `STATE.md`** — B1 xong, việc tiếp theo là plan B2.
- [ ] **Step 4: Commit** — `docs: record local API run`
