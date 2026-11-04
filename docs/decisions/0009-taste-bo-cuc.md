# 0009 — Cho taste-skill chọn bố cục, giữ màu và font

## Bối cảnh
Quyết định `0006` chỉ cho dùng phần đánh giá và trình kiểm tra của taste-skill, không cho dùng `draw.mjs` để chọn hướng thiết kế, vì bộ nhận diện đã được duyệt ở phần A. Sau khi xem web, chủ dự án thấy các trang mẫu của plugin đẹp hơn nhiều. Một phần lý do là bố cục trang vẫn giữ kiểu B2 ban đầu, chưa được thiết kế lại.

## Quyết định
Ngày 2026-11-04, chủ dự án chọn "Cho phép, giữ màu font":
- Được dùng `draw.mjs` của taste-skill để chọn hướng bố cục: cách xếp các phần, nhịp trang, cách đặt ảnh và hình minh họa, cách dùng chữ lớn nhỏ.
- Luôn chạy với `--keep palette,type`: màu và font giữ đúng `brand/README.md`. Logo và mascot không đổi.
- Chạy `--options 3` để đưa 3 hướng cho chủ dự án chọn. Chỉ làm hướng chủ dự án đã chọn.

Quyết định này thay dòng "taste-skill chỉ dùng phần đánh giá và trình kiểm tra trên trình duyệt, không dùng để chọn hướng thiết kế mới" trong `0006`. Các phần khác của `0006` giữ nguyên.

## Lý do
- Màu, font, logo và mascot đã được duyệt và là nhận diện của gia đình. Bố cục thì chưa ai thiết kế kỹ.
- `draw.mjs` chọn hướng dựa trên 247 trang web được tuyển chọn, nên tránh được bố cục chung chung.

## Hệ quả
- Đổi bố cục trang chủ sẽ chạm vào các phần mà nhánh minh họa (`feat/canh-minh-hoa`) đang sửa. Làm sau khi nhánh đó merge, hoặc phối hợp trong nhánh đó.
- Vẻ đẹp của trang vẫn phụ thuộc nhiều vào ảnh thật (đồng lúa, bịch gạo, máy xát, người nhà). Bố cục mới không thay được ảnh thật.
