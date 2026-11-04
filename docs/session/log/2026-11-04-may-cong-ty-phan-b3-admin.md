# 2026-11-04 — máy công ty — Phần B3 (trang quản trị) và điều phối B4

## Phản hồi
- Chủ dự án duyệt plan B3 và chọn chạy subagent-driven → làm trong worktree `D:\workspaces\nepnhaxudong-b3` (nhánh `feat/phan-b3-admin`) để website local ở thư mục chính vẫn chạy.
- "Có bước nào tách được sang session khác làm cho nhanh thì làm" → B4 chạy trong session riêng; Task 10 của B3 chạy song song với Task 9 trong worktree tạm rồi gộp lại.
- "Mở web ở local tôi review" → chạy bản B3 ở cổng 3011 (web) và 8090 (API), database riêng `nepnha_b3`; không tắt bản cũ ở 3000/8080 và port-forward luz ở 8081.
- Hỏi có dùng bộ skill frontend trên GitHub không → không: session mở từ `D:\workspaces\luz` nên plugin của repo (`frontend-design`, `playwright`, `claude-seo`) không được nạp. Chủ dự án bảo chuyển các session sang `D:\workspaces\nepnhaxudong` → đã chuyển.
- Push / tạo PR / merge của B3 và B4: hỏi chủ dự án trước.
- Session B4 không tự chuyển thư mục được (chế độ tự động chặn); chủ dự án đã tự chuyển session này sang `D:\workspaces\nepnhaxudong`.
- "Cài cái này rồi apply cho dự án https://github.com/miqdadbadjuber/anti-slop" → đọc và quét repo trước, cài vào `.claude/` của dự án, rồi áp dụng cho web. Chủ dự án thêm: cài cả `https://github.com/leonxlnx/taste-skill` và skill `web-design-guidelines` của `vercel-labs/agent-skills` (có luật code frontend).

- Chủ dự án chọn chế độ anti-slop "1 – Áp dụng trong lúc làm" → dùng luật anti-slop khi viết code giao diện, và chạy Delivery Gate (báo cáo PASS/FAIL) trước khi giao B3, B4 và các phần sau. Ghi thành luật trong `CLAUDE.md`.
- Chủ dự án đồng ý push nhánh `feat/anti-slop-taste` và mở PR vào `main` (PR #6), để các session sau tự nạp skill. Merge PR: hỏi chủ dự án.
- "Chỉ giữ 1 workspace nepnhaxudong thôi, những sub session dùng nó như khác worktree" → không tạo thư mục anh em (`nepnhaxudong-b3`, `-b4`, `-skills`...). Session phụ mở từ thư mục repo và để app tự tạo worktree riêng. Không cần ghi luật vào `CLAUDE.md` (chủ dự án: app đã tự làm việc này).
- Chủ dự án hỏi có nên chép hết skill vào repo không → chọn "Đổi sang plugin": anti-slop, taste-skill, gsap-skills khai báo trong `.claude/settings.json`; chỉ giữ `web-interface-guidelines` trong repo. AI không tự cài plugin, thiếu thì báo chủ dự án. Đã ghi vào `CLAUDE.md` và quyết định 0006.
- Chủ dự án bảo merge PR #6 → đã merge vào `main` (abc538d).
- "Lần sau tự mở PR nhé" → khi nhánh xong, đã review và test qua thì tự push và mở PR, không cần hỏi. Merge vẫn hỏi chủ dự án. Đã ghi vào `CLAUDE.md`.
- Popup Zalo và thanh đang tải: làm trên nhánh `feat/zalo-popup-dang-tai` sau khi B3 merge. Agent tự chọn màu thanh là Vàng lúa `#D9A13B` (Vàng rơm gần như không thấy trên nền) — chờ chủ dự án xác nhận.
- PR #11 (B3): "merge luôn nếu nó không phức tạp" → merge khi CI đạt hết và không có xung đột (repo không cho bật auto-merge của GitHub).
- "Commit push hết đi, tôi muốn coi sản phẩm để feedback" → commit và push nhánh B3 và B4 ngay khi vòng sửa cuối commit xong; mở server local để chủ dự án xem cả trang quản trị (B3) và hiệu ứng (B4). Mở PR / merge: vẫn hỏi trước.
- Góp ý sau khi xem web (hướng chung: mộc mạc, thôn quê nhưng hiện đại, bắt mắt, chuyển động mượt; dùng các skill giao diện mới để đề xuất):
  1. Nền sau mascot trống → thêm đồng lúa nếp sau lưng mascot, trời xanh, mây trắng, mặt trời chuyển động nhẹ liên tục, lúa lắc theo gió.
  2. Bấm Zalo → hiện popup mã QR, không chuyển sang trang khác.
  3. Khi trang đang tải lại → hiện trạng thái đang tải để khách biết.
  4. Một hình minh họa (kiểu hoạt hình) giống ảnh sản phẩm thật để khách biết sản phẩm trông thế nào.
  5. Rà trang quản trị để dễ dùng, thông minh hơn.
  6. Câu chuyện có hình động từ cánh đồng đến bữa ăn: gieo mạ → nắng gió mưa → thu hoạch → sấy thóc bằng dàn sấy than (lò than, quạt công suất lớn thổi hơi nóng quanh dàn, thóc đặt trên dàn) → máy xát tách vỏ (ảnh máy xát nhà đã gửi) → máy hút chân không đóng bịch vuông (ảnh sản phẩm đã gửi) → tới tay khách (làm quà, nấu ăn, trên kệ siêu thị) → các món nấu từ gạo nếp. Chủ dự án gợi ý vẽ trước bằng Figma hoặc Canva.
  - Tạo session song song cho các phần làm song song được.

## Quyết định
- Chủ dự án duyệt thiết kế popup Zalo và trạng thái đang tải (làm trên nhánh mới sau khi B4 merge, vì B4 đang sửa header và cơ chế chuyển trang):
  - Zalo, máy tính: popup có mã QR (tạo ở trình duyệt từ số Zalo trong trang quản trị, thư viện `qrcode`), số điện thoại, nút "Sao chép số", nút "Mở Zalo"; đóng bằng Esc hoặc bấm ra ngoài.
  - Zalo, điện thoại: tấm trượt từ dưới lên, nút lớn "Mở Zalo" (mở app) và "Sao chép số"; không hiện QR.
  - Đang tải: thanh mảnh màu rơm ở mép trên khi chuyển trang (chỉ hiện nếu chờ lâu hơn khoảng 250 ms, như dòng chữ đang tải của B4); khung xương cho danh sách câu chuyện khi chờ dữ liệu.
- Phạm vi B4: bỏ chớp mắt, cả bó lúa lắc chung, gộp logo và favicon thật vào B4, GSAP 3.15.0 — mascot thật không có lớp mắt, bó lúa là một nhóm.
- Không hiện "Đặt lại mật khẩu" ở dòng của chính mình — thao tác này đăng xuất và tắt xác thực 2 lớp của chính mình; đổi mật khẩu của mình dùng "Đổi mật khẩu".
- Đăng / gỡ bài bị khóa khi bài còn thay đổi chưa lưu — tránh đăng nội dung chưa xem lại.

## Còn mở
- Một số test của màn Câu chuyện quá thời gian chờ khi máy bận: sửa trước khi mở PR.
- Sau khi B3 và B4 xong: một lượt rà giao diện (`frontend-design`) và rà SEO (`claude-seo`) từ session mở trong thư mục repo; cần duyệt MCP của dự án nếu muốn dùng `shadcn`, `next-devtools`.
- Tắt server review ở cổng 3011 / 8090 khi chủ dự án xem xong.

## Đã làm
- Plan B4: `docs/superpowers/plans/2026-11-04-phan-b4-hieu-ung.md` (318a8b0, nhánh `feat/phan-b4-gsap`).
- B3 Task 4–10 xong, mỗi task có review và vòng sửa; Task 10 gộp vào nhánh B3 (5de2efe). Task 11 (kiểm thử đầu-cuối, CI, tài liệu) đang làm.
