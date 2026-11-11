# Chuyển động cho khối "Từ hạt lúa tới người dùng" (chuyện hạt nếp)

Ngày: 2026-11-11. Chủ dự án đã duyệt cách làm và bảng chuyển động trong chat. Câu của chủ dự án: "viết spec đi rồi làm đi".

## 1. Mục tiêu

8 cảnh của khối "Từ hạt lúa tới người dùng" (`#tu-hat-lua`) hiện là tranh WebP tĩnh, nét mực manhua (quyết định `0014`). Việc này làm cho mỗi cảnh có chuyển động nhỏ, mà vẫn giữ nguyên nét vẽ đã duyệt.

Thành công nghĩa là:
- Mỗi cảnh có một đoạn mở đầu 1–2 giây khi cảnh tới gần giữa màn hình. Đoạn mở đầu đang chạy dở mà cảnh ra hẳn khỏi màn hình thì dừng đúng chỗ đó; khi cảnh quay lại thì chạy tiếp từ chỗ đã dừng (chủ dự án, 2026-11-11: "scroll qua thì dừng tại thời điểm đó, back lại thì tiếp tục"). Cảnh đã chạy xong đoạn mở đầu mà ra hẳn khỏi màn hình thì quay về khung đầu; khi quay lại (cuộn xuống hay cuộn lên) thì chạy lại đoạn mở đầu từ đầu (chủ dự án, 2026-11-11: "phải chạy lại 1 vòng như lúc đầu"). Sau đó cảnh chuyển động liên tục khi còn trên màn hình, không dừng sau đoạn mở đầu (chủ dự án, sau khi xem bản đầu: "ảnh không chạy liên tục, chạy xong bị dừng").
- Nét mực và màu của tranh không đổi: phần động được cắt thẳng từ tranh gốc, hoặc vẽ bằng code (mưa, gió, hơi, trấu).
- Trang đầu không nặng hơn. Lớp động chỉ tải khi cảnh sắp tới.
- Người xem bật "giảm chuyển động" thì thấy tranh tĩnh như bây giờ, và không tải gì thêm.

## 2. Cách làm (chủ dự án đã chọn)

Giữ tranh manhua làm nền. Chỉ cắt vài vật cần động thành lớp ảnh trong suốt, cộng hiệu ứng vẽ bằng code. Không dựng lại cảnh SVG tách lớp.

Quy tắc chủ dự án đã chốt:
- Máy gặt (bước 3) và xe chở gạo (bước 7) chỉ rung hoặc quay bánh tại chỗ, không chạy ngang qua tranh. Như vậy không phải vẽ bù phần nền phía sau bằng AI.
- Người trong tranh đứng yên.

## 3. Bảng chuyển động

| Bước | Mở đầu (chạy một lần) | Lặp lại khi còn trên màn hình | Phần động |
|---|---|---|---|
| 1. Cấy mạ | Gợn nước lan ra quanh tay người cấy | Mây trôi chậm, gợn nước nhẹ | Gợn nước: code. Mây: lớp cắt |
| 2. Nắng, mưa, gió | Nắng chói, mây kéo tới, mưa rơi, gió quét, rồi trời chuyển sang đêm trăng | Cả vòng lặp lại: đom đóm trong đêm, trời sáng về lúa non, lúa lớn lại tới đêm | Ngày sang đêm: tranh đêm đã có, hiện dần lên trên tranh ngày. Mưa, gió, sao, lay lúa: code |
| 3. Gặt lúa | Guồng quay một vòng | Chỉ guồng quay liên tục như cánh quạt; máy gặt đứng yên, không bụi, không chim (chủ dự án, 2026-11-11: "chỉ cần đầu máy gặt chuyển động thôi") | Guồng: lớp cắt (ghép lại từ 1/6 nguyên vẹn, quay sau bông lúa phía trước) |
| 4. Sấy thóc | Than đỏ rực lên, quạt bắt đầu quay | Cánh quạt quay, mũi tên hơi nóng đi lên | Cánh quạt: lớp cắt hình tròn. Than rực, hơi nóng: code |
| 5. Xay xát | Gạo trắng chảy xuống từ vòi | Trấu bay ra, gạo chảy | Code |
| 6. Đóng gói | Nắp máy hút chân không ép xuống, thêm một túi lên chồng | Nắp ép lên xuống mỗi vài giây | Nắp, túi mới: lớp cắt |
| 7. Đến tay khách | Xe chở gạo rung như vừa đỗ, bánh xe quay | Bánh xe quay đều tại chỗ, xe rung nhẹ như máy đang nổ, mây trôi | Xe, bánh xe, mây: lớp cắt |
| 8. Mâm cơm | Hơi nóng bốc lên từ xôi và chè | Hơi bốc nhẹ | Code |

Khi làm, vị trí chính xác của từng vật được đo trên tranh gốc. Nếu một vật không cắt sạch được (ví dụ bị bông lúa phía trước che), chuyển động đó được làm nhẹ đi hoặc vẽ bằng code, và ghi lại trong báo cáo.

## 4. Thiết kế kỹ thuật

### 4.1. Tài nguyên
- **Nguồn:** bản phác đã duyệt `brand/story/phac/*.webp` (1600 px).
- **Định nghĩa lớp:** `brand/story/layers.json`. Mỗi lớp ghi: cảnh, tên, hình cắt (chữ nhật, tròn hoặc đa giác, đo theo pixel của bản 1600 px), độ mờ mép, tâm quay nếu có. Nếu vật dời khỏi chỗ cũ, ghi thêm vùng tô bù bằng màu nền phẳng xung quanh. Chỉ dùng vùng tô bù khi nền ở đó là màu phẳng.
- **Công cụ cắt:** `brand/tools/cut-story-layers.py` (Python, PIL). Script đọc `layers.json`, cắt từng lớp từ bản phác thu về 1200 × 675 (đơn vị của mọi tọa độ). Script ghi:
  - 8 tranh cảnh trên web, 960 × 540 (sau góp ý "page load hơi lâu", 2026-11-11: khung cảnh rộng tối đa 416 px nên 960 px vẫn nét trên màn hình tỉ lệ 2, nhẹ hơn khoảng 30 %);
  - mỗi lớp ra một file WebP có kênh trong suốt, trong `web/public/lop/`;
  - vị trí và kích thước của mọi lớp (theo phần trăm khung cảnh) ra `web/src/lib/story/scene-layers.json`.
- **Tranh đêm bước 2:** chỉ có đồng lúa dưới trăng, không có người: ban đêm hai ông bà đã về nghỉ (chủ dự án, 2026-11-11). Khi trời chuyển sang đêm, hai người mờ dần cùng lúc tranh đêm hiện lên. File `web/public/story/canh-2-nang-mua-gio-dem.webp` (960 × 540, như tranh ngày), xuất từ `brand/story/phac/2-nang-mua-gio-dem.webp`.
- **Giới hạn dung lượng:** mỗi lớp dưới 40 KB; tổng các lớp của một cảnh dưới 120 KB. Tranh lúa non và tranh đêm của bước 2 tính riêng: mỗi tranh dưới 120 KB. Test kiểm tra.
- **Bước 2 (chủ dự án chọn thêm, 2026-11-11):** lúa lớn dần: tranh lúa non mới (Nano Banana Pro, cùng bố cục) → lúa xanh → lúa chín vàng → đêm trăng. Lúa xanh được đổi màu từ tranh gốc ngay trong trình duyệt (`web/src/lib/story/green-rice.ts`), vì làm thành file thì nặng như chính tranh gốc (khoảng 150 KB). Việc đổi màu chia thành từng dải 60 hàng điểm ảnh, nghỉ giữa các dải, để không làm khựng chuyển động khác đang chạy (làm một lần thì chặn trang 50–80 ms). Giọt mưa có sẵn trong tranh được cắt theo từng giọt (mỗi giọt một hình tròn nhỏ) và che đi lúc đầu, rồi hiện ra khi mây đã tới; thêm vài giọt rơi vẽ bằng code. Như vậy không có mưa trước khi có mây.

### 4.2. Trên trang
- **Phần HTML tĩnh gần như không đổi.** Ảnh WebP của mỗi cảnh được bọc trong một khung (`data-story-stage`). Khung mang hiệu ứng mờ mép (`story-scene-fade`), nên lớp động cũng mờ mép như tranh.
- **Mã chuyển động** (`lib/motion/story/rice-story.ts`) giữ cơ chế đang có:
  - tải trước khoảng một màn hình (`STORY_LOAD_AHEAD`);
  - đoạn mở đầu chạy ở 75 % chiều cao màn hình (`STORY_INTRO_LINE`);
  - vòng lặp chạy thưa để đỡ tốn máy (`throttledLoop`);
  - cảnh ra khỏi màn hình thì dừng;
  - nút tạm dừng dừng mọi vòng lặp (`getLoopController`).
- **Hình chạy trên con đường (chủ dự án, 2026-11-11):** hình đổi theo giai đoạn của hạt: hạt mầm (bước 1–2), hạt thóc (bước 3–4), hạt gạo (bước 5–7), bát xôi bốc hơi (bước 8). Hình đổi ở điểm dừng nơi giai đoạn đổi, phóng nhỏ rồi to lại trong 0,25 giây. Đoạn đường đã đi qua là một dải màu liền cả đường, đậm dần như thanh tiến độ (chủ dự án chọn): xanh mạ nhạt → xanh mạ → vàng thóc (bước 2 chuyển từ xanh sang vàng, như lúa chín) → vàng đậm dần → nâu túi gạo ở cuối đường. Không tối tới gần đen: tới đóng gói và mâm cơm mà đường gần đen thì không hợp (chủ dự án, 2026-11-11). Hình chạy có viền mỏng màu trắng gạo, để bát xôi nâu vẫn nổi trên đoạn đường nâu. Mỗi đoạn chuyển từ màu của điểm dừng mình sang màu của điểm dừng kế tiếp, nên không có chỗ đổi màu đột ngột. Không dùng trắng gạo: trên đường màu rơm, chủ dự án thấy "như chưa từng đi qua". Hình nằm đúng điểm ảnh của màn hình và không có lớp riêng, để không bị mờ.
- **Phần thay đổi:**
  - Khi cảnh sắp tới, mã tạo một lớp phủ (`data-story-overlay`) trong khung: các ảnh lớp cắt đặt đúng vị trí theo `scene-layers.json`, và một SVG nhỏ cho hiệu ứng vẽ bằng code.
  - Hàm chuyển động của mỗi cảnh (`SCENE_MOTIONS`) nhận lớp phủ này thay cho SVG cũ, và trả về `{ intro, loop }` như trước.
  - Lớp phủ chỉ hiện sau khi mọi ảnh lớp của cảnh đã tải xong. Nếu một ảnh không tải được, cảnh giữ tranh tĩnh và không có chuyển động. Không có ô trống.
  - Vị trí lúc nghỉ của mọi lớp trùng với tranh gốc: nhìn tĩnh, lớp phủ và tranh khớp nhau.
- **Chỉ dùng `transform` và `opacity`.** Không đổi bố cục, không gây dịch trang (CLS).
- **Giảm chuyển động:** GSAP không tải (như bây giờ), nên không có lớp phủ và không tải thêm ảnh.

### 4.3. Xóa đường cũ (luật dự án: code mới thay code cũ thì xóa code cũ)
- **Xóa:**
  - các cảnh SVG tách lớp: `web/public/story/*.svg`, `brand/story/scenes/`, cùng các phần chỉ cảnh dùng trong `brand/story/parts/`, `people/`, `pose-fixes/`;
  - script `story:build` (`web/scripts/build-story.mjs`, `story-scenes.mjs`);
  - mã nhúng SVG (`inline-svg.ts`) và các test của chúng;
  - 2 test đầu-cuối đang tạm tắt về cảnh SVG.
- **Kiểm tra trước khi xóa:** phần nào còn dùng chung thì giữ, ví dụ luật an toàn SVG mà hình túi gạo `ProductBag` cũng dùng.
- **Công cụ trace người** `brand/tools/vectorize-pose.py`: xóa nếu không còn nơi nào dùng.

### 4.4. Tài liệu
- Quyết định mới `docs/decisions/0017-chuyen-dong-chuyen-hat-nep.md`: cách làm lớp cắt, và việc bỏ đường SVG tách lớp.
- Sửa phần "Còn phải làm" của `0014`.
- Cập nhật `brand/story/phac/README.md`.

## 5. Kiểm thử
- **Unit:**
  - mọi lớp trong `scene-layers.json` có file thật, đúng kích thước và dưới giới hạn dung lượng;
  - tranh đêm có thật và cùng kích thước với tranh ngày;
  - lớp phủ được tạo đúng chỗ và chỉ hiện khi ảnh đã tải; nếu ảnh lỗi thì không có lớp phủ;
  - mỗi cảnh có đủ phần mà hàm chuyển động của nó cần;
  - đoạn mở đầu và vòng lặp nối với cuộn trang như cũ.
- **Đầu-cuối (Playwright):**
  - ảnh lớp không tải khi trang vừa mở, chỉ tải khi cuộn gần cảnh;
  - đoạn mở đầu chạy, rồi vòng lặp chạy khi cảnh trên màn hình và dừng khi cảnh ra khỏi màn hình;
  - nút tạm dừng dừng vòng lặp;
  - giảm chuyển động: không tải lớp, không có lớp phủ;
  - bước 2 kết thúc ở tranh đêm;
  - không dịch trang khi lớp phủ hiện;
  - không cuộn ngang ở 320 px.
- **Xem bằng mắt:** chụp màn hình và quay vài khung hình mỗi cảnh ở 375 px và 1280 px, so với tranh gốc để chắc lớp khớp đúng chỗ.
- **Trước PR:** antislop Delivery Gate; đủ `npm test`, `npm run typecheck`, `npm run lint`.

## 6. Rủi ro
- **Vật bị che một phần** (guồng máy gặt sau bông lúa): cắt bằng mặt nạ theo màu, hoặc giảm chuyển động. Ghi lại trong báo cáo.
- **Mép lớp cắt lộ khi rung:** biên độ rung 1–2 px và mép cắt mờ dần.
- **Tốn máy trên điện thoại:** vòng lặp đã chạy thưa sẵn; không dùng bộ lọc (filter) hay mặt nạ động.
