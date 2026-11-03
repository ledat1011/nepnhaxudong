---
name: call-chain
description: Draws an easy-to-read call chain tree for a Java error or code flow — from the entry point (REST endpoint, scheduled job, message listener) down to the failing line — with line numbers, where the transaction starts, where exceptions are caught / wrapped / retried, external calls, real timings per step from logs, and the alert line marked. Adds a table of clickable file links and the exception chain with the root cause first, so the user can open the code and follow it. Use whenever the user wants to read or understand the code path behind an error, alert, stack trace or log — "send me the stack chain", "call chain", "call flow", "show the flow from the message to the error", "draw the call chain", "so I can read the code", "where is this called from", "trace this stack", "show me the code path" — in any language, or pastes a stack trace / log CSV and asks how the code gets there, even if they do not say "call chain".
---

# Call chain

The goal is a tree the user can read top to bottom **while they open the code**. A raw stack
trace is bottom-up, full of proxies, and says nothing about time, transactions or who catches
the error. The tree fixes all of that: entry point first, only the application frames, and
markers for the things that explain the bug.

## 1. Get the frames

- **Stack trace in a file or a Cloud Logging CSV export:** run the bundled script. It removes
  Spring / CGLIB proxies, merges the "Caused by" sections, and prints the chain entry-first plus the
  exception chain root-cause-first.
  ```bash
  python "$CLAUDE_PROJECT_DIR/.claude/skills/call-chain/scripts/extract_frames.py" <file> [--prefix vn.nepnhaxudong] [--grep "<text of the alert line>"]
  ```
  For a pasted stack trace, save it to a scratch file first.
- **Stack trace from a cloud log service:** export the log entry as JSON or CSV
  and take the `textPayload` field (or the stack trace text).
- **No stack trace (the user names a method or a flow):** build the chain by reading the code
  (use CodeGraph `codegraph_explore` when the repo has `.codegraph/`, otherwise Grep/Read).
  Say clearly that the chain comes from code reading, not from a real stack.

## 2. Check the line numbers against the code

The stack trace line numbers belong to the **deployed** version. Compare a few frames with the
local file (and with `origin/master` via `git show origin/master:<path>`). If they match, say so.
If they do not, keep the stack numbers in the tree, say which version they come from, and give
the links with the local line numbers. A link that opens on the wrong line wastes the user's time.

## 3. Add what the stack cannot show

Read each method in the chain, then add these. Each one answers a question the user will ask.

| Marker | When | How to find it |
|---|---|---|
| `══ @Transactional (:N) → TRANSACTION STARTS HERE, limit 30 s ══` | a method opens the transaction | `@Transactional`; inner `REQUIRED` methods join it, so the marker goes on the outermost one only |
| `← catch → "<log text>" (:N)` | a frame catches, wraps, retries or swallows the error | try/catch in that method; quote the real log message |
| `→ GET <service>/<path>` | an external call (REST, message publish, other database) | rest clients, publishers |
| sibling line `├─ foo() :N` | a call that ran and **returned** before the failing call, but matters (took time, changed state) | code read of the parent method; it is not in the stack |
| `── STEP X: <duration>, <note> ──` | logs show how long a part took | gap between two log lines of the same thread and pod; mark the longest step |
| `(<count> posts)`, `(43 batches × 1000)` | a number from the logs explains the size | log lines such as "Saving 34775 posts" |
| `← ALERT LINE` | the frame that produced the logged error | innermost application frame of the logged exception |

Only add a marker when it is backed by code or a log line. If a step's content is inferred
(for example a silent gap), say so in the text under the tree.

## 4. Output

Write the tree inside a code block so the box-drawing lines stay aligned. Use this layout:

```
<Entry point (endpoint / job / message type)>
│
├─ Class.method                                   :line
│  └─ Class.method                                :line   ← catch → "…" (:line)
│     ├─ siblingCall                              :line   → GET service/path
│     └─ Class.method                             :line
│        ══ @Transactional (:line) → TRANSACTION STARTS HERE ══
│        └─ …
│           │  ── STEP B: 2 min 21 s, no logs ──
│           ├─ …
│           └─ failingCall()                      :line  ← ALERT LINE
```

- Start from the real entry point, not from the first application frame.
- Use `Class.method` at the first mention of a class, then `method` alone inside the same class.
- Keep the `:line` column aligned where possible. Drop plumbing frames that add nothing
  (for example a pure delegate), but never drop a frame that has a marker.

After the tree, add in the user's language:

1. **Links table** — `Step | Link`, one row per important frame, as markdown links with the
   full path from the working directory (for example
   `[TimelineService.java:42](backend/src/main/java/vn/nepnhaxudong/timeline/TimelineService.java:42)`).
   Never shorten a path with `.../`.
2. **Exception chain** — a second code block, root cause first, each wrapper on its own line,
   the misleading message and the alert line marked, and the end of the chain
   (retry / HTTP 500).
3. **Points to notice** — 3 or 4 short numbered points that a reader would miss in the code:
   transaction propagation, flush versus commit, where the error is swallowed, retry behaviour.

## 5. Optional: save it

If the user asks to keep the chain, save it as a markdown file in `docs/` (for example
`docs/diagrams/<topic>-call-chain.md`), with the tree inside a code block.

## Example

A complete example (entry point, markers, timing steps, exception chain) is
in `references/example.md`. Read it before the first chain in a session to match the style.
