# 2026-11-06 — máy công ty — link chia sẻ và giấy chứng nhận

## Phản hồi
- Mở `https://nepnhaxudong-prevew.vercel.app` thì web tự chuyển sang `/en`; chủ dự án muốn mặc định là `/vi` → `/` luôn chuyển sang `/vi`, không xét ngôn ngữ của trình duyệt nữa. Người cần tiếng Anh bấm nút đổi ngôn ngữ.
- Gửi link bản xem thử qua tin nhắn thì thẻ link không có hình (cũng không có tiêu đề) → nguyên nhân có khả năng cao: `robots.txt` của bản xem thử chặn mọi bot (`Disallow: /`), nên bot tạo thẻ link không đọc trang. Sửa: bản xem thử vẫn `noindex` bằng thẻ meta, nhưng `robots.txt` không chặn trang công khai nữa.
- Sản phẩm có giấy chứng nhận cơ sở đủ điều kiện an toàn thực phẩm (Sở NN&PTNT Hải Dương, số 05/2021/NNPTNT-HD, cấp cho Chi hội nông dân nghề nghiệp sản xuất và tiêu thụ gạo nếp cái hoa vàng phường Duy Tân) → chủ dự án muốn dùng "nano banana" làm ảnh đẹp và rõ hơn rồi đưa lên web cho khách an tâm. Giấy ghi hiệu lực đến 27/6/2024 nên đã hết hạn; chủ dự án nói chưa có giấy mới → chưa đưa giấy lên web, chờ giấy mới.
- Sau PR #38: Zalo và bài đăng Facebook đã hiện thẻ có hình; Messenger vẫn chưa (có thể Messenger còn giữ kết quả cũ của link). Ảnh trong thẻ là mascot tạm cũ (cậu bé đội nón), không phải mascot mới (cô gái ôm bó lúa) → vẽ lại ảnh chia sẻ theo đầu trang hiện tại.
- "Merge luôn đi khỏi đợi", rồi "cho lần này thôi" → chỉ PR #39 được merge không chờ CI. Luật chung trong `CLAUDE.md` giữ nguyên: chờ CI, trừ khi đã chạy đủ test, typecheck, lint ở máy trên code cuối.
- Chủ dự án gửi câu chuyện thật cho khối "Hành trình" kèm 5 ảnh (bao đầu tiên 2021, giấy chứng nhận, máy sấy và xay xát, bịch hút chân không vuông, bao in logo 2025), muốn thiết kế cho hay, hấp dẫn và soát câu chữ; có thể bo tròn ảnh sản phẩm hoặc dùng Nano Banana nếu cần. Mốc: 2008 nhà bán phân bón, thuốc BVTV, hạt giống nếp cái hoa vàng; 2021 được hợp tác xã nông nghiệp địa phương động viên, hỗ trợ đưa nếp ra thị trường, tự chọn giống và chăm ruộng, HTX hỗ trợ máy hút chân không nhỏ (1 bịch 2 kg mỗi lần) và thiết kế bao bì, 10 tấn (~5.000 bịch), Sở Nông nghiệp cấp giấy chứng nhận ATTP; 2022 đầu tư lò sấy thóc 20 tấn/mẻ, máy xay xát, máy hút chân không 4 bịch/lần, 30 tấn (~15.000 bịch); 2023–2024 bao bì ép khuôn vuông, 40 tấn/năm, có mặt trên kệ siêu thị; 2025 in logo thẳng lên bao thay vì dán nhãn, 50 tấn.
- Duyệt nháp Hành trình: mốc 2008 viết "vật tư nông nghiệp" (không nêu "thuốc bảo vệ thực vật"); giữ nguyên số điện thoại và mã QR trên ảnh bao; dừng ở mốc 2025; ảnh thật, chỉ cắt và chỉnh sáng, không dùng AI.
- "Nhà mình chỉ tôi nói với bạn thôi" → câu chữ trên web không dùng "nhà mình"; viết theo giọng của web: "gia đình" hoặc "Nếp Nhà".
- Chủ dự án gửi thêm 2 ảnh ("thêm thông tin ảnh"): mặt trước bao 2 kg đầu tiên chụp rõ, và nhiều bịch vuông hút chân không xếp hàng → mốc 2021 dùng ảnh bao rõ, mốc 2023 dùng ảnh nhiều bịch xếp hàng.
- "Xong rồi review lại những chỗ [MẪU] bạn biết thông tin rồi thì sửa lại" → sau PR Hành trình, thay các chữ [MẪU] mà đã có thông tin thật (từ chủ dự án) bằng nội dung thật; chỗ chưa có thông tin thì giữ [MẪU].

## Quyết định
- `/` luôn chuyển sang `/vi` — khách chủ yếu là người Việt, nhiều người dùng điện thoại cài tiếng Anh.
- Giấy chứng nhận: không dùng AI tạo lại ảnh (Nano Banana có thể đổi chữ, số, con dấu, chữ ký). Khi có giấy mới, chủ dự án chụp lại thẳng, đủ sáng, độ phân giải cao; chỉ cắt, làm thẳng, tăng tương phản, không vẽ lại nội dung.

## Còn mở
- Đưa giấy chứng nhận ATTP lên web khi có giấy mới còn hạn (chủ dự án gửi ảnh chụp mới).
- Messenger chưa hiện thẻ: sau khi merge ảnh mới, chủ dự án mở Facebook Sharing Debugger (`https://developers.facebook.com/tools/debug/`), dán link, bấm "Scrape Again", rồi gửi lại link trong Messenger.

## Đã làm
- Nhánh `feat/link-chia-se`: `/` luôn về `/vi`; bản xem thử không chặn bot trong `robots.txt`, giữ `noindex` bằng thẻ meta và header `X-Robots-Tag`. Test đơn vị và e2e trang chủ, SEO đều qua.
- PR #38 merge (`ee04e10`, chủ dự án tự merge).
- Nhánh `feat/anh-chia-se-mascot-moi`: ảnh chia sẻ vẽ lại theo đầu trang (chữ "Nếp Nhà" + dòng phụ theo ngôn ngữ, cô gái ôm bó lúa, mặt trời, mây, cánh đồng của trang chủ).
- PR #39 merge (`a42027b`): ảnh chia sẻ mới đã lên bản xem thử.
- Nhánh `feat/hanh-trinh-that` (chưa commit): 4 ảnh thật, 5 mốc vi/en, dòng giới thiệu, ẩn khung ảnh trống. Chủ dự án dừng lúc đang chạy test; việc còn lại ghi trong STATE.
- Chủ dự án gửi lại 2 ảnh: "mẫu đầu tiên với mẫu vuông vức dán tay" → thay ảnh mốc 2021 và 2023; mốc 2023 thêm ý "nhãn dán tay từng bịch".
- Xem web ở máy, chủ dự án: mốc 2021 đặt thêm giấy chứng nhận, bố cục hai khung so le (khung vuông nhỏ trên trái, khung chữ nhật lớn dưới phải, theo hình vẽ); "lấy ảnh mới gửi đi" (ảnh bao ở mốc 2021 vẫn là ảnh cũ do web lưu tạm ảnh cùng tên) → đổi tên file ảnh mới. Quyết định cũ "chưa đưa giấy lên web" đổi thành: đưa giấy lên như một mốc lịch sử năm 2021.
- Chủ dự án chọn "cho mỗi mốc nhiều ảnh" (sửa API, cơ sở dữ liệu, trang quản trị, web) thay vì ghép ảnh; thêm: bấm vào ảnh thì hiện popup xem ảnh lớn; nhớ chỉnh ảnh cho đẹp (giấy chứng nhận: cắt, làm thẳng, tăng tương phản, không vẽ lại).
- Chủ dự án duyệt thiết kế "nhiều ảnh cho mỗi mốc" (bảng `timeline_event_media`, tối đa 3 ảnh, khung so le, popup xem ảnh dùng chung với khối Sản phẩm, ảnh giấy chứng nhận chỉ cắt/làm thẳng/tăng tương phản) và nói "implement it" → viết spec và plan rồi làm luôn, không dừng chờ duyệt spec/plan.
- Viết spec và plan cho "nhiều ảnh mỗi mốc"; chỉnh ảnh giấy chứng nhận (cắt, giấy trắng lại, chữ rõ hơn, không dùng AI).
- PR #40 (Hành trình thật, chữ sản phẩm thật): chủ dự án tự merge (`3b3e236`).
- Nhiều ảnh mỗi mốc: 3 agent làm song song (API, trang quản trị, web), đã gộp vào `feat/hanh-trinh-nhieu-anh`; test web 1645, API toàn bộ, full-stack 39 đều qua. Lưu ý: test API và full-stack ở máy công ty cần `JAVA_HOME` trỏ tới JDK 21 (mặc định là Java 8).
- Xem mốc 2021 có 2 ảnh, chủ dự án: "cái to cái nhỏ nhìn không đều lắm" → các khung so le bằng nhau (vuông, mỗi khung nửa cột), ảnh căn theo mép trên.
- Chủ dự án gửi hình vẽ mới: khung vuông trên trái và khung chữ nhật dưới phải chồng lên nhau ở góc, chỗ chồng có góc khoét lõm (hai khung không dính vào nhau); muốn dùng skill UI thiết kế cho đẹp, tính cả trường hợp 3 ảnh. Skill taste-skill và antislop không có trên máy công ty → đưa phương án để chủ dự án chọn.
- Chủ dự án chọn phương án A "Ghép góc" cho mốc 2–3 ảnh: khung vuông và khung 4:3 cao bằng nhau, chồng nhẹ ở góc, khung trên có viền màu nền tạo rãnh khoét lõm; ảnh 3 vuông, quay về bên trái.
- Chủ dự án: viền vàng ở chỗ hai ảnh chồng nhau "không được prety" → bỏ viền ở cụm nhiều ảnh, thay bằng bóng đổ nhẹ màu nâu đất, giữ rãnh màu nền; "cho 2021 thôi": mốc 1 ảnh giữ viền vàng.
- Chủ dự án bảo cài plugin taste-skill và antislop → đã cài antislop, taste-skill, gsap-skills (phạm vi project, đúng phiên bản ghim trong `.claude/settings.json`); có hiệu lực từ session sau.
- Chủ dự án: ảnh giấy chứng nhận "trông thiếu thiếu trống trống" (khung vuông cắt mất con dấu) → chọn phương án C: khung theo chiều ảnh (ảnh dọc khung 3:4, ảnh ngang 4:3, gần vuông thì vuông), các khung cao bằng nhau, vẫn chồng góc.
- Chủ dự án gửi bài về sản phẩm do UBND phường Nhị Chiểu (TP. Hải Phòng) đăng: reel Facebook https://www.facebook.com/reel/2585570238579411, tiêu đề "Nếp cái hoa vàng phường Nhị Chiểu – lan tỏa hương vị đặc sản quê hương" (Truyền hình Nhị Chiểu), kèm ảnh chụp khung hình → đưa vào khối Báo chí, xóa các bài báo mẫu; nhờ soát nội dung khối "Câu chuyện Nếp Nhà" xem đã ổn chưa.
- Chủ dự án duyệt hướng viết lại 4 bài Câu chuyện; nói có thể viết bài về cách nấu, cách bảo quản (kiến thức chung).
- Thêm mốc Hành trình 2024: sản phẩm "Gạo nếp cái hoa vàng Duy Tân" (HTX Nông sản sạch Duy Tân) được UBND thị xã Kinh Môn công nhận OCOP 3 sao (Quyết định 1925/QĐ-UBND ngày 30/12/2024, giá trị 3 năm); Sở NN&PTNT Hải Dương cấp giấy chứng nhận cơ sở đủ điều kiện ATTP mới cho HTX Nông sản sạch Duy Tân (số 94/2024/NNPTNT-HD, cấp 10/12/2024, hiệu lực tới 09/12/2027, "Xay xát, kinh doanh gạo"). Có ảnh 2 giấy.
- Chủ dự án duyệt nháp 5 bài Câu chuyện (hành trình, mẻ sấy 20 tấn, bảo quản bịch hút chân không, nấu xôi, phóng sự Truyền hình Nhị Chiểu chỉ tiếng Việt) và mốc 2024 (OCOP 3 sao, giấy ATTP mới tới 12/2027). Chờ ảnh 2 giấy 2024 (gửi lại).
- Đã làm: 5 bài Câu chuyện thật (agent, `a1f017c`), mốc 2024 có 2 ảnh giấy (cắt sát khung tranh, không vẽ lại), báo chí thật thay bài mẫu; xem ở 375 px và 1280 px, không tràn ngang.
