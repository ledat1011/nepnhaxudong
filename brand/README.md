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
| `tokens/tokens.json` | Nguồn gốc màu, font, các cặp chữ / nền hợp lệ. |
| `tokens/tokens.css` | Biến CSS sinh từ `tokens.json` (`--color-*`, `--font-*`). |
| `fonts/` | Pacifico, Quicksand 400 / 500 / 700 (giấy phép OFL). |
| `concepts/` | 6 ý tưởng mascot ban đầu (chỉ để lưu lại). |
| `preview.html` | Trang xem: logo trên 3 nền, icon các cỡ, mascot chuyển động, bảng màu. |

## Quy tắc màu

- Vàng lúa `#D9A13B` không dùng làm màu chữ trên nền sáng (không đủ tương phản). Chỉ dùng cho điểm nhấn, hoặc làm chữ trên nền Nâu đất.
- Hồng má `#E59A84`, `da` `#F4CDA8` và `toc` `#222222` chỉ dùng trong mascot, không dùng làm màu chữ.
- Xanh mạ `#6E8B3D` dùng rất ít (lá lúa).
- Chỉ ghép chữ / nền theo `textPairs` trong `tokens.json`; mọi cặp đạt WCAG AA (4,5 : 1).

## Font

- Pacifico chỉ cho chữ "Nếp Nhà" và tiêu đề lớn. Không dùng cho chữ nhỏ.
- Quicksand 400 / 500 / 700 cho mọi chữ còn lại.

## Chạy lại công cụ

Trong `brand/tools` (Node 22), lần đầu chạy `npm ci`, sau đó:

| Lệnh | Việc |
|---|---|
| `npm run tokens` | `tokens.json` → `tokens.css` |
| `npm run concepts` | 6 concept SVG → `concepts/concepts.png` |
| `npm run logo-mascot` | Vẽ lại thân, bó lúa, tay của `logo/mascot-logo.svg`, giữ cái đầu đã trace trong file |
| `npm run logo-mascot -- --source <png>` | Như trên, và trace lại cái đầu từ ảnh mascot gốc đã duyệt (cùng kiểm SHA-256 như `vectorize-mascot.py`) → `logo/mascot-logo.svg` và `logo/mascot-logo-head.svg`. Cần Python như dòng `vectorize-mascot.py`. Chạy lệnh này sau khi sửa bó lúa: lỗ trên cái đầu đi theo bó lúa. |
| `npm run logos` | 2 mascot + chữ → 5 file `logo/logo-*.svg` (cả 2 bản sáng) |
| `npm run png` | `logo/logo-icon.svg` → `png/logo-icon-{32,192,512}.png` |
| `npm run preview` | mascot + tokens → `preview.html` |
| `npm test` | Kiểm tra token, font, SVG, PNG, preview |
| `python vectorize-mascot.py <png> ../mascot/mascot-layered.svg` | Ảnh mascot gốc đã duyệt (PNG giữ ngoài repo) → `mascot/mascot-layered.svg`. Cần Python: `pip install -r requirements-mascot.txt`. Sau đó chạy `npm run logos`, `npm run png`, `npm run preview`. |

Hai mascot, hai việc: `logo-full` dùng mascot chi tiết (`mascot/mascot-layered.svg`) cho chỗ lớn
(bao bì, banner, đầu trang); `logo-icon` và `logo-mono` dùng mascot giản lược (`logo/mascot-logo.svg`)
cho cỡ nhỏ và in một màu, vì ở cỡ đó mascot chi tiết bị nhòe.

Khi mascot đổi: chạy `npm run logos`, rồi `npm run png`, rồi `npm run preview`, rồi `npm test`.
Test báo lỗi nếu PNG hoặc `preview.html` cũ hơn SVG.

`preview.html` là file sinh ra, không sửa tay. Logo được nạp bằng `<img>` nên luôn là bản mới nhất;
mascot được chép thẳng vào trang (để CSS xoay được `#head` và `#rice` quanh `data-pivot`), nên cần
`npm run preview` sau khi mascot đổi. Mở trang bằng cách bấm đúp file (`file://`), không cần máy chủ.
