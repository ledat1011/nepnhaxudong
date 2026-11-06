# Bản xem thử giao diện trên Vercel

Bản này chạy 24/24 trên máy chủ của Vercel, kể cả khi máy tính ở nhà tắt. Chỉ có giao diện với **dữ liệu mẫu**;
trang quản trị không đăng nhập được, vì chưa có API. Lý do chọn: `docs/decisions/0015-xem-thu-vercel.md`.
Khi web chạy thật trên VPS, làm theo `docs/deploy.md`.

## Cài đặt (một lần, chủ dự án làm)
1. Mở [vercel.com/signup](https://vercel.com/signup), chọn **Hobby**, rồi **Continue with GitHub**. Đăng nhập GitHub
   bằng tài khoản `ledat1011`.
2. Ở trang Vercel, bấm **Add New… → Project**. Khi GitHub hỏi quyền cho ứng dụng Vercel, chọn
   **Only select repositories** và chỉ chọn repo `nepnhaxudong`.
3. Bấm **Import** cạnh repo `nepnhaxudong`. Điền:

   | Ô | Giá trị |
   |---|---|
   | Project Name | `nepnha-xem-thu` (link sẽ là `https://nepnha-xem-thu.vercel.app`; nếu tên đã có người dùng thì Vercel báo, chọn tên khác) |
   | Framework Preset | **Next.js** (Vercel tự nhận) |
   | Root Directory | bấm **Edit**, chọn thư mục **`web`** |
   | Build and Output Settings | giữ mặc định |

4. Mở **Environment Variables**, thêm 3 biến (không có biến nào là bí mật):

   | Key | Value |
   |---|---|
   | `CONTENT_SOURCE` | `mock` |
   | `SITE_NOINDEX` | `1` |
   | `SITE_URL` | `https://nepnha-xem-thu.vercel.app` (đúng link ở bước 3, không có `/` ở cuối) |

5. Bấm **Deploy**. Chờ khoảng 2–3 phút. Xong thì mở `https://nepnha-xem-thu.vercel.app/vi`.
6. Nếu link thật khác với `SITE_URL` (xem ở **Settings → Domains**): sửa `SITE_URL` trong
   **Settings → Environment Variables**, rồi vào **Deployments**, bấm **⋯ → Redeploy** ở bản mới nhất.

## Sau đó
- Mỗi lần merge vào `main`, Vercel tự build và cập nhật link trên.
- Mỗi PR có một link xem thử riêng (Vercel ghi vào PR trên GitHub). Mặc định link này cần đăng nhập Vercel mới xem được.
- Kiểm tra bản xem thử không bị Google index: mở trang `/vi`, xem mã nguồn trang (Ctrl+U), phải thấy
  `<meta name="robots" content="noindex, nofollow"/>`. `robots.txt` cố ý không chặn trang công khai, để thẻ link khi gửi qua Zalo hay Messenger có hình.
- Gói Hobby chỉ dành cho dùng cá nhân, không thương mại. Khi web bán hàng thật trên VPS, xóa project này trong
  **Settings → Advanced → Delete Project**.
