# Answer format

Two templates: the explanation for the user (in the user's language) and the reply for the PO
(English). A worked example follows each template. The examples are made up for illustration (a
story post on the website that stays old after the admin publishes it). Copy the shape, not the
content.

## Contents
1. Explanation for the user — template
2. Explanation for the user — example (Vietnamese)
3. Two-cause variant (when reproduction finds a second bug)
4. Reply for the PO — template
5. Reply for the PO — example (English)
6. Flow diagram — when to draw, how to draw, example

---

## 1. Explanation for the user — template

```markdown
<!-- Write the headings in the user's language. -->
[Verdict: 1–2 sentences. Which part is NOT broken, which part IS, which ticket/service owns it.]

## Summary
[3–4 short numbered points: what happens, why, the result.]

## The rule it depends on
[Bullets or a table (e.g. allowed transitions). The key rule in bold.]

## What happened on [ENV]
[One line: which record, which test data.]

| Time (UTC) | Service | Event | Result |
|---|---|---|---|
| hh:mm:ss.mmm | service | what happened | ✅ / ❌ error / — |

## Why it stays broken / Why it recovers
[Numbered steps from the first event to the final state.]

## Why [working case] is not affected
[One or two sentences, with the value that shows the difference.]

## Where in the code
[file + method, from the main branch. ASCII flow diagram if two services interact.]

## Evidence
[Table of the proving rows. Then the query in a ```sql block.]

## Proposed fix
1. **Main fix:** ... (why it works)
2. **Optional hardening:** ...

## Notes
- [Stuck test data → re-test with a new record.]
- [Side observations, things not checked yet.]

[One question: offer to implement the fix.]
```

## 2. Explanation for the user — example (Vietnamese)

> Phần lưu trạng thái bài viết không bị lỗi. Lỗi nằm ở **thứ tự gọi revalidate trang web và
> commit giao dịch** trong `StoryService.publish`. Trang web được yêu cầu dựng lại trước khi bài
> viết được commit, nên nó đọc dữ liệu cũ và lưu cache trang cũ.
>
> | Giờ (UTC) | Thành phần | Sự kiện | Kết quả |
> |---|---|---|---|
> | 02:14:05.120 | backend | `publish` mở giao dịch, ghi bài 12 từ DRAFT sang **PUBLISHED** (chưa commit) | — |
> | 02:14:05.180 | backend | Gọi `POST /api/revalidate` cho trang `/vi/story` | ✅ 200 |
> | 02:14:05.350 | website | Dựng lại trang, gọi `GET /api/public/stories` | ❌ danh sách không có bài 12 |
> | 02:14:05.400 | website | Lưu cache trang không có bài 12 | ❌ cache cũ |
> | 02:14:05.460 | backend | Commit giao dịch, bài 12 là PUBLISHED | ✅ |
>
> Flow diagram when two services interact: see section 6.
>
> Working vs failing, side by side:
>
> | | Trang `/vi/story` (lỗi) | Trang `/vi/about` (đúng) |
> |---|---|---|
> | Thời điểm gọi revalidate | Trước commit | Sau commit |
> | Tự hết không? | **Không**, đến lần revalidate kế tiếp | **Có** |

## 3. Two-cause variant

When reproduction on the user's environment behaves differently, add a comparison table:

| | [Condition A, e.g. preview environment (wrong secret)] | [Condition B, e.g. production environment (right secret)] |
|---|---|---|
| Lỗi chặn đầu tiên | ... | ... |
| Kết quả | ... | ... |
| Cần sửa | ... | ... |

Also say explicitly whether the first bug will appear again once the second one is fixed.

---

## 4. Reply for the PO — template

```markdown
Hi [PO name],

Thanks for the test. I found the root cause of [the failing part].

**Summary:** [1–2 sentences. What is saved / what is shown / why.]

**How [the check] works today:** [2–3 sentences on the mechanism.]

**What goes wrong for [case]:** [bullets: who does what, in which order.]

[ASCII flow diagram in a code block.]

[One paragraph: what is temporary vs what is permanent.]

**Evidence from [ENV]** ([record id], [table] sorted by [column]):

| ... | ... |

[One sentence reading the table.]

[Why the working case is not affected.]

**Fix:** [minimal fix in 1–2 sentences.]

**Re-test:** [record] ([ENV]) already has the wrong data, so please re-test with a
new [record] once the fix is deployed. [Side note if any.]

Full timeline and details: [link]
```

## 5. Reply for the PO — example (English)

> **Summary:** The story **is saved** as PUBLISHED. The website still does not show it, because
> the page was rebuilt a few milliseconds before the save was committed.
>
> **How the page update works today:** when the admin publishes a story, the backend asks the
> website to rebuild the story page. The website then reads the public story list from the
> backend. The list only contains rows that are already committed.
>
> The order is the problem: the backend asks for the rebuild **inside** the transaction, before
> the commit. The website reads the old list and keeps that page in its cache until the next
> rebuild.
>
> **Re-test:** story 12 (staging) already has a stale page, so it will stay hidden until the
> next rebuild. Please re-test with a new story once the fix is deployed.

---

## 6. Flow diagram — when to draw, how to draw, example

**When to draw one:** the cause depends on *when* something happens across two services, two
threads, or a call and its callback — ordering bugs, races, timestamps taken at the wrong moment,
work done before or after a commit. Skip it when the cause sits in one method and one step.

**How to draw it:**
- Top line of each column: `service  Class.method` of the entry point.
- Left column = the caller. Draw a nested call as a box that opens with `┐` and returns with `┘`,
  and put the callee's steps inside it on the right (`├─` for a step, `└─` for the last step).
- One line per step that matters to the cause. Leave out logging, mapping, validation noise.
- Put the **real timestamp** of each important step at the right, in one aligned column.
- Mark the values that decide the bug with `←` and a short label (`← read old list`).
- Use the real method names from the main branch, so a developer can search for them.
- Keep it under ~20 lines and inside a plain code block (no language tag), so it renders the same
  in chat, a pull request and a ticket.
- Below the diagram, add one or two sentences that say what the reader should notice.

**Example** (the revalidate call runs before the commit):

```
backend  StoryService.publish
 │
 ├─ begin transaction
 ├─ story 12: DRAFT → PUBLISHED (not committed)              02:14:05.120
 │
 ├─ RevalidateClient.revalidate("/vi/story") ───────────┐
 │                                                       │  website  /api/revalidate
 │                                                       ├─ GET backend /api/public/stories   02:14:05.350  ← read old list
 │                                                       ├─ render page without story 12
 │                                                       └─ cache the page                    02:14:05.400
 │  ◄──────────────────── 200 ───────────────────────────┘
 │
 └─ commit                                                     02:14:05.460  ← story 12 visible only now
```

What to notice: the website reads the list 110 ms before the commit, so it cannot see story 12.

**Other shapes that follow the same rules:**

Callback / async flow (request, then a later callback from a third party):

```
backend  upload photo                                 10:00:00.100
 ├─ save file, status = PROCESSING                    10:00:00.150  ← state = PROCESSING
 └─ return 202 to the admin app
        ...
image worker  POST /api/photos/12/ready               10:00:04.900
 └─ backend  PhotoService.markReady
      └─ status = READY                               10:00:05.000  ← needs state = PROCESSING
```

Two requests racing on the same record:

```
database  story 12, version = 3
 ├─ admin phone  save title "A"   read version 3 at 10:00:01.0 → write 10:00:01.4  → version 4
 ├─ admin laptop save title "B"   read version 3 at 10:00:01.2 → write 10:00:01.6  → version 5  ← overwrites "A"
 └─ the final title is "B"; the edit "A" is lost without an error
```
