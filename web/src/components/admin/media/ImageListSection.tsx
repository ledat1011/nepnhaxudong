"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useId } from "react";
import { moved } from "@/components/admin/product/rows";
import { Button } from "@/components/admin/ui/button";
import { useMediaByIds } from "@/lib/admin/use-media-by-ids";
import { useRemoveWithUndo } from "@/lib/admin/use-remove-with-undo";
import { MediaPicker } from "./MediaPicker";

type Props = {
  /** The chosen images, in the order they show on the website. */
  ids: number[];
  onChange(ids: number[]): void;
  /** The most images (the API refuses more). */
  max: number;
  /** What the images belong to, as it reads after "Một" and "khỏi": "sản phẩm", "mốc". */
  owner: string;
  /**
   * True: with `max` images, "Chọn ảnh" is off and the note under it says why.
   * False: "Chọn ảnh" stays on, so the user can still take images off the list in the library.
   */
  lockPickerWhenFull?: boolean;
};

/**
 * An ordered list of images: a preview of each, buttons to move it up or down, and one to take it off (with
 * "Hoàn tác"). New images come from the library picker (multiple mode).
 */
export function ImageListSection({ ids, onChange, max, owner, lockPickerWhenFull = false }: Props) {
  const noteId = useId();
  const { items } = useMediaByIds(ids);
  const remove = useRemoveWithUndo(ids, onChange, { keyOf: (id) => id, max });
  const full = ids.length >= max;
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-2 text-base font-semibold">Ảnh</legend>
      <ul className="flex flex-col gap-2">
        {ids.map((id, index) => {
          const media = items.find((item) => item.id === id);
          const name = media?.altVi ?? `số ${id}`;
          return (
            <li key={id} className="flex items-center gap-2 rounded-md border p-2">
              {media !== undefined ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={media.url}
                  alt={name}
                  width={media.width}
                  height={media.height}
                  className="size-16 rounded object-cover"
                />
              ) : (
                <span className="size-16 rounded bg-muted" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Đưa ảnh ${name} lên`}
                disabled={index === 0}
                onClick={() => onChange(moved(ids, index, -1))}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Đưa ảnh ${name} xuống`}
                disabled={index === ids.length - 1}
                onClick={() => onChange(moved(ids, index, 1))}
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Bỏ ảnh ${name}`}
                className="ml-2"
                onClick={() => remove(index, `Đã bỏ ảnh ${index + 1} khỏi ${owner}.`)}
              >
                <X />
              </Button>
            </li>
          );
        })}
      </ul>
      <MediaPicker
        mode="multiple"
        value={ids}
        onChange={onChange}
        max={max}
        disabled={full && lockPickerWhenFull}
        describedBy={full ? noteId : undefined}
      />
      {full ? (
        <p id={noteId} className="text-sm text-muted-foreground">
          Một {owner} có tối đa {max} ảnh.
        </p>
      ) : null}
    </fieldset>
  );
}
