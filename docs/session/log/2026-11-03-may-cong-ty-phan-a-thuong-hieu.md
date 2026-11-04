# 2026-11-03 — máy công ty — phần A (thương hiệu)

Nhánh `feat/phan-a-thuong-hieu`, worktree `D:\workspaces\nepnhaxudong-phan-a` (tách từ `main`).
Chạy song song với session phần C (nhánh `feat/phan-c-nen-tang`). Không sửa file của phần C:
`CLAUDE.md`, `docs/session/STATE.md`, `.claude/**`, `.mcp.json`, `package.json`, `scripts/**`.

## Phản hồi
- Chủ dự án duyệt plan phần A, chọn cách thực hiện Subagent-driven → mỗi task một subagent làm + một subagent review.

- Chủ dự án hỏi vì sao làm logo lại tốn tiền, rồi nói: "bạn tự làm, không dùng Nano Banana của Google" → Claude tự vẽ mascot và logo bằng SVG; không gọi Gemini, không dùng Recraft, không tốn phí API.
- Xem 6 ý tưởng, chủ dự án nói: "một người phụ nữ trung niên ~50 tuổi, với ôm một bó lúa" → lấy bản 1 (nhìn thẳng, ~50 tuổi) làm gốc, đổi tư thế thành hai tay ôm bó lúa (bàn tay nắm phía trước thân lúa), ngọn lúa vẫn cong qua vai.
- Chủ dự án thêm: "người phụ nữ nông dân chất phác" → dáng mộc mạc, giản dị của người làm ruộng (không làm điệu, không giống búp bê); áo cánh đơn giản, có thể xắn tay áo, nụ cười hiền và mộc.
- Chủ dự án gửi ảnh chân dung bà chủ sản phẩm → mascot giống bà chủ ở các nét: tóc đen thẳng ngang vai có mái thưa, nụ cười hiền mím môi, khoảng 55 tuổi. Không vẽ kính, không vẽ khuyên tai (chủ dự án nói không cần). Ảnh chân dung là ảnh riêng: không đưa vào repo.
- Xem mascot bản Task 4, chủ dự án chỉ vào ảnh tham khảo Freepik: "mặt, bắp tay tròn như này được", "bó lúa to, dày, trĩu hạt" → sửa mascot: mặt tròn đầy đặn hơn (má phúng phính), cánh tay và bắp tay tròn, mập; bó lúa to và dày hơn, nhiều bông, hạt nặng làm bông cong rủ xuống. Chỉ lấy tỷ lệ tròn trịa của ảnh tham khảo, không chép hình.
- Chủ dự án gửi ảnh người nông dân ôm lúa: "để bó lúa ở khuỷu tay ôm kiểu như này" → bó lúa nằm chéo ngang người, đặt trong khuỷu tay như bế: gốc rạ ở dưới một bên, bông lúa trĩu hạt rủ xuống qua cánh tay bên kia; một tay đỡ dưới, một tay nắm phía trên. Thay cho "cong qua vai" ở spec 2.3.
- Chủ dự án sửa: "bó lúa nghiêng bên trái, không phải bên phải như hình" → lật ngược so với ảnh: bông lúa rủ về bên trái của người xem, gốc rạ ở dưới bên phải người xem.
- Xem logo nháp, chủ dự án: "sao cái nón cao vậy, thấp xuống, ngả ra sau chứ, nhìn logo là biết" → nón lá thấp hơn (chóp thấp, rộng), đội ngả ra sau để lộ rõ trán và mặt; nhìn logo là nhận ra mặt người ngay.
- Chủ dự án hỏi "bó lúa vẫn bé vậy" (đang xem bản cũ) → bó lúa phải thật to, là thứ nổi bật nhất trong hình.
- Chủ dự án: "cười mắt híp lại hình lưỡi liềm, mặt tròn đầy đặn nhìn phúc hậu, đây là mẫu" (chỉ ảnh tham khảo Freepik) → mắt cười híp hình lưỡi liềm (thay mắt chấm tròn), mặt tròn to, má đầy, vẻ phúc hậu; vẫn không kính.
- Xem bản nháp d4, chủ dự án: "tay cầm lúa hơi sai sai" → vẽ lại hai tay cho đúng: tay bên trái người xem gập khuỷu, cẳng tay đỡ dưới bó lúa, bó lúa nằm trong khuỷu tay; tay bên phải người xem vòng qua người, nắm bó lúa từ trên; hai tay nối rõ với vai qua tay áo.
- Chủ dự án: "cái nón cũng hơi sai sai, che phần tóc, kiểu nó bay trước đầu" → nón phải đội lên đầu: nửa sau vành nón nằm sau đầu, thấy một chút mặt dưới vành; tóc lộ ra dưới vành hai bên; có quai nón nối xuống cằm.
- Chủ dự án nhờ review lại logo → Claude đánh giá: chữ và màu ổn; tay, nón, gốc rạ còn lỗi; mascot quá nhiều chi tiết cho logo; đề xuất 2 bản (minh họa đầy đủ + logo rút gọn).
- Chủ dự án trả lời: "phải làm pretty, chỉn chu, và dựa vào minh họa để làm" → làm 2 bản: bản minh họa đầy đủ (`brand/mascot/mascot-layered.svg`) và bản logo rút gọn vẽ lại từ chính bản minh họa (cùng nhân vật, cùng tư thế; ít hạt hơn, bỏ nếp nhăn và nan nón, nét dày hơn). Chất lượng phải đẹp, gọn gàng, hoàn chỉnh.
- Xem bản minh họa mới, chủ dự án: mặt đã OK. Chưa được: (1) vành nón sai góc nhìn — nón ngả ra sau thì vành phải ra sau đầu; (2) đội nón rồi mà vẫn lộ phần tóc trên đỉnh đầu — nón phải che tóc; (3) tay và vai không liền mạch, mượt như mẫu (ảnh Freepik: vai và tay là một khối tròn liền); (4) thân lúa không khớp với bông lúa — làm như mẫu bó lúa (thân rơm chụm lại, buộc dây ở giữa, xòe lên thành bông, liền một bó). "Check lại đi, làm như mẫu."
- Claude giải thích không tự tạo được ảnh dạng tranh; chủ dự án quyết định: "dùng ChatGPT và Gemini" trên Chrome của chủ dự án (đã đăng nhập sẵn) → Claude điều khiển Chrome, gõ prompt mô tả nhân vật, lấy ảnh về rồi chuyển sang SVG trên máy (vtracer) và tách lớp. Bản vẽ tay SVG vòng 3 giữ lại làm phương án dự phòng.
- Chủ dự án: "làm như vẽ tay mẫu, không theo kiểu AI đã train vì nhìn không pretty"; gửi bản vẽ của Claude + các ảnh mẫu lên làm tham khảo (đồng ý gửi cả 4 ảnh; ChatGPT bản miễn phí chỉ nhận 2 ảnh).
- Chủ dự án: "Gemini generate mặt trẻ quá, mặt bạn tạo tôi thấy OK" → giữ khuôn mặt của bản vẽ SVG của Claude.
- Chủ dự án: "bông lúa bên ChatGPT OK" (ảnh ChatGPT v2) → lấy bó lúa (và thân, tay) từ ảnh ChatGPT v2, ghép với mặt của bản vẽ SVG của Claude.
- Chủ dự án: "nón bên Gemini như nón thời trang, không giống nón lá người nông dân" → nón phải là nón lá hình chóp rõ ràng (như ChatGPT v2: chóp nhọn, ngả ra sau), không vẽ thành vành tròn phẳng kiểu mũ rộng vành. Bản SVG vòng 3 của Claude cũng có vành tròn phẳng như vậy → khi ghép, lấy nón theo kiểu ChatGPT v2.
- Chủ dự án tự tải ảnh ChatGPT v2 về `Downloads\Kawaii Vietnamese Rice Farmer.png` (1254×1254) và bảo: "kết hợp những góp ý của tôi rồi bảo Gemini làm lại" → gửi ảnh ChatGPT v2 + bản vẽ SVG của Claude lên Gemini, prompt gom mọi góp ý.
- Xem Gemini v3, chủ dự án: "mặt hơi già rồi; mặt bản của bạn tôi thấy OK, giống bút vẽ" → mặt phải giống hệt mặt bản vẽ SVG của Claude: nét gọn như bút vẽ, chỉ vài nét chân chim nhẹ ở khóe mắt, không nếp nhăn ở má và quanh miệng.
- Chủ dự án: "bạn vẽ tóc vén sang một bên đúng ý tôi" → giữ kiểu tóc của bản vẽ SVG của Claude: một bên dài xuống vai, bên kia vén ra sau.
- Chủ dự án duyệt ảnh Gemini v5 (mặt + tóc theo bản vẽ của Claude, nón chóp + áo + tay + bó lúa theo ChatGPT v2): "được, chuyển SVG" → tải ảnh gốc từ Gemini, chuyển sang SVG (vtracer), ép bảng màu, tách lớp body / rice / hands / head.
- Chủ dự án: "bước nào tách được sang session khác thì làm" → Task 6 (xuất PNG, `preview.html`, README) chạy ở session riêng, nhánh `feat/phan-a-task6`; gộp vào nhánh phần A sau khi mascot xong.
- Xem bản SVG đầu tiên (tóc ra màu nâu đậm vì bảng màu không có đen), chủ dự án: "tóc màu đen này nhé" (chỉ ảnh gốc) → thêm token `toc` = `#222222`, chỉ dùng cho tóc mascot; viền vẫn Nâu đất.
- Chủ dự án: "áo mascot hơi giống miền Tây, có style nào giống miền Bắc không" → Claude đề xuất các kiểu áo miền Bắc (áo cánh nâu lộ yếm, áo tứ thân, khăn mỏ quạ). Chủ dự án quyết định: "để áo như vậy đi" → giữ áo hiện tại, không đổi.
- Xem vòng sửa 1 (rơm thẳng cứng như thanh gỗ, dây buộc dựng đứng), chủ dự án: "sửa thêm rơm" → vẽ lại toàn bộ phần rơm theo ảnh gốc: nhiều cọng mảnh, hơi cong, xòe nhẹ hai đầu; dây thừng quấn chéo ngay dưới bàn tay trên; màu ấm trong bảng màu (Vàng rơm + nét Vàng lúa).
- Xem vòng sửa 3 (dây thừng 2 sợi quấn ngang bó, mép tay áo trơn), chủ dự án: "Duyệt" → bản minh họa `brand/mascot/mascot-layered.svg` (commit `d63926d`) được duyệt. Bước sau: review mã, gộp nhánh Task 6, vẽ bản logo rút gọn từ bản minh họa.
- Chủ dự án: "gộp đi" → gộp nhánh `feat/phan-a-task6` vào nhánh phần A (chỉ trên máy, không push), xuất lại PNG và preview.
- Chủ dự án chọn nơi lưu ảnh gốc mascot: thư mục logo riêng, ngoài repo.
- Xem 3 bản nháp logo rút gọn (A vẽ tay, B mặt lấy từ bản minh họa + thân vẽ tay, C nét đậm), chủ dự án: "chọn B" → bản B (`brand/logo/mascot-logo.svg`), làm dày nét mặt cho khớp với thân.
- Chủ dự án hỏi "không dùng bản chi tiết được hả", rồi chọn kết hợp → logo đầy đủ dựng từ bản minh họa chi tiết (dùng ở cỡ lớn: bao bì, banner, đầu trang); icon và logo một màu dựng từ bản B (cỡ nhỏ, in một màu).
- Trên nền Nâu đất, logo đầy đủ mất chữ và logo một màu mất hẳn; chủ dự án: "làm bản sáng" → thêm `logo-full-light.svg` (chữ Trắng gạo, viền sticker Trắng gạo quanh mascot) và `logo-mono-light.svg` (một màu Trắng gạo) cho nền tối.
- Ở `logo-mono-light`, tóc đen đảo thành mảng trắng; chủ dự án: "tóc theo nền" → ở bản một màu sáng, tóc là phần nền (trong suốt), chỉ giữ viền Trắng gạo.
- Review toàn nhánh chỉ ra icon chỉ thấy vành nón, không thấy chóp; chủ dự án: "giữ như hiện tại" → giữ icon như hiện tại (mặt to, rõ ở 32px).

## Quyết định
- Không dùng Nano Banana / Recraft qua API trả phí (khác quy trình ở spec 2.3) — chủ dự án quyết định.
- Mascot: thử vẽ tay SVG 3 vòng nhưng chưa đủ đẹp; chủ dự án chọn tạo ảnh bằng ChatGPT và Gemini trên web, trong Chrome của chủ dự án (không gọi API, không tốn phí API). Ảnh duyệt cuối: Gemini v5 (mặt và tóc theo bản vẽ của Claude; nón chóp, áo, tay, bó lúa theo ChatGPT v2). Chuyển sang SVG bằng vtracer (`brand/tools/vectorize-mascot.py`), ép bảng màu, tách lớp; phần rơm và dây buộc vẽ lại bằng script — chủ dự án duyệt.
- Mascot có thêm nhóm `g#hands` (thứ tự body → rice → hands → head) để bàn tay nằm trước bó lúa.
- Bó lúa ôm trong khuỷu tay, nằm chéo người, bông rủ về bên trái người xem — thay cho "cong qua vai" ở spec 2.3 (chủ dự án).
- Hai bản mascot: bản minh họa chi tiết (`brand/mascot/mascot-layered.svg`) và bản logo rút gọn B (`brand/logo/mascot-logo.svg`, mặt lấy từ bản minh họa, thân và bó lúa vẽ gọn) — chủ dự án chọn B.
- Logo đầy đủ dựng từ bản minh họa chi tiết (dùng ở cỡ lớn); icon và logo một màu dựng từ bản B (cỡ nhỏ, in một màu) — chủ dự án chọn.
- Icon có màu; chỉ logo một màu là một màu Nâu đất (spec 2.3 liệt kê 3 bản, chỉ bản một màu là một màu).
- Thêm hai bản sáng cho nền tối: `logo-full-light.svg` (chữ Trắng gạo, dòng nhỏ Vàng lúa, viền sticker Trắng gạo) và `logo-mono-light.svg` (nét Trắng gạo, tóc theo màu nền) — chủ dự án chọn.
- Áo mascot giữ như hiện tại (đã xem các kiểu áo miền Bắc) — chủ dự án chọn.
- Thêm màu `da` = `#F4CDA8`, chỉ dùng trong mascot — chủ dự án duyệt theo plan.
- Thêm màu `toc` = `#222222` (tóc đen), chỉ dùng trong mascot — chủ dự án chọn tóc đen như ảnh gốc.
- Ảnh gốc của mascot (ảnh Gemini v5 đã duyệt) lưu lâu dài ngoài repo, trong thư mục logo riêng của chủ dự án, tên `nepnha-mascot-source-gemini-v5.png`, SHA-256 `65ae40db…b352`; script `vectorize-mascot.py` kiểm tra mã này — chủ dự án chọn.
- Được tải font Pacifico / Quicksand + OFL, gói npm `@resvg/resvg-js`, `opentype.js`, `svgson` (không dùng `svgo`), gói Python `vtracer`, `numpy`, `Pillow` (phiên bản ghi trong `brand/tools/requirements-mascot.txt`) — chủ dự án duyệt.

## Còn mở
- (Từ session chính, chủ dự án nói) "Duy Tân" là tên phường, thương hiệu vẫn là "Nếp Nhà", bảng màu nâu / vàng / trắng không đổi. Bao bì hiện tại màu xanh lá, khẩu hiệu "Hạt Ngọc Xứ Đông", "Mềm - Dẻo - Thơm ngon". Có thể hỏi chủ dự án: dòng nhỏ của logo có muốn dùng "Hạt Ngọc Xứ Đông" thay cho "Xứ Đông · Gạo nếp cái hoa vàng" không. Không đưa số hotline và logo hội nông dân vào repo.
- Quyết định "không dùng Nano Banana / Recraft" nên được ghi vào `docs/decisions/` khi session phần C gộp trạng thái; `.mcp.json` của phần C có thể bỏ `nanobanana` và `recraft`.
- Logo một màu làm bằng `<mask>`: máy cắt decal và công cụ bỏ qua mask không dùng được; khi cần cắt decal phải làm thêm một bản riêng.
- Ở nền Nâu áo, dòng nhỏ Vàng lúa của logo sáng chỉ đạt tỷ lệ 2,53 (chưa đạt AA); khi logo rộng khoảng 120px, dòng nhỏ quá bé để đọc.
- Phần B (web) đang dùng màu và logo tạm trong `web/src/lib/brand/` (7 màu, tên khác, không có `da` / `toc`); nên chuyển sang dùng `brand/tokens` và `brand/logo/*` sau khi gộp. Id trong các file logo có tiền tố riêng (ví dụ `nn-logo-full-head`); hiệu ứng nghiêng đầu / lắc lúa dùng `brand/mascot/mascot-layered.svg` (`#head`, `#rice`).
- CI chưa chạy test của `brand/tools` (51 test); cần một workflow riêng (thuộc phần C hoặc gộp chung).
- Spec trên `main` (mục 2.3) và plan phần C còn ghi đường dẫn ảnh tham khảo trên máy; phần C nên xóa.

## Đã làm
- Tạo worktree và nhánh `feat/phan-a-thuong-hieu`; viết plan phần A (duyệt, chạy Subagent-driven).
- Token màu và chữ (`brand/tokens/`), font Pacifico + Quicksand 400 / 500 / 700 kèm OFL (`brand/fonts/`).
- 6 ý tưởng mascot (`brand/concepts/`).
- Mascot tách lớp từ ảnh Gemini v5 (`brand/mascot/mascot-layered.svg`, script `vectorize-mascot.py`, kiểm tra SHA-256 ảnh gốc), có điểm xoay cho đầu ±3° và bó lúa ±6°; test kiểm tra lỗ hở khi xoay.
- Logo rút gọn B (`brand/logo/mascot-logo.svg`, `mascot-logo-head.svg`, script `build-logo-mascot.mjs` + `trace-logo-head.py`).
- 5 logo do script dựng (`build-logos.mjs`): `logo-full`, `logo-icon`, `logo-mono`, `logo-full-light`, `logo-mono-light`.
- PNG icon 32 / 192 / 512 (`export-png.mjs`), trang xem `brand/preview.html` (`build-preview.mjs`), `brand/README.md` (Task 6 làm ở session riêng, nhánh `feat/phan-a-task6`, đã gộp).
- Review từng task, review mã Task 4c, review toàn nhánh; đã sửa theo review.
