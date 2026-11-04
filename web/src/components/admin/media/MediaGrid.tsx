import type { MediaAdminDto } from "@/lib/admin/types";
import { cn } from "@/lib/admin/utils";

type Props = {
  items: MediaAdminDto[];
  onSelect(media: MediaAdminDto): void;
  /** When set, each image is a toggle button and the listed ones are shown as chosen. */
  selectedIds?: number[];
};

/**
 * Thumbnails of the library. The images are small files of this site under /media, so a plain
 * lazy <img> with its width and height is enough; next/image would only add an optimizer for them.
 */
export function MediaGrid({ items, onSelect, selectedIds }: Props) {
  if (items.length === 0) return <p className="py-6 text-center text-muted-foreground">Chưa có ảnh nào.</p>;
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
      {items.map((media) => {
        const selected = selectedIds?.includes(media.id);
        return (
          <li key={media.id}>
            <button
              type="button"
              onClick={() => onSelect(media)}
              aria-pressed={selectedIds === undefined ? undefined : selected}
              className={cn(
                "relative block aspect-square w-full min-h-11 overflow-hidden rounded-md border bg-muted outline-none hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 active:opacity-80",
                selected && "ring-4 ring-primary",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={media.url}
                alt={media.altVi ?? ""}
                width={media.width}
                height={media.height}
                loading="lazy"
                className="size-full object-cover"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
