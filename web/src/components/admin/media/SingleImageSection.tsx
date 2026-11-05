"use client";

import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { Button } from "@/components/admin/ui/button";
import { useMediaByIds } from "@/lib/admin/use-media-by-ids";

type Props = {
  mediaId: number | null;
  onChange(mediaId: number | null): void;
  /** The title of the section. */
  label?: string;
};

/** One optional image: a preview with "Bỏ ảnh" when chosen, and the library picker (single mode). */
export function SingleImageSection({ mediaId, onChange, label = "Ảnh" }: Props) {
  const ids = mediaId === null ? [] : [mediaId];
  const { items } = useMediaByIds(ids);
  const media = items.find((item) => item.id === mediaId);
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-2 text-base font-semibold">{label}</legend>
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
          <span className="min-w-0 flex-1 truncate text-sm">{media?.altVi ?? "(chưa có mô tả)"}</span>
          <Button type="button" variant="outline" onClick={() => onChange(null)}>
            Bỏ ảnh
          </Button>
        </div>
      ) : null}
      <MediaPicker mode="single" value={ids} onChange={(next) => onChange(next[0] ?? null)} />
    </fieldset>
  );
}
