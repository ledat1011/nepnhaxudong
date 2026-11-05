"use client";

import { Camera, ImageOff } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent, type FocusEvent } from "react";
import { toast } from "sonner";
import { BilingualField } from "@/components/admin/form/BilingualField";
import { Button } from "@/components/admin/ui/button";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { toRequestText } from "@/lib/admin/localized";
import { useAdminSession } from "@/lib/admin/session";
import type { LocalizedText, MediaAdminDto } from "@/lib/admin/types";
import { IMAGE_ACCEPT, checkPickedFile, checkUploadFile, isHeic } from "@/lib/admin/upload-check";
import { uploadWithProgress } from "@/lib/admin/upload-progress";
import { useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";
import { withReLogin } from "@/lib/admin/with-relogin";
import { shrinkImage } from "./shrink-image";

/** Same limit as the API (MediaService.MAX_ALT_LENGTH). */
export const MAX_ALT_LENGTH = 300;

const PICK_LABEL = "Chụp hoặc chọn ảnh";
const HEIC_TIP = "Trên iPhone, vào Cài đặt, Camera, Định dạng, chọn Tương thích nhất, rồi chụp lại.";
const STOPPED_MESSAGE = "Đã dừng tải ảnh này.";
const EMPTY_ALT: LocalizedText = { vi: null, en: null };
/**
 * Leaving a photo's boxes sends it after this pause. A tap on a button of the same photo (on an iPhone a tap does not
 * focus the button, so the boxes lose focus to nothing) cancels it: that button's own action decides.
 */
const LEAVE_DELAY_MS = 400;

type Phase = "preparing" | "waiting" | "sending" | "failed";

type Item = {
  key: number;
  /** "Ảnh 1", "Ảnh 2"…: given when the photo is picked and kept, so a number does not move while the user types. */
  number: number;
  original: File;
  /** The file to send, after shrinking. `null` while the photo is prepared. */
  file: File | null;
  /** A small thumbnail made while shrinking; `null` before that, or when the browser cannot read the photo. */
  previewUrl: string | null;
  alt: LocalizedText;
  phase: Phase;
  /** The user is done with this photo (left its boxes, or pressed a button). It is sent when its turn comes. */
  requested: boolean;
  progress: number;
  error: string | null;
  /** The file itself cannot be sent (not an image, too large): no boxes and no Thử lại. */
  blocked: boolean;
  tip: string | null;
};

type Props = {
  /** Many photos at once (the library). A single-image field takes one. */
  multiple?: boolean;
  onUploaded(media: MediaAdminDto): void;
  /** True while a picked photo is not uploaded yet (waiting for text, going up, or failed). */
  onPendingChange?(pending: boolean): void;
  /** The list is empty again and at least one photo went up; `count` is how many. */
  onAllDone?(count: number): void;
};

function described(alt: LocalizedText): boolean {
  const request = toRequestText(alt);
  return request.vi !== null && request.en !== null;
}

function blank(alt: LocalizedText): boolean {
  const request = toRequestText(alt);
  return request.vi === null && request.en === null;
}

function missingText(alt: LocalizedText): string {
  const request = toRequestText(alt);
  if (request.vi === null && request.en === null) return "Cần mô tả tiếng Việt và tiếng Anh để tải lên.";
  return request.vi === null ? "Cần mô tả tiếng Việt để tải lên." : "Cần mô tả tiếng Anh để tải lên.";
}

/** Still being worked on: shrinking, going up, or queued to go up. A failed or untouched photo is not. */
function active(item: Item): boolean {
  return item.phase === "preparing" || item.phase === "sending" || (item.phase === "waiting" && item.requested);
}

/** A photo that "Dùng mô tả này" may fill: both boxes empty, and free to change. */
function copyTarget(item: Item): boolean {
  return !item.blocked && item.phase !== "sending" && blank(item.alt);
}

/**
 * The upload box. One big button opens the phone's own choice of camera or gallery (`accept="image/*"`, no
 * `capture`). Every chosen photo:
 * 1. is made smaller in the browser, one photo at a time (see `shrinkImage`), with a small thumbnail as its preview;
 * 2. gets its own description boxes, and says which text is still missing (the API needs both languages);
 * 3. goes up when both texts are there and the user leaves its boxes, or presses Tải lên. One photo goes up at a
 *    time, with its own progress and a Dừng button; a failed one keeps its text and offers Thử lại and Bỏ ảnh này.
 */
export function MediaUploader({ multiple = false, onUploaded, onPendingChange, onAllDone }: Props) {
  const { requireReLogin } = useAdminSession();
  const [items, setItems] = useState<Item[]>([]);
  const [sendingKey, setSendingKey] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  const nextKey = useRef(1);
  const nextNumber = useRef(1);
  /** Photos that went up since the list was last empty (for onAllDone), and since the last toast. */
  const batchUploaded = useRef(0);
  const untoasted = useRef(0);
  const sending = useRef<{ key: number; controller: AbortController; stopped: boolean } | null>(null);
  const preparing = useRef<Promise<void>>(Promise.resolve());
  const leaveTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const pointerAt = useRef(new Map<number, number>());
  const mounted = useRef(true);
  const urls = useRef(new Set<string>());
  const callbacks = useRef({ onUploaded, onAllDone, onPendingChange });

  useLayoutEffect(() => {
    itemsRef.current = items;
    callbacks.current = { onUploaded, onAllDone, onPendingChange };
  });

  const pending = items.length > 0;
  useUnsavedChanges(pending);
  useEffect(() => {
    callbacks.current.onPendingChange?.(pending);
  }, [pending]);

  useEffect(() => {
    const created = urls.current;
    const timers = leaveTimers.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      sending.current?.controller.abort();
      for (const timer of timers.values()) clearTimeout(timer);
      for (const url of created) URL.revokeObjectURL(url);
      created.clear();
    };
  }, []);

  const forget = useCallback((url: string | null) => {
    if (url === null || !urls.current.has(url)) return;
    URL.revokeObjectURL(url);
    urls.current.delete(url);
  }, []);

  const update = useCallback((key: number, change: (item: Item) => Item) => {
    setItems((current) => current.map((item) => (item.key === key ? change(item) : item)));
  }, []);

  /** Shows the toast once nothing is going on any more, and tells the parent when the list is empty again. */
  const settle = useCallback((left: Item[]) => {
    if (!left.some(active) && untoasted.current > 0) {
      const count = untoasted.current;
      untoasted.current = 0;
      toast.success(count === 1 ? "Đã tải ảnh lên." : `Đã tải lên ${count} ảnh.`);
    }
    if (left.length === 0 && batchUploaded.current > 0) {
      const count = batchUploaded.current;
      batchUploaded.current = 0;
      callbacks.current.onAllDone?.(count);
    }
  }, []);

  const prepare = useCallback(
    async (key: number, original: File) => {
      // Skipped when the photo was removed while it waited for its turn.
      if (!mounted.current || !itemsRef.current.some((item) => item.key === key)) return;
      let file = original;
      let thumbnail: Blob | null = null;
      try {
        ({ file, thumbnail } = await shrinkImage(original));
      } catch {
        // The original is sent; the API says what is wrong with it.
      }
      if (!mounted.current || !itemsRef.current.some((item) => item.key === key && item.phase === "preparing")) return;
      const problem = checkUploadFile(file);
      let previewUrl: string | null = null;
      if (thumbnail != null) {
        previewUrl = URL.createObjectURL(thumbnail);
        urls.current.add(previewUrl);
      }
      update(key, (item) =>
        problem === null
          ? { ...item, file, previewUrl, phase: "waiting" }
          : { ...item, file, previewUrl, phase: "failed", blocked: true, error: problem, requested: false },
      );
    },
    [update],
  );

  function onFilesChosen(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, multiple ? undefined : 1);
    // Cleared, so choosing the same photo again still fires a change.
    event.target.value = "";
    if (files.length === 0) return;
    // One photo only: a new choice replaces the one that waits. (The button is off while a photo goes up.)
    if (!multiple) for (const old of itemsRef.current) forget(old.previewUrl);
    if (!multiple || itemsRef.current.length === 0) nextNumber.current = 1;
    const created: Item[] = files.map((original) => {
      const problem = checkPickedFile(original);
      return {
        key: nextKey.current++,
        number: nextNumber.current++,
        original,
        file: null,
        previewUrl: null,
        alt: EMPTY_ALT,
        phase: problem === null ? "preparing" : "failed",
        requested: false,
        progress: 0,
        error: problem,
        blocked: problem !== null,
        tip: null,
      };
    });
    const next = multiple ? [...itemsRef.current, ...created] : created;
    itemsRef.current = next;
    setItems(next);
    // One photo is decoded at a time: ten 12 MP photos at once would not fit in a phone's memory.
    for (const item of created) {
      if (!item.blocked) preparing.current = preparing.current.then(() => prepare(item.key, item.original));
    }
  }

  const send = useCallback(
    async (item: Item) => {
      const job = { key: item.key, controller: new AbortController(), stopped: false };
      sending.current = job;
      setSendingKey(item.key);
      update(item.key, (current) => ({ ...current, phase: "sending", progress: 0, error: null, tip: null }));
      const request = toRequestText(item.alt);
      const form = new FormData();
      form.append("file", item.file as File);
      form.append("altVi", request.vi ?? "");
      form.append("altEn", request.en ?? "");
      try {
        const media = await withReLogin(
          () =>
            uploadWithProgress<MediaAdminDto>("/admin/media", form, {
              signal: job.controller.signal,
              onProgress: (fraction) => update(item.key, (current) => ({ ...current, progress: fraction })),
            }),
          requireReLogin,
        );
        if (!mounted.current) return;
        batchUploaded.current += 1;
        untoasted.current += 1;
        forget(item.previewUrl);
        const left = itemsRef.current.filter((other) => other.key !== item.key);
        itemsRef.current = left;
        setItems((current) => current.filter((other) => other.key !== item.key));
        callbacks.current.onUploaded(media);
        settle(left);
      } catch (failure) {
        if (!mounted.current) return;
        if (job.controller.signal.aborted && !job.stopped) return; // removed: nothing to show
        const error = job.stopped
          ? new AdminApiError(0, STOPPED_MESSAGE)
          : failure instanceof AdminApiError
            ? failure
            : new AdminApiError(0, GENERIC_ERROR_MESSAGE);
        const tip = isHeic(item.original) && error.status === 415 ? HEIC_TIP : null;
        // The proxy refuses a body over its limit; sending the same file again cannot work.
        const blocked = error.status === 413;
        update(item.key, (current) => ({ ...current, phase: "failed", requested: false, error: error.detail, tip, blocked }));
        settle(itemsRef.current.filter((other) => other.key !== item.key));
      } finally {
        if (sending.current === job) sending.current = null;
        if (mounted.current) setSendingKey(null);
      }
    },
    [forget, requireReLogin, settle, update],
  );

  // One photo at a time: the API works on at most two images at once, and a phone on 4G gains nothing from more.
  useEffect(() => {
    if (sendingKey !== null || sending.current !== null) return;
    const next = items.find((item) => item.phase === "waiting" && item.requested && item.file !== null && described(item.alt));
    if (next !== undefined) void send(next);
  }, [items, sendingKey, send]);

  function cancelLeave(key: number) {
    const timer = leaveTimers.current.get(key);
    if (timer !== undefined) clearTimeout(timer);
    leaveTimers.current.delete(key);
  }

  function changeAlt(key: number, alt: LocalizedText) {
    // New text means the user is still writing: the photo waits until they leave its boxes again.
    cancelLeave(key);
    update(key, (item) => ({ ...item, alt, requested: false }));
  }

  function request(key: number) {
    cancelLeave(key);
    // A photo that is still being made smaller is sent as soon as it is ready.
    update(key, (item) =>
      (item.phase === "waiting" || item.phase === "preparing") && described(item.alt) ? { ...item, requested: true } : item,
    );
  }

  function leave(key: number, event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    // A tap on this photo's own buttons (an iPhone does not focus them) is not "leaving".
    if (Date.now() - (pointerAt.current.get(key) ?? 0) < LEAVE_DELAY_MS) return;
    cancelLeave(key);
    leaveTimers.current.set(
      key,
      setTimeout(() => {
        leaveTimers.current.delete(key);
        if (mounted.current) request(key);
      }, LEAVE_DELAY_MS),
    );
  }

  function touched(key: number) {
    pointerAt.current.set(key, Date.now());
    cancelLeave(key);
  }

  function copyText(source: Item) {
    cancelLeave(source.key);
    const text = toRequestText(source.alt);
    setItems((current) =>
      current.map((item) => {
        if (item.key === source.key) return item.phase === "waiting" || item.phase === "preparing" ? { ...item, requested: true } : item;
        // Only photos with no text at all: a half-written pair is the user's own and must not be completed for them.
        if (!copyTarget(item)) return item;
        return { ...item, alt: text, requested: item.phase !== "failed" };
      }),
    );
  }

  function retry(key: number) {
    update(key, (item) => ({ ...item, phase: "waiting", requested: described(item.alt), error: null, tip: null }));
  }

  function stop(key: number) {
    const job = sending.current;
    if (job === null || job.key !== key) return;
    job.stopped = true;
    job.controller.abort();
  }

  function remove(key: number) {
    cancelLeave(key);
    const job = sending.current;
    if (job !== null && job.key === key) job.controller.abort();
    const item = itemsRef.current.find((other) => other.key === key);
    if (item !== undefined) forget(item.previewUrl);
    const left = itemsRef.current.filter((other) => other.key !== key);
    itemsRef.current = left;
    setItems((current) => current.filter((other) => other.key !== key));
    settle(left);
  }

  const busy = sendingKey !== null;
  const sendingItem = items.find((item) => item.key === sendingKey);
  const copyCount = (source: Item) => items.filter((item) => item.key !== source.key && copyTarget(item)).length;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple={multiple}
          aria-label={PICK_LABEL}
          tabIndex={-1}
          className="hidden"
          onChange={onFilesChosen}
        />
        <Button
          type="button"
          size="lg"
          className="h-14 w-full text-base"
          disabled={!multiple && busy}
          onClick={() => inputRef.current?.click()}
        >
          <Camera aria-hidden="true" className="size-6" />
          {PICK_LABEL}
        </Button>
        <p className="text-sm text-muted-foreground">
          {multiple ? "Chọn được nhiều ảnh một lần. " : ""}Ảnh lớn được thu nhỏ trước khi gửi. Mỗi ảnh cần mô tả tiếng Việt
          và tiếng Anh, gõ sau khi chọn ảnh.
        </p>
      </div>
      {/* One line for screen readers and for the eye: which photo is going up now. */}
      <p role="status" className={sendingItem === undefined ? "sr-only" : "text-sm font-medium"}>
        {sendingItem !== undefined ? `Đang tải Ảnh ${sendingItem.number}` : ""}
      </p>
      {items.length > 0 ? (
        <ol className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.key} className="min-w-0 rounded-lg border bg-card p-3">
              <UploadItem
                item={item}
                copyCount={copyCount(item)}
                onAlt={(alt) => changeAlt(item.key, alt)}
                onLeave={(event) => leave(item.key, event)}
                onTouch={() => touched(item.key)}
                onUpload={() => request(item.key)}
                onCopy={() => copyText(item)}
                onRetry={() => retry(item.key)}
                onStop={() => stop(item.key)}
                onRemove={() => remove(item.key)}
              />
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

type ItemProps = {
  item: Item;
  /** How many other photos have no text at all. */
  copyCount: number;
  onAlt(alt: LocalizedText): void;
  onLeave(event: FocusEvent<HTMLElement>): void;
  onTouch(): void;
  onUpload(): void;
  onCopy(): void;
  onRetry(): void;
  onStop(): void;
  onRemove(): void;
};

function UploadItem({ item, copyCount, onAlt, onLeave, onTouch, onUpload, onCopy, onRetry, onStop, onRemove }: ItemProps) {
  const [broken, setBroken] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const sendingNow = item.phase === "sending";
  const ready = described(item.alt);
  const percent = Math.round(item.progress * 100);
  const name = `Ảnh ${item.number}`;

  // The boxes are locked while the photo goes up. Focus that was in them, or on the button that vanished,
  // moves to the photo itself instead of falling back to the top of the page.
  useEffect(() => {
    if (!sendingNow) return;
    const focused = document.activeElement;
    const root = rootRef.current;
    if (root === null) return;
    if (focused === null || focused === document.body || (root.contains(focused) && (focused as HTMLInputElement).disabled)) {
      root.focus({ preventScroll: true });
    }
  }, [sendingNow]);

  return (
    <div
      ref={rootRef}
      role="group"
      aria-labelledby={headingId}
      tabIndex={-1}
      onBlur={onLeave}
      onPointerDown={(event) => {
        // Only a press on a button of this photo: a tap into its boxes is ordinary typing.
        if ((event.target as Element).closest("button") !== null) onTouch();
      }}
      className="flex min-w-0 flex-col gap-3 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <h3 id={headingId} className="text-base font-semibold">
        {name}
      </h3>
      <div className="flex min-w-0 items-start gap-3">
        {item.previewUrl !== null && broken !== item.previewUrl ? (
          // A blob: URL of a small thumbnail made in the browser; next/image cannot optimize it.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.previewUrl}
            alt={`Xem trước ${name.toLowerCase()}`}
            width={80}
            height={80}
            onError={() => setBroken(item.previewUrl)}
            className="size-20 shrink-0 rounded-md border bg-muted object-cover"
          />
        ) : (
          <span className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border bg-muted p-1 text-center text-[13px] leading-tight text-muted-foreground">
            <ImageOff aria-hidden="true" className="size-5" />
            {item.phase === "preparing" ? "Đang chuẩn bị" : "Không xem trước được"}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
          <ItemStatus item={item} ready={ready} percent={percent} />
          {sendingNow ? (
            <div
              role="progressbar"
              aria-label={`Tiến độ tải ${name.toLowerCase()}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
          ) : null}
        </div>
      </div>
      {!item.blocked ? (
        // Locked while the photo goes up: the text that is being sent must not change under it.
        <fieldset disabled={sendingNow} className="min-w-0">
          <BilingualField label="Mô tả ảnh" value={item.alt} onChange={onAlt} maxLength={MAX_ALT_LENGTH} viRequired enRequired />
        </fieldset>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {item.phase === "waiting" && ready && !item.requested ? (
          <Button type="button" onClick={onUpload}>
            Tải lên
          </Button>
        ) : null}
        {sendingNow ? (
          <Button type="button" variant="outline" onClick={onStop}>
            Dừng
          </Button>
        ) : null}
        {item.phase === "failed" && !item.blocked ? (
          <Button type="button" onClick={onRetry} disabled={!ready}>
            Thử lại
          </Button>
        ) : null}
        {ready && copyCount > 0 ? (
          <Button type="button" variant="outline" className="h-auto min-h-11 max-w-full shrink whitespace-normal text-left" onClick={onCopy}>
            Dùng mô tả này cho {copyCount} ảnh chưa có mô tả
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onRemove}>
          Bỏ ảnh này
        </Button>
      </div>
    </div>
  );
}

function ItemStatus({ item, ready, percent }: { item: Item; ready: boolean; percent: number }) {
  if (item.phase === "failed") {
    return (
      <div role="alert" className="flex flex-col gap-1 text-destructive">
        <p className="font-medium">{item.error}</p>
        {item.tip !== null ? <p>{item.tip}</p> : null}
      </div>
    );
  }
  if (item.phase === "sending") return <p className="font-medium">Đang tải lên {percent}%</p>;
  if (item.phase === "preparing") return <p className="text-muted-foreground">Đang thu nhỏ ảnh…</p>;
  if (!ready) return <p className="font-medium">{missingText(item.alt)}</p>;
  if (item.requested) return <p className="text-muted-foreground">Đang chờ tải lên…</p>;
  return <p className="text-muted-foreground">Đã đủ mô tả.</p>;
}
