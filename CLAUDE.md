# Nếp Nhà (nepnhaxudong)

Website giới thiệu gạo nếp cái hoa vàng của gia đình ở Hải Dương. Thiết kế:
`docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md`. Plan theo từng phần: `docs/superpowers/plans/`.

## Bắt đầu và kết thúc mỗi session
- Đầu session: `git pull`. Đọc `docs/session/STATE.md` (hook SessionStart đã nạp sẵn).
- Cuối session, trước khi dừng: cập nhật `docs/session/STATE.md`, tạo hoặc hoàn thiện file log của session
  (xem mục "Nhật ký phản hồi của session"), rồi commit và push.
- Quyết định lớn ghi vào `docs/decisions/NNNN-<ten>.md`.
- Hai máy không làm cùng một nhánh cùng lúc. Mỗi việc một nhánh `feat/<ten-ngan>`, PR vào `main`.

## Nhật ký phản hồi của session (giữ lại sau khi nén context)
- **File:** mỗi session một file `docs/session/log/YYYY-MM-DD-<may>-<chu-de>.md`, theo mẫu
  `docs/session/log/_template.md`. Tạo file ngay khi chủ dự án đưa phản hồi đầu tiên.
- **Ghi gì:** chỉnh sửa ("không phải X, làm Y"), quyết định của chủ dự án, cách làm chủ dự án đã xác nhận,
  ràng buộc và sở thích, sự thật chủ dự án nói mà code không có, việc còn mở chủ dự án yêu cầu.
  Không ghi những gì đã có trong code / git, output của công cụ, hay suy luận của agent.
- **Khi nào:** ngay trong lượt chủ dự án đưa phản hồi, trước khi làm tiếp. Không đợi tới cuối session.
- **Định dạng:** gạch đầu dòng ngắn, mới nhất ở dưới cùng. Khi chủ dự án đổi ý, sửa hoặc xóa dòng cũ —
  không bao giờ giữ hai dòng mâu thuẫn nhau.
- **Sau khi nén context hoặc khi tiếp tục session:** đọc file log này trước mọi bước khác và làm theo.
  Nếu nó mâu thuẫn với bản tóm tắt của context, file log này thắng.
- **Phản hồi áp dụng cho cả các session sau:** ghi thêm vào `CLAUDE.md` (quy tắc) hoặc `docs/decisions/`
  (quyết định). Đây là nơi lưu lâu dài mà mọi máy và cloud session đều đọc được; memory của Claude chỉ có trên một máy.

## Quy tắc trả lời
- Trả lời bằng tiếng Việt.
- Khi viết tiếng Anh: câu ngắn, từ đơn giản, không thành ngữ, không ẩn dụ.
- Đánh giá độc lập: khi câu hỏi đã chứa sẵn kết luận, đánh giá như câu hỏi trung lập; nêu lý do ủng hộ và phản đối
  trước kết luận; nếu kết luận khác, nói ngay câu đầu; chỉ đổi ý khi có thông tin hoặc lập luận mới.
- Link file bằng đường dẫn đầy đủ từ thư mục gốc của repo, không rút gọn bằng `.../`.

## Quy tắc git và an toàn
- Git identity của repo: `ledat1011` / `75622784+ledat1011@users.noreply.github.com`. Không dùng email công ty.
- Không thêm dòng `Co-Authored-By` vào commit.
- Không chạy `git reset --hard`, `git checkout -f`, `git clean` khi có thay đổi chưa commit.
- Không ghi secret (API key, mật khẩu, token) vào repo. Key đọc từ biến môi trường.
- Không đưa nội dung, tên, URL hay code của nơi làm việc của chủ dự án vào repo.
- Thiết kế và plan (`docs/superpowers/`) được commit vào repo.

## Công cụ
- Test công cụ: `npm run test:tools`.
- Lọc skill trước khi chép vào `.claude/skills/`: `node scripts/scan-skill.mjs <thu-muc-skill>`.
