"use client";

import { useId, useLayoutEffect, useRef, useState, type ClipboardEvent } from "react";
import { BilingualField } from "@/components/admin/form/BilingualField";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { toRequestText } from "@/lib/admin/localized";
import { useAdminSession } from "@/lib/admin/session";
import type { LocalizedText, PressMentionAdminDto, PressMentionRequest, PressPreviewDto } from "@/lib/admin/types";
import { useMediaByIds } from "@/lib/admin/use-media-by-ids";
import { useSave } from "@/lib/admin/use-save";
import { useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";
import { withReLogin } from "@/lib/admin/with-relogin";

const NOTHING_READ_MESSAGE = "Không đọc được thông tin từ trang này. Hãy tự nhập.";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMPTY_TEXT: LocalizedText = { vi: null, en: null };

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

/**
 * The request body. A blank English title and a blank date are `null`. `sortOrder` is left out:
 * a new mention goes last and an edited one stays.
 */
function toRequest(state: FormState): PressMentionRequest {
  const url = state.url.trim();
  const sourceName = state.sourceName.trim();
  if (url === "") throw new AdminApiError(400, "Hãy nhập đường dẫn bài báo.");
  if (sourceName === "") throw new AdminApiError(400, "Hãy nhập tên báo.");
  const title = toRequestText(state.title);
  if (title.vi === null) throw new AdminApiError(400, "Hãy nhập tiêu đề tiếng Việt.");
  const publishedOn = state.publishedOn.trim();
  return { url, sourceName, publishedOn: publishedOn === "" ? null : publishedOn, title, mediaId: state.mediaId };
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
  });
  const deleting = useSave(
    async () => {
      await adminFetch<void>(`/admin/press/${initial?.id}`, { method: "DELETE" });
      return true;
    },
    { successMessage: "Đã xóa bài báo." },
  );

  const busy = saving.pending || deleting.pending || leaving;
  const canSave =
    !busy && !isBlank(state.url) && !isBlank(state.sourceName) && !isBlank(state.title.vi) && (initial === undefined || dirty);
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
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => (open ? undefined : requestClose())}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{initial === undefined ? "Thêm bài báo" : "Sửa bài báo"}</DialogTitle>
            <DialogDescription>Bài báo hiện trong mục Báo chí của website.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={urlId}>Đường dẫn bài báo</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id={urlId}
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  value={state.url}
                  onChange={(e) => patch({ url: e.target.value })}
                  onPaste={onPaste}
                  placeholder="https://"
                />
                <Button type="button" variant="outline" disabled={busy || trimmedUrl === ""} onClick={() => void readPage(state.url)}>
                  Lấy thông tin
                </Button>
              </div>
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
                Tên báo<span aria-hidden> *</span>
              </Label>
              <Input id={sourceId} type="text" required value={state.sourceName} onChange={(e) => patch({ sourceName: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={dateId}>Ngày đăng</Label>
              <Input id={dateId} type="date" value={state.publishedOn} onChange={(e) => patch({ publishedOn: e.target.value })} />
            </div>
            <BilingualField label="Tiêu đề" value={state.title} onChange={(title) => patch({ title })} viRequired />
            <ImageSection mediaId={state.mediaId} onChange={(mediaId) => patch({ mediaId })} />

            <ProblemMessage error={saving.error ?? deleting.error} />

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
          </div>
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

function ImageSection({ mediaId, onChange }: { mediaId: number | null; onChange(mediaId: number | null): void }) {
  const ids = mediaId === null ? [] : [mediaId];
  const { items } = useMediaByIds(ids);
  const media = items.find((item) => item.id === mediaId);
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-2 text-base font-semibold">Ảnh</legend>
      {mediaId !== null ? (
        <div className="flex items-center gap-2 rounded-md border p-2">
          {media !== undefined ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.url}
              alt={media.altVi ?? ""}
              width={media.width}
              height={media.height}
              className="size-16 rounded object-cover"
            />
          ) : (
            <span className="size-16 rounded bg-muted" aria-hidden />
          )}
          <span className="min-w-0 flex-1 truncate text-sm">{media?.altVi ?? `Ảnh số ${mediaId}`}</span>
          <Button type="button" variant="outline" onClick={() => onChange(null)}>
            Bỏ ảnh
          </Button>
        </div>
      ) : null}
      <MediaPicker mode="single" value={ids} onChange={(next) => onChange(next[0] ?? null)} />
    </fieldset>
  );
}
