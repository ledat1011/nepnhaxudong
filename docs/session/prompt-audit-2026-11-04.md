# Rà soát prompt (prompt audit) — 2026-11-04

## Giả định

- **Phạm vi:** các file hướng dẫn Claude trong repo: `CLAUDE.md`, `web/AGENTS.md`, 5 skill trong `.claude/skills/` (SKILL.md và các file tham chiếu), và chữ mà hook gửi cho Claude (`.claude/hooks/lib/session-state.mjs`).
- **Không xét:** `~/.claude/CLAUDE.md` và `~/.claude/RTK.md` (nằm ngoài repo); các plugin cài qua `.claude/settings.json` (nằm ngoài repo); `.claude/settings.json` và `.mcp.json` không đọc vì có thể chứa secret; `scripts/test/fixtures/*/SKILL.md` là dữ liệu kiểm thử.
- **Mô hình đích:** Claude Opus 5.5 (mô hình đang chạy Claude Code; không skill nào ghi mô hình riêng).
- **Nhà cung cấp khác:** không có mã nào của ứng dụng gọi mô hình AI. Gemini chỉ xuất hiện qua MCP `nanobanana` (`GEMINI_API_KEY`), không thuộc phạm vi.

## Tóm tắt

Các file hướng dẫn hầu như không có mẫu prompt cũ: không có chữ in hoa nhấn mạnh, không có "think step by step", không có giới hạn số chữ. `CLAUDE.md` sạch: mỗi quy tắc là ngữ cảnh hoặc ràng buộc thật.

Các phát hiện chính đều thuộc Nhóm 2 (sự thật đã cũ so với repo), còn sót lại khi chép skill từ công ty:

1. `call-chain` bảo so sánh với `origin/master`, nhưng nhánh chính của repo là `main`. Lệnh `git show origin/master:<path>` sẽ lỗi.
2. `call-chain` ghi "limit 30 s" vào mẫu đánh dấu transaction. API không đặt timeout cho transaction nào, nên mỗi cây gọi hàm sẽ ghi một giới hạn không có thật.
3. `visual-deck` nói "trên máy Windows này" như thể mọi máy đều có WPS. Repo được dùng trên nhiều máy và trong cloud session.

| Nhóm | Số phát hiện |
|---|---|
| 1 — Chữ prompt kiểu cũ | 0 |
| 2 — File skill và cấu hình | 5 (2 cao, 2 trung bình, 1 chỉ ghi nhận) + 3 chỉ ghi nhận khác |
| 3 — Mô tả tool | không áp dụng (repo không định nghĩa tool) |
| 4 — Cấu hình request | không áp dụng (không có mã gọi API mô hình) |

## Phát hiện

### 1. `origin/master` không tồn tại — Cao

- **Vị trí:** `.claude/skills/call-chain/SKILL.md:31`
- **Bằng chứng:** "local file (and with `origin/master` via `git show origin/master:<path>`)"
- **Mẫu:** Nhóm 2 — Volatile specifics.
- **Vì sao cũ:** `git branch -r` chỉ có `origin/main` (`origin/HEAD -> origin/main`). Lệnh trong skill sẽ báo lỗi.
- **Hành động:** `rewrite` → `origin/main`.

### 2. "limit 30 s" trong mẫu đánh dấu transaction — Cao

- **Vị trí:** `.claude/skills/call-chain/SKILL.md:41`, `.claude/skills/call-chain/references/example.md:27`
- **Bằng chứng:** "`══ @Transactional (:N) → TRANSACTION STARTS HERE, limit 30 s ══`"
- **Mẫu:** Nhóm 2 — Volatile specifics (giá trị của dự án công ty chép theo).
- **Vì sao cũ:** trong `api/src/main` không có `@Transactional(timeout = …)` và không có `spring.transaction.default-timeout`. Mẫu này dạy Claude ghi một giới hạn 30 giây không có thật.
- **Hành động:** `rewrite` — bỏ "limit 30 s" khỏi mẫu; chỉ ghi giới hạn khi code có đặt timeout.

### 3. Ví dụ đường dẫn `backend/…` — Trung bình

- **Vị trí:** `.claude/skills/call-chain/SKILL.md:79`
- **Bằng chứng:** "`[TimelineService.java:42](backend/src/main/java/vn/nepnhaxudong/timeline/TimelineService.java:42)`"
- **Mẫu:** Nhóm 2 — Volatile specifics.
- **Vì sao cũ:** repo không có thư mục `backend/`; mã Java nằm ở `api/src/main/java/vn/nepnhaxudong/`. Ví dụ là mẫu định dạng, nhưng Claude dễ chép theo thư mục gốc sai, và CLAUDE.md yêu cầu đường dẫn đầy đủ, đúng.
- **Hành động:** `rewrite` → một file có thật: `api/src/main/java/vn/nepnhaxudong/auth/LoginService.java:79`.

### 4. `visual-deck` gắn với "máy Windows này" — Trung bình

- **Vị trí:** `.claude/skills/visual-deck/SKILL.md:3`, `:36`, `:41`
- **Bằng chứng:** "via WPS Office on this Windows machine (no PowerPoint/LibreOffice installed)"; "## Environment (this Windows machine)"
- **Mẫu:** Nhóm 2 — Volatile specifics (sự thật về một máy, trong file dùng chung cho nhiều máy).
- **Vì sao cũ:** `CLAUDE.md:11` và `docs/decisions/0004-trang-thai-xuyen-may.md` nói repo chạy trên nhiều máy; `docs/setup.md:36` nói bước WPS "chỉ chạy được trên máy Windows có cài WPS". Skill không nói phải làm gì khi không có WPS.
- **Hành động:** `rewrite` — nói rõ là cần máy Windows có WPS, và khi không có WPS thì bỏ bước render và báo cho người dùng.

### 5. Nguyên tắc nội dung lấy từ một bộ slide cụ thể — Trung bình

- **Vị trí:** `.claude/skills/visual-deck/SKILL.md:23-27`
- **Bằng chứng:** "\"What this unlocked\" beats \"what we replaced.\""; "(\"someone who never coded now ships\")"; "\"Your first week / what Monday looks like\""
- **Mẫu:** Nhóm 2 — Recency trap (quy tắc của một lần làm việc thành quy tắc lâu dài); Nhóm 1c — Strategy coaching.
- **Vì sao cũ:** ba dòng này mô tả câu chuyện của một bài thuyết trình về việc áp dụng công cụ mới (thay thế, người không biết lập trình, tuần đầu tiên). Với slide cho Nếp Nhà (giới thiệu thương hiệu, gặp đối tác — theo `docs/session/skills-review.md:14`), chúng đẩy nội dung sai hướng. Hai dòng còn giá trị chung (ví dụ cụ thể, trung thực về chỗ yếu) được giữ.
- **Hành động:** `rewrite` — bỏ dòng 23 và 25, viết lại dòng 24 và 27 cho chung.

### 6. "PO" và bản tiếng Anh trong `explain-root-cause` — chỉ ghi nhận

- **Vị trí:** `.claude/skills/explain-root-cause/SKILL.md:3`, `:68-70`, `:76`; so với `CLAUDE.md:28-29`
- **Bằng chứng:** "When the text is for the PO or another team, write it in English (unless told otherwise)" và "Reply to the owner in Vietnamese … Documents for the owner in `docs/` … stay in Vietnamese."
- **Mẫu:** Nhóm 2 — Instruction files that contradict each other (có thể).
- **Vì sao ghi nhận:** dự án không có PO hay nhóm khác (`docs/` không nhắc tới PO); người đọc là chủ dự án. Nếu "PO" ở đây là chủ dự án, quy tắc tiếng Anh trái với `CLAUDE.md`. Theo `git blame`, `CLAUDE.md:28-29` mới hơn (commit `8b7bf91`) so với skill (commit `3820989`). Chủ dự án cần quyết định: bỏ phần "PO / tiếng Anh", hay giữ cho trường hợp gửi người ngoài.
- **Hành động:** `flag`.

### 7. Hai skill vẽ sơ đồ lưu vào `docs/` theo hai cách — chỉ ghi nhận

- **Vị trí:** `.claude/skills/state-diagram/SKILL.md:64-66` so với `.claude/skills/excalidraw-diagram/SKILL.md:73-79`
- **Bằng chứng:** state-diagram: "PNG + SVG in `docs/diagrams/<topic>.png` …" (lưu luôn); excalidraw-diagram: "Show, then ask before saving."
- **Mẫu:** Nhóm 2 — Instruction files that contradict each other (có thể là khác biệt có chủ đích theo từng skill).
- **Vì sao ghi nhận:** cùng một việc (lưu sơ đồ vào `docs/diagrams/`) nhưng một skill hỏi trước, một skill không. Có thể là chủ ý (sơ đồ trạng thái dùng cho PR). Chủ dự án quyết định có cần thống nhất không.
- **Hành động:** `flag`.

### 8. `web/AGENTS.md` không được Claude Code đọc — chỉ ghi nhận

- **Vị trí:** `web/AGENTS.md:1-9`
- **Bằng chứng:** "Read the relevant guide in `node_modules/next/dist/docs/` … before writing any code."
- **Vì sao ghi nhận:** Claude Code đọc `CLAUDE.md`, không đọc `AGENTS.md` nếu không có file `CLAUDE.md` nào import nó. Repo không có `web/CLAUDE.md`. Vậy hướng dẫn "đọc tài liệu Next.js trong `node_modules`" không tới được Claude. Nếu muốn dùng, thêm `web/CLAUDE.md` có một dòng `@AGENTS.md`. Khối này do `next dev` tự tạo lại, nên không nên sửa nội dung của nó (kể cả tiêu đề viết hoa).
- **Hành động:** `flag` (không thuộc mẫu nào trong bảng; chủ dự án quyết định).

### 9. Thông báo lỗi trỏ tới mục "Offline" không tồn tại — Thấp

- **Vị trí:** `.claude/skills/excalidraw-diagram/lib/render.js:255`
- **Bằng chứng:** "(SKILL.md, \"Offline\")"
- **Vì sao:** mục trong SKILL.md tên là "Requirements and offline use". Ảnh hưởng nhỏ.
- **Hành động:** `flag`.

## Những gì giữ nguyên (khớp mẫu tìm kiếm nhưng không phải lỗi)

- `CLAUDE.md:35-41` — các câu "Do not …" là ràng buộc thật (danh tính git, không lộ secret, không chép nội dung công ty), phần lớn có lý do.
- `visual-deck/SKILL.md:15`, `:72` — "No accent stripes down card edges", "Never default to Aptos": danh sách kiểu mặc định cụ thể cần tránh; đây là dạng hướng dẫn thiết kế nên giữ.
- `excalidraw-diagram/SKILL.md:67` — "at most 4 rounds" là giới hạn vòng lặp sửa lỗi, không phải giới hạn độ dài câu trả lời.
- `state-diagram/SKILL.md:19` — "the user's rules — do not drift from them": quy tắc phong cách do chủ dự án đặt.

## Đề xuất sửa

Chủ dự án đã duyệt và các phát hiện 1–5 đã được áp dụng (2026-11-04). Các mục 6–9 vẫn chờ chủ dự án quyết định.
