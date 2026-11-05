"use client";

import { useState } from "react";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { MediaEditDialog } from "@/components/admin/media/MediaEditDialog";
import { MediaGrid } from "@/components/admin/media/MediaGrid";
import { MediaUploader } from "@/components/admin/media/MediaUploader";
import { useUploadDialog } from "@/components/admin/media/use-upload-dialog";
import { Button } from "@/components/admin/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import type { MediaAdminDto } from "@/lib/admin/types";
import { useMediaLibrary } from "@/lib/admin/use-media-library";

/** The photo library: newest first. Tap a photo to change its description or delete it. */
export default function MediaPage() {
  const library = useMediaLibrary();
  const [editing, setEditing] = useState<MediaAdminDto | null>(null);
  const upload = useUploadDialog();

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button type="button" onClick={() => upload.onOpenChange(true)}>
        Tải ảnh mới
      </Button>
      {library.items.length > 0 || !library.loading ? <MediaGrid items={library.items} onSelect={setEditing} /> : null}
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

      <Dialog open={upload.open} onOpenChange={upload.onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tải ảnh mới</DialogTitle>
            <DialogDescription>Chụp ảnh mới hoặc chọn ảnh có sẵn trong máy.</DialogDescription>
          </DialogHeader>
          <MediaUploader
            multiple
            onUploaded={library.added}
            onPendingChange={upload.setPending}
            onAllDone={upload.close}
          />
        </DialogContent>
      </Dialog>
      {upload.confirm}

      <MediaEditDialog
        media={editing}
        onClose={() => setEditing(null)}
        onChanged={(media) => {
          library.changed(media);
          // Only update the open dialog. If the user closed it while the save ran, it stays closed.
          setEditing((current) => (current?.id === media.id ? media : current));
        }}
        onDeleted={(id) => {
          library.removed(id);
          setEditing(null);
        }}
      />
    </div>
  );
}
