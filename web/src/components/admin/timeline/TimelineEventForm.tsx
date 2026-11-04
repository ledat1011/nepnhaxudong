"use client";

import { useId, useState } from "react";
import { BilingualField } from "@/components/admin/form/BilingualField";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError } from "@/lib/admin/errors";
import { toRequestText } from "@/lib/admin/localized";
import type { LocalizedText, TimelineEventAdminDto, TimelineEventRequest } from "@/lib/admin/types";
import { useMediaByIds } from "@/lib/admin/use-media-by-ids";
import { useSave } from "@/lib/admin/use-save";
import { useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";

/** The API accepts years from 1900 to 2100. */
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const YEAR_RANGE_MESSAGE = "Năm phải nằm trong khoảng 1900 đến 2100.";

const EMPTY_TEXT: LocalizedText = { vi: null, en: null };

type FormState = {
  year: string;
  title: LocalizedText;
  description: LocalizedText;
  mediaId: number | null;
};

function stateFrom(event: TimelineEventAdminDto | undefined): FormState {
  if (event === undefined) return { year: "", title: EMPTY_TEXT, description: EMPTY_TEXT, mediaId: null };
  return { year: String(event.year), title: event.title, description: event.description, mediaId: event.mediaId };
}

/** An integer year in range, or null. */
function parseYear(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const year = Number(trimmed);
  return year >= MIN_YEAR && year <= MAX_YEAR ? year : null;
}

/** The request body. A blank English box is `null`. `sortOrder` is left out: a new event goes last and an edited one stays. */
function toRequest(state: FormState): TimelineEventRequest {
  const year = parseYear(state.year);
  if (year === null) throw new AdminApiError(400, YEAR_RANGE_MESSAGE);
  const title = toRequestText(state.title);
  if (title.vi === null) throw new AdminApiError(400, "Hãy nhập tiêu đề tiếng Việt.");
  return { year, title, description: toRequestText(state.description), mediaId: state.mediaId };
}

type Props = {
  /** The event to edit. Without it the form creates a new event. */
  initial?: TimelineEventAdminDto;
  onClose(): void;
  /** Called after a create, an update or a delete succeeded, so the list can load again. */
  onChanged(): void;
};

/** A dialog to create, edit or delete one timeline event. */
export function TimelineEventForm({ initial, onClose, onChanged }: Props) {
  const yearId = useId();
  const [state, setState] = useState<FormState>(() => stateFrom(initial));
  const [baseline] = useState(() => JSON.stringify(stateFrom(initial)));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // True after a save or delete succeeded, until the dialog closes: no second tap may write again.
  const [leaving, setLeaving] = useState(false);
  const dirty = JSON.stringify(state) !== baseline;
  useUnsavedChanges(dirty && !leaving);

  const saving = useSave(async () => {
    const body = toRequest(state);
    return initial === undefined
      ? adminFetch<TimelineEventAdminDto>("/admin/timeline", { method: "POST", body })
      : adminFetch<TimelineEventAdminDto>(`/admin/timeline/${initial.id}`, { method: "PUT", body });
  });
  const deleting = useSave(
    async () => {
      await adminFetch<void>(`/admin/timeline/${initial?.id}`, { method: "DELETE" });
      return true;
    },
    { successMessage: "Đã xóa mốc." },
  );

  const yearInvalid = state.year.trim() !== "" && parseYear(state.year) === null;
  const titleBlank = toRequestText(state.title).vi === null;
  const busy = saving.pending || deleting.pending || leaving;
  const canSave = !busy && !yearInvalid && parseYear(state.year) !== null && !titleBlank && (initial === undefined || dirty);

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
            <DialogTitle>{initial === undefined ? "Thêm mốc" : "Sửa mốc"}</DialogTitle>
            <DialogDescription>Mốc hiện trên trang Hành trình của website.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={yearId}>Năm</Label>
              <Input
                id={yearId}
                type="text"
                inputMode="numeric"
                value={state.year}
                aria-invalid={yearInvalid}
                onChange={(e) => patch({ year: e.target.value })}
              />
              {yearInvalid ? <p className="text-sm text-destructive">{YEAR_RANGE_MESSAGE}</p> : null}
            </div>
            <BilingualField label="Tiêu đề" value={state.title} onChange={(title) => patch({ title })} viRequired />
            <BilingualField
              label="Mô tả"
              value={state.description}
              onChange={(description) => patch({ description })}
              multiline
            />
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
                  Xóa mốc
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xóa mốc này?"
        description="Mốc sẽ biến mất khỏi website. Bạn có thể khôi phục từ mục Lịch sử."
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
