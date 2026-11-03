---
name: explain-root-cause
description: Explains the root cause of a bug or failed test like a senior expert, so that developers, testers and the PO all understand it in one read — verdict first, the rule the bug depends on, a timeline from real evidence, why it stays broken, the working case next to the failing case, the code location with a small flow diagram, database/log evidence, and the fix. Writes for the user in their language and, on request, a short English version for the PO. Use whenever the user asks to explain a root cause or an investigation result — "giải thích root cause", "là sao giải thích giúp tôi", "explain this for the PO", "viết giải thích cho PO", "make a timeline", "tóm tắt nguyên nhân", "is my understanding right?", "why does this happen", or wants to turn findings into something others can understand — even if they don't say "root cause".
---

# Explain a root cause

The job is not to find the bug. The job is to make the cause **obvious** to someone who was not
in the investigation — a developer, a tester, or the PO — in one read, without re-asking.

An expert explanation is short, concrete, and backed by evidence. It answers four questions in
this order: **What is broken? What rule does it break? What actually happened? What fixes it?**

## Before writing

Collect what the explanation needs from the conversation (or ask, or look it up):

- The **verdict**: which part is broken and which part is not. Name the owner (ticket or issue, service).
- The **rule** the bug depends on: a validator, a sort order, a state machine, a feature switch.
- **Evidence** with real values: log lines with timestamps, DB rows, ids. Prefer real numbers over
  descriptions — "commit 02:14:05.460, revalidate 02:14:05.180" beats "revalidate was earlier".
- A **working case** to compare against (page A vs page B, staging vs production).
- The **code location**: file + method, from the main branch.
- The **fix**: minimal fix first, optional hardening second.

If a claim has no evidence yet, mark it as unverified. Never fill a gap with a guess that
reads like a fact.

## Structure

Follow this order. Skip a section only when it has nothing true to say. The full template with
a worked example is in `references/answer-format.md`.

1. **Verdict** — one or two sentences. Say what is *not* broken too, because readers usually
   blame the wrong code first ("The save code works. The bug is in the order of revalidate and commit.").
2. **The rule** — the mechanism the bug depends on, as a short list or a table (e.g. the allowed
   status transitions). Put the one key rule in bold. Readers cannot follow the timeline without it.
3. **Timeline** — a table from real evidence: `Time (UTC) | Service | Event | Result`, with ✅ / ❌.
   One row per meaningful step. Highlight the rows where it goes wrong.
4. **Why it stays broken** (or why it recovers) — numbered steps from the first event to the
   final state. This is where most readers get the "aha".
5. **Working vs failing** — side by side, in a table or two short blocks. The difference between
   them is the root cause made visible.
6. **Where in the code** — file + method. When the cause depends on *when* something happens
   across two services, two threads, or a call and its callback, add an ASCII flow diagram with
   real method names and real timestamps, and mark the deciding values with `←`. Follow the
   drawing rules and the example in `references/answer-format.md`, section 6.
7. **Evidence** — a DB or log table with the columns that prove the cause (for example the row
   `id` for real insert order next to the business timestamp). Include the query.
8. **Fix** — minimal fix and why it works, then optional hardening. Offer to implement it; do not
   implement it inside the explanation.
9. **Notes** — side effects, stuck test data, things not checked yet.

## Writing rules

- **Plain, literal language.** Short sentences. No idioms, no metaphors, no slang. Define a term
  the first time it appears ("revalidate = the website rebuilds a cached page").
- **Separate things that sound alike.** Most confusion comes from two concepts sharing one word:
  saved vs committed, call order vs timestamp order, draft status vs published status,
  temporary retry vs permanent stuck. Name both and say which one causes the problem — a small
  two-column table works well.
- **Use real values**, not placeholders, and use UTC. Convert stored local times (e.g.
  `created_at` in Asia/Ho_Chi_Minh) before comparing them with logs, and say that you did.
- **Tables for comparisons and sequences, prose for reasoning.** Do not put reasoning in a table.
- **One explanation, one cause.** If there are two causes (e.g. a second bug found in another
  environment), explain each separately, then add a table that compares them and says whether the
  first will appear again once the second is fixed.
- **Language:** write for the user in the language they wrote in. When the text is for the PO or
  another team, write it in English (unless told otherwise) and keep code internals to the
  minimum the reader needs.

## Follow-up questions

- "Is my understanding right?" → answer **Yes / No** (or **Đúng / Không**) first, then add only
  the nuance that changes the meaning. Do not repeat the whole explanation.
- "Rewrite this for the PO" → use the PO template in `references/answer-format.md`: summary,
  rule, what goes wrong, diagram, evidence, why the working case is fine, fix, re-test note
  (name the record and environment for any test data).
- "Make a diagram / timeline" → an ASCII flow diagram in the reply is enough for chat. For a page
  others will open, save a short markdown note or an image in `docs/` (timeline, sequence
  diagram, evidence, fix).
