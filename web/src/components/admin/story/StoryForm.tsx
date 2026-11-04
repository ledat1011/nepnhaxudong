"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";
import { FieldError, RequiredMark, RequiredNote } from "@/components/admin/form/FieldError";
import { MissingEnBadge } from "@/components/admin/form/MissingEnBadge";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { SaveBar } from "@/components/admin/form/SaveBar";
import { SingleImageSection } from "@/components/admin/media/SingleImageSection";
import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin/ui/tabs";
import { Textarea } from "@/components/admin/ui/textarea";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError } from "@/lib/admin/errors";
import { apiRest, invalidProps, mapApiDetail, langOfDetail, NOT_SAVED_NOTICE, type FieldRule } from "@/lib/admin/field-errors";
import { toRequestText } from "@/lib/admin/localized";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { useAdminSession } from "@/lib/admin/session";
import { publishChecks, type PublishCheckKey } from "@/lib/admin/publish-checks";
import { slugify } from "@/lib/admin/slugify";
import type { StoryAdminDto, StoryRequest } from "@/lib/admin/types";
import { useFieldErrors } from "@/lib/admin/use-field-errors";
import { useSave } from "@/lib/admin/use-save";
import { useStoryDraft } from "@/lib/admin/use-story-draft";
import { useLeavePage, useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";
import { DraftRestoreDialog } from "./DraftRestoreDialog";
import { PublishCheckDialog } from "./PublishCheckDialog";
import { StoryPreview } from "./StoryPreview";

// The editor (Tiptap and ProseMirror) is large. It is loaded only here, in the admin, and never on a public page.
const RichTextEditor = dynamic(() => import("./RichTextEditor").then((module) => module.RichTextEditor), {
  ssr: false,
  loading: () => (
    <p role="status" className="py-6 text-center text-muted-foreground">
      Đang tải trình soạn thảo…
    </p>
  ),
});

type Lang = "vi" | "en";
const LANGS: Lang[] = ["vi", "en"];

type LangFields = { title: string; slug: string; excerpt: string; bodyHtml: string };

const TITLE_MISSING_MESSAGE = "Tiêu đề bài viết (tiếng Việt) không được để trống.";

/** The API messages that name a field of this form (see `StoryService.validateContent`). */
const FIELD_RULES: FieldRule[] = [{ prefix: "Tiêu đề bài viết", field: (detail) => `title.${langOfDetail(detail)}` }];

/** A box the "Quay lại sửa" of the check panel moves to: its `data-fix` value, in a tab. */
type FixTarget = { lang: Lang; box: "title" | "excerpt" | "body" };

type FormState = {
  coverMediaId: number | null;
  vi: LangFields;
  en: LangFields;
};

function fieldsFrom(story: StoryAdminDto | undefined, lang: Lang): LangFields {
  return {
    title: story?.title[lang] ?? "",
    slug: story?.slug[lang] ?? "",
    excerpt: story?.excerpt[lang] ?? "",
    bodyHtml: story?.bodyHtml[lang] ?? "",
  };
}

function stateFrom(story: StoryAdminDto | undefined): FormState {
  return { coverMediaId: story?.coverMediaId ?? null, vi: fieldsFrom(story, "vi"), en: fieldsFrom(story, "en") };
}

function isLangFields(value: unknown): value is LangFields {
  if (typeof value !== "object" || value === null) return false;
  const fields = value as Record<string, unknown>;
  return ["title", "slug", "excerpt", "bodyHtml"].every((name) => typeof fields[name] === "string");
}

/** A form state read back from the browser storage, which anything could have written. */
function isFormState(value: unknown): value is FormState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  const cover = state.coverMediaId;
  return (cover === null || typeof cover === "number") && isLangFields(state.vi) && isLangFields(state.en);
}

function snapshot(state: FormState): string {
  return JSON.stringify(state);
}

/** The request body. Blank English boxes are `null`, so a story with no English text has no English version. */
function toRequest(state: FormState): StoryRequest {
  return {
    coverMediaId: state.coverMediaId,
    slug: toRequestText({ vi: state.vi.slug, en: state.en.slug }),
    title: toRequestText({ vi: state.vi.title, en: state.en.title }),
    excerpt: toRequestText({ vi: state.vi.excerpt, en: state.en.excerpt }),
    bodyHtml: toRequestText({ vi: state.vi.bodyHtml, en: state.en.bodyHtml }),
  };
}

/**
 * After a save: each box takes the value the API answered, unless the user changed it after the request left.
 * A box that changed meanwhile keeps the typed text and stays unsaved.
 */
function mergeSaved(current: FormState, sent: FormState, saved: FormState): FormState {
  const mergeLang = (lang: Lang): LangFields => ({
    title: current[lang].title === sent[lang].title ? saved[lang].title : current[lang].title,
    slug: current[lang].slug === sent[lang].slug ? saved[lang].slug : current[lang].slug,
    excerpt: current[lang].excerpt === sent[lang].excerpt ? saved[lang].excerpt : current[lang].excerpt,
    bodyHtml: current[lang].bodyHtml === sent[lang].bodyHtml ? saved[lang].bodyHtml : current[lang].bodyHtml,
  });
  return {
    coverMediaId: current.coverMediaId === sent.coverMediaId ? saved.coverMediaId : current.coverMediaId,
    vi: mergeLang("vi"),
    en: mergeLang("en"),
  };
}

/** The slug the API will use for one language, or `null` when that language has no slug. */
function effectiveSlug(lang: Lang, sent: FormState, baseline: StoryAdminDto | undefined): string | null {
  const typed = sent[lang].slug.trim();
  if (typed !== "") return slugify(typed);
  const stored = baseline?.slug[lang];
  if (stored !== null && stored !== undefined) return stored;
  const title = sent[lang].title.trim();
  return title === "" ? null : slugify(title);
}

/**
 * The languages whose slug another story already uses. The API answers 409 without saying which language,
 * so the other stories are read and compared. If they cannot be read, or none matches, the first language
 * whose slug the user changed is named.
 */
async function conflictingLangs(sent: FormState, baseline: StoryAdminDto | undefined): Promise<Lang[]> {
  const mine = LANGS.filter((lang) => effectiveSlug(lang, sent, baseline) !== null);
  try {
    const others = (await adminFetch<StoryAdminDto[]>("/admin/stories")).filter((story) => story.id !== baseline?.id);
    const taken = mine.filter((lang) => others.some((story) => story.slug[lang] === effectiveSlug(lang, sent, baseline)));
    if (taken.length > 0) return taken;
  } catch {
    // The list is only a help to find the language; the fallback below still answers.
  }
  const changed = mine.filter((lang) => effectiveSlug(lang, sent, baseline) !== (baseline?.slug[lang] ?? null));
  return [changed[0] ?? "vi"];
}

function countImages(html: string): number {
  return (html.match(/<img\b/gi) ?? []).length;
}

function formatDate(iso: string | null): string {
  if (iso === null) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

type SlugConflicts = Record<Lang, string | null>;
const NO_CONFLICTS: SlugConflicts = { vi: null, en: null };

/** The editor of one story. Without `initial` it creates a new story. */
export function StoryForm({ initial }: { initial?: StoryAdminDto }) {
  const router = useRouter();
  const [baseline, setBaseline] = useState<StoryAdminDto | undefined>(initial);
  const [state, setState] = useState<FormState>(() => stateFrom(initial));
  const [baselineState, setBaselineState] = useState(() => stateFrom(initial));
  // Per language: the API body had an image that the editor cannot show.
  const [lostImages, setLostImages] = useState<Record<Lang, boolean>>({ vi: false, en: false });
  const [tab, setTab] = useState<Lang>("vi");
  // A slug follows its title while it is empty and the story has no saved slug in that language.
  // Editing the slug by hand to something else turns this off.
  const [followTitle, setFollowTitle] = useState<Record<Lang, boolean>>(() => ({
    vi: initial?.slug.vi == null,
    en: initial?.slug.en == null,
  }));
  const [conflicts, setConflicts] = useState<SlugConflicts>(NO_CONFLICTS);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [askUnpublish, setAskUnpublish] = useState(false);
  // The box "Quay lại sửa" moves to, once its tab is shown. A ref plus a counter: the effect reads it without a state update.
  const fix = useRef<FixTarget | null>(null);
  const [fixRequests, setFixRequests] = useState(0);
  const fields = useFieldErrors();
  const coverRef = useRef<HTMLFieldSetElement>(null);
  // True after a create succeeded, until the page changes: no second tap may create the story again.
  const [leaving, setLeaving] = useState(false);
  const dirty = snapshot(state) !== snapshot(baselineState);
  const { user } = useAdminSession();
  // The saved story as the API sent it. The baseline state may hold the editor's own form of the body.
  const rawBase = useMemo(() => stateFrom(baseline), [baseline]);
  const draft = useStoryDraft({
    storyId: initial?.id,
    userId: user?.id ?? null,
    state,
    base: rawBase,
    dirty,
    // After a create the page goes to the new story: the "new" draft must not be written again.
    enabled: !leaving,
    isState: isFormState,
  });
  // While the draft is kept on this phone, the "Rời trang?" question says so instead of "will be lost".
  useUnsavedChanges(dirty && !leaving, { keepsDraft: draft.keeping });
  const leavePage = useLeavePage();

  // The newest state, for the save action: after a sign-in again the action runs once more and must send what is typed now.
  const latestState = useRef(state);
  useLayoutEffect(() => {
    latestState.current = state;
  });

  const saving = useSave(async () => {
    const sent = latestState.current;
    const body = toRequest(sent);
    try {
      const saved =
        baseline === undefined
          ? await adminFetch<StoryAdminDto>("/admin/stories", { method: "POST", body })
          : await adminFetch<StoryAdminDto>(`/admin/stories/${baseline.id}`, { method: "PUT", body });
      return { saved, sent };
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 409) {
        const langs = await conflictingLangs(sent, baseline);
        setConflicts({ vi: langs.includes("vi") ? error.detail : null, en: langs.includes("en") ? error.detail : null });
        setTab(langs[0]);
      }
      throw error;
    }
  }, {
    onError: (error) => {
      const keys = Object.keys(mapApiDetail(error.detail, FIELD_RULES).errors);
      if (keys.length === 0) return;
      // The box may be on the other tab: show that tab first (Vietnamese when both), then the cursor moves there.
      setTab(keys.some((key) => key.endsWith(".vi")) ? "vi" : "en");
      fields.showApi(error.detail, FIELD_RULES);
    },
  });
  const publishing = useSave(() => adminFetch<StoryAdminDto>(`/admin/stories/${baseline?.id}/publish`, { method: "POST" }), {
    successMessage: "Đã đăng bài.",
  });
  const unpublishing = useSave(
    () => adminFetch<StoryAdminDto>(`/admin/stories/${baseline?.id}/unpublish`, { method: "POST" }),
    { successMessage: "Đã gỡ bài." },
  );
  const busy = saving.pending || publishing.pending || unpublishing.pending || leaving;

  async function save() {
    setConflicts(NO_CONFLICTS);
    if (latestState.current.vi.title.trim() === "") {
      saving.reset();
      setTab("vi");
      fields.show({ "title.vi": TITLE_MISSING_MESSAGE });
      return;
    }
    fields.reset();
    const result = await saving.save();
    if (result === undefined) return;
    const { saved, sent } = result;
    // The story is on the server now: its draft goes. Text typed during the save is still unsaved, so clear()
    // makes the hook write it again a moment later.
    draft.clear();
    if (baseline === undefined) {
      setLeaving(true);
      leavePage(() => router.replace(`${ADMIN_ROUTES.stories}/${saved.id}`));
      return;
    }
    const fresh = stateFrom(saved);
    setBaseline(saved);
    setState((current) => mergeSaved(current, sent, fresh));
    setBaselineState(fresh);
    setLostImages({ vi: false, en: false });
    // A slug the story has now is an existing slug: it no longer follows the title.
    setFollowTitle((current) => ({ vi: current.vi && saved.slug.vi == null, en: current.en && saved.slug.en == null }));
  }

  async function changeStatus(action: typeof publishing) {
    const result = await action.save();
    if (result === undefined) return;
    // Only the status changes here. The form text is left as it is: the user may have typed meanwhile.
    setBaseline((current) =>
      current === undefined ? current : { ...current, status: result.status, publishedAt: result.publishedAt },
    );
  }

  function cancel() {
    const original = stateFrom(baseline);
    setState(original);
    setBaselineState(original);
    setFollowTitle({ vi: baseline?.slug.vi == null, en: baseline?.slug.en == null });
    setConflicts(NO_CONFLICTS);
    saving.reset();
    fields.reset();
    draft.clear();
  }

  /** "Khôi phục": the kept text goes into the form, unsaved, on top of the saved story. */
  function restoreDraft() {
    const kept = draft.restore();
    if (kept === null) return;
    setState(kept);
    setConflicts(NO_CONFLICTS);
    fields.reset();
    setFollowTitle({
      vi: baseline?.slug.vi == null && kept.vi.slug === slugify(kept.vi.title),
      en: baseline?.slug.en == null && kept.en.slug === slugify(kept.en.title),
    });
  }

  /** "Quay lại sửa" in the check panel: go to the first part that is missing. */
  function fixFirstGap() {
    if (baseline === undefined) return;
    const gap = publishChecks(baseline).find((check) => !check.ok);
    if (gap === undefined) return;
    if (gap.key === "cover") {
      const button = coverRef.current?.querySelector<HTMLElement>("button");
      button?.scrollIntoView?.({ block: "center" });
      button?.focus({ preventScroll: true });
      return;
    }
    const targets: Record<Exclude<PublishCheckKey, "cover">, FixTarget> = {
      title: { lang: "vi", box: "title" },
      excerpt: { lang: "vi", box: "excerpt" },
      body: { lang: "vi", box: "body" },
      en: {
        lang: "en",
        box: state.en.title.trim() === "" ? "title" : state.en.excerpt.trim() === "" ? "excerpt" : "body",
      },
    };
    const target = targets[gap.key];
    fix.current = target;
    setTab(target.lang);
    setFixRequests((count) => count + 1);
  }

  function patchLang(lang: Lang, change: Partial<LangFields>) {
    setState((current) => ({ ...current, [lang]: { ...current[lang], ...change } }));
    if (change.title !== undefined) fields.clear(`title.${lang}`);
    // "Tiêu đề bài viết (tiếng Anh) ... khi đã có nội dung tiếng Anh" may no longer hold once English text changes.
    if (lang === "en" && Object.keys(change).some((key) => key !== "title")) fields.clear("title.en");
    if (change.slug !== undefined) setConflicts((current) => ({ ...current, [lang]: null }));
  }

  /**
   * The editor wrote the body in its own form when it opened. If the box still holds the API value, both the box
   * and the saved baseline take the new form, so an untouched story is not "changed". If the editor dropped an
   * image, nothing is replaced and the writer is warned: the stored body stays until the body is really edited.
   */
  function bodyNormalized(lang: Lang, html: string, from: string) {
    const take = (current: FormState): FormState =>
      current[lang].bodyHtml === from ? { ...current, [lang]: { ...current[lang], bodyHtml: html } } : current;
    if (countImages(html) < countImages(from)) {
      // The stored body is kept as it is: it is sent again until the writer edits the body, so no image is lost silently.
      setLostImages((current) => ({ ...current, [lang]: true }));
      return;
    }
    setState(take);
    setBaselineState(take);
  }

  function changeTitle(lang: Lang, title: string) {
    patchLang(lang, followTitle[lang] ? { title, slug: slugify(title) } : { title });
  }

  function changeSlug(lang: Lang, slug: string) {
    patchLang(lang, { slug });
    // An emptied box follows the title again, but only for a story that has no saved slug in this language.
    setFollowTitle((current) => ({ ...current, [lang]: slug.trim() === "" && baseline?.slug[lang] == null }));
  }

  const saved = baseline !== undefined;
  const published = baseline?.status === "PUBLISHED";
  const statusBlocked = busy || dirty;
  // While a new story is created the fields cannot change: the page goes to the new story and would lose the text.
  const locked = baseline === undefined && (saving.pending || leaving);
  // A slug conflict is shown under the slug box; other errors that name a field under that field.
  const saveError =
    saving.error?.status === 409 ? null : [apiRest(saving.error, FIELD_RULES), ...fields.unshown].filter(Boolean).join(" ") || null;

  // After the tab of a "Quay lại sửa" target is shown, the cursor goes into its box.
  useEffect(() => {
    const wanted = fix.current;
    if (fixRequests === 0 || wanted === null || wanted.lang !== tab) return;
    function focusBox(): boolean {
      if (wanted === null) return true;
      const box = document.querySelector<HTMLElement>(`[data-fix="${wanted.lang}-${wanted.box}"]`);
      if (box === null) return false;
      const target = box.matches("input, textarea") ? box : (box.querySelector<HTMLElement>("[contenteditable]") ?? box);
      target.scrollIntoView?.({ block: "center" });
      target.focus({ preventScroll: true });
      return true;
    }
    if (focusBox()) {
      fix.current = null;
      return;
    }
    // The panel of a tab that was just chosen appears one render later (Radix Presence).
    const retry = setTimeout(() => {
      focusBox();
      fix.current = null;
    }, 0);
    return () => clearTimeout(retry);
  }, [fixRequests, tab]);

  return (
    <div className="flex flex-col gap-6 p-4 pb-44">
      <section aria-label="Trạng thái" className="flex flex-col gap-3 rounded-md border p-3">
        <div className="flex flex-wrap items-center gap-2">
          {saved ? (
            published ? (
              <Badge variant="outline">Đã đăng</Badge>
            ) : (
              <Badge variant="secondary">Nháp</Badge>
            )
          ) : (
            <Badge variant="secondary">Bài mới</Badge>
          )}
          {published && baseline?.publishedAt != null ? (
            <span className="text-sm text-muted-foreground">Đăng ngày {formatDate(baseline.publishedAt)}</span>
          ) : null}
          {baseline?.missingEn ? <MissingEnBadge /> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {saved ? (
            published ? (
              <Button type="button" variant="outline" disabled={statusBlocked} onClick={() => setAskUnpublish(true)}>
                Gỡ bài
              </Button>
            ) : (
              <Button type="button" disabled={statusBlocked} onClick={() => setChecking(true)}>
                Đăng bài
              </Button>
            )
          ) : null}
          <Button type="button" variant="outline" disabled={!saved || dirty || busy} onClick={() => setPreviewOpen(true)}>
            Xem trước
          </Button>
        </div>
        {!saved ? <p className="text-sm text-muted-foreground">Hãy lưu bài trước khi đăng.</p> : null}
        {saved && dirty ? (
          <p className="text-sm text-muted-foreground">Hãy lưu thay đổi trước khi đăng hoặc gỡ bài.</p>
        ) : null}
        {!saved || dirty ? <p className="text-sm text-muted-foreground">Hãy lưu trước khi xem trước.</p> : null}
        {draft.failed ? (
          <p className="text-sm text-muted-foreground">Máy này không lưu tạm được bài đang viết. Hãy bấm Lưu thường xuyên.</p>
        ) : null}
        <ProblemMessage error={publishing.error ?? unpublishing.error} />
      </section>

      <RequiredNote />

      <fieldset ref={coverRef} disabled={locked} className="min-w-0">
        <SingleImageSection
          label="Ảnh bìa"
          mediaId={state.coverMediaId}
          onChange={(coverMediaId) => setState((current) => ({ ...current, coverMediaId }))}
        />
      </fieldset>

      <Tabs {...fields.rootProps} value={tab} onValueChange={(next) => setTab(next as Lang)}>
        <TabsList className="w-full">
          <TabsTrigger value="vi">Tiếng Việt</TabsTrigger>
          <TabsTrigger value="en">English</TabsTrigger>
        </TabsList>
        {LANGS.map((lang) => (
          <TabsContent key={lang} value={lang} className="flex flex-col gap-5 pt-3">
            <LangPanel
              lang={lang}
              fields={state[lang]}
              slugError={conflicts[lang]}
              titleError={fields.errors[`title.${lang}`]}
              readOnly={locked}
              lostImages={lostImages[lang]}
              onNormalized={(html, from) => bodyNormalized(lang, html, from)}
              onTitle={(title) => changeTitle(lang, title)}
              onSlug={(slug) => changeSlug(lang, slug)}
              onExcerpt={(excerpt) => patchLang(lang, { excerpt })}
              onBody={(bodyHtml) => patchLang(lang, { bodyHtml })}
            />
          </TabsContent>
        ))}
      </Tabs>

      <ProblemMessage message={saveError} />

      <SaveBar
        dirty={dirty}
        pending={busy}
        onSave={() => void save()}
        onDiscard={cancel}
        notice={fields.hasErrors ? NOT_SAVED_NOTICE : null}
      />
      {draft.offer !== null ? (
        <DraftRestoreDialog
          savedAt={draft.offer.draft.savedAt}
          stale={draft.offer.stale}
          onRestore={restoreDraft}
          onDiscard={draft.discard}
          onLater={draft.later}
        />
      ) : null}
      {baseline !== undefined ? (
        <>
          <StoryPreview story={baseline} open={previewOpen} onOpenChange={setPreviewOpen} />
          <PublishCheckDialog
            open={checking}
            onOpenChange={setChecking}
            checks={publishChecks(baseline)}
            onPublish={() => void changeStatus(publishing)}
            onFix={fixFirstGap}
          />
          <ConfirmDialog
            open={askUnpublish}
            onOpenChange={setAskUnpublish}
            title="Gỡ bài khỏi website?"
            description="Người đọc sẽ không thấy bài này nữa. Bài vẫn được giữ ở đây và bạn có thể đăng lại."
            confirmLabel="Gỡ bài"
            cancelLabel="Không gỡ"
            destructive
            onConfirm={() => void changeStatus(unpublishing)}
          />
        </>
      ) : null}
    </div>
  );
}

type PanelProps = {
  lang: Lang;
  fields: LangFields;
  slugError: string | null;
  titleError?: string | null;
  readOnly: boolean;
  lostImages: boolean;
  onNormalized(html: string, from: string): void;
  onTitle(title: string): void;
  onSlug(slug: string): void;
  onExcerpt(excerpt: string): void;
  onBody(html: string): void;
};

function LangPanel({
  lang,
  fields,
  slugError,
  titleError,
  readOnly,
  lostImages,
  onNormalized,
  onTitle,
  onSlug,
  onExcerpt,
  onBody,
}: PanelProps) {
  const id = useId();
  // Only the Vietnamese title is required. The English one is needed once English text exists; the API says so.
  const required = lang === "vi";
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-title`}>
          Tiêu đề
          {required ? <RequiredMark /> : null}
        </Label>
        <Input
          id={`${id}-title`}
          readOnly={readOnly}
          required={required}
          data-fix={`${lang}-title`}
          value={fields.title}
          {...invalidProps(`${id}-title`, titleError)}
          onChange={(event) => onTitle(event.target.value)}
        />
        <FieldError id={`${id}-title`} message={titleError} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-slug`}>Đường dẫn</Label>
        <Input
          id={`${id}-slug`}
          value={fields.slug}
          readOnly={readOnly}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="tu-dong-tao-tu-tieu-de"
          aria-invalid={slugError !== null}
          aria-describedby={slugError === null ? undefined : `${id}-slug-error`}
          onChange={(event) => onSlug(event.target.value)}
        />
        {slugError !== null ? (
          <p id={`${id}-slug-error`} role="alert" className="text-sm text-destructive">
            {slugError}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-excerpt`}>Tóm tắt</Label>
        <Textarea id={`${id}-excerpt`} data-fix={`${lang}-excerpt`} rows={3} readOnly={readOnly} value={fields.excerpt} onChange={(event) => onExcerpt(event.target.value)} />
      </div>
      <div data-fix={`${lang}-body`} className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Nội dung</span>
        {lostImages ? (
          <p role="status" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            Có ảnh không hiển thị được trong trình soạn thảo và sẽ bị xóa nếu bạn lưu.
          </p>
        ) : null}
        <RichTextEditor
          lang={lang}
          value={fields.bodyHtml}
          onChange={onBody}
          onNormalized={onNormalized}
          readOnly={readOnly}
        />
      </div>
    </>
  );
}
