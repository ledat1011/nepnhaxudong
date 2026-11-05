# 0007 — Hai màu xanh trời chỉ dùng trong hình minh hoạ

## Bối cảnh
Chủ dự án muốn nền Hero có "trời xanh mây trắng". Bảng màu thương hiệu (spec 2026-11-03, mục 2.1, và `brand/README.md`) không có màu xanh da trời.

## Quyết định
- Thêm 2 màu, chỉ dùng trong hình minh hoạ (giống cách `da` và `toc` chỉ dùng trong mascot):
  - Xanh trời `#CFE4EE`: phần trên của bầu trời, nền hình nhỏ trên nhãn túi.
  - Xanh trời nhạt `#E9F2F1`: phần giữa của bầu trời, mặt nước ruộng, nền các cảnh ngoài trời.
- Không dùng 2 màu này cho chữ, nút, viền của giao diện, hay làm nền của một khối giao diện.
- Trời chuyển dần từ Xanh trời xuống Trắng gạo ở chân trời.
- Thêm Xanh lá nhạt `#A9C47F` (bổ sung 2026-11-05, chủ dự án chọn): chỉ dùng trong hình minh hoạ, cho áo của ba. Không dùng cho chữ, nút, viền giao diện.
- Mở rộng quy tắc cũ: Hồng má `#E59A84`, `da` `#F4CDA8` và `toc` `#222222` trước đây "chỉ dùng trong mascot", nay "chỉ dùng trong hình minh hoạ". Lý do: ba và anh 2 cũng cần màu da và tóc; than hồng trong lò sấy, máy xay màu đỏ và hộp quà cần một màu đỏ ấm. Vẫn không dùng các màu này cho chữ.

## Lý do
- Chủ dự án chọn trời xanh thay cho trời màu Vàng rơm.
- Chữ Nâu đất `#4A2C1A` trên Xanh trời có độ tương phản khoảng 8,9 : 1, trên Xanh trời nhạt cao hơn, nên chữ Hero vẫn đạt WCAG AA.
- Giới hạn "chỉ trong hình" giữ bảng màu của giao diện như cũ (2–3 màu chính và 1 màu nhấn).

## Hệ quả
- `brand/tokens/tokens.json` thêm `xanh-troi`, `xanh-troi-nhat` và `xanh-la-nhat` vào `color`, với `use` ghi "chỉ trong hình minh hoạ"; sửa `use` của `hong-ma`, `da`, `toc` thành "chỉ trong hình minh hoạ". Không thêm cặp chữ / nền nào vào `textPairs`.
- `brand/README.md`, mục "Quy tắc màu", sửa theo quyết định này.
- `web/src/lib/brand/colors.ts`: đổi `MASCOT_ONLY_COLORS` thành nhóm màu chỉ dùng trong minh hoạ (gồm 2 màu trời), và test `brand-sync` kiểm tra nhóm này khớp với `tokens.json`.
