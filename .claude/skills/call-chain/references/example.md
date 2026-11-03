# Worked example: NullPointerException when the admin saves a timeline story (illustrative)

Input the user gave: a log line from the Spring Boot backend,
`ERROR … vn.nepnhaxudong.timeline.TimelineService … NullPointerException … saveStory`,
plus the log lines of the same request thread that showed where the time went.

This example is made up to show the format. The line numbers are not from real code.

What was added on top of the raw stack frames, and where it came from:

| Added item | Source |
|---|---|
| `loadCoverImage :38 → GET media-service /images/42` | code read of `saveStory` + the log line of the GET (a sibling call that returned before the failing call, not in the stack) |
| `══ @Transactional (:30) → TRANSACTION STARTS HERE ══` | annotation on `TimelineService.saveStory`; inner `@Transactional` methods are REQUIRED, so they join it |
| `STEP B: 4.2 s, no logs` and its child lines | gap between two log lines of the same thread + code read of the method that runs between them |
| `renumberStories (120 stories) :61` | sibling call that completed before the failing call; count from the `Renumbering 120 stories` log line |
| `← catch → "Cannot save story…" (:47)` | try/catch read in `TimelineController.create` |
| `← ALERT LINE` | the frame that threw the logged error (innermost app frame) |

## Output

```
POST /api/admin/timeline  (admin saves a story, then the page is revalidated)
│
├─ TimelineController.create                                     :47   ← catch → "Cannot save story…" (:49)
│  └─ TimelineService.saveStory                                  :31
│     ══ @Transactional (:30) → TRANSACTION STARTS HERE, limit 30 s ══
│     ├─ loadCoverImage                                          :38   → GET media-service /images/42
│     ├─ renumberStories (120 stories)                           :61
│     │
│     │  ── STEP B: 4.2 s, no logs ──
│     └─ StoryMapper.toEntity                                    :44
│        └─ StoryMapper.mapTranslations                          :72
│           └─ story.getTitle().trim()                           :75   ← ALERT LINE
```

## Exception chain that followed the tree

```
NullPointerException: Cannot invoke "String.trim()" because "story.getTitle()" is null   ← ROOT CAUSE
  at StoryMapper.mapTranslations                                 :75   ← ALERT LINE
  → caught in TimelineController.create → InternalServerErrorException "Cannot save story"
  → HTTP 500 to the admin app; the revalidate call to the website is never reached
```

## "Points to notice" that followed

1. `saveStory` opens the transaction, so the 500 rolls back the renumbering as well. The
   story list stays as it was before the save.
2. The title is optional in the English translation but `mapTranslations` calls `trim()`
   on it without a null check.
3. The revalidate request to the website runs after the save returns. A failed save never
   triggers it, so the public page keeps showing the old content.
