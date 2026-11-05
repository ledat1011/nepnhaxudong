# Nếp Nhà — bộ nhận diện

## File nào dùng ở đâu

| File | Dùng ở đâu |
|---|---|
| `logo/logo-full.svg` | Logo đầy đủ (mascot chi tiết + "Nếp Nhà" + dòng phụ), cho chỗ lớn: bao bì, banner, đầu trang. |
| `logo/logo-icon.svg` | Biểu tượng (đầu đội nón lá, từ mascot giản lược): avatar mạng xã hội, chỗ nhỏ. |
| `logo/logo-mono.svg` | Logo một màu Nâu đất (từ mascot giản lược): in một màu, khắc, đóng dấu. |
| `logo/logo-full-light.svg` | Bản sáng của `logo-full` cho nền tối (Nâu đất: chân trang, đồng phục nâu, túi tối màu): chữ "Nếp Nhà" Trắng gạo, dòng phụ Vàng lúa, viền Trắng gạo quanh mascot. |
| `logo/logo-mono-light.svg` | Bản sáng của `logo-mono` cho nền tối: nét Trắng gạo, nền trong suốt (nền tối hiện qua). |
| `png/logo-icon-{32,192,512}.png` | Favicon (32), icon ứng dụng web (192, 512). |
| `mascot/mascot-layered.svg` | Mascot tách lớp `#head`, `#rice`, `#hands`, `#body` (có `data-pivot` để làm hiệu ứng). |
| `logo/mascot-logo.svg` | Mascot giản lược (ít hạt lúa hơn, hạt to hơn, nét dày hơn), cùng nhóm và `data-pivot` như mascot chi tiết; nguồn của `logo-mono.svg`. |
| `logo/mascot-logo-head.svg` | Cả cái đầu của mascot giản lược (không bị bó lúa che), nguồn của `logo-icon.svg`. |
| `story/people/*.svg` | 6 tư thế người cho các cảnh câu chuyện (`me-cay`, `nong-dan-cay`, `me-trao-tui`, `ba-lai-may`, `ba-canh-lo`, `anh2-be-bao`), trace từ ảnh Recraft đã duyệt bằng `tools/vectorize-pose.py`. Mỗi file `viewBox="0 0 256 256"`, đúng một nhóm `<g data-part="person">`, chân chạm đáy khung. `web/scripts/build-story.mjs` ghép chúng vào cảnh. |
| `story/pose-fixes/` | Phần sửa tay của từng tư thế cho `vectorize-pose.py`: `<tu-the>.json` (lật ngang, đổi màu, xoá vùng) và hình vẽ tay đặt trên / dưới hình trace (`me-trao-tui-bag.svg`: túi 2 kg mảnh; `ba-lai-may-face.svg`: mắt cười nhắm, cằm thon hơn, nếp cười, tóc bạc bên thái dương). |
| `tokens/tokens.json` | Nguồn gốc màu, font, các cặp chữ / nền hợp lệ. |
| `tokens/tokens.css` | Biến CSS sinh từ `tokens.json` (`--color-*`, `--font-*`). |
| `fonts/` | Pacifico, Quicksand 400 / 500 / 700 (giấy phép OFL). |
| `concepts/` | 6 ý tưởng mascot ban đầu (chỉ để lưu lại). |
| `preview.html` | Trang xem: logo trên 3 nền, icon các cỡ, mascot chuyển động, bảng màu. |

## Quy tắc màu

- Vàng lúa `#D9A13B` không dùng làm màu chữ trên nền sáng (không đủ tương phản). Chỉ dùng cho điểm nhấn, hoặc làm chữ trên nền Nâu đất.
- Hồng má `#E59A84`, `da` `#F4CDA8` và `toc` `#222222` chỉ dùng trong hình minh hoạ (mascot, người, than hồng, máy xay, hộp quà), không dùng làm màu chữ.
- Xanh trời `#CFE4EE` và Xanh trời nhạt `#E9F2F1` chỉ dùng trong hình minh hoạ (bầu trời, mặt nước ruộng, nền cảnh ngoài trời, nền hình nhỏ trên nhãn túi). Không dùng cho chữ, nút, viền giao diện, hay làm nền của một khối giao diện. Trời chuyển dần từ Xanh trời xuống Trắng gạo ở chân trời.
- Xanh lá nhạt `#A9C47F` chỉ dùng trong hình minh hoạ (áo của ba). Không dùng cho chữ, nút, viền giao diện. Không có cặp chữ / nền nào với màu này.
- Xanh mạ `#6E8B3D` dùng rất ít (lá lúa).
- Chỉ ghép chữ / nền theo `textPairs` trong `tokens.json`; mọi cặp đạt WCAG AA (4,5 : 1).

## Font

- Pacifico chỉ cho chữ "Nếp Nhà" và tiêu đề lớn. Không dùng cho chữ nhỏ.
- Quicksand 400 / 500 / 700 cho mọi chữ còn lại.

## Chạy lại công cụ

Trong `brand/tools` (Node 22 trở lên), lần đầu chạy `npm ci`. Khi cần dựng lại, chạy theo đúng thứ tự
này (bỏ qua bước không đổi gì; mỗi bước dùng kết quả của bước trước):

1. `npm run tokens`: `tokens.json` → `tokens.css`.
2. `node fetch-fonts.mjs`: chỉ khi cần tải lại font. Tải Pacifico, Quicksand 400 / 500 / 700 và giấy phép OFL vào `fonts/`.
3. `python vectorize-mascot.py <png> ../mascot/mascot-layered.svg`: ảnh mascot gốc đã duyệt (PNG giữ ngoài repo) → `mascot/mascot-layered.svg`. Cần Python: `pip install -r requirements-mascot.txt`.
4. `npm run logo-mascot`: vẽ lại thân, bó lúa và tay của `logo/mascot-logo.svg`, giữ cái đầu đã trace trong file. Lấy `data-pivot` từ `mascot-layered.svg`, nên chạy sau bước 3.
   - `npm run logo-mascot -- --source <png>`: như trên, và trace lại cái đầu từ ảnh gốc (cùng kiểm SHA-256 như `vectorize-mascot.py`) → `logo/mascot-logo.svg` và `logo/mascot-logo-head.svg`. Dùng lệnh này sau khi sửa bó lúa, vì lỗ trên cái đầu đi theo bó lúa.
5. `npm run logos`: 2 mascot + chữ → 5 file `logo/logo-*.svg` (cả 2 bản sáng).
6. `npm run png`: `logo/logo-icon.svg` → `png/logo-icon-{32,192,512}.png`.
7. `npm run preview`: mascot + tokens → `preview.html`.
8. `npm test`: kiểm tra token, font, SVG, PNG, preview. Test báo lỗi nếu một file sinh ra cũ hơn nguồn của nó.

`npm run concepts` (6 concept SVG → `concepts/concepts.png`) đứng riêng, không thuộc thứ tự trên.

### Tư thế người cho câu chuyện

`python vectorize-pose.py <png> ../story/people/<tu-the>.svg --fixes ../story/pose-fixes/<tu-the>.json`:
ảnh tư thế đã duyệt (PNG 1024 px, giữ ngoài repo) → `story/people/<tu-the>.svg`. Cùng Python và
`requirements-mascot.txt` như bước 3. Thêm `--debug <thu-muc>` để xem màu đã ép (`snapped.png`, toạ độ
của ảnh gốc, trước khi lật) và bảng màu gốc → màu bảng (`anchors.txt`). Sau đó chạy `npm run story:build`
trong `web/`.

| Tư thế | Ảnh gốc (ngoài repo) | Sửa tay trong `story/pose-fixes/` |
|---|---|---|
| `me-cay` | `me-cay-recraft-v1.png` | Lật ngang. |
| `nong-dan-cay` | `nong-dan-cay-recraft-v1.png` | Lật ngang; áo và nón Vàng rơm, mặt / tai / tay / chân `da` (ảnh gốc dùng một màu cho cả hai); mạ Xanh mạ (tự động sẽ thành Vàng lúa); bóng quần Nâu áo. |
| `me-trao-tui` | `me-trao-tui-recraft-v2.png` | Lật ngang; mặt và tay `da`, nón Vàng rơm; xoá túi dày của ảnh gốc, vẽ tay túi 2 kg mảnh (`me-trao-tui-bag.svg`) nằm dưới hai bàn tay. |
| `ba-lai-may` | `ba-lai-may-recraft-v2.png` | Lật ngang; áo Xanh lá nhạt; vô lăng Nâu đất, lỗ giữa vô lăng trong suốt; mắt chấm thành mắt cười nhắm như `ba-canh-lo`; cằm tròn được xoá bớt và vẽ lại thon hơn; thêm nếp cười và tóc bạc bên thái dương dưới mũ (`ba-lai-may-face.svg`). |
| `ba-canh-lo` | `ba-canh-lo-recraft-v1.png` | Lật ngang; mặt dưới vành mũ Nâu đất (tự động sẽ thành `toc`). |
| `anh2-be-bao` | `anh2-be-bao-recraft-v2.png` | Lật ngang; quần Nâu đất (ảnh gốc màu đen như tóc); bao Vàng rơm, vân đan Vàng lúa; khe giữa hai chân trong suốt. |

Hai mascot, hai việc: `logo-full` dùng mascot chi tiết (`mascot/mascot-layered.svg`) cho chỗ lớn
(bao bì, banner, đầu trang); `logo-icon` và `logo-mono` dùng mascot giản lược (`logo/mascot-logo.svg`)
cho cỡ nhỏ và in một màu, vì ở cỡ đó mascot chi tiết bị nhòe.

Mọi `id` trong các file `logo/logo-*.svg` có tiền tố riêng của file (ví dụ `nn-logo-full-head`,
`nn-logo-mono-mono-ink`), nên có thể nhúng nhiều logo và mascot vào cùng một trang mà không trùng `id`.
Mascot (`mascot/mascot-layered.svg`, `logo/mascot-logo.svg`) giữ `id` gốc `#body`, `#rice`, `#hands`,
`#head` để làm hiệu ứng.

`preview.html` là file sinh ra, không sửa tay. Logo được nạp bằng `<img>` nên luôn là bản mới nhất;
mascot được chép thẳng vào trang (để CSS xoay được `#head` và `#rice` quanh `data-pivot`), nên cần
`npm run preview` sau khi mascot đổi. Mở trang bằng cách bấm đúp file (`file://`), không cần máy chủ.
