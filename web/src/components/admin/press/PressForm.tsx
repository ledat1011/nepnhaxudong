"use client";

import { useId, useLayoutEffect, useRef, useState, type ClipboardEvent } from "react";
import { BilingualField } from "@/components/admin/form/BilingualField";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";
import { FieldError, NotSavedNotice, RequiredMark, RequiredNote } from "@/components/admin/form/FieldError";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { SingleImageSection } from "@/components/admin/media/SingleImageSection";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { fieldOfDetail, invalidProps, langOfDetail, type FieldErrors, type FieldRule } from "@/lib/admin/field-errors";
import { toRequestText } from "@/lib/admin/localized";
import { useAdminSession } from "@/lib/admin/session";
import type { LocalizedText, PressMentionAdminDto, PressMentionRequest, PressPreviewDto } from "@/lib/admin/types";
import { useFieldErrors } from "@/lib/admin/use-field-errors";
import { useSave } from "@/lib/admin/use-save";
import { useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";
import { withReLogin } from "@/lib/admin/with-relogin";

const NOTHING_READ_MESSAGE = "Không đọc được thông tin từ trang này. Hãy tự nhập.";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMPTY_TEXT: LocalizedText = { vi: null, en: null };

/** The API messages that name a field of this form (see `PressService`). */
const FIELD_RULES: FieldRule[] = [
  { prefix: "Đường dẫn bài báo", field: "url" },
  { prefix: "Tên báo", field: "sourceName" },
  { prefix: "Tiêu đề bài báo", field: (detail) => `title.${langOfDetail(detail)}` },
];

type FormState = {
  url: string;
  sourceName: string;
  /** `yyyy-mm-dd`, the value of a date box, or "". */
  publishedOn: string;
  title: LocalizedText;
  mediaId: number | null;
};

function stateFrom(item: PressMentionAdminDto | undefined): FormState {
  if (item === undefined) return { url: "", sourceName: "", publishedOn: "", title: EMPTY_TEXT, mediaId: null };
  return {
    url: item.url,
    sourceName: item.sourceName,
    publishedOn: item.publishedOn ?? "",
    title: item.title,
    mediaId: item.mediaId,
  };
}

function isBlank(text: string | null): boolean {
  return (text ?? "").trim() === "";
}

/** True for an address that is safe to open in a new tab: only http and https. */
function isHttpUrl(text: string): boolean {
  try {
    const { protocol } = new URL(text);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** The required boxes that are empty. The API checks the rest, such as the form of the link. */
function check(state: FormState): FieldErrors {
  const errors: Record<string, string> = {};
  if (isBlank(state.url)) errors.url = "Hãy nhập đường dẫn bài báo.";
  if (isBlank(state.sourceName)) errors.sourceName = "Hãy nhập tên báo.";
  if (isBlank(state.title.vi)) errors["title.vi"] = "Hãy nhập tiêu đề tiếng Việt.";
  return errors;
}

/**
 * The request body. A blank English title and a blank date are `null`. `sortOrder` is left out:
 * a new mention goes last and an edited one stays.
 */
function toRequest(state: FormState): PressMentionRequest {
  const publishedOn = state.publishedOn.trim();
  return {
    url: state.url.trim(),
    sourceName: state.sourceName.trim(),
    publishedOn: publishedOn === "" ? null : publishedOn,
    title: toRequestText(state.title),
    mediaId: state.mediaId,
  };
}

/** Puts the preview into the boxes that are empty now. A box with text is never changed. */
function withPreview(current: FormState, preview: PressPreviewDto): FormState {
  const title = preview.title?.trim() ?? "";
  const source = preview.sourceName?.trim() ?? "";
  const date = preview.publishedOn?.trim() ?? "";
  return {
    ...current,
    title: isBlank(current.title.vi) && title !== "" ? { ...current.title, vi: title } : current.title,
    sourceName: isBlank(current.sourceName) && source !== "" ? source : current.sourceName,
    publishedOn: isBlank(current.publishedOn) && ISO_DATE.test(date) ? date : current.publishedOn,
  };
}

function hasNothing(preview: PressPreviewDto): boolean {
  return isBlank(preview.title) && isBlank(preview.sourceName) && !ISO_DATE.test(preview.publishedOn?.trim() ?? "");
}

type Props = {
  /** The mention to edit. Without it the form creates a new mention. */
  initial?: PressMentionAdminDto;
  onClose(): void;
  /** Called after a create, an update or a delete succeeded, so the list can load again. */
  onChanged(): void;
};

/** A dialog to create, edit or delete one press mention, with a button that reads the article page. */
export function PressForm({ initial, onClose, onChanged }: Props) {
  const { requireReLogin } = useAdminSession();
  const urlId = useId();
  const sourceId = useId();
  const dateId = useId();
  const [state, setState] = useState<FormState>(() => stateFrom(initial));
  const [baseline] = useState(() => JSON.stringify(stateFrom(initial)));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // True after a save or delete succeeded, until the dialog closes: no second tap may write again.
  const [leaving, setLeaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<AdminApiError | null>(null);
  const [nothingRead, setNothingRead] = useState(false);
  const dirty = JSON.stringify(state) !== baseline;
  useUnsavedChanges(dirty && !leaving);
  const fields = useFieldErrors();

  // Each preview gets a number. Only the newest one may change the form, and only while the link is still the same.
  const latestPreview = useRef(0);
  const latestUrl = useRef(state.url.trim());
  useLayoutEffect(() => {
    latestUrl.current = state.url.trim();
  });

  const saving = useSave(async () => {
    const body = toRequest(state);
    return initial === undefined
      ? adminFetch<PressMentionAdminDto>("/admin/press", { method: "POST", body })
      : adminFetch<PressMentionAdminDto>(`/admin/press/${initial.id}`, { method: "PUT", body });
  }, {
    onError: (error) => {
      const field = fieldOfDetail(error.detail, FIELD_RULES);
      if (field !== null) fields.show({ [field]: error.detail });
    },
  });
  const deleting = useSave(
    async () => {
      await adminFetch<void>(`/admin/press/${initial?.id}`, { method: "DELETE" });
      return true;
    },
    { successMessage: "Đã xóa bài báo." },
  );

  const busy = saving.pending || deleting.pending || leaving;
  // Lưu stays on for a new mention even when boxes are empty: pressing it shows what is missing.
  const canSave = !busy && (initial === undefined || dirty);
  const saveError = saving.error !== null && fieldOfDetail(saving.error.detail, FIELD_RULES) === null ? saving.error : null;
  const trimmedUrl = state.url.trim();

  async function readPage(raw: string) {
    const url = raw.trim();
    if (url === "") return;
    const number = latestPreview.current + 1;
    latestPreview.current = number;
    setPreviewing(true);
    setPreviewError(null);
    setNothingRead(false);
    let preview: PressPreviewDto | null = null;
    let failure: AdminApiError | null = null;
    try {
      preview = await withReLogin(
        () => adminFetch<PressPreviewDto>("/admin/press/preview", { method: "POST", body: { url } }),
        requireReLogin,
      );
    } catch (error) {
      failure = error instanceof AdminApiError ? error : new AdminApiError(0, GENERIC_ERROR_MESSAGE);
    }
    if (latestPreview.current !== number) return;
    setPreviewing(false);
    // The link changed while the page was read: the answer is about another page.
    if (latestUrl.current !== url) return;
    if (failure !== null) {
      setPreviewError(failure);
      return;
    }
    if (preview === null) return;
    if (hasNothing(preview)) setNothingRead(true);
    // The boxes are checked here, when the answer arrives, because the user may have typed meanwhile.
    const answer = preview;
    setState((current) => withPreview(current, answer));
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const box = event.currentTarget;
    // The pasted text is in the box only after this event, so read it a moment later.
    setTimeout(() => void readPage(box.value), 0);
  }

  async function save() {
    const problems = check(state);
    if (Object.keys(problems).length > 0) {
      saving.reset();
      fields.show(problems);
      return;
    }
    fields.reset();
    if ((await saving.save()) === undefined) return;
    setLeaving(true);
    onChanged();
  }

  async function remove() {
    if (await deleting.save()) {
      setLeaving(true);
      onChanged();
    }
  }

  function requestClose() {
    if (busy) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  }

  function patch(change: Partial<FormState>) {
    setState((current) => ({ ...current, ...change }));
    fields.clear(...Object.keys(change).flatMap((key) => [key, `${key}.`]));
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => (open ? undefined : requestClose())}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{initial === undefined ? "Thêm bài báo" : "Sửa bài báo"}</DialogTitle>
            <DialogDescription>Bài báo hiện trong mục Báo chí của website.</DialogDescription>
          </DialogHeader>
          {/* Nothing can be typed while a save runs: the dialog closes after it and would drop that text. */}
          <fieldset {...fields.rootProps} disabled={busy} className="flex min-w-0 flex-col gap-5">
            <RequiredNote />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={urlId}>
                Đường dẫn bài báo
                <RequiredMark />
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id={urlId}
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  required
                  value={state.url}
                  {...invalidProps(urlId, fields.errors.url)}
                  onChange={(e) => {
                    patch({ url: e.target.value });
                    // The message was about the old link.
                    setPreviewError(null);
                    setNothingRead(false);
                  }}
                  onPaste={onPaste}
                  placeholder="https://"
                />
                <Button type="button" variant="outline" disabled={busy || trimmedUrl === ""} onClick={() => void readPage(state.url)}>
                  Lấy thông tin
                </Button>
              </div>
              <FieldError id={urlId} message={fields.errors.url} />
              {previewing ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Đang đọc trang…
                </p>
              ) : null}
              {nothingRead ? (
                <p role="status" className="text-sm text-muted-foreground">
                  {NOTHING_READ_MESSAGE}
                </p>
              ) : null}
              <ProblemMessage error={previewError} />
              {isHttpUrl(trimmedUrl) ? (
                <Button asChild variant="outline" className="self-start">
                  <a href={trimmedUrl} target="_blank" rel="noopener noreferrer">
                    Mở bài gốc
                  </a>
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={sourceId}>
                Tên báo
                <RequiredMark />
              </Label>
              <Input
                id={sourceId}
                type="text"
                required
                value={state.sourceName}
                {...invalidProps(sourceId, fields.errors.sourceName)}
                onChange={(e) => patch({ sourceName: e.target.value })}
              />
              <FieldError id={sourceId} message={fields.errors.sourceName} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={dateId}>Ngày đăng</Label>
              <Input id={dateId} type="date" value={state.publishedOn} onChange={(e) => patch({ publishedOn: e.target.value })} />
            </div>
            <BilingualField
              label="Tiêu đề"
              value={state.title}
              onChange={(title) => patch({ title })}
              viRequired
              errors={{ vi: fields.errors["title.vi"], en: fields.errors["title.en"] }}
            />
            <SingleImageSection mediaId={state.mediaId} onChange={(mediaId) => patch({ mediaId })} />

            <ProblemMessage error={saveError ?? deleting.error} />
            <NotSavedNotice show={fields.hasErrors} />

            <div className="flex flex-col gap-2">
              <Button type="button" onClick={() => void save()} disabled={!canSave}>
                {saving.pending ? "Đang lưu…" : "Lưu"}
              </Button>
              <Button type="button" variant="outline" onClick={requestClose} disabled={busy}>
                Hủy
              </Button>
              {initial !== undefined ? (
                <Button type="button" variant="destructive" disabled={busy} onClick={() => setConfirmDelete(true)}>
                  Xóa bài báo
                </Button>
              ) : null}
            </div>
          </fieldset>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xóa bài báo này?"
        description="Bài báo sẽ biến mất khỏi website. Bạn có thể khôi phục từ mục Lịch sử."
        confirmLabel="Xóa"
        destructive
        onConfirm={() => void remove()}
      />
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Bỏ thay đổi chưa lưu?"
        description="Những gì bạn vừa nhập sẽ mất."
        confirmLabel="Bỏ thay đổi"
        destructive
        onConfirm={onClose}
      />
    </>
  );
}
