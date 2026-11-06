"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Button } from "@/components/admin/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/admin/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin/ui/tabs";
import type { MediaAdminDto } from "@/lib/admin/types";
import { rememberMedia } from "@/lib/admin/use-media-by-ids";
import { useMediaLibrary } from "@/lib/admin/use-media-library";
import { MediaGrid } from "./MediaGrid";
import { MediaUploader } from "./MediaUploader";
import { useUploadDialog } from "./use-upload-dialog";

type Props = {
  mode: "single" | "multiple";
  value: number[];
  onChange(ids: number[]): void;
  /** Multiple mode only: the most images that can be chosen. */
  max?: number;
  /** The text of the button that opens the library. */
  triggerLabel?: string;
  /** Turns the button that opens the library off. */
  disabled?: boolean;
  /** The id of the text that says more about the button, for example why it is off. */
  describedBy?: string;
};

/**
 * A button that opens the library to choose images by id. Use `useMediaByIds` to show the chosen images.
 * Single mode: choosing an image replaces the value with that one id and closes the box.
 * Multiple mode: choosing toggles an image, and the user closes the box with "Xong".
 * The upload tab takes one photo in single mode and many in multiple mode. While a photo is not uploaded yet,
 * closing the box asks first.
 */
export function MediaPicker({ mode, value, onChange, max, triggerLabel = "Chọn ảnh", disabled, describedBy }: Props) {
  const dialog = useUploadDialog();
  return (
    <>
      <Dialog open={dialog.open} onOpenChange={dialog.onOpenChange}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" disabled={disabled} aria-describedby={describedBy}>
            {triggerLabel}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{mode === "single" ? "Chọn một ảnh" : "Chọn ảnh"}</DialogTitle>
            <DialogDescription>Chọn từ thư viện hoặc tải ảnh mới lên.</DialogDescription>
          </DialogHeader>
          <PickerBody
            mode={mode}
            value={value}
            onChange={onChange}
            max={max}
            close={dialog.close}
            onPendingChange={dialog.setPending}
          />
          <DialogFooter>
            <Button
              type="button"
              variant={mode === "multiple" ? "default" : "outline"}
              onClick={() => dialog.onOpenChange(false)}
            >
              {mode === "multiple" ? "Xong" : "Đóng"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog.confirm}
    </>
  );
}

type BodyProps = Props & { close(): void; onPendingChange(pending: boolean): void };

function PickerBody({ mode, value, onChange, max, close, onPendingChange }: BodyProps) {
  const library = useMediaLibrary();
  // `null` until the user picks a tab: an empty library opens on the upload tab.
  const [chosenTab, setTab] = useState<string | null>(null);
  const emptyLibrary = !library.loading && library.error === null && library.items.length === 0;
  const tab = chosenTab ?? (emptyLibrary ? "upload" : "library");
  // The ids the parent will have after the last onChange: two uploads can finish before the parent renders again.
  const chosen = useRef(value);
  useLayoutEffect(() => {
    chosen.current = value;
  }, [value]);

  const full = mode === "multiple" && max !== undefined && value.length >= max;

  function change(ids: number[]) {
    chosen.current = ids;
    onChange(ids);
  }

  function choose(media: MediaAdminDto) {
    if (mode === "single") {
      change([media.id]);
      close();
    } else {
      if (full && !value.includes(media.id)) return;
      change(value.includes(media.id) ? value.filter((id) => id !== media.id) : [...value, media.id]);
    }
  }

  function uploaded(media: MediaAdminDto) {
    library.added(media);
    rememberMedia(media);
    if (mode === "single") {
      change([media.id]);
      close();
      return;
    }
    const current = chosen.current;
    const room = max === undefined || current.length < max;
    if (room && !current.includes(media.id)) change([...current, media.id]);
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="w-full">
        <TabsTrigger value="library">Thư viện</TabsTrigger>
        <TabsTrigger value="upload">Tải ảnh mới</TabsTrigger>
      </TabsList>
      <TabsContent value="library" className="flex flex-col gap-3 pt-3">
        {full ? (
          <p role="status" className="text-sm text-muted-foreground">
            Tối đa {max} ảnh
          </p>
        ) : null}
        {library.items.length > 0 || !library.loading ? (
          <MediaGrid items={library.items} onSelect={choose} selectedIds={value} />
        ) : null}
        <ProblemMessage error={library.error} />
        {library.loading ? (
          <p role="status" className="text-center text-muted-foreground">
            Đang tải…
          </p>
        ) : null}
        {library.error !== null && !library.loading ? (
          <Button type="button" variant="outline" onClick={() => void library.loadMore()}>
            Thử lại
          </Button>
        ) : null}
        {library.hasMore && !library.loading && library.error === null ? (
          <Button type="button" variant="outline" onClick={() => void library.loadMore()}>
            Xem thêm
          </Button>
        ) : null}
      </TabsContent>
      {/* Kept mounted while hidden: the photos that wait for text must survive a look at the library. */}
      <TabsContent value="upload" forceMount hidden={tab !== "upload"} className="pt-3">
        {full && tab === "upload" ? (
          <p role="status" className="pb-3 text-sm text-muted-foreground">
            Tối đa {max} ảnh
          </p>
        ) : null}
        <MediaUploader
          multiple={mode === "multiple"}
          onUploaded={uploaded}
          onPendingChange={onPendingChange}
          onAllDone={() => {
            if (mode === "multiple") setTab("library");
          }}
        />
      </TabsContent>
    </Tabs>
  );
}
