"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useId, useLayoutEffect, useRef, useState } from "react";
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
import { toRequestText } from "@/lib/admin/localized";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { slugify } from "@/lib/admin/slugify";
import type { StoryAdminDto, StoryRequest } from "@/lib/admin/types";
import { useSave } from "@/lib/admin/use-save";
import { useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";
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
  const [baselineSnapshot, setBaselineSnapshot] = useState(() => snapshot(stateFrom(initial)));
  const [tab, setTab] = useState<Lang>("vi");
  // A slug follows its title while it is empty and the story has no saved slug in that language.
  // Editing the slug by hand to something else turns this off.
  const [followTitle, setFollowTitle] = useState<Record<Lang, boolean>>(() => ({
    vi: initial?.slug.vi == null,
    en: initial?.slug.en == null,
  }));
  const [conflicts, setConflicts] = useState<SlugConflicts>(NO_CONFLICTS);
  const [previewOpen, setPreviewOpen] = useState(false);
  // True after a create succeeded, until the page changes: no second tap may create the story again.
  const [leaving, setLeaving] = useState(false);
  const dirty = snapshot(state) !== baselineSnapshot;
  useUnsavedChanges(dirty && !leaving);

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
    const result = await saving.save();
    if (result === undefined) return;
    const { saved, sent } = result;
    if (baseline === undefined) {
      setLeaving(true);
      router.replace(`${ADMIN_ROUTES.stories}/${saved.id}`);
      return;
    }
    const fresh = stateFrom(saved);
    setBaseline(saved);
    setState((current) => mergeSaved(current, sent, fresh));
    setBaselineSnapshot(snapshot(fresh));
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
    setBaselineSnapshot(snapshot(original));
    setFollowTitle({ vi: baseline?.slug.vi == null, en: baseline?.slug.en == null });
    setConflicts(NO_CONFLICTS);
    saving.reset();
  }

  function patchLang(lang: Lang, change: Partial<LangFields>) {
    setState((current) => ({ ...current, [lang]: { ...current[lang], ...change } }));
    if (change.slug !== undefined) setConflicts((current) => ({ ...current, [lang]: null }));
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
  const saveError = saving.error?.status === 409 ? null : saving.error;

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
              <Button type="button" variant="outline" disabled={statusBlocked} onClick={() => void changeStatus(unpublishing)}>
                Gỡ bài
              </Button>
            ) : (
              <Button type="button" disabled={statusBlocked} onClick={() => void changeStatus(publishing)}>
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
        <ProblemMessage error={publishing.error ?? unpublishing.error} />
      </section>

      <SingleImageSection
        label="Ảnh bìa"
        mediaId={state.coverMediaId}
        onChange={(coverMediaId) => setState((current) => ({ ...current, coverMediaId }))}
      />

      <Tabs value={tab} onValueChange={(next) => setTab(next as Lang)}>
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
              onTitle={(title) => changeTitle(lang, title)}
              onSlug={(slug) => changeSlug(lang, slug)}
              onExcerpt={(excerpt) => patchLang(lang, { excerpt })}
              onBody={(bodyHtml) => patchLang(lang, { bodyHtml })}
            />
          </TabsContent>
        ))}
      </Tabs>

      <ProblemMessage error={saveError} />

      <SaveBar dirty={dirty} pending={busy} onSave={() => void save()} onCancel={cancel} />
      {baseline !== undefined ? <StoryPreview story={baseline} open={previewOpen} onOpenChange={setPreviewOpen} /> : null}
    </div>
  );
}

type PanelProps = {
  lang: Lang;
  fields: LangFields;
  slugError: string | null;
  onTitle(title: string): void;
  onSlug(slug: string): void;
  onExcerpt(excerpt: string): void;
  onBody(html: string): void;
};

function LangPanel({ lang, fields, slugError, onTitle, onSlug, onExcerpt, onBody }: PanelProps) {
  const id = useId();
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-title`}>Tiêu đề</Label>
        <Input id={`${id}-title`} value={fields.title} onChange={(event) => onTitle(event.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-slug`}>Đường dẫn</Label>
        <Input
          id={`${id}-slug`}
          value={fields.slug}
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
        <Textarea id={`${id}-excerpt`} rows={3} value={fields.excerpt} onChange={(event) => onExcerpt(event.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Nội dung</span>
        <RichTextEditor lang={lang} value={fields.bodyHtml} onChange={onBody} />
      </div>
    </>
  );
}
