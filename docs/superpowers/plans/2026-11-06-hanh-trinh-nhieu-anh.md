# Hành trình nhiều ảnh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A journey milestone holds 0–3 ordered photos end to end (DB, API, admin, public web), and a click on a photo opens a shared lightbox.

**Architecture:** A `timeline_event_media` join table replaces `timeline_event.media_id`, following `product_media`. The admin form reuses the product image list. The public journey renders staggered frames and reuses a `Lightbox` component extracted from `Gallery`.

**Tech Stack:** Spring Boot 4 + JPA + Flyway + Testcontainers (api), Next.js 16 + React + Vitest + Playwright (web).

**Spec:** `docs/superpowers/specs/2026-11-06-hanh-trinh-nhieu-anh-design.md`

## Global Constraints
- Max 3 photos per milestone. Error texts (Vietnamese, exact): "Một mốc có tối đa 3 ảnh.", "Ảnh bị chọn hai lần: {id}.", "Ảnh không tồn tại: {id}."
- The old single-image path (`mediaId` on the event, `image` in the public DTO and web type) is deleted everywhere, with its tests. No flag, no fallback, except reading old audit snapshots.
- Code, comments, tests, commits in English; user-facing text bilingual through the dictionaries.
- Containers: run `docker info` first (CLAUDE.md, "Local containers").
- Run only the tests of the changed area while working (CLAUDE.md, "Running tests").
- Git identity `ledat1011`; no `Co-Authored-By` line.

## Review Focus
1. An audit snapshot written before this change (`"mediaId": 7` or `null`) is restored after it: the event comes back with `[7]` or no photos.
2. Deleting a photo that a milestone uses is refused with the existing "in use" message.
3. A milestone with 3 photos at 375 px: no horizontal scroll, frames do not overlap the text.
4. Keyboard: Tab reaches each photo button, Enter opens the lightbox, Esc closes it and focus returns to the same button.
5. The public API drops a photo whose file is gone without failing the whole page.

---

### Task 1: API and database
**Files:**
- Create: `api/src/main/resources/db/migration/V5__timeline_event_media.sql`, `api/src/main/java/vn/nepnhaxudong/timeline/TimelineEventMedia.java`
- Modify: `timeline/TimelineEvent.java`, `TimelineEventRequest.java`, `TimelineEventAdminDto.java`, `TimelineService.java`, `TimelineAuditedHandler.java`, `publicapi/TimelinePublicDto.java`, `publicapi/PublicContentService.java`, `media/MediaRepository.java`, `dev/DevSeed.java`, and their tests.

**Interfaces (produces):**
- `TimelineEventRequest(Integer year, Integer sortOrder, LocalizedText title, LocalizedText description, List<Long> mediaIds)`; `MAX_IMAGES = 3`, `@Size` message "Một mốc có tối đa 3 ảnh."
- `TimelineEventAdminDto(long id, int year, int sortOrder, LocalizedText title, LocalizedText description, List<Long> mediaIds, boolean missingEn)`; a `@JsonCreator` (or `@JsonAlias` plus a compact constructor) that also accepts the old `mediaId` field.
- `TimelineEvent.mediaIds(): List<Long>` and package-private `replaceMedia(List<Long>)`, same rules as `Product.replaceMedia`.
- `TimelinePublicDto(int year, String title, String description, List<ImageRefDto> images)`.

- [ ] Migration test first (old row with `media_id` → one `timeline_event_media` row, column gone), then the migration.
- [ ] Service tests: 0/1/3 photos saved in order; 4 photos, a duplicate and an unknown id rejected with the exact messages; then the entity, request, service changes (validation like `ProductService.validateMedia`).
- [ ] Audit tests: restore from a new snapshot and from an old `mediaId` snapshot (number and null); then the handler.
- [ ] `isUsed` test for a timeline photo; public API test for `images` order and a missing file; then the repository query, public DTO and service.
- [ ] `DevSeed` compiles and seeds; run the timeline, media, publicapi and audit test classes; commit.

### Task 2: Admin form and full-stack test
**Files:** `web/src/lib/admin/types.ts`, `web/src/components/admin/timeline/TimelineEventForm.tsx` (+ test), `TimelineList.tsx` (+ test), the timeline steps in `web/e2e-fullstack/*.spec.ts`.

**Interfaces:** consumes Task 1 JSON: admin `mediaIds: number[]` in request and response.

- [ ] Form tests: add up to 3 photos, move up/down, remove; the add button is disabled at 3 with a reason; the request body has `mediaIds` in order. Then replace `SingleImageSection` in the form with the product-style image list (`MediaPicker`, `useMediaByIds`). Remove `mediaId` from types and code.
- [ ] `TimelineList` shows the first photo; test.
- [ ] Full-stack spec: create a milestone with 2 photos in the admin and see both on the public page; commit.

### Task 3: Public web — staggered frames and shared lightbox
**Files:**
- Create: `web/src/components/ui/Lightbox.tsx` (+ test), `web/src/components/home/JourneyPhotos.tsx` (client, + test)
- Modify: `web/src/components/home/Gallery.tsx` (use `Lightbox`, keep all its tests passing), `JourneySection.tsx` (+ test), `web/src/lib/content/types.ts` (`images: ImageRef[]`), `web/src/lib/i18n/dictionaries.ts` (labels for the photo button and lightbox if `Gallery`'s labels do not fit), `web/src/lib/motion/journey.ts` if its selectors change, `web/e2e/home.spec.ts`.

**Interfaces:**
- `Lightbox({ images: { src: string; alt: string; width: number; height: number }[]; index: number | null; onClose(): void; onIndexChange(i: number): void; dict: Dictionary })` — renders nothing when `index` is null; the dialog, focus trap, arrows, Esc and backdrop close move here from `Gallery`.
- `JourneyPhotos({ images: ImageRef[]; dict: Dictionary })` — layout per spec for 1, 2, 3 photos; each photo a `<button>` that opens `Lightbox` at its index.

- [ ] `Lightbox` tests (open at index, next/previous, Esc, backdrop, focus return), then extract it from `Gallery`; run `Gallery` tests unchanged.
- [ ] `JourneyPhotos` tests (frame count and shape classes for 1/2/3; click opens at that index), then the component; `JourneySection` uses it.
- [ ] e2e in `home.spec.ts`: open a journey photo, Esc closes; 375 px has no horizontal scroll; commit.

### Task 4: Photos and content
**Files:** `web/public/journey/2021-giay-chung-nhan-attp.webp`, `web/src/fixtures/home.{vi,en}.json`, `web/src/fixtures/fixtures.test.ts`, `docs/noi-dung/hanh-trinh.md`.
- [ ] Certificate photo: crop to the paper edge, straighten, raise contrast, WebP; no AI redraw.
- [ ] Fixtures: every milestone has `images` (2021: certificate, bag); fixture tests check the files exist; doc lists the certificate photo; commit.

### Final
- [ ] Merge the task branches; full `npm test`, `npm run typecheck`, `npm run lint` in `web/`; the api test suite; e2e `home.spec.ts`; full-stack suite.
- [ ] Browser check at 375 px and 1280 px of the 2021 milestone and the lightbox; screenshots looked at.
- [ ] PR, then merge when CI passes.
