# Đưa Nếp Nhà lên internet (phần D)

Tài liệu này là danh sách việc **chỉ chủ dự án làm được**: thuê máy, tạo tài khoản, giữ key và mật khẩu.
Phần code đã có sẵn trong repo. Lý do chọn cách làm: `docs/decisions/0012-ha-tang-vps-nho.md`. Plan: `docs/superpowers/plans/2026-11-05-phan-d-ha-tang.md`.

Trong lúc chưa thuê VPS, bản xem thử giao diện (dữ liệu mẫu) chạy trên Vercel: `docs/xem-thu-vercel.md`.

Cách hệ thống chạy, nói ngắn gọn:
- Một VPS chạy 4 container: `caddy` (HTTPS, chia đường), `web` (Next.js), `api` (Spring Boot), `postgres`.
- Mỗi lần merge vào `main`, workflow `deploy` của GitHub Actions làm các việc sau:
  1. build image;
  2. chạy thử cả hệ thống trên máy của GitHub;
  3. đẩy image lên GHCR;
  4. SSH vào VPS để chạy bản mới;
  5. nếu bản mới lỗi thì tự quay lại bản trước.
- Mỗi đêm 02:30, VPS sao lưu cơ sở dữ liệu và ảnh bằng restic (có mã hóa).

Không ghi mật khẩu, key hay token vào repo, vào issue hay vào chat. Chỉ để chúng ở 3 chỗ: trình quản lý mật khẩu của anh/chị, file `/opt/nepnha/.env` trên VPS, và GitHub Secrets.

## 1. Thuê VPS
- [ ] Chọn nhà cung cấp ở Việt Nam, gói có đủ các điều kiện sau:
  - **2 vCPU, 2 GB RAM, từ 30 GB SSD**;
  - **Ubuntu 24.04**;
  - **IPv4 riêng**;
  - **cho đăng nhập root bằng SSH lúc mới tạo**.

  Nên chọn nơi có snapshot (chụp lại cả máy) và cho nâng cấp RAM sau này. Giá tham khảo tháng 11/2026: khoảng 100–190 nghìn đồng một tháng. Hãy xem giá trên trang của từng nhà cung cấp trước khi thuê.
- [ ] Ghi lại **IP** của VPS và mật khẩu root mà nhà cung cấp gửi.

## 2. Tạo hai cặp key SSH trên máy của anh/chị
Trên Windows, mở Git Bash:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/nepnha_admin -C "nepnha-admin"
```
```bash
ssh-keygen -t ed25519 -f ~/.ssh/nepnha_deploy -N "" -C "nepnha-github-deploy"
```
- `nepnha_admin` là key của anh/chị, nên đặt passphrase.
- `nepnha_deploy` là key cho GitHub Actions: để trống passphrase, vì GitHub cần dùng nó khi không có ai gõ.

## 3. Cài đặt VPS (một lần)
- [ ] Đăng nhập root (lần duy nhất dùng mật khẩu): `ssh root@<IP>`
- [ ] Tải script cài đặt và chạy nó. Thay hai chuỗi trong ngoặc kép bằng nội dung hai file `~/.ssh/nepnha_admin.pub` và `~/.ssh/nepnha_deploy.pub` (mỗi file là một dòng):
  ```bash
  curl -fsSLO https://raw.githubusercontent.com/ledat1011/nepnhaxudong/main/infra/vps/setup.sh
  bash setup.sh --admin-key "ssh-ed25519 AAAA... nepnha-admin" --deploy-key "ssh-ed25519 AAAA... nepnha-github-deploy"
  ```
  Script hỏi một mật khẩu cho user `nepnha`. Mật khẩu này chỉ dùng cho `sudo`, không dùng để đăng nhập SSH.

  Script này:
  - bật tường lửa (chỉ mở cổng 22, 80, 443);
  - cài fail2ban, tự cập nhật bảo mật (và tự khởi động lại máy lúc 04:30 khi cần);
  - thêm 2 GB swap;
  - cài Docker và restic;
  - tắt đăng nhập bằng mật khẩu và tắt đăng nhập root.
- [ ] **Chưa đóng cửa sổ root.** Mở một cửa sổ Git Bash mới và thử đăng nhập:
  ```bash
  ssh -i ~/.ssh/nepnha_admin nepnha@<IP>
  ```
  Vào được thì mới đóng cửa sổ root. Không vào được thì sửa ngay trong cửa sổ root đang mở.

## 4. Tạo file bí mật `.env` trên VPS
Trong cửa sổ `nepnha@<IP>`:
```bash
curl -fsSL -o /tmp/init-env.sh https://raw.githubusercontent.com/ledat1011/nepnhaxudong/main/infra/vps/init-env.sh
sudo -u deploy bash /tmp/init-env.sh <IP> <email-admin-đầu-tiên>
```
- [ ] Script in ra **mật khẩu admin tạm** và **mật khẩu sao lưu** (`RESTIC_PASSWORD`). Cất cả hai vào trình quản lý mật khẩu ngay. Mất mật khẩu sao lưu thì không đọc được bản sao lưu nào.
- [ ] Ghi lại địa chỉ web mà script in ra, dạng `https://203-0-113-7.sslip.io`. Phần sau `https://` là `SITE_HOST`.

## 5. Đặt biến và secret trên GitHub
Vào repo `ledat1011/nepnhaxudong` → Settings → Secrets and variables → Actions.
- [ ] Tab **Variables**, thêm:
  - `VPS_HOST` = IP của VPS
  - `SITE_HOST` = ví dụ `203-0-113-7.sslip.io` (phải giống hệt `SITE_HOST` trong `/opt/nepnha/.env`)
- [ ] Tab **Secrets**, thêm:
  - `VPS_SSH_KEY` = toàn bộ nội dung file `~/.ssh/nepnha_deploy`, tức key riêng (không phải file `.pub`)
  - `VPS_KNOWN_HOSTS` = kết quả của lệnh sau, chạy trên máy của anh/chị:
    ```bash
    ssh-keyscan -t ed25519 <IP>
    ```

## 6. Deploy lần đầu
- [ ] Vào tab Actions → workflow **deploy** → **Run workflow** (nhánh `main`). Workflow chạy mất khoảng 10–15 phút.
- [ ] Workflow xanh thì mở `https://<SITE_HOST>/vi` và kiểm tra trang hiện ra.
- [ ] Cài lịch sao lưu. Các file của lịch chỉ có trên VPS sau lần deploy đầu, nên phải làm bước này sau khi deploy. Trong cửa sổ `nepnha@<IP>`:
  ```bash
  sudo install -m 644 /opt/nepnha/systemd/nepnha-* /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now nepnha-backup.timer nepnha-restore-test.timer && systemctl list-timers 'nepnha-*'
  ```
  Kết quả phải có hai dòng `nepnha-backup.timer` và `nepnha-restore-test.timer`.
- [ ] Chạy thử một lần sao lưu: `sudo systemctl start nepnha-backup.service`, rồi xem kết quả bằng `sudo journalctl -u nepnha-backup -n 50`. Phải có dòng `backup done`.
- [ ] Mở `https://<SITE_HOST>/admin`, đăng nhập bằng email và mật khẩu tạm, rồi đổi mật khẩu.
- [ ] Đổi xong thì xóa mật khẩu tạm khỏi file `.env`:
  ```bash
  sudo -u deploy sed -i 's/^BOOTSTRAP_ADMIN_PASSWORD=.*/BOOTSTRAP_ADMIN_PASSWORD=/' /opt/nepnha/.env
  ```
- [ ] Tải lên một ảnh thật trong trang quản trị, rồi xem ảnh đó hiện trên trang chủ. Trong CI không kiểm tra được bước thu nhỏ ảnh qua `/_next/image` với tên miền thật, nên phải kiểm tra bằng tay ở đây.

Từ giờ, mỗi lần merge vào `main` là web tự cập nhật.

## 7. Cảnh báo (miễn phí, không cài gì trên VPS)
- [ ] **UptimeRobot** (uptimerobot.com): tạo 2 monitor kiểu HTTP(s), mỗi 5 phút, báo qua email:
  - `https://<SITE_HOST>/vi`
  - `https://<SITE_HOST>/api/actuator/health`
- [ ] **healthchecks.io**: tạo hai check:
  - `nepnha-backup`: chu kỳ 1 ngày, grace 2 giờ (sao lưu mỗi đêm);
  - `nepnha-restore-test`: chu kỳ 31 ngày, grace 1 ngày (chạy thử khôi phục mỗi tháng).

  Mỗi check có một đường ping riêng, dạng `https://hc-ping.com/<uuid>`. Mở `.env` bằng `sudo -u deploy nano /opt/nepnha/.env` và điền hai dòng có sẵn:
  ```
  HEALTHCHECK_URL=https://hc-ping.com/<uuid-của-nepnha-backup>
  RESTORE_HEALTHCHECK_URL=https://hc-ping.com/<uuid-của-nepnha-restore-test>
  ```
  Khi một lần chạy lỗi hoặc không chạy đúng hạn, healthchecks.io gửi email.

## 8. Gửi bản sao lưu ra ngoài VPS (Backblaze B2)
Trước bước này, bản sao lưu chỉ nằm trên VPS. Mất VPS là mất cả bản sao lưu.
- [ ] Tạo tài khoản tại backblaze.com (gói B2 miễn phí 10 GB, không cần thẻ).
- [ ] Tạo bucket **Private**, ví dụ `nepnha-backup`. Ghi lại endpoint, dạng `s3.<vùng>.backblazeb2.com`.
- [ ] Tạo Application Key chỉ cho bucket này (Read and Write).
- [ ] Sửa `/opt/nepnha/.env` bằng `sudo -u deploy nano /opt/nepnha/.env`:
  ```
  RESTIC_REPOSITORY=s3:https://s3.<vùng>.backblazeb2.com/nepnha-backup/nepnha
  AWS_ACCESS_KEY_ID=<keyID>
  AWS_SECRET_ACCESS_KEY=<applicationKey>
  ```
- [ ] Chạy thử một lần: `sudo systemctl start nepnha-backup.service`, rồi xem kết quả: `sudo journalctl -u nepnha-backup -n 50`.

## 9. Tên miền và Cloudflare (làm sau cùng)
- [ ] Kiểm tra tên miền còn trống (whois), rồi mua, ví dụ `nepnhaxudong.vn`.
- [ ] Tạo tài khoản Cloudflare (gói Free), thêm tên miền, trỏ NS của tên miền về Cloudflare.
- [ ] Ở Cloudflare, thêm bản ghi `A` cho tên miền trỏ về IP VPS, bật Proxied (đám mây màu cam).
- [ ] SSL/TLS → chế độ **Full (strict)**.
- [ ] Không bật "Cache Everything". Caddy đã gửi `Cloudflare-CDN-Cache-Control: no-store` cho trang HTML. Nếu sau này thêm Cache Rule, chỉ cache `/_next/static/*` và `/media/*`.
- [ ] Tạo API token: My Profile → API Tokens → mẫu "Edit zone DNS", chỉ cho tên miền này. Caddy dùng token này để lấy chứng chỉ khi đã đứng sau Cloudflare.
- [ ] Sửa `/opt/nepnha/.env`:
  ```
  SITE_HOST=nepnhaxudong.vn
  TLS_MODE=cloudflare
  CLOUDFLARE_API_TOKEN=<token>
  ```
- [ ] Đổi biến `SITE_HOST` trên GitHub cho giống, rồi chạy lại workflow **deploy**. Web phải build lại, vì `SITE_URL` được đọc lúc build.
- [ ] Đổi hai monitor của UptimeRobot sang tên miền mới.

## Việc thường ngày
Các lệnh dưới đây chạy trong cửa sổ `nepnha@<IP>`.

- Xem log của một container:
  ```bash
  cd /opt/nepnha && sudo -u deploy docker compose logs --tail 100 api
  ```
  Thay `api` bằng `web`, `caddy` hoặc `postgres`. Log được xoay vòng: mỗi container giữ tối đa 3 file × 10 MB.
- Xem trạng thái các container:
  ```bash
  cd /opt/nepnha && sudo -u deploy docker compose ps
  ```
- Quay lại bản trước bằng tay:
  ```bash
  sudo -u deploy bash /opt/nepnha/deploy.sh "$(cat /opt/nepnha/.previous-tag)" <SITE_HOST>
  ```
  VPS luôn giữ image của bản đang chạy và bản trước, nên lệnh này không cần tải gì. Lệnh này dùng file `compose.yml` hiện tại. Khi bản mới đổi file đó, hãy chép file cũ lại trước: `sudo -u deploy cp /opt/nepnha/compose.prev.yml /opt/nepnha/compose.yml`.
- Sau khi một PR đổi file trong `infra/systemd/`: cài lại lịch sao lưu bằng lệnh `sudo install …` ở mục 6. Deploy chỉ chép file vào `/opt/nepnha/systemd`, không tự cài.
- Xem danh sách bản sao lưu:
  ```bash
  sudo bash /opt/nepnha/backup/snapshots.sh
  ```
- Khôi phục từ bản sao lưu (web ngừng một lúc; script hỏi xác nhận trước):
  ```bash
  sudo bash /opt/nepnha/backup/restore.sh latest
  ```
- Ngày 1 hằng tháng, VPS tự chạy thử khôi phục vào một cơ sở dữ liệu tạm. Xem kết quả:
  ```bash
  sudo journalctl -u nepnha-restore-test -n 50
  ```
