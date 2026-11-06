# 2026-11-06 — máy công ty — link chia sẻ và giấy chứng nhận

## Phản hồi
- Mở `https://nepnhaxudong-prevew.vercel.app` thì web tự chuyển sang `/en`; chủ dự án muốn mặc định là `/vi` → `/` luôn chuyển sang `/vi`, không xét ngôn ngữ của trình duyệt nữa. Người cần tiếng Anh bấm nút đổi ngôn ngữ.
- Gửi link bản xem thử qua tin nhắn thì thẻ link không có hình (cũng không có tiêu đề) → nguyên nhân có khả năng cao: `robots.txt` của bản xem thử chặn mọi bot (`Disallow: /`), nên bot tạo thẻ link không đọc trang. Sửa: bản xem thử vẫn `noindex` bằng thẻ meta, nhưng `robots.txt` không chặn trang công khai nữa.
- Sản phẩm có giấy chứng nhận cơ sở đủ điều kiện an toàn thực phẩm (Sở NN&PTNT Hải Dương, số 05/2021/NNPTNT-HD, cấp cho Chi hội nông dân nghề nghiệp sản xuất và tiêu thụ gạo nếp cái hoa vàng phường Duy Tân) → chủ dự án muốn dùng "nano banana" làm ảnh đẹp và rõ hơn rồi đưa lên web cho khách an tâm. Giấy ghi hiệu lực đến 27/6/2024 nên đã hết hạn; chủ dự án nói chưa có giấy mới → chưa đưa giấy lên web, chờ giấy mới.

## Quyết định
- `/` luôn chuyển sang `/vi` — khách chủ yếu là người Việt, nhiều người dùng điện thoại cài tiếng Anh.
- Giấy chứng nhận: không dùng AI tạo lại ảnh (Nano Banana có thể đổi chữ, số, con dấu, chữ ký). Khi có giấy mới, chủ dự án chụp lại thẳng, đủ sáng, độ phân giải cao; chỉ cắt, làm thẳng, tăng tương phản, không vẽ lại nội dung.

## Còn mở
- Đưa giấy chứng nhận ATTP lên web khi có giấy mới còn hạn (chủ dự án gửi ảnh chụp mới).
- Sau khi merge: gửi lại link để kiểm tra thẻ link có hình. Zalo và Messenger có thể còn giữ thẻ cũ một thời gian; thử link có thêm `?v=2`.

## Đã làm
- Nhánh `feat/link-chia-se`: `/` luôn về `/vi`; bản xem thử không chặn bot trong `robots.txt`, giữ `noindex` bằng thẻ meta và header `X-Robots-Tag`. Test đơn vị và e2e trang chủ, SEO đều qua.
