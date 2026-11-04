"use client";

import { Camera, ImageOff } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FocusEvent } from "react";
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
const EMPTY_ALT: LocalizedText = { vi: null, en: null };

type Phase = "preparing" | "waiting" | "sending" | "failed";

type Item = {
  key: number;
  /** "Ảnh 1", "Ảnh 2"…: given when the photo is picked and kept, so a number does not move while the user types. */
  number: number;
  original: File;
  /** The file to send, after shrinking. `null` while the photo is prepared. */
  file: File | null;
  previewUrl: string | null;
  alt: LocalizedText;
  phase: Phase;
  /** The user is done with this photo (left its boxes, or pressed Tải lên). It is sent when its turn comes. */
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
  /** Every picked photo is uploaded; `count` is how many went up. */
  onAllDone?(count: number): void;
};

function described(alt: LocalizedText): boolean {
  const request = toRequestText(alt);
  return request.vi !== null && request.en !== null;
}

function missingText(alt: LocalizedText): string {
  const request = toRequestText(alt);
  if (request.vi === null && request.en === null) return "Cần mô tả tiếng Việt và tiếng Anh để tải lên.";
  return request.vi === null ? "Cần mô tả tiếng Việt để tải lên." : "Cần mô tả tiếng Anh để tải lên.";
}

/** The text of an empty box is taken from `source`; a box the user already filled stays as it is. */
function fillEmpty(alt: LocalizedText, source: LocalizedText): LocalizedText {
  const own = toRequestText(alt);
  return { vi: own.vi === null ? source.vi : alt.vi, en: own.en === null ? source.en : alt.en };
}

/**
 * The upload box. One big button opens the phone's own choice of camera or gallery (`accept="image/*"`, no
 * `capture`). Every chosen photo:
 * 1. is made smaller in the browser right away (see `shrinkImage`);
 * 2. gets its own description boxes, and says which text is still missing (the API needs both languages);
 * 3. goes up as soon as both texts are there and the user leaves its boxes or presses Tải lên. One photo goes up
 *    at a time, with its own progress; a failed one keeps its text and offers Thử lại and Bỏ ảnh này.
 */
export function MediaUploader({ multiple = false, onUploaded, onPendingChange, onAllDone }: Props) {
  const { requireReLogin } = useAdminSession();
  const [items, setItems] = useState<Item[]>([]);
  const [sendingKey, setSendingKey] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  const nextKey = useRef(1);
  const nextNumber = useRef(1);
  const uploaded = useRef(0);
  const sending = useRef<{ key: number; controller: AbortController } | null>(null);
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
    mounted.current = true;
    return () => {
      mounted.current = false;
      sending.current?.controller.abort();
      for (const url of created) URL.revokeObjectURL(url);
      created.clear();
    };
  }, []);

  const preview = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    urls.current.add(url);
    return url;
  }, []);

  const forget = useCallback((url: string | null) => {
    if (url === null || !urls.current.has(url)) return;
    URL.revokeObjectURL(url);
    urls.current.delete(url);
  }, []);

  const update = useCallback((key: number, change: (item: Item) => Item) => {
    setItems((current) => current.map((item) => (item.key === key ? change(item) : item)));
  }, []);

  const prepare = useCallback(
    async (key: number, original: File) => {
      let file = original;
      try {
        file = (await shrinkImage(original)).file;
      } catch {
        // The original is sent; the API says what is wrong with it.
      }
      if (!mounted.current) return;
      const problem = checkUploadFile(file);
      update(key, (item) => {
        if (item.phase !== "preparing") return item;
        let previewUrl = item.previewUrl;
        if (file !== original) {
          forget(previewUrl);
          previewUrl = preview(file);
        }
        return problem === null
          ? { ...item, file, previewUrl, phase: "waiting" }
          : { ...item, file, previewUrl, phase: "failed", blocked: true, error: problem };
      });
    },
    [forget, preview, update],
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
        previewUrl: problem === null ? preview(original) : null,
        alt: EMPTY_ALT,
        phase: problem === null ? "preparing" : "failed",
        requested: false,
        progress: 0,
        error: problem,
        blocked: problem !== null,
        tip: null,
      };
    });
    setItems((current) => (multiple ? [...current, ...created] : created));
    for (const item of created) if (!item.blocked) void prepare(item.key, item.original);
  }

  const send = useCallback(
    async (item: Item) => {
      const controller = new AbortController();
      sending.current = { key: item.key, controller };
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
              signal: controller.signal,
              onProgress: (fraction) => update(item.key, (current) => ({ ...current, progress: fraction })),
            }),
          requireReLogin,
        );
        if (!mounted.current) return;
        uploaded.current += 1;
        forget(item.previewUrl);
        const left = itemsRef.current.filter((other) => other.key !== item.key);
        setItems((current) => current.filter((other) => other.key !== item.key));
        callbacks.current.onUploaded(media);
        if (left.length === 0) {
          const count = uploaded.current;
          uploaded.current = 0;
          toast.success(count === 1 ? "Đã tải ảnh lên." : `Đã tải lên ${count} ảnh.`);
          callbacks.current.onAllDone?.(count);
        }
      } catch (failure) {
        if (!mounted.current || controller.signal.aborted) return;
        const error = failure instanceof AdminApiError ? failure : new AdminApiError(0, GENERIC_ERROR_MESSAGE);
        const tip = isHeic(item.original) && error.status === 415 ? HEIC_TIP : null;
        update(item.key, (current) => ({ ...current, phase: "failed", requested: false, error: error.detail, tip }));
      } finally {
        if (sending.current?.key === item.key) sending.current = null;
        if (mounted.current) setSendingKey(null);
      }
    },
    [forget, requireReLogin, update],
  );

  // One photo at a time: the API works on at most two images at once, and a phone on 4G gains nothing from more.
  useEffect(() => {
    if (sendingKey !== null || sending.current !== null) return;
    const next = items.find((item) => item.phase === "waiting" && item.requested && item.file !== null && described(item.alt));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts the next upload (a network request) when the list allows it
    if (next !== undefined) void send(next);
  }, [items, sendingKey, send]);

  function changeAlt(key: number, alt: LocalizedText) {
    // New text means the user is still writing: the photo waits until they leave its boxes again.
    update(key, (item) => ({ ...item, alt, requested: false }));
  }

  function request(key: number) {
    // A photo that is still being made smaller is sent as soon as it is ready.
    update(key, (item) =>
      (item.phase === "waiting" || item.phase === "preparing") && described(item.alt) ? { ...item, requested: true } : item,
    );
  }

  function leave(key: number, event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) request(key);
  }

  function copyText(source: Item) {
    setItems((current) =>
      current.map((item) => {
        if (item.key === source.key) return item.phase === "waiting" ? { ...item, requested: true } : item;
        if (item.blocked || item.phase === "sending" || described(item.alt)) return item;
        const alt = fillEmpty(item.alt, source.alt);
        return { ...item, alt, requested: described(alt) && item.phase !== "failed" };
      }),
    );
  }

  function retry(key: number) {
    update(key, (item) => ({ ...item, phase: "waiting", requested: described(item.alt), error: null, tip: null }));
  }

  function remove(key: number) {
    const item = itemsRef.current.find((other) => other.key === key);
    if (item !== undefined) forget(item.previewUrl);
    setItems((current) => current.filter((other) => other.key !== key));
  }

  const busy = sendingKey !== null;
  const withoutText = (except: Item) =>
    items.filter((item) => item.key !== except.key && !item.blocked && item.phase !== "sending" && !described(item.alt)).length;

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
      {items.length > 0 ? (
        <ol className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.key} className="min-w-0 rounded-lg border bg-card p-3">
              <UploadItem
                item={item}
                others={withoutText(item)}
                onAlt={(alt) => changeAlt(item.key, alt)}
                onLeave={(event) => leave(item.key, event)}
                onUpload={() => request(item.key)}
                onCopy={() => copyText(item)}
                onRetry={() => retry(item.key)}
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
  /** How many other photos still have no description. */
  others: number;
  onAlt(alt: LocalizedText): void;
  onLeave(event: FocusEvent<HTMLElement>): void;
  onUpload(): void;
  onCopy(): void;
  onRetry(): void;
  onRemove(): void;
};

function UploadItem({ item, others, onAlt, onLeave, onUpload, onCopy, onRetry, onRemove }: ItemProps) {
  const [broken, setBroken] = useState<string | null>(null);
  const sendingNow = item.phase === "sending";
  const ready = described(item.alt);
  const percent = Math.round(item.progress * 100);
  const name = `Ảnh ${item.number}`;

  return (
    // The whole photo is locked while it goes up: the text that is being sent must not change under it.
    <fieldset disabled={sendingNow} onBlur={onLeave} className="flex min-w-0 flex-col gap-3">
      <legend className="mb-2 text-base font-semibold">{name}</legend>
      <div className="flex min-w-0 items-start gap-3">
        {item.previewUrl !== null && broken !== item.previewUrl ? (
          // A blob: URL of the chosen photo; next/image cannot optimize it.
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
          <span className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md border bg-muted p-1 text-center text-xs text-muted-foreground">
            <ImageOff aria-hidden="true" className="size-5" />
            Không xem trước được
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
        <BilingualField label="Mô tả ảnh" value={item.alt} onChange={onAlt} maxLength={MAX_ALT_LENGTH} viRequired enRequired />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {item.phase === "waiting" && ready && !item.requested ? (
          <Button type="button" onClick={onUpload}>
            Tải lên
          </Button>
        ) : null}
        {item.phase === "failed" && !item.blocked ? (
          <Button type="button" onClick={onRetry} disabled={!ready}>
            Thử lại
          </Button>
        ) : null}
        {ready && others > 0 && !sendingNow ? (
          <Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal text-left" onClick={onCopy}>
            Dùng mô tả này cho {others} ảnh chưa có mô tả
          </Button>
        ) : null}
        {!sendingNow ? (
          <Button type="button" variant="outline" onClick={onRemove}>
            Bỏ ảnh này
          </Button>
        ) : null}
      </div>
    </fieldset>
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
