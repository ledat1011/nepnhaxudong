# Phần D — Hạ tầng: kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Mục tiêu:** đưa web Nếp Nhà lên một VPS nhỏ ở Việt Nam để chạy lâu dài: 4 container sau Caddy, deploy tự động khi push `main`, có sao lưu hằng đêm và cảnh báo.

**Kiến trúc:** GitHub Actions build 3 image (`caddy`, `web`, `api`), chạy thử cả hệ thống bằng compose production trên runner, đẩy image lên GHCR, rồi SSH vào VPS chạy `deploy.sh`. Script này kéo image theo commit, chạy `docker compose up -d`, kiểm tra sức khỏe và tự quay lại tag trước khi lỗi. Postgres chỉ nằm trong mạng nội bộ. Ảnh tải lên nằm ở `/srv/nepnha/media` trên VPS: API ghi, Caddy đọc (chỉ đọc).

**Công nghệ:** Docker Compose v2, Caddy 2 (build kèm `caddy-ratelimit` và `caddy-dns/cloudflare`), Node 22 (Next.js 16 standalone), Temurin 21 JRE, Postgres 16, restic, systemd timer, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md` mục 4.2, 4.5 và 5; các điểm đổi so với spec ở `docs/decisions/0012-ha-tang-vps-nho.md`; ràng buộc ở mục "Ghi chú cho phần D" của `docs/session/STATE.md`.

## Ràng buộc chung
- VPS: 2 vCPU / 2 GB RAM, Ubuntu 24.04, 2 GB swap. Không build trên VPS.
- Giới hạn bộ nhớ container: `api` 1100m (JVM `-Xmx768m -XX:+ExitOnOutOfMemoryError`), `web` 384m, `postgres` 384m, `caddy` 128m. Mọi container `restart: unless-stopped`.
- Log docker: driver `json-file`, `max-size: 10m`, `max-file: 3` cho mọi container.
- Không có secret trong repo hay trong image. Secret ở `/opt/nepnha/.env` (quyền 600) và GitHub Secrets. File mẫu: `infra/prod.env.example`.
- Tên image: `ghcr.io/ledat1011/nepnha-{caddy,web,api}:<git sha>`.
- Trước khi có tên miền: `SITE_HOST=<ip có dấu gạch>.sslip.io`. `SITE_URL=https://${SITE_HOST}`, đặt cả lúc build web lẫn lúc chạy.
- Caddy: `/api/*` → `api:8080`, `/media/*` → `/srv/media` (chỉ đọc), còn lại → `web:3000`. Body `/api/*` tối đa 16 MB.
- API chạy profile mặc định (cookie `Secure`), `SERVER_FORWARD_HEADERS_STRATEGY=framework`, `WEB_BASE_URL=http://web:3000`.
- Web: `HOSTNAME=0.0.0.0`, `PORT=3000`, `CONTENT_SOURCE=api`, `API_BASE_URL=http://api:8080`. Không đặt `API_PROXY_ORIGIN` ở production.
- Sao lưu: mỗi đêm 02:30 (giờ Việt Nam), giữ 7 bản ngày và 4 bản tuần; chạy thử khôi phục mỗi tháng.
- Script shell: `bash`, `set -euo pipefail`, qua `shellcheck`. Chữ trong script và comment bằng tiếng Anh; tài liệu cho chủ dự án bằng tiếng Việt.

## Điểm cần soát kỹ
1. Sau Caddy, API phải biết request là HTTPS: cookie `XSRF-TOKEN` và `NEPNHA_SESSION` có `Secure`. Kiểm tra trong `smoke.sh` (Task 4).
2. Ảnh WebP tải lên bản đóng gói (`java -jar` trong container) phải qua được (plugin TwelveMonkeys). Kiểm tra trong `smoke.sh`.
3. Sửa nội dung trong admin phải hiện trên trang công khai đã được cache (revalidate thật từ API sang web). Kiểm tra trong `smoke.sh`.
4. Deploy lỗi (health check không qua trong 180 giây) phải quay lại tag trước và workflow báo đỏ. Kiểm tra bằng đọc code và `shellcheck`; không giả lập được VPS trong CI.
5. Bản sao lưu phải khôi phục được: `restore-test.sh` dựng lại DB từ bản mới nhất và đếm bảng. Chạy trong CI ở Task 5.

---

### Task 1: Image của API

**Files:**
- Create: `api/Dockerfile`, `api/.dockerignore`

**Interfaces:**
- Produces: image nghe cổng 8080, chạy user UID 10001, `MEDIA_DIR=/data/media` (thư mục thuộc UID 10001), JVM đọc thêm cờ từ `JAVA_OPTS`.

- [ ] **Step 1:** Dockerfile hai tầng: `eclipse-temurin:21-jdk` chạy `./mvnw -B -q -DskipTests package` (copy `pom.xml`, `.mvn`, `mvnw` trước để cache phụ thuộc bằng `dependency:go-offline`), rồi `eclipse-temurin:21-jre` chỉ có file jar. `ENTRYPOINT ["sh","-c","exec java $JAVA_OPTS -jar /app/app.jar"]`. Mặc định `JAVA_OPTS="-Xmx768m -XX:+ExitOnOutOfMemoryError"`.
- [ ] **Step 2:** `.dockerignore`: `target/`, `data/`, `.idea/`, `*.log`.
- [ ] **Step 3:** Build thử trong CI (Task 4). Kết quả mong đợi: image build xong, `smoke.sh` gọi health ra `UP`.

### Task 2: Image của web

**Files:**
- Create: `web/Dockerfile`, `web/.dockerignore`

**Interfaces:**
- Produces: image nghe `0.0.0.0:3000`, chạy user `node`, nhận build arg `SITE_URL`.

- [ ] **Step 1:** Dockerfile ba tầng trên `node:22-bookworm-slim`: `npm ci`; `next build` với `ARG SITE_URL`, `NEXT_TELEMETRY_DISABLED=1`; tầng chạy chỉ chép `.next/standalone`, `.next/static` (vào `.next/static` cạnh `server.js`) và `public/`. `CMD ["node","server.js"]`, `ENV HOSTNAME=0.0.0.0 PORT=3000 NODE_ENV=production`.
- [ ] **Step 2:** `.dockerignore`: `node_modules`, `.next*`, `playwright-report`, `test-results`, `coverage`, `.env*`.
- [ ] **Step 3:** Build thử trong CI (Task 4). Kết quả mong đợi: `/vi` trả 200 qua Caddy.

### Task 3: Image của Caddy và Caddyfile

**Files:**
- Create: `infra/caddy/Dockerfile`, `infra/caddy/Caddyfile`

**Interfaces:**
- Consumes: biến `SITE_HOST`, `TLS_MODE` (`acme` hoặc `cloudflare`), `ACME_EMAIL`, `CLOUDFLARE_API_TOKEN`.
- Produces: image có Caddyfile ở `/etc/caddy/Caddyfile`; đổi Caddyfile là đổi image, nên quay lại tag trước cũng trả lại Caddyfile cũ.

- [ ] **Step 1:** Dockerfile: `caddy:2-builder` chạy `xcaddy build --with github.com/mholt/caddy-ratelimit --with github.com/caddy-dns/cloudflare`, rồi `caddy:2-alpine` thay binary và chép Caddyfile. Cuối Dockerfile: `RUN SITE_HOST=localhost caddy validate --config /etc/caddy/Caddyfile` để Caddyfile sai thì build lỗi.
- [ ] **Step 2:** Caddyfile:
  - Global: `order rate_limit before reverse_proxy`; `servers { trusted_proxies static <dải IP Cloudflare>; client_ip_headers CF-Connecting-IP X-Forwarded-For }`; `email {$ACME_EMAIL}` khi có.
  - Snippet `(tls_acme)` rỗng và `(tls_cloudflare)` dùng `dns cloudflare {env.CLOUDFLARE_API_TOKEN}`; site import `tls_{$TLS_MODE:acme}`.
  - `rate_limit`: vùng `login` (POST `/api/auth/login`, theo `{client_ip}`, 5 lần / phút), vùng `login_all` (cùng đường dẫn, khóa chung, 30 lần / phút), vùng `admin` (`/api/admin/*`, theo IP, 120 lần / phút).
  - `request_body` cho `/api/*`: `max_size 16MB`.
  - `/media/*`: `root /srv/media`, `file_server` (không liệt kê thư mục), `X-Content-Type-Options: nosniff`, `Cache-Control: public, max-age=31536000, immutable` chỉ khi file có thật.
  - Các đường dẫn khác `/media/*` và `/_next/static/*`: `Cloudflare-CDN-Cache-Control: no-store`.
  - `Strict-Transport-Security: max-age=31536000`, bỏ header `Server`, `encode zstd gzip` (trừ `/media/*`).
  - Không đặt cache ở Caddy; `reverse_proxy` giữ nguyên header `rsc` và tham số `_rsc` (mặc định).
- [ ] **Step 3:** Kiểm tra: build image (bước validate qua), và các kiểm tra header trong `smoke.sh` (Task 4).

### Task 4: Compose production, file env mẫu, smoke test và CI

**Files:**
- Create: `infra/compose.prod.yml`, `infra/prod.env.example`, `infra/test/compose.smoke.yml`, `infra/test/smoke.sh`, `.github/workflows/infra.yml`

**Interfaces:**
- Consumes: 3 image ở Task 1–3.
- Produces: `IMAGE_PREFIX`, `IMAGE_TAG` trong `.env` chọn image; `smoke.sh <base-url>` trả mã 0 khi mọi kiểm tra qua. Task 6 dùng lại `smoke.sh` trong workflow deploy.

- [ ] **Step 1:** `compose.prod.yml`: mạng `edge` (caddy, web, api) và `internal` (`internal: true`; api, postgres, web). Postgres 16-alpine với `-c shared_buffers=96MB -c max_connections=30 -c work_mem=4MB`, healthcheck `pg_isready`, volume `pgdata`. API `depends_on: postgres: condition: service_healthy`. Caddy publish `80`, `443`, `443/udp`; volume `/srv/nepnha/media:/srv/media:ro`, `caddy_data`, `caddy_config`. API mount `/srv/nepnha/media:/data/media`. Biến lấy từ `.env`; biến bắt buộc dùng `${VAR:?}`.
- [ ] **Step 2:** `prod.env.example`: mọi biến của `.env`, giá trị mẫu rỗng hoặc ví dụ, kèm một dòng giải thích mỗi biến.
- [ ] **Step 3:** `compose.smoke.yml`: `SITE_HOST=localhost` (Caddy tự cấp chứng chỉ nội bộ), cổng `127.0.0.1:8443:443` (dùng `!override`), thư mục ảnh tạm.
- [ ] **Step 4:** `smoke.sh` (curl, `-k`), mỗi kiểm tra in tên và dừng ở kiểm tra đầu tiên sai:
  1. `GET /api/actuator/health` có `"status":"UP"` (đợi tối đa 180 giây).
  2. `GET /vi` trả 200 và có `Cloudflare-CDN-Cache-Control: no-store`.
  3. `GET /api/auth/csrf`: `Set-Cookie: XSRF-TOKEN` có `Secure`.
  4. Đăng nhập admin đầu tiên, đổi mật khẩu, tải ảnh WebP 1×1 (`UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA`) → 201; `GET` url ảnh trả 200, `Content-Type: image/webp`, `nosniff`, `immutable`.
  5. Tạo mốc hành trình tên `SMOKE-<ngẫu nhiên>`; trong 20 giây `GET /vi` phải có tên đó.
  6. `POST /api/revalidate` từ ngoài không trả 2xx.
  7. Body 17 MB gửi tới `/api/admin/media` trả 413.
  8. 6 lần `POST /api/auth/login` (email không tồn tại) liên tiếp: có ít nhất một lần 429.
  9. `docker compose port postgres 5432` không có kết quả.
- [ ] **Step 5:** `infra.yml`: chạy khi PR đổi `infra/**`, `api/Dockerfile`, `api/.dockerignore`, `web/Dockerfile`, `web/.dockerignore`, hai workflow `infra.yml` và `deploy.yml`. Các bước: `shellcheck infra/**/*.sh`; build 3 image (`docker buildx`, cache `gha`, `load: true`); `docker compose -f infra/compose.prod.yml -f infra/test/compose.smoke.yml up -d`; `smoke.sh https://localhost:8443`; bước test sao lưu (Task 5); lỗi thì in `docker compose logs`.
- [ ] **Step 6:** Push nhánh, xem workflow `infra` xanh.

### Task 5: Sao lưu và khôi phục

**Files:**
- Create: `infra/backup/backup.sh`, `infra/backup/restore.sh`, `infra/backup/restore-test.sh`, `infra/systemd/nepnha-backup.service`, `infra/systemd/nepnha-backup.timer`, `infra/systemd/nepnha-restore-test.service`, `infra/systemd/nepnha-restore-test.timer`
- Modify: `.github/workflows/infra.yml`

**Interfaces:**
- Consumes: `.env` của `/opt/nepnha` (biến `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `HEALTHCHECK_URL`), service `postgres` trong compose, thư mục `MEDIA_HOST_DIR` (mặc định `/srv/nepnha/media`).
- Produces: `backup.sh` (không tham số), `restore.sh <snapshot|latest>`, `restore-test.sh`; đều đọc thư mục compose từ biến `NEPNHA_DIR` (mặc định `/opt/nepnha`).

- [ ] **Step 1:** `backup.sh`: ping `${HEALTHCHECK_URL}/start` nếu có; `restic init` khi kho chưa có; `docker compose exec -T postgres pg_dump -Fc` vào thư mục tạm; `restic backup` file dump và thư mục ảnh, gắn tag `nepnha`; `restic forget --keep-daily 7 --keep-weekly 4 --prune`; `restic check`; ping thành công, hoặc `${HEALTHCHECK_URL}/fail` khi có lỗi (trap).
- [ ] **Step 2:** `restore-test.sh`: `restic restore latest` vào thư mục tạm; chạy một container `postgres:16-alpine` tạm, `pg_restore` file dump, đếm bảng trong schema `public` (phải lớn hơn 0) và kiểm tra có bảng `flyway_schema_history`; xóa container và thư mục tạm (trap). Lỗi thì ping `/fail`.
- [ ] **Step 3:** `restore.sh`: hỏi xác nhận (gõ `KHOI PHUC`), dừng `api` và `web`, `pg_restore --clean --if-exists` vào DB đang chạy, chép lại ảnh, bật lại `api` và `web`.
- [ ] **Step 4:** Timer: sao lưu `*-*-* 02:30:00`, khôi phục thử `*-*-01 03:30:00`, cả hai `Persistent=true`.
- [ ] **Step 5:** Thêm vào `infra.yml` sau `smoke.sh`: chạy `backup.sh` với kho restic tạm, rồi `restore-test.sh`. Kết quả mong đợi: cả hai trả mã 0.

### Task 6: Script VPS và workflow deploy

**Files:**
- Create: `infra/vps/setup.sh`, `infra/vps/init-env.sh`, `infra/vps/deploy.sh`, `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `smoke.sh` (Task 4), file systemd (Task 5).
- Produces: `setup.sh --admin-key "<public key>" --deploy-key "<public key>"` (root, chạy một lần); `init-env.sh <ip-công-khai> <email-admin>` (tạo `/opt/nepnha/.env`); `deploy.sh <tag> <site-host>`.

- [ ] **Step 1:** `setup.sh`: từ chối chạy nếu không phải root hoặc không phải Ubuntu 24.04; đặt múi giờ `Asia/Ho_Chi_Minh`; tạo user `nepnha` (sudo, key của chủ dự án) và `deploy` (nhóm `docker`, key của GitHub Actions); file `/etc/ssh/sshd_config.d/10-nepnha.conf` (`PasswordAuthentication no`, `KbdInteractiveAuthentication no`, `PermitRootLogin no`), `sshd -t` trước khi reload; ufw (OpenSSH, 80/tcp, 443/tcp, 443/udp); fail2ban (`[sshd] backend = systemd`); unattended-upgrades (tự khởi động lại lúc 04:30); swap 2 GB, `vm.swappiness=10`; Docker từ kho apt chính thức của Docker; `restic`; thư mục `/opt/nepnha` (chủ `deploy`), `/srv/nepnha/media` (UID 10001). Chạy lại script không hỏng gì.
- [ ] **Step 2:** `init-env.sh`: không ghi đè `.env` đã có; sinh `POSTGRES_PASSWORD`, `REVALIDATE_SECRET`, `RESTIC_PASSWORD`, `BOOTSTRAP_ADMIN_PASSWORD` bằng `openssl rand`; `SITE_HOST=<ip>.sslip.io` với dấu chấm đổi thành gạch; quyền 600; in mật khẩu admin tạm và mật khẩu restic một lần, nhắc chủ dự án cất vào trình quản lý mật khẩu.
- [ ] **Step 3:** `deploy.sh <tag> <site-host>`: dừng nếu `SITE_HOST` trong `.env` khác `<site-host>`; nhớ tag cũ; `IMAGE_TAG=<tag> docker compose pull`; ghi `IMAGE_TAG=<tag>` vào `.env`; `docker compose up -d --remove-orphans`; health check `curl --resolve <site-host>:443:127.0.0.1` cho `/api/actuator/health` và `/vi`, tối đa 180 giây; lỗi thì in log, ghi lại tag cũ, `up -d`, trả mã 1; thành công thì lưu tag cũ vào `.previous-tag` và `docker image prune -af --filter until=168h`; chép file systemd từ `/opt/nepnha/systemd` chỉ khi `setup.sh` đã cài (deploy không có sudo, nên timer do `setup.sh` cài một lần).
- [ ] **Step 4:** `deploy.yml`: chạy khi push `main` và bằng tay; `if: vars.VPS_HOST != ''` (chưa có VPS thì bỏ qua, không báo đỏ); `concurrency: deploy` không hủy giữa chừng; `permissions: packages: write`. Các bước: build 3 image với `SITE_URL=https://${{ vars.SITE_HOST }}`, chạy `smoke.sh` với compose smoke, push 3 image lên GHCR; ghi key SSH (`secrets.VPS_SSH_KEY`) và `known_hosts` (`secrets.VPS_KNOWN_HOSTS`); `scp` `infra/compose.prod.yml`, `infra/backup/`, `infra/systemd/`, `infra/vps/deploy.sh` vào `/opt/nepnha`; SSH: `docker login ghcr.io` bằng `GITHUB_TOKEN`, `deploy.sh <sha> <site-host>`, luôn `docker logout`.
- [ ] **Step 5:** `infra/test/deploy-test.sh`: kho image tạm (`registry:2`), deploy bản tốt rồi bản có API hỏng; bản hỏng phải trả mã 1 và quay lại bản tốt. Chạy trong workflow `infra` sau `run-smoke.sh`; `shellcheck` qua.

### Task 7: Tài liệu cho chủ dự án

**Files:**
- Create: `docs/deploy.md`
- Modify: `docs/setup.md` (một dòng trỏ sang `docs/deploy.md`), `docs/session/STATE.md`

- [ ] **Step 1:** `docs/deploy.md` (tiếng Việt), theo thứ tự: chọn và thuê VPS (tiêu chí: 2 vCPU / 2 GB, Ubuntu 24.04, IPv4 riêng, có snapshot); tạo 2 cặp key SSH trên máy mình; chạy `setup.sh`; thử đăng nhập bằng user `nepnha` ở cửa sổ mới trước khi đóng cửa sổ root; chạy `init-env.sh`; đặt GitHub Variables (`VPS_HOST`, `SITE_HOST`) và Secrets (`VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`); chạy workflow `deploy`; đăng nhập admin lần đầu và đổi mật khẩu, xóa `BOOTSTRAP_ADMIN_PASSWORD` khỏi `.env`; UptimeRobot (`/vi`, `/api/actuator/health`); healthchecks.io; Backblaze B2; sau cùng: tên miền và Cloudflare (`SSL Full (strict)`, Cache Rules không cache HTML, `TLS_MODE=cloudflare`, đổi `SITE_HOST` ở cả `.env` và GitHub Variables). Cuối file: cách xem log, quay lại bản trước, khôi phục từ sao lưu.
- [ ] **Step 2:** `STATE.md`: phần D đã có code; đánh dấu từng ghi chú của "Ghi chú cho phần D" là đã xử lý (ở file nào) hoặc để sau.
