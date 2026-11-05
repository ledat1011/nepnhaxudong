"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";

/**
 * The open state of a dialog that holds a `MediaUploader`. While a picked photo is not uploaded yet, closing the
 * dialog (Escape, the X, a tap outside, or a close button) first asks, because closing drops the photos and their text.
 * Give `setPending` to the uploader's `onPendingChange`, and render `confirm` next to the dialog.
 */
export function useUploadDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [asking, setAsking] = useState(false);

  function onOpenChange(next: boolean) {
    if (!next && pending) {
      setAsking(true);
      return;
    }
    setOpen(next);
  }

  function close() {
    setPending(false);
    setOpen(false);
  }

  const confirm = (
    <ConfirmDialog
      open={asking}
      onOpenChange={setAsking}
      title="Bỏ ảnh chưa tải lên?"
      description="Các ảnh chưa tải lên và mô tả của chúng sẽ mất. Ảnh đã tải lên vẫn ở trong thư viện."
      confirmLabel="Bỏ ảnh"
      cancelLabel="Ở lại"
      destructive
      onConfirm={close}
    />
  );

  return { open, onOpenChange, close, setPending, confirm };
}
