# Phần C — Nền tảng làm việc: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repo `nepnhaxudong` có đủ quy tắc, trạng thái dùng chung, hook, skill đã lọc và cấu hình MCP / plugin, để máy công ty, máy cá nhân và Claude cloud session làm việc tiếp nối nhau mà không cần kể lại.

**Architecture:** Mọi thứ agent cần nằm trong repo. `CLAUDE.md` chứa quy tắc; `docs/session/STATE.md` chứa trạng thái; hook `SessionStart` nạp `STATE.md` vào context, hook `Stop` nhắc cập nhật nó. Các script công cụ là Node ESM thuần (không có dependency npm), có test bằng `node --test`, chạy được trên Windows (Git Bash) và Linux (cloud, CI).

**Tech Stack:** Node 22 (ESM `.mjs`, `node:test`, `node:child_process`), Git, GitHub Actions, Claude Code settings / hooks / `.mcp.json`.

**Spec:** `docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md` (mục 6 và mục 7.1)

## Global Constraints

- Node ≥ 22; script công cụ là `.mjs`, chỉ dùng module có sẵn của Node, không thêm dependency npm.
- Mọi lệnh hook chạy được trên Git Bash (Windows) và bash (Linux). Đường dẫn trong lệnh hook dùng `"$CLAUDE_PROJECT_DIR/..."` có dấu ngoặc kép.
- Line ending trong repo: LF (`.gitattributes`: `* text=auto eol=lf`).
- Git identity của repo: `user.name=ledat1011`, `user.email=75622784+ledat1011@users.noreply.github.com` (config local, không dùng email công ty).
- Commit message tiếng Anh ngắn, dạng `type: summary`; không thêm dòng `Co-Authored-By`.
- Tài liệu trong `docs/` và `CLAUDE.md` viết tiếng Việt; tên file, code, message lỗi của script bằng tiếng Anh, riêng lời nhắc hook gửi cho agent bằng tiếng Việt.
- Không bao giờ commit secret: key Gemini / Recraft và mọi `.env` chỉ nằm trong biến môi trường hoặc file bị `.gitignore`.
- Không mang vào repo bất kỳ nội dung, code hay URL nội bộ nào gắn với công ty. Ngoại lệ duy nhất: danh sách từ khóa của scanner (Task 4) và các dòng trong spec / plan mô tả quy tắc lọc.
- Hook `Stop` chạy sau mỗi lượt trả lời của agent, không chỉ cuối session; lời nhắc chỉ xuất hiện cho tới khi `STATE.md` được sửa.
- Plugin `playwright@claude-plugins-official` thay cho mục playwright trong `.mcp.json` (tránh khai báo hai lần cùng một MCP).

## Review Focus

1. Clone mới chưa có `docs/session/STATE.md` (hoặc file rỗng) → hook `SessionStart` in một thông báo rõ ràng, không lỗi. (Test ở Task 2)
2. File có tên tiếng Việt / có dấu cách trong `git status` (ví dụ `ảnh ruộng.jpg`) → parser đọc đúng đường dẫn. (Test ở Task 2)
3. Hook `Stop` chạy ngoài repo git hoặc `git` lỗi → thoát 0, không chặn agent. (Test ở Task 2)
4. Hook `Stop` được gọi lại khi đang tiếp tục do chính nó chặn (`stop_hook_active: true`) → không chặn lần nữa, tránh vòng lặp. (Test ở Task 2)
5. Skill có file CRLF hoặc file nhị phân (ảnh, font) → scanner bỏ qua file nhị phân và báo đúng số dòng với file CRLF. (Test ở Task 4)

---

## File Structure

```
nepnhaxudong/
├── .gitattributes                         Task 1
├── .gitignore                             Task 1
├── package.json                           Task 1   (private, type module, script test:tools)
├── README.md                              Task 1
├── CLAUDE.md                              Task 1
├── docs/setup.md                          Task 1 (tạo), Task 6 (bổ sung kết quả)
├── docs/session/STATE.md                  Task 1
├── docs/session/log/_template.md          Task 1
├── docs/decisions/0001..0004-*.md         Task 1
├── .claude/hooks/lib/session-state.mjs    Task 2   (logic thuần, có test)
├── .claude/hooks/session-start.mjs        Task 2   (CLI mỏng)
├── .claude/hooks/stop-check.mjs           Task 2   (CLI mỏng)
├── .claude/hooks/test/session-state.test.mjs  Task 2
├── .claude/settings.json                  Task 2 (hooks), Task 3 (plugins, permissions)
├── .claude/mcp/launch.mjs                 Task 3
├── .claude/mcp/test/launch.test.mjs       Task 3
├── .mcp.json                              Task 3
├── scripts/scan-skill.mjs                 Task 4
├── scripts/test/scan-skill.test.mjs       Task 4
├── scripts/test/fixtures/…                Task 4
├── docs/session/skills-review.md          Task 5
├── .claude/skills/<skill>/…               Task 5
├── .github/workflows/tools.yml            Task 6
└── scripts/cloud-setup.sh                 Task 6
```

---

### Task 1: Khung repo, quy tắc agent và trạng thái ban đầu

**Files:**
- Create: `.gitattributes`, `.gitignore`, `package.json`, `README.md`, `CLAUDE.md`, `docs/setup.md`, `docs/session/STATE.md`, `docs/session/log/_template.md`, `docs/decisions/0001-cong-nghe.md`, `docs/decisions/0002-ten-thuong-hieu.md`, `docs/decisions/0003-mot-repo.md`, `docs/decisions/0004-trang-thai-xuyen-may.md`

**Interfaces:**
- Produces: đường dẫn `docs/session/STATE.md` (Task 2 đọc); script `npm run test:tools` = `node --test .claude/hooks/test .claude/mcp/test scripts/test` (Task 2–4 thêm test vào các thư mục này; Task 6 gọi trong CI).

- [ ] **Step 1: Đặt git identity cho repo và kiểm tra**

Run:
```bash
git -C D:/workspaces/nepnhaxudong config user.name "ledat1011"
git -C D:/workspaces/nepnhaxudong config user.email "75622784+ledat1011@users.noreply.github.com"
git -C D:/workspaces/nepnhaxudong config user.email
```
Expected: `75622784+ledat1011@users.noreply.github.com`

- [ ] **Step 2: Tạo `.gitattributes` và chuẩn hóa line ending**

Nội dung: `* text=auto eol=lf` và các dòng `*.png binary`, `*.jpg binary`, `*.jpeg binary`, `*.webp binary`, `*.avif binary`, `*.gif binary`, `*.woff2 binary`, `*.ico binary`. Sau đó chạy `git add --renormalize .`.

Run: `git check-attr eol -- docs/superpowers/specs/2026-11-03-nepnhaxudong-design.md`
Expected: `... eol: lf`

- [ ] **Step 3: Tạo `.gitignore`**

Gồm: `node_modules/`, `.env`, `.env.*` (trừ `!.env.example`), `.claude/settings.local.json`, `*.log`, `.DS_Store`, `Thumbs.db`, `target/`, `.next/`, `dist/`, `coverage/`, `.pr-review/`.

- [ ] **Step 4: Tạo `package.json`**

`{"name": "nepnhaxudong", "private": true, "type": "module", "engines": {"node": ">=22"}, "scripts": {"test:tools": "node --test .claude/hooks/test .claude/mcp/test scripts/test"}}`

- [ ] **Step 5: Tạo `CLAUDE.md` với đúng nội dung sau**

```markdown
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
```

- [ ] **Step 6: Tạo `docs/session/STATE.md`**

Các mục cố định (heading cấp 2, đúng tên): `Giai đoạn hiện tại`, `Đã xong`, `Đang làm`, `Việc tiếp theo`, `Vướng mắc`, `Quyết định gần nhất`, và dòng đầu `Cập nhật: 2026-11-03 — máy công ty`. Nội dung ban đầu: giai đoạn = "Phần C — nền tảng làm việc"; đã xong = spec; đang làm = plan phần C (link file plan này); tiếp theo = Task 2 của plan này; vướng mắc = "không có".

- [ ] **Step 7: Tạo `docs/session/log/_template.md`**

Các mục: `# YYYY-MM-DD — <máy> — <chủ đề>`, `## Phản hồi`, `## Quyết định`, `## Còn mở`, `## Đã làm`.

- [ ] **Step 8: Tạo 4 file quyết định**

Mỗi file có mục `Bối cảnh`, `Quyết định`, `Lý do`, `Hệ quả`, nội dung lấy từ mục 1 của spec:
`0001-cong-nghe.md` (Next.js + Spring Boot 3 / Java 21 + Postgres 16, docker compose trên 1 VPS, không k8s lúc này), `0002-ten-thuong-hieu.md` ("Nếp Nhà", tên kỹ thuật `nepnhaxudong`), `0003-mot-repo.md` (một repo, Next.js chứa cả web công khai và admin), `0004-trang-thai-xuyen-may.md` (STATE.md + hook + log, spec/plan được commit).

- [ ] **Step 9: Tạo `docs/setup.md` và `README.md`**

`docs/setup.md` — mục "Cài đặt một máy mới (Windows)": cài Git for Windows, Node 22, uv; `git clone https://github.com/ledat1011/nepnhaxudong.git`; hai lệnh `git config` ở Step 1; đặt biến môi trường người dùng `GEMINI_API_KEY` (lệnh `setx GEMINI_API_KEY "<key>"`); mở Claude Code trong thư mục repo, chấp nhận cài plugin được đề nghị; kiểm tra bằng câu hỏi "Giai đoạn hiện tại là gì?". Để trống mục "Cloud session" (Task 6 điền).
`README.md` — 5–10 dòng: dự án là gì, link tới spec, `docs/setup.md`, `docs/session/STATE.md`.

- [ ] **Step 10: Kiểm tra và commit**

Run: `git status --short`
Expected: chỉ có các file của Task này (và các file spec được renormalize).

```bash
git add -A
git commit -m "chore: add repo skeleton, agent rules and session state"
```

---

### Task 2: Hook SessionStart và Stop

**Files:**
- Create: `.claude/hooks/lib/session-state.mjs`, `.claude/hooks/session-start.mjs`, `.claude/hooks/stop-check.mjs`, `.claude/hooks/test/session-state.test.mjs`, `.claude/settings.json`

**Interfaces:**
- Consumes: `docs/session/STATE.md` (Task 1).
- Produces (export từ `.claude/hooks/lib/session-state.mjs`):
  - `STATE_PATH = "docs/session/STATE.md"`
  - `renderSessionStart({ stateText: string | null, isRemote: boolean }): string`
  - `parsePorcelainZ(output: string): string[]` — danh sách đường dẫn đã đổi (dạng `/`), từ `git status --porcelain=v1 -z`
  - `decideStop({ changedPaths: string[] | null, stopHookActive: boolean }): { block: boolean, reason?: string }`
  - `.claude/settings.json` có khóa `hooks` (Task 3 thêm khóa khác vào cùng file, không ghi đè `hooks`).

- [ ] **Step 1: Viết test thất bại**

`.claude/hooks/test/session-state.test.mjs` dùng `node:test` và `node:assert/strict`:

```js
test('renderSessionStart wraps state text', () => {
  const out = renderSessionStart({ stateText: '## Giai đoạn hiện tại\nPhần C', isRemote: false });
  assert.match(out, /docs\/session\/STATE\.md/);
  assert.match(out, /Phần C/);
});
test('renderSessionStart handles missing state', () => {
  assert.match(renderSessionStart({ stateText: null, isRemote: false }), /chưa có docs\/session\/STATE\.md/);
});
test('renderSessionStart handles empty state', () => {
  assert.match(renderSessionStart({ stateText: '   \n', isRemote: false }), /STATE\.md đang trống/);
});
test('renderSessionStart notes cloud session', () => {
  assert.match(renderSessionStart({ stateText: 'x', isRemote: true }), /cloud session/);
});
test('parsePorcelainZ reads modified, untracked, unicode and spaced paths', () => {
  const out = ' M web/a.ts\0?? docs/ảnh ruộng.jpg\0';
  assert.deepEqual(parsePorcelainZ(out), ['web/a.ts', 'docs/ảnh ruộng.jpg']);
});
test('parsePorcelainZ keeps the new path of a rename', () => {
  assert.deepEqual(parsePorcelainZ('R  new.md\0old.md\0'), ['new.md']);
});
test('decideStop blocks when work changed but STATE.md did not', () => {
  const r = decideStop({ changedPaths: ['web/a.ts'], stopHookActive: false });
  assert.equal(r.block, true);
  assert.match(r.reason, /STATE\.md/);
});
test('decideStop allows when STATE.md changed', () => {
  assert.equal(decideStop({ changedPaths: ['web/a.ts', 'docs/session/STATE.md'], stopHookActive: false }).block, false);
});
test('decideStop allows when only session docs changed', () => {
  assert.equal(decideStop({ changedPaths: ['docs/session/log/2026-11-03-a.md'], stopHookActive: false }).block, false);
});
test('decideStop allows clean tree', () => {
  assert.equal(decideStop({ changedPaths: [], stopHookActive: false }).block, false);
});
test('decideStop never blocks twice in a row', () => {
  assert.equal(decideStop({ changedPaths: ['web/a.ts'], stopHookActive: true }).block, false);
});
test('decideStop allows when git status is unavailable', () => {
  assert.equal(decideStop({ changedPaths: null, stopHookActive: false }).block, false);
});
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `node --test .claude/hooks/test`
Expected: FAIL — `Cannot find module '.../session-state.mjs'`

- [ ] **Step 3: Viết `.claude/hooks/lib/session-state.mjs`**

Bốn export ở Interfaces. Văn bản do hook in ra:
- có state: dòng đầu `Trạng thái dự án (docs/session/STATE.md):`, sau đó là nội dung file;
- `null`: `Repo chưa có docs/session/STATE.md. Hãy tạo nó theo CLAUDE.md trước khi làm việc.`;
- chỉ có khoảng trắng: `docs/session/STATE.md đang trống. Hãy điền trạng thái theo CLAUDE.md.`;
- `isRemote: true`: thêm dòng `Đây là cloud session: Docker có thể không có; xem docs/setup.md mục Cloud session.`
- `reason` khi chặn: `Có thay đổi trong repo nhưng docs/session/STATE.md chưa được cập nhật. Hãy cập nhật STATE.md và viết log session theo CLAUDE.md trước khi dừng.`
- `parsePorcelainZ`: tách theo `\0`; mỗi mục là `XY<space>path`; nếu `X` là `R` hoặc `C` thì mục kế tiếp là đường dẫn cũ, bỏ qua; đổi `\` thành `/`.
- `decideStop`: không chặn khi `stopHookActive`, khi `changedPaths` là `null`, khi danh sách rỗng, khi danh sách có `STATE_PATH`, hoặc khi mọi đường dẫn nằm dưới `docs/session/`.

- [ ] **Step 4: Chạy test, xác nhận đạt**

Run: `node --test .claude/hooks/test`
Expected: PASS, 12 test

- [ ] **Step 5: Viết hai CLI mỏng**

- `session-start.mjs`: đọc `STATE_PATH` từ `process.env.CLAUDE_PROJECT_DIR ?? process.cwd()` (file không có → `null`); `isRemote = process.env.CLAUDE_CODE_REMOTE === 'true'`; in `renderSessionStart(...)` ra stdout; luôn thoát 0.
- `stop-check.mjs`: đọc JSON từ stdin, lấy `stop_hook_active` (JSON lỗi → coi là `false`); chạy `git status --porcelain=v1 -z` bằng `execFileSync` trong thư mục dự án (lỗi → `changedPaths = null`); khi `decideStop` trả `block: true` thì in `JSON.stringify({ decision: 'block', reason })` ra stdout; luôn thoát 0.

- [ ] **Step 6: Tạo `.claude/settings.json` với khóa `hooks`**

```json
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.mjs\"" }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/stop-check.mjs\"" }] }]
  }
}
```

- [ ] **Step 7: Kiểm tra bằng tay hai CLI**

Run: `CLAUDE_PROJECT_DIR=$PWD node .claude/hooks/session-start.mjs`
Expected: in `Trạng thái dự án (docs/session/STATE.md):` và nội dung STATE.md

Run: `echo '{"stop_hook_active":false}' | CLAUDE_PROJECT_DIR=$PWD node .claude/hooks/stop-check.mjs`
Expected: in JSON có `"decision":"block"` (vì đang có file chưa commit và STATE.md chưa đổi)

- [ ] **Step 8: Mở một session Claude Code mới trong repo, hỏi "Giai đoạn hiện tại là gì?"**

Expected: agent trả lời "Phần C — nền tảng làm việc" mà không cần đọc file.

- [ ] **Step 9: Commit**

```bash
git add .claude/hooks .claude/settings.json
git commit -m "feat: add session state hooks"
```

---

### Task 3: Plugin, quyền và MCP dùng chung

**Files:**
- Modify: `.claude/settings.json` (thêm `enabledPlugins`, `extraKnownMarketplaces`, `permissions`; giữ nguyên `hooks`)
- Create: `.claude/mcp/launch.mjs`, `.claude/mcp/test/launch.test.mjs`, `.mcp.json`

**Interfaces:**
- Produces (export từ `.claude/mcp/launch.mjs`): `resolveSpawn(tool: 'npx' | 'uvx', args: string[], platform: string): { command: string, args: string[], shell: boolean }`. Chạy trực tiếp: `node .claude/mcp/launch.mjs <npx|uvx> <args...>` → spawn tiến trình con với `stdio: 'inherit'`, thoát với mã thoát của tiến trình con.

- [ ] **Step 1: Viết test thất bại**

```js
test('resolveSpawn uses shell on Windows', () => {
  assert.deepEqual(resolveSpawn('npx', ['-y', 'shadcn@latest', 'mcp'], 'win32'),
    { command: 'npx', args: ['-y', 'shadcn@latest', 'mcp'], shell: true });
});
test('resolveSpawn runs directly on Linux', () => {
  assert.deepEqual(resolveSpawn('uvx', ['nanobanana-mcp-server@latest'], 'linux'),
    { command: 'uvx', args: ['nanobanana-mcp-server@latest'], shell: false });
});
test('resolveSpawn rejects unknown tools', () => {
  assert.throws(() => resolveSpawn('bash', [], 'linux'), /unsupported tool/);
});
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `node --test .claude/mcp/test`
Expected: FAIL — module not found

- [ ] **Step 3: Viết `.claude/mcp/launch.mjs`** (export `resolveSpawn`; phần chạy trực tiếp chỉ thực hiện khi file là entry point, so sánh `import.meta.url` với `process.argv[1]` qua `pathToFileURL`)

- [ ] **Step 4: Chạy test, xác nhận đạt**

Run: `node --test .claude/mcp/test`
Expected: PASS, 3 test

- [ ] **Step 5: Tạo `.mcp.json`**

```json
{
  "mcpServers": {
    "shadcn": { "command": "node", "args": [".claude/mcp/launch.mjs", "npx", "-y", "shadcn@latest", "mcp"] },
    "next-devtools": { "command": "node", "args": [".claude/mcp/launch.mjs", "npx", "-y", "next-devtools-mcp@latest"] },
    "nanobanana": { "command": "node", "args": [".claude/mcp/launch.mjs", "uvx", "nanobanana-mcp-server@latest"], "env": { "GEMINI_API_KEY": "${GEMINI_API_KEY}" } },
    "recraft": { "type": "http", "url": "https://mcp.recraft.ai/mcp" }
  }
}
```

- [ ] **Step 6: Thêm vào `.claude/settings.json`**

```json
"enabledPlugins": {
  "superpowers@claude-plugins-official": true,
  "frontend-design@claude-plugins-official": true,
  "playwright@claude-plugins-official": true,
  "claude-seo@agricidaniel-claude-seo": true
},
"extraKnownMarketplaces": {
  "agricidaniel-claude-seo": { "source": { "source": "github", "repo": "AgriciDaniel/claude-seo" } }
},
"permissions": {
  "allow": ["Bash(npm run test:tools)", "Bash(node --test:*)", "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)"],
  "deny": ["Read(./.env)", "Read(./.env.*)"]
}
```

- [ ] **Step 7: Kiểm tra trong Claude Code**

Run: `claude mcp list` (trong thư mục repo, sau khi chấp nhận các MCP của dự án)
Expected: `shadcn`, `next-devtools`, `recraft` hiện trong danh sách; `nanobanana` kết nối được khi `GEMINI_API_KEY` đã đặt, báo lỗi rõ ràng khi chưa đặt. Ghi kết quả vào `docs/session/STATE.md` mục `Vướng mắc` nếu có server không kết nối được.

- [ ] **Step 8: Commit**

```bash
git add .claude/settings.json .claude/mcp .mcp.json
git commit -m "feat: add shared plugins, permissions and MCP servers"
```

---

### Task 4: Scanner lọc skill

**Files:**
- Create: `scripts/scan-skill.mjs`, `scripts/test/scan-skill.test.mjs`, `scripts/test/fixtures/clean-skill/SKILL.md`, `scripts/test/fixtures/dirty-skill/SKILL.md`, `scripts/test/fixtures/dirty-skill/notes-crlf.md` (CRLF), `scripts/test/fixtures/dirty-skill/logo.png` (vài byte, có byte `0`)

**Interfaces:**
- Produces (export từ `scripts/scan-skill.mjs`):
  - `PATTERNS: { name: string, regex: RegExp }[]`
  - `scanText(text: string, file: string): { file: string, line: number, pattern: string, excerpt: string }[]`
  - `scanDir(dir: string): Finding[]` (bỏ qua `node_modules/`, `.git/`, và file có byte `0` trong 8000 byte đầu)
  - CLI `node scripts/scan-skill.mjs <dir> [<dir>...]`: in mỗi phát hiện một dòng `file:line [pattern] excerpt`; thoát 1 khi có phát hiện, 0 khi sạch.

- [ ] **Step 1: Viết test thất bại**

```js
test('scanText flags company words with line numbers', () => {
  const f = scanText('ok\nsee luz_eletter\nKlara admin', 'SKILL.md');
  assert.deepEqual(f.map(x => [x.line, x.pattern]), [[2, 'company-luz'], [3, 'company-klara']]);
});
test('scanText flags workspace path and company email', () => {
  const f = scanText('cd D:\\workspaces\\luz\\x\nmail a.b@axonactive.com', 'a.md');
  assert.deepEqual(f.map(x => x.pattern), ['company-luz', 'workspace-path', 'company-axon', 'company-email']);
});
test('scanText flags secrets that look real', () => {
  assert.equal(scanText('API_KEY=sk_live_abcdefghijklmnop', 'a.md')[0].pattern, 'secret-assignment');
});
test('scanText ignores placeholder secrets', () => {
  assert.deepEqual(scanText('GEMINI_API_KEY=${GEMINI_API_KEY}', 'a.md'), []);
});
test('scanDir counts CRLF lines correctly and skips binaries', () => {
  const f = scanDir('scripts/test/fixtures/dirty-skill');
  assert.ok(f.some(x => x.file.endsWith('notes-crlf.md') && x.line === 3));
  assert.ok(!f.some(x => x.file.endsWith('logo.png')));
});
test('scanDir returns nothing for a clean skill', () => {
  assert.deepEqual(scanDir('scripts/test/fixtures/clean-skill'), []);
});
```
Fixture `notes-crlf.md`: dòng 3 chứa `tenant`. Fixture `clean-skill/SKILL.md`: một skill mẫu không có từ nào trong `PATTERNS`.

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `node --test scripts/test`
Expected: FAIL — module not found

- [ ] **Step 3: Viết `scripts/scan-skill.mjs`**

`PATTERNS` (theo đúng thứ tự, mỗi dòng chỉ báo một lần cho mỗi pattern; kết quả sắp theo dòng rồi theo thứ tự pattern):

| name | regex |
|---|---|
| `company-luz` | `/\bluz\b\|luz_/i` |
| `company-klara` | `/klara/i` |
| `company-axon` | `/axon ?(active\|ivy)/i` |
| `company-oneapi` | `/one ?api/i` |
| `company-tenant` | `/\btenants?\b/i` |
| `workspace-path` | `/[A-Z]:\\workspaces\\/i` |
| `company-url` | `/bitbucket\.org\|atlassian\.net\|\.axonactive\./i` |
| `company-email` | `/@axonactive\.com/i` |
| `secret-assignment` | `/(api[_-]?key\|token\|secret\|password)\s*[:=]\s*['"]?(?!\$\{)[A-Za-z0-9_\-]{12,}/i` |

Trong bảng, `\|` là dấu `|` của regex (được escape cho Markdown). Tách dòng bằng `/\r?\n/`.

- [ ] **Step 4: Chạy test, xác nhận đạt**

Run: `node --test scripts/test`
Expected: PASS, 6 test

- [ ] **Step 5: Chạy toàn bộ test công cụ**

Run: `npm run test:tools`
Expected: PASS, 21 test

- [ ] **Step 6: Commit**

```bash
git add scripts
git commit -m "feat: add skill scanner for company content"
```

---

### Task 5: Chọn, lọc và chép skill từ máy công ty

**Files:**
- Create: `docs/session/skills-review.md`, `.claude/skills/<skill>/…` (chỉ các skill được duyệt)

**Interfaces:**
- Consumes: `node scripts/scan-skill.mjs <dir>` (Task 4).

- [ ] **Step 1: Quét các skill ứng viên ngay tại chỗ (chưa chép)**

Ứng viên trong `C:/Users/lvdat/.claude/skills/`: `excalidraw-diagram`, `state-diagram`, `explain-root-cause`, `explainer`, `call-chain`, `visual-deck`, `story-writer`, `epic-breakdown`.

Run: `node scripts/scan-skill.mjs C:/Users/lvdat/.claude/skills/<skill>` cho từng skill
Expected: mỗi skill có danh sách phát hiện (có thể rỗng)

- [ ] **Step 2: Viết `docs/session/skills-review.md`**

Bảng: `Skill | Dùng cho Nếp Nhà để làm gì | Số phát hiện | Đề xuất (giữ / viết lại / bỏ) | Lý do`. Skill gắn với Jira hoặc quy trình công ty (ví dụ `story-writer`, `epic-breakdown`) đề xuất bỏ, trừ khi viết lại được thành bản chung có ích. Thêm một dòng cho plugin `andrej-karpathy-skills@karpathy-skills` (đề xuất có bật trong `enabledPlugins` hay không).

- [ ] **Step 3: DỪNG — chủ dự án duyệt danh sách**

Gửi bảng cho chủ dự án. Chỉ tiếp tục với các skill và plugin được duyệt; ghi quyết định vào cột `Đề xuất` của bảng.

- [ ] **Step 4: Chép skill được duyệt (bỏ `node_modules/`, `.git/`)**

Run: `cp -r C:/Users/lvdat/.claude/skills/<skill> .claude/skills/<skill>` rồi xóa `node_modules` nếu có. Nếu skill cần package npm, ghi lệnh cài vào `docs/setup.md`.

- [ ] **Step 5: Viết lại các dòng bị phát hiện**

Thay tên, đường dẫn, ví dụ của công ty bằng ví dụ của Nếp Nhà hoặc bằng chữ chung. Đường dẫn lưu file mặc định của skill trỏ vào trong repo (ví dụ `docs/diagrams/`).

- [ ] **Step 6: Quét lại, xác nhận sạch**

Run: `node scripts/scan-skill.mjs .claude/skills/*`
Expected: không in gì, mã thoát 0

- [ ] **Step 7: Thêm plugin được duyệt vào `enabledPlugins` (nếu có) và commit**

```bash
git add .claude/skills docs/session/skills-review.md .claude/settings.json docs/setup.md
git commit -m "feat: add filtered shared skills"
```

---

### Task 6: GitHub, CI và kiểm tra trên máy cá nhân và cloud

**Files:**
- Create: `.github/workflows/tools.yml`, `scripts/cloud-setup.sh`
- Modify: `docs/setup.md` (mục Cloud session + kết quả kiểm tra), `docs/session/STATE.md`, `docs/decisions/0005-test-trong-cloud.md` (chỉ khi cloud không có Docker)

**Interfaces:**
- Consumes: `npm run test:tools` (Task 1–4).

- [ ] **Step 1: Viết `.github/workflows/tools.yml`**

Chạy khi `push` và `pull_request`; matrix `os: [ubuntu-latest, windows-latest]`; các bước: `actions/checkout@v4`, `actions/setup-node@v4` với `node-version: 22`, `npm run test:tools`. Trên Windows đặt `defaults.run.shell: bash`.

- [ ] **Step 2: Viết `scripts/cloud-setup.sh`**

Bash, `set -euo pipefail`. In phiên bản của `node`, `java` (nếu có), `docker` (nếu có, kèm `docker info` thành công hay không), và `corepack enable` cho pnpm. Không cài gì cần quyền root. Kết thúc bằng một dòng tóm tắt `node=<v> java=<v|missing> docker=<ok|missing>`.

- [ ] **Step 3: DỪNG — chủ dự án tạo repo GitHub**

Chủ dự án tạo repo **private** `ledat1011/nepnhaxudong` trên github.com (không tạo README / license), rồi báo lại.

- [ ] **Step 4: Thêm remote và push**

```bash
git remote add origin https://github.com/ledat1011/nepnhaxudong.git
git push -u origin main
```
Expected: push thành công; tab Actions chạy `tools` xanh trên cả `ubuntu-latest` và `windows-latest`.

- [ ] **Step 5: DỪNG — chủ dự án bật bảo vệ nhánh `main`**

Trong Settings → Branches: yêu cầu PR và hai check `tools (ubuntu-latest)` và `tools (windows-latest)` xanh trước khi merge.

- [ ] **Step 6: DỪNG — chủ dự án kiểm tra trên máy cá nhân**

Theo `docs/setup.md`. Đạt khi: (a) `git log -1 --format=%ae` là email noreply; (b) Claude Code trả lời đúng "Giai đoạn hiện tại là gì?"; (c) các plugin được đề nghị cài; (d) `claude mcp list` giống máy công ty. Chủ dự án báo lại kết quả.

- [ ] **Step 7: DỪNG — chủ dự án kiểm tra cloud session**

Trên claude.ai/code: kết nối repo `ledat1011/nepnhaxudong`, tạo môi trường, chạy `bash scripts/cloud-setup.sh`, hỏi "Giai đoạn hiện tại là gì?". Chủ dự án gửi lại dòng tóm tắt của script.

- [ ] **Step 8: Ghi kết quả**

Điền mục "Cloud session" trong `docs/setup.md` (biến môi trường cần đặt, kết quả `cloud-setup.sh`). Nếu `docker=missing`: viết `docs/decisions/0005-test-trong-cloud.md` — cloud chỉ chạy unit test; test Testcontainers chạy ở local và GitHub Actions. Cập nhật `docs/session/STATE.md`: phần C xong, việc tiếp theo là viết plan phần A.

- [ ] **Step 9: Commit và push qua PR**

```bash
git checkout -b feat/phan-c-ket-qua
git add .github scripts/cloud-setup.sh docs
git commit -m "ci: add tools workflow and record device checks"
git push -u origin feat/phan-c-ket-qua
```
Mở PR vào `main`; merge khi check `tools` xanh.
