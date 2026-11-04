"use client";

import { useState } from "react";
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

type Props = {
  mode: "single" | "multiple";
  value: number[];
  onChange(ids: number[]): void;
};

/**
 * A button that opens the library to choose images by id. Use `useMediaByIds` to show the chosen images.
 * Single mode: choosing an image replaces the value with that one id and closes the box.
 * Multiple mode: choosing toggles an image, and the user closes the box with "Xong".
 */
export function MediaPicker({ mode, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Chọn ảnh
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "single" ? "Chọn một ảnh" : "Chọn ảnh"}</DialogTitle>
          <DialogDescription>Chọn từ thư viện hoặc tải ảnh mới lên.</DialogDescription>
        </DialogHeader>
        <PickerBody mode={mode} value={value} onChange={onChange} close={() => setOpen(false)} />
        <DialogFooter>
          <Button type="button" variant={mode === "multiple" ? "default" : "outline"} onClick={() => setOpen(false)}>
            {mode === "multiple" ? "Xong" : "Đóng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({ mode, value, onChange, close }: Props & { close(): void }) {
  const library = useMediaLibrary();
  const [tab, setTab] = useState("library");

  function choose(media: MediaAdminDto) {
    if (mode === "single") {
      onChange([media.id]);
      close();
    } else {
      onChange(value.includes(media.id) ? value.filter((id) => id !== media.id) : [...value, media.id]);
    }
  }

  function uploaded(media: MediaAdminDto) {
    library.added(media);
    rememberMedia(media);
    if (mode === "single") {
      onChange([media.id]);
      close();
    } else {
      onChange([...value.filter((id) => id !== media.id), media.id]);
      setTab("library");
    }
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="w-full">
        <TabsTrigger value="library">Thư viện</TabsTrigger>
        <TabsTrigger value="upload">Tải ảnh mới</TabsTrigger>
      </TabsList>
      <TabsContent value="library" className="flex flex-col gap-3 pt-3">
        {library.items.length > 0 || !library.loading ? (
          <MediaGrid items={library.items} onSelect={choose} selectedIds={value} />
        ) : null}
        <ProblemMessage error={library.error} />
        {library.loading ? <p role="status" className="text-center text-muted-foreground">Đang tải…</p> : null}
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
      <TabsContent value="upload" className="pt-3">
        <MediaUploader onUploaded={uploaded} />
      </TabsContent>
    </Tabs>
  );
}
